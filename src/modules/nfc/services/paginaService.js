const { sequelize, CompanyPage, PageLink } = require("../../../models");
const { costruisciUrlLink } = require("../utils/urlSicuro");
const { TIPI_LINK } = require("../models/PageLink");
const { renderPaginaPubblica } = require("../views/renderPaginaPubblica");
const pageCache = require("../utils/pageCache");
const ErroreAzienda = require("../utils/erroreAzienda");

// Logica condivisa per modificare la pagina di un'azienda — usata sia dal
// pannello cliente (scope: la propria azienda) sia dal pannello admin
// (scope: qualsiasi azienda, scelta dall'id nell'URL).

async function ottieniPaginaEModifica(companyId) {
  const [pagina, links] = await Promise.all([
    CompanyPage.findOne({ where: { company_id: companyId } }),
    PageLink.findAll({ where: { company_id: companyId }, order: [["position", "ASC"]] }),
  ]);
  return { pagina, links };
}

async function salvaContenuto(companyId, slug, { description, hours, seo_title, seo_description, design } = {}) {
  let pagina = await CompanyPage.findOne({ where: { company_id: companyId } });
  if (!pagina) pagina = await CompanyPage.create({ company_id: companyId });

  await pagina.update({
    ...(description !== undefined && { description }),
    ...(hours !== undefined && { hours }),
    ...(seo_title !== undefined && { seo_title }),
    ...(seo_description !== undefined && { seo_description }),
    ...(design !== undefined && { design }),
  });

  if (pagina.is_published) pageCache.invalidate(slug);
  return pagina;
}

async function salvaLinks(companyId, slug, links) {
  if (!Array.isArray(links)) throw new ErroreAzienda("Formato non valido", 400);
  if (links.length > 20) throw new ErroreAzienda("Massimo 20 link", 400);

  const preparati = links.map(l => {
    if (!TIPI_LINK.includes(l.type)) throw new ErroreAzienda(`Tipo link non valido: ${l.type}`, 400);
    if (!l.label || !l.label.trim()) throw new ErroreAzienda("Ogni link deve avere un'etichetta", 400);
    return {
      type: l.type, label: String(l.label).trim().slice(0, 60),
      url: costruisciUrlLink(l.type, l.url), is_visible: l.is_visible !== false,
    };
  });

  const t = await sequelize.transaction();
  try {
    await PageLink.destroy({ where: { company_id: companyId }, transaction: t });
    let pos = 0;
    for (const l of preparati) {
      await PageLink.create({ company_id: companyId, position: pos++, ...l }, { transaction: t });
    }
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  const pagina = await CompanyPage.findOne({ where: { company_id: companyId } });
  if (pagina?.is_published) pageCache.invalidate(slug);
  return PageLink.findAll({ where: { company_id: companyId }, order: [["position", "ASC"]] });
}

async function pubblica(companyId, slug) {
  const pagina = await CompanyPage.findOne({ where: { company_id: companyId } });
  if (!pagina) throw new ErroreAzienda("Configura prima la pagina", 400);
  const nLinks = await PageLink.count({ where: { company_id: companyId, is_visible: true } });
  if (!nLinks) throw new ErroreAzienda("Aggiungi almeno un link visibile prima di pubblicare", 400);

  await pagina.update({ is_published: true, published_at: new Date() });
  pageCache.invalidate(slug);
  return pagina;
}

async function nascondi(companyId, slug) {
  const pagina = await CompanyPage.findOne({ where: { company_id: companyId } });
  if (!pagina) throw new ErroreAzienda("Pagina non trovata", 404);
  await pagina.update({ is_published: false });
  pageCache.invalidate(slug);
  return pagina;
}

async function anteprimaHtml(azienda) {
  const [pagina, links] = await Promise.all([
    CompanyPage.findOne({ where: { company_id: azienda.id } }),
    PageLink.findAll({ where: { company_id: azienda.id, is_visible: true }, order: [["position", "ASC"]] }),
  ]);
  return renderPaginaPubblica(azienda, pagina, links, { anteprima: true, accessibile: true });
}

async function caricaLogo(companyId, slug, url) {
  let pagina = await CompanyPage.findOne({ where: { company_id: companyId } });
  if (!pagina) pagina = await CompanyPage.create({ company_id: companyId });
  await pagina.update({ logo_url: url });
  if (pagina.is_published) pageCache.invalidate(slug);
  return pagina;
}

async function caricaSfondo(companyId, slug, url) {
  let pagina = await CompanyPage.findOne({ where: { company_id: companyId } });
  if (!pagina) pagina = await CompanyPage.create({ company_id: companyId });
  await pagina.update({ background_url: url });
  if (pagina.is_published) pageCache.invalidate(slug);
  return pagina;
}

async function rimuoviSfondo(companyId, slug) {
  const pagina = await CompanyPage.findOne({ where: { company_id: companyId } });
  if (!pagina) throw new ErroreAzienda("Pagina non trovata", 404);
  await pagina.update({ background_url: null });
  if (pagina.is_published) pageCache.invalidate(slug);
  return pagina;
}

module.exports = {
  ottieniPaginaEModifica, salvaContenuto, salvaLinks, pubblica, nascondi, anteprimaHtml,
  caricaLogo, caricaSfondo, rimuoviSfondo,
};
