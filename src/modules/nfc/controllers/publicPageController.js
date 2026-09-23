const path = require("path");
const { Company, CompanyPage, PageLink, Subscription } = require("../../../models");
const { renderPaginaPubblica } = require("../views/renderPaginaPubblica");
const { registraEvento } = require("../services/analyticsService");
const pageCache = require("../utils/pageCache");

const PAGINA_404 = path.join(__dirname, "..", "..", "..", "..", "public", "404.html");

// La pagina pubblica resta online durante il periodo di grazia dopo la
// scadenza; dopo mostra un messaggio invece del contenuto (mai un errore).
function paginaAccessibile(subscription) {
  if (!subscription) return false;
  if (["cancelled", "suspended"].includes(subscription.status)) return false;
  if (subscription.status === "trial") {
    return !!subscription.trial_ends_at && new Date() <= new Date(subscription.trial_ends_at);
  }
  if (subscription.paid_until) {
    const graceDays = parseInt(process.env.NFC_GRACE_DAYS || "7", 10);
    const limite = new Date(subscription.paid_until);
    limite.setDate(limite.getDate() + graceDays);
    return new Date() <= limite;
  }
  return false;
}

async function mostraPagina(req, res) {
  const slug = String(req.params.slug || "").toLowerCase();

  // La azienda si carica sempre (query leggera, indicizzata su slug) perche'
  // il page_view va registrato anche quando la risposta arriva dalla cache.
  const azienda = await Company.findOne({ where: { slug, status: "active" } });
  if (!azienda) return res.status(404).sendFile(PAGINA_404);

  const cache = pageCache.get(slug);
  if (cache) {
    // in cache solo se pubblicata: se c'e' un hit, e' sicuramente una vista reale
    registraEvento("page_view", { companyId: azienda.id }, req)
      .catch(err => console.error("Errore registrazione page_view:", err.message));
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.send(cache);
  }

  const pagina = await CompanyPage.findOne({ where: { company_id: azienda.id, is_published: true } });
  if (!pagina) return res.status(404).sendFile(PAGINA_404);

  registraEvento("page_view", { companyId: azienda.id }, req)
    .catch(err => console.error("Errore registrazione page_view:", err.message));

  const subscription = await Subscription.findOne({ where: { company_id: azienda.id } });
  const accessibile = paginaAccessibile(subscription);

  const links = accessibile
    ? await PageLink.findAll({ where: { company_id: azienda.id, is_visible: true }, order: [["position", "ASC"]] })
    : [];

  const html = renderPaginaPubblica(azienda, pagina, links, { anteprima: false, accessibile });
  pageCache.set(slug, html);
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

module.exports = { mostraPagina, paginaAccessibile };
