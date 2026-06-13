const { Ticket, Messaggio } = require("../models");
const { sendMessage, registraWebhook } = require("../utils/telegram");

// POST /api/telegram/webhook — riceve aggiornamenti da Telegram
const webhook = async (req, res) => {
  const secret   = req.headers["x-telegram-bot-api-secret-token"];
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected && secret !== expected) return res.status(403).end();

  res.json({ ok: true }); // rispondo subito a Telegram (richiede risposta rapida)

  const message = req.body?.message;
  if (!message?.text || !message?.reply_to_message) return;

  // Il ticket ID è incorporato in ogni messaggio come [T:5]
  const replyText = message.reply_to_message.text || "";
  const match = replyText.match(/\[T:(\d+)\]/);
  if (!match) return;

  const ticketId = parseInt(match[1]);

  try {
    const ticket = await Ticket.findByPk(ticketId);

    if (!ticket) {
      await sendMessage(`⚠️ Ticket #${ticketId} non trovato.`, { reply_to_message_id: message.message_id });
      return;
    }
    if (ticket.estado === "cerrado") {
      await sendMessage(`⚠️ Ticket #${ticketId} è chiuso. Riaprilo dal pannello prima di rispondere.`, { reply_to_message_id: message.message_id });
      return;
    }

    await Messaggio.create({ ticket_id: ticket.id, remitente: "admin", texto: message.text });
    await Ticket.update({ updatedAt: new Date() }, { where: { id: ticket.id } });

    await sendMessage(`✅ Risposta inviata al cliente — ticket #${ticket.id}`, { reply_to_message_id: message.message_id });
  } catch (err) {
    console.error("Telegram webhook:", err.message);
  }
};

// POST /api/telegram/setup — registra il webhook con Telegram (chiamare una volta)
const setup = async (req, res) => {
  try {
    const BASE_URL = process.env.BASE_URL;
    if (!BASE_URL) return res.status(400).json({ error: "BASE_URL non configurata nel .env" });
    const result = await registraWebhook(`${BASE_URL}/api/telegram/webhook`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { webhook, setup };
