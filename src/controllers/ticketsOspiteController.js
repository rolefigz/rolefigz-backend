// Ticket senza account, sugli stessi ticket di sempre (tabelle tickets/mensajes, Telegram, pannello admin): niente
// tabelle nuove. Il cliente lascia nome ed email, che vanno nella prima riga del primo messaggio
// («[ospite] Nome <email>»); per continuare la conversazione usa un token firmato con il numero del ticket
// (nel suo browser e nel link dell'email che riceve a ogni risposta).
const crypto = require("crypto");
const { Ticket, Messaggio } = require("../models");
const { emailNuovoTicketAdmin, emailTicketOspiteRicevuto } = require("../utils/mailer");
const { sendMessage } = require("../utils/telegram");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTESTAZIONE = /^\[ospite\] (.+) <([^<>\s]+@[^<>\s]+)>\n/;
const testo = (v, max) => String(v ?? "").trim().slice(0, max);

function firma(id) {
  return crypto.createHmac("sha256", process.env.JWT_SECRET || "rolefigz").update("ticket-ospite:" + id)
    .digest("hex").slice(0, 32);
}
const tokenDi = id => `${id}.${firma(id)}`;

async function ticketDaToken(token) {
  const m = String(token || "").match(/^(\d{1,10})\.([a-f0-9]{32})$/);
  if (!m || !crypto.timingSafeEqual(Buffer.from(m[2]), Buffer.from(firma(m[1])))) return null;
  const ticket = await Ticket.findByPk(m[1]);
  return ticket && !ticket.usuario_id ? ticket : null;              // solo i ticket senza account
}

// Nome ed email dell'ospite di un ticket senza account (dalla prima riga del primo messaggio), o null
async function ospiteDelTicket(ticketId) {
  const primo = await Messaggio.findOne({ where: { ticket_id: ticketId, remitente: "cliente" }, order: [["createdAt", "ASC"]] });
  const m = primo && primo.texto.match(INTESTAZIONE);
  return m ? { nome: m[1], email: m[2] } : null;
}

// POST /api/tickets/ospite — { nome, email, asunto, texto, consenso }
const creaTicketOspite = async (req, res) => {
  try {
    const nome = testo(req.body?.nome, 100).replace(/[<>\n]/g, ""), email = testo(req.body?.email, 120).toLowerCase();
    const asunto = testo(req.body?.asunto, 150), texto = testo(req.body?.texto, 4000);
    if (!nome || !EMAIL.test(email)) return res.status(400).json({ error: "Inserisci nome ed email validi." });
    if (!asunto || !texto) return res.status(400).json({ error: "Oggetto e messaggio obbligatori" });
    if (req.body?.consenso !== true) return res.status(400).json({ error: "Devi accettare l'informativa privacy." });

    const ticket = await Ticket.create({ asunto });
    await Messaggio.create({ ticket_id: ticket.id, remitente: "cliente", texto: `[ospite] ${nome} <${email}>\n${texto}` });
    const token = tokenDi(ticket.id);

    emailNuovoTicketAdmin({ id: ticket.id, asunto, texto, utente: { nombre: `${nome} (senza account)`, email } })
      .catch(console.error);
    emailTicketOspiteRicevuto({ ticket, nome, email, token }).catch(console.error);
    sendMessage(
      `🎫 <b>Nuovo ticket #${ticket.id}</b> (senza account)\n👤 ${nome} — <code>${email}</code>\n📋 <b>${asunto}</b>\n\n${texto}\n\n<i>↩️ Rispondi a questo messaggio per rispondere al cliente (gli arriva per email).</i>\n[T:${ticket.id}]`
    ).catch(console.error);

    res.status(201).json({ ticket: { id: ticket.id, asunto, estado: ticket.estado }, token });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/tickets/ospite/elenco — { tokens: [...] } → i ticket di questo browser
const elencoTicketOspite = async (req, res) => {
  try {
    const tokens = (Array.isArray(req.body?.tokens) ? req.body.tokens : []).slice(0, 30);
    const righe = await Promise.all(tokens.map(async token => {
      const t = await ticketDaToken(token);
      if (!t) return null;
      const no_leidos = await Messaggio.count({ where: { ticket_id: t.id, remitente: "admin", leido: false } });
      return { id: t.id, asunto: t.asunto, estado: t.estado, updatedAt: t.updatedAt, no_leidos, token };
    }));
    res.json(righe.filter(Boolean).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/tickets/ospite/:token/mensajes
const messaggiOspite = async (req, res) => {
  try {
    const t = await ticketDaToken(req.params.token);
    if (!t) return res.status(404).json({ error: "Ticket non trovato" });
    await Messaggio.update({ leido: true }, { where: { ticket_id: t.id, remitente: "admin", leido: false } });
    const mensajes = (await Messaggio.findAll({ where: { ticket_id: t.id }, order: [["createdAt", "ASC"]] }))
      .map(m => ({ ...m.toJSON(), texto: m.texto.replace(INTESTAZIONE, "") }));     // la riga tecnica non si mostra
    res.json({ ticket: { id: t.id, asunto: t.asunto, estado: t.estado }, mensajes });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/tickets/ospite/:token/mensajes — { texto }
const inviaOspite = async (req, res) => {
  try {
    const t = await ticketDaToken(req.params.token);
    if (!t) return res.status(404).json({ error: "Ticket non trovato" });
    if (t.estado === "cerrado") return res.status(400).json({ error: "Ticket chiuso" });
    const texto = testo(req.body?.texto, 4000);
    if (!texto) return res.status(400).json({ error: "Messaggio vuoto" });
    const msg = await Messaggio.create({ ticket_id: t.id, remitente: "cliente", texto });
    await Ticket.update({ updatedAt: new Date() }, { where: { id: t.id } });
    const o = await ospiteDelTicket(t.id);
    sendMessage(
      `💬 <b>Nuovo messaggio</b> — ticket #${t.id} (senza account)\n👤 ${o ? o.nome : "ospite"}\n\n${texto}\n\n<i>↩️ Rispondi a questo messaggio per rispondere.</i>\n[T:${t.id}]`
    ).catch(console.error);
    res.status(201).json({ data: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// Per il pannello admin e le risposte: nome ed email del cliente di un ticket (con account o senza)
async function clienteDelTicket(ticket) {
  if (ticket.Utente?.email) return { nome: ticket.Utente.nombre || ticket.Utente.email, email: ticket.Utente.email, token: null };
  if (ticket.usuario_id) return null;
  const o = await ospiteDelTicket(ticket.id);
  return o ? { ...o, token: tokenDi(ticket.id) } : null;
}

module.exports = { creaTicketOspite, elencoTicketOspite, messaggiOspite, inviaOspite, clienteDelTicket };
