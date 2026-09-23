const { Tag, Company } = require("../../../models");
const { registraEvento } = require("../services/analyticsService");

// Sempre 302 (mai 301: i browser lo cachano e romperebbe la riassegnazione
// futura di un tag fisico gia' stampato). Tag disattivato/senza azienda o
// azienda sospesa -> verso il landing del modulo, mai un errore.
async function scansionaTag(req, res) {
  const code = String(req.params.code || "").toUpperCase();

  try {
    const tag = await Tag.findOne({ where: { code } });
    if (!tag || !tag.is_active || !tag.company_id) return res.redirect(302, "/nfc");

    const azienda = await Company.findByPk(tag.company_id);
    if (!azienda || azienda.status !== "active") return res.redirect(302, "/nfc");

    registraEvento("tag_scan", { companyId: tag.company_id, tag }, req)
      .catch(err => console.error("Errore registrazione scan:", err.message));

    return res.redirect(302, `/nfc/${azienda.slug}`);
  } catch (err) {
    console.error("Errore scansione tag:", err.message);
    return res.redirect(302, "/nfc");
  }
}

module.exports = { scansionaTag };
