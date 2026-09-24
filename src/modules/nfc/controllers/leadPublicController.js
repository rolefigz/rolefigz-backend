const { Lead } = require("../../../models");
const { sendMessage } = require("../../../utils/telegram");

const creaLead = async (req, res) => {
  try {
    const { company_name, contact_name, email, phone, message } = req.body;

    const lead = await Lead.create({
      company_name: company_name.trim(), contact_name: contact_name.trim(),
      email: email.trim(), phone: phone?.trim() || null, message: message?.trim() || null,
    });

    sendMessage(
      `🆕 <b>Nuova richiesta RoleFigz NFC</b>\n` +
      `Azienda: ${lead.company_name}\n` +
      `Referente: ${lead.contact_name}\n` +
      `Email: ${lead.email}\n` +
      (lead.phone ? `Telefono: ${lead.phone}\n` : "") +
      (lead.message ? `Messaggio: ${lead.message}` : "")
    ).catch(err => console.error("Telegram lead:", err.message));

    res.status(201).json({ ok: true, mensaje: "Richiesta inviata. Ti contatteremo presto." });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { creaLead };
