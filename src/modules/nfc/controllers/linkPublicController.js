const { PageLink, Company } = require("../../../models");
const { registraEvento } = require("../services/analyticsService");
const { validaUrlSicuro } = require("../utils/urlSicuro");

// Come /nfc/t/{code}: sempre 302, mai un errore — verso /nfc se il link non
// esiste piu', e' nascosto o l'azienda non e' attiva.
async function vaiAlLink(req, res) {
  const linkId = parseInt(req.params.linkId, 10);
  if (!Number.isInteger(linkId)) return res.redirect(302, "/nfc");

  try {
    const link = await PageLink.findByPk(linkId);
    if (!link || !link.is_visible) return res.redirect(302, "/nfc");

    const azienda = await Company.findByPk(link.company_id);
    if (!azienda || azienda.status !== "active") return res.redirect(302, "/nfc");

    registraEvento("link_click", { companyId: azienda.id, link }, req)
      .catch(err => console.error("Errore registrazione click:", err.message));

    let urlSicuro;
    try { urlSicuro = validaUrlSicuro(link.url); } catch { return res.redirect(302, "/nfc"); }

    return res.redirect(302, urlSicuro);
  } catch (err) {
    console.error("Errore link click:", err.message);
    return res.redirect(302, "/nfc");
  }
}

module.exports = { vaiAlLink };
