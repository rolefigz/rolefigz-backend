const { Op } = require("sequelize");
const { Ticket, Mensaje, Usuario } = require("../models");

// POST /api/tickets — crear ticket + primer mensaje (cliente)
const crearTicket = async (req, res) => {
  try {
    const { asunto, texto } = req.body;
    if (!asunto?.trim() || !texto?.trim())
      return res.status(400).json({ error: "Oggetto e messaggio obbligatori" });

    const ticket = await Ticket.create({ usuario_id: req.usuario.id, asunto: asunto.trim() });
    await Mensaje.create({ ticket_id: ticket.id, remitente: "cliente", texto: texto.trim() });
    res.status(201).json({ mensaje: "Ticket creato", ticket });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets/mis — tickets del usuario autenticado
const getMisTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      where: { usuario_id: req.usuario.id },
      order: [["updatedAt", "DESC"]]
    });

    const result = await Promise.all(tickets.map(async t => {
      const noLeidos = await Mensaje.count({
        where: { ticket_id: t.id, remitente: "admin", leido: false }
      });
      const ultimo = await Mensaje.findOne({
        where: { ticket_id: t.id },
        order: [["createdAt", "DESC"]]
      });
      return {
        ...t.toJSON(),
        no_leidos: noLeidos,
        ultimo_mensaje: ultimo?.texto?.slice(0, 60) || "",
        ultimo_at: ultimo?.createdAt || t.createdAt
      };
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets/unread — mensajes de admin no leídos (para FAB badge)
const getUnreadCliente = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ where: { usuario_id: req.usuario.id }, attributes: ["id"] });
    const ids = tickets.map(t => t.id);
    const count = ids.length
      ? await Mensaje.count({ where: { ticket_id: { [Op.in]: ids }, remitente: "admin", leido: false } })
      : 0;
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets/:id/mensajes — mensajes de un ticket (marca leídos)
const getMensajes = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id, {
      include: [{ model: Usuario, attributes: ["nombre", "email"] }]
    });
    if (!ticket) return res.status(404).json({ error: "Ticket non trovato" });
    if (req.usuario.rol !== "admin" && ticket.usuario_id !== req.usuario.id)
      return res.status(403).json({ error: "Accesso negato" });

    // Marcar como leídos los mensajes del otro lado
    const otroRemitente = req.usuario.rol === "admin" ? "cliente" : "admin";
    await Mensaje.update(
      { leido: true },
      { where: { ticket_id: ticket.id, remitente: otroRemitente, leido: false } }
    );

    const mensajes = await Mensaje.findAll({
      where: { ticket_id: ticket.id },
      order: [["createdAt", "ASC"]]
    });

    res.json({ ticket, mensajes });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/tickets/:id/mensajes — enviar mensaje
const enviarMensaje = async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error: "Messaggio vuoto" });

    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket non trovato" });
    if (req.usuario.rol !== "admin" && ticket.usuario_id !== req.usuario.id)
      return res.status(403).json({ error: "Accesso negato" });
    if (ticket.estado === "cerrado" && req.usuario.rol !== "admin")
      return res.status(400).json({ error: "Ticket chiuso" });

    const remitente = req.usuario.rol === "admin" ? "admin" : "cliente";
    const msg = await Mensaje.create({ ticket_id: ticket.id, remitente, texto: texto.trim() });

    // Tocar updatedAt del ticket para ordenación
    await Ticket.update({ updatedAt: new Date() }, { where: { id: ticket.id } });

    res.status(201).json({ mensaje: "Messaggio inviato", data: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets — todos los tickets (admin)
const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({
      include: [{ model: Usuario, attributes: ["nombre", "email"] }],
      order: [["updatedAt", "DESC"]]
    });

    const result = await Promise.all(tickets.map(async t => {
      const noLeidos = await Mensaje.count({
        where: { ticket_id: t.id, remitente: "cliente", leido: false }
      });
      const ultimo = await Mensaje.findOne({
        where: { ticket_id: t.id },
        order: [["createdAt", "DESC"]]
      });
      return {
        ...t.toJSON(),
        no_leidos: noLeidos,
        ultimo_mensaje: ultimo?.texto?.slice(0, 60) || "",
        ultimo_at: ultimo?.createdAt || t.createdAt
      };
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets/admin/unread — total no leídos para badge del menú
const getUnreadAdmin = async (req, res) => {
  try {
    const count = await Mensaje.count({ where: { remitente: "cliente", leido: false } });
    res.json({ count });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/tickets/:id/estado — abrir/cerrar ticket (admin)
const cambiarEstado = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ error: "Ticket non trovato" });
    const estados = ["abierto", "cerrado"];
    if (!estados.includes(req.body.estado))
      return res.status(400).json({ error: "Stato non valido" });
    await ticket.update({ estado: req.body.estado });
    res.json({ mensaje: "Stato aggiornato", ticket });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { crearTicket, getMisTickets, getUnreadCliente, getMensajes, enviarMensaje, getAllTickets, getUnreadAdmin, cambiarEstado };
