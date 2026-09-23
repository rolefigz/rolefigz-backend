const { Op } = require("sequelize");
const {
  sequelize, Subscription, Plan, CompanyPage, PageLink, MerchOrder, AnalyticsEvent,
} = require("../../../models");
const { calcolaSaldoCrediti } = require("../services/subscriptionService");
const { costruisciUrlLink } = require("../utils/urlSicuro");
const { TIPI_LINK } = require("../models/PageLink");
const { renderPaginaPubblica } = require("../views/renderPaginaPubblica");
const pageCache = require("../utils/pageCache");
const ErroreAzienda = require("../utils/erroreAzienda");

const home = async (req, res) => {
  try {
    const azienda = req.azienda;
    const [subscription, pagina, creditiSaldo] = await Promise.all([
      Subscription.findOne({ where: { company_id: azienda.id }, include: [{ model: Plan }] }),
      CompanyPage.findOne({ where: { company_id: azienda.id } }),
      calcolaSaldoCrediti(azienda.id),
    ]);

    const ordiniInCorso = await MerchOrder.count({
      where: { company_id: azienda.id, status: { [Op.notIn]: ["consegnato", "annullato"] } },
    });

    const inizioMese = new Date();
    inizioMese.setDate(1); inizioMese.setHours(0, 0, 0, 0);
    const eventiMese = await AnalyticsEvent.findAll({
      where: { company_id: azienda.id, createdAt: { [Op.gte]: inizioMese } },
      attributes: ["event_type", [sequelize.fn("COUNT", sequelize.col("id")), "totale"]],
      group: ["event_type"], raw: true,
    });
    const conteggiMese = { page_view: 0, tag_scan: 0, link_click: 0 };
    eventiMese.forEach(e => { conteggiMese[e.event_type] = parseInt(e.totale, 10); });

    const baseUrl = process.env.NFC_PUBLIC_BASE_URL || "";
    res.json({
      azienda: { name: azienda.name, slug: azienda.slug },
      url: `${baseUrl}/${azienda.slug}`,
      subscription,
      paginaPubblicata: pagina?.is_published || false,
      creditiSaldo,
      ordiniInCorso,
      statisticheMese: { visite: conteggiMese.page_view, scansioni: conteggiMese.tag_scan, click: conteggiMese.link_click },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const ottieniPagina = async (req, res) => {
  try {
    const [pagina, links] = await Promise.all([
      CompanyPage.findOne({ where: { company_id: req.azienda.id } }),
      PageLink.findAll({ where: { company_id: req.azienda.id }, order: [["position", "ASC"]] }),
    ]);
    res.json({ pagina, links });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const salvaPagina = async (req, res) => {
  try {
    const { description, hours, seo_title, seo_description, design } = req.body;
    let pagina = await CompanyPage.findOne({ where: { company_id: req.azienda.id } });
    if (!pagina) pagina = await CompanyPage.create({ company_id: req.azienda.id });

    await pagina.update({
      ...(description !== undefined && { description }),
      ...(hours !== undefined && { hours }),
      ...(seo_title !== undefined && { seo_title }),
      ...(seo_description !== undefined && { seo_description }),
      ...(design !== undefined && { design }),
    });

    if (pagina.is_published) pageCache.invalidate(req.azienda.slug);
    res.json(pagina);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const salvaLinks = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const links = req.body.links;
    if (!Array.isArray(links)) throw new ErroreAzienda("Formato non valido", 400);
    if (links.length > 20) throw new ErroreAzienda("Massimo 20 link", 400);

    const preparati = links.map(l => {
      if (!TIPI_LINK.includes(l.type)) throw new ErroreAzienda(`Tipo link non valido: ${l.type}`, 400);
      if (!l.label || !l.label.trim()) throw new ErroreAzienda("Ogni link deve avere un'etichetta", 400);
      return {
        type: l.type,
        label: String(l.label).trim().slice(0, 60),
        url: costruisciUrlLink(l.type, l.url),
        is_visible: l.is_visible !== false,
      };
    });

    await PageLink.destroy({ where: { company_id: req.azienda.id }, transaction: t });
    let pos = 0;
    for (const l of preparati) {
      await PageLink.create({ company_id: req.azienda.id, position: pos++, ...l }, { transaction: t });
    }
    await t.commit();

    const pagina = await CompanyPage.findOne({ where: { company_id: req.azienda.id } });
    if (pagina?.is_published) pageCache.invalidate(req.azienda.slug);

    const nuoviLinks = await PageLink.findAll({ where: { company_id: req.azienda.id }, order: [["position", "ASC"]] });
    res.json(nuoviLinks);
  } catch (err) {
    await t.rollback();
    res.status(err.status || 500).json({ error: err.message });
  }
};

const pubblicaPagina = async (req, res) => {
  try {
    const pagina = await CompanyPage.findOne({ where: { company_id: req.azienda.id } });
    if (!pagina) return res.status(400).json({ error: "Configura prima la tua pagina" });
    const nLinks = await PageLink.count({ where: { company_id: req.azienda.id, is_visible: true } });
    if (!nLinks) return res.status(400).json({ error: "Aggiungi almeno un link visibile prima di pubblicare" });

    await pagina.update({ is_published: true, published_at: new Date() });
    pageCache.invalidate(req.azienda.slug);
    res.json(pagina);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const nascondiPagina = async (req, res) => {
  try {
    const pagina = await CompanyPage.findOne({ where: { company_id: req.azienda.id } });
    if (!pagina) return res.status(404).json({ error: "Pagina non trovata" });
    await pagina.update({ is_published: false });
    pageCache.invalidate(req.azienda.slug);
    res.json(pagina);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const anteprimaPagina = async (req, res) => {
  try {
    const [pagina, links] = await Promise.all([
      CompanyPage.findOne({ where: { company_id: req.azienda.id } }),
      PageLink.findAll({ where: { company_id: req.azienda.id, is_visible: true }, order: [["position", "ASC"]] }),
    ]);
    const html = renderPaginaPubblica(req.azienda, pagina, links, { anteprima: true, accessibile: true });
    res.set("Content-Type", "text/html; charset=utf-8").send(html);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const caricaLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato" });
    const url = req.file.path || req.file.secure_url;

    let pagina = await CompanyPage.findOne({ where: { company_id: req.azienda.id } });
    if (!pagina) pagina = await CompanyPage.create({ company_id: req.azienda.id });
    await pagina.update({ logo_url: url });

    if (pagina.is_published) pageCache.invalidate(req.azienda.slug);
    res.json({ logo_url: url });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = {
  home, ottieniPagina, salvaPagina, salvaLinks, pubblicaPagina, nascondiPagina, anteprimaPagina, caricaLogo,
};
