const { Lead } = require("../../../models");
const { registraAzione } = require("../services/auditLogService");

const listaLeads = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const leads = await Lead.findAll({ where, order: [["createdAt", "DESC"]] });
    res.json(leads);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const cambiaStatoLead = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["nuova", "contattata", "convertita", "scartata"].includes(status)) {
      return res.status(400).json({ error: "Stato non valido" });
    }
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: "Richiesta non trovata" });

    await lead.update({ status });
    await registraAzione({ actorUserId: req.usuario.id, action: "lead_status_changed", details: { leadId: lead.id, status } });
    res.json(lead);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listaLeads, cambiaStatoLead };
