const { Company } = require("../../../models");

// company_id non arriva MAI dal body/query/URL: si deriva sempre dalla sessione.
// Ogni rotta del pannello cliente passa da qui e lavora solo su req.azienda.
async function conAzienda(req, res, next) {
  try {
    const azienda = await Company.findOne({ where: { owner_user_id: req.usuario.id } });
    if (!azienda) return res.status(404).json({ error: "Nessuna azienda associata al tuo account" });
    if (azienda.status === "suspended") return res.status(403).json({ error: "Azienda sospesa. Contatta RoleFigz." });
    req.azienda = azienda;
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
}

module.exports = { conAzienda };
