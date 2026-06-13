const { Op } = require("sequelize");
const { Ticket, Messaggio, Utente } = require("../models");
const { emailNuovoTicketAdmin, emailRispostaTicket } = require("../utils/mailer");
const { sendMessage } = require("../utils/telegram");

// POST /api/tickets — crea ticket + primo messaggio (cliente)
const crearTicket = async (req, res) => {
  try {
    const { asunto, texto } = req.body;
    if (!asunto?.trim() || !texto?.trim())
      return res.status(400).json({ error: "Oggetto e messaggio obbligatori" });

    const ticket = await Ticket.create({ usuario_id: req.usuario.id, asunto: asunto.trim() });
    await Messaggio.create({ ticket_id: ticket.id, remitente: "cliente", texto: texto.trim() });

    emailNuovoTicketAdmin({ id: ticket.id, asunto: asunto.trim(), texto: texto.trim(), utente: req.usuario }).catch(console.error);
    sendMessage(
      `🎫 <b>Nuovo ticket #${ticket.id}</b>\n👤 ${req.usuario.nombre || ""} — <code>${req.usuario.email}</code>\n📋 <b>${asunto.trim()}</b>\n\n${texto.trim()}\n\n<i>↩️ Rispondi a questo messaggio per rispondere al cliente.</i>\n[T:${ticket.id}]`
    ).catch(console.error);

    res.status(201).json({ mensaje: "Ticket creato", ticket });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets/mis — ticket dell'utente autenticato
const getMisTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { usuario_id: req.usuario.id },
      order: [["updatedAt", "DESC"]]
    });

    const risultato = await Promise.all(tickets.map(async t => {
      const nonLetti = await Messaggio.count({
        where: { ticket_id: t.id, remitente: "admin", leido: false }
      });
      const ultimo = await Messaggio.findOne({
        where: { ticket_id: t.id },
        order: [["createdAt", "DESC"]]
      });
      return {
        ...t.toJSON(),
        no_leidos:      nonLetti,
        ultimo_mensaje: ultimo?.texto?.slice(0, 60) || "",
        ultimo_at:      ultimo?.createdAt || t.createdAt
      };
    }));

    res.json(risultato);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets/unread — messaggi admin non letti (per badge FAB)
const getUnreadCliente = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ where: { usuario_id: req.usuario.id }, attributes: ["id"] });
    const ids = tickets.map(t => t.id);
    const count = ids.length
      ? await Messaggio.count({ where: { ticket_id: { [Op.in]: ids }, remitente: "admin", leido: false } })
      : 0;
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets/:id/mensajes — messaggi di un ticket (segna come letti)
const getMensajes = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{ model: Utente, attributes: ["nombre", "email"] }]
    });
    if (!ticket) return res.status(404).json({ error: "Ticket non trovato" });
    if (req.usuario.rol !== "admin" && ticket.usuario_id !== req.usuario.id)
      return res.status(403).json({ error: "Accesso negato" });

    // Segna come letti i messaggi dell'altra parte
    const altroMittente = req.usuario.rol === "admin" ? "cliente" : "admin";
    await Messaggio.update(
      { leido: true },
      { where: { ticket_id: ticket.id, remitente: altroMittente, leido: false } }
    );

    const messaggi = await Messaggio.findAll({
      where: { ticket_id: ticket.id },
      order: [["createdAt", "ASC"]]
    });

    res.json({ ticket, mensajes: messaggi });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/tickets/:id/mensajes — invia messaggio
const enviarMensaje = async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error: "Messaggio vuoto" });

    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{ model: Utente, attributes: ["nombre", "email"] }]
    });
    if (!ticket) return res.status(404).json({ error: "Ticket non trovato" });
    if (req.usuario.rol !== "admin" && ticket.usuario_id !== req.usuario.id)
      return res.status(403).json({ error: "Accesso negato" });
    if (ticket.estado === "cerrado" && req.usuario.rol !== "admin")
      return res.status(400).json({ error: "Ticket chiuso" });

    const mittente = req.usuario.rol === "admin" ? "admin" : "cliente";
    const msg      = await Messaggio.create({ ticket_id: ticket.id, remitente: mittente, texto: texto.trim() });

    await Ticket.update({ updatedAt: new Date() }, { where: { id: ticket.id } });

    if (mittente === "cliente") {
      sendMessage(
        `💬 <b>Nuovo messaggio</b> — ticket #${ticket.id}\n👤 ${req.usuario.nombre || req.usuario.email}\n\n${texto.trim()}\n\n<i>↩️ Rispondi a questo messaggio per rispondere.</i>\n[T:${ticket.id}]`
      ).catch(console.error);
    }

    if (mittente === "admin" && ticket.Utente?.email) {
      emailRispostaTicket({
        ticket,
        texto:        texto.trim(),
        emailCliente: ticket.Utente.email,
        nomeCliente:  ticket.Utente.nombre || ticket.Utente.email,
      }).catch(console.error);
    }

    res.status(201).json({ mensaje: "Messaggio inviato", data: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets — tutti i ticket (admin)
const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      include: [{ model: Utente, attributes: ["nombre", "email"] }],
      order: [["updatedAt", "DESC"]]
    });

    const risultato = await Promise.all(tickets.map(async t => {
      const nonLetti = await Messaggio.count({
        where: { ticket_id: t.id, remitente: "cliente", leido: false }
      });
      const ultimo = await Messaggio.findOne({
        where: { ticket_id: t.id },
        order: [["createdAt", "DESC"]]
      });
      return {
        ...t.toJSON(),
        no_leidos:      nonLetti,
        ultimo_mensaje: ultimo?.texto?.slice(0, 60) || "",
        ultimo_at:      ultimo?.createdAt || t.createdAt
      };
    }));

    res.json(risultato);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets/admin/unread — totale non letti per badge menu
const getUnreadAdmin = async (req, res) => {
  try {
    const count = await Messaggio.count({ where: { remitente: "cliente", leido: false } });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/tickets/:id/estado — apri/chiudi ticket (admin)
const cambiarEstado = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket non trovato" });
    const statiValidi = ["abierto", "cerrado"];
    if (!statiValidi.includes(req.body.estado))
      return res.status(400).json({ error: "Stato non valido" });
    await ticket.update({ estado: req.body.estado });
    res.json({ mensaje: "Stato aggiornato", ticket });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { crearTicket, getMisTickets, getUnreadCliente, getMensajes, enviarMensaje, getAllTickets, getUnreadAdmin, cambiarEstado };
