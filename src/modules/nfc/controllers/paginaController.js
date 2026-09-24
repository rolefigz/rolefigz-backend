const { Op } = require("sequelize");
const {
  sequelize, Subscription, Plan, CompanyPage, MerchOrder, AnalyticsEvent,
} = require("../../../models");
const { calcolaSaldoCrediti } = require("../services/subscriptionService");
const paginaService = require("../services/paginaService");

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
    res.json(await paginaService.ottieniPaginaEModifica(req.azienda.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const salvaPagina = async (req, res) => {
  try {
    res.json(await paginaService.salvaContenuto(req.azienda.id, req.azienda.slug, req.body));
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const salvaLinks = async (req, res) => {
  try {
    res.json(await paginaService.salvaLinks(req.azienda.id, req.azienda.slug, req.body.links));
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const pubblicaPagina = async (req, res) => {
  try {
    res.json(await paginaService.pubblica(req.azienda.id, req.azienda.slug));
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const nascondiPagina = async (req, res) => {
  try {
    res.json(await paginaService.nascondi(req.azienda.id, req.azienda.slug));
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const anteprimaPagina = async (req, res) => {
  try {
    const html = await paginaService.anteprimaHtml(req.azienda);
    res.set("Content-Type", "text/html; charset=utf-8").send(html);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const caricaLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato" });
    const url = req.file.path || req.file.secure_url;
    await paginaService.caricaLogo(req.azienda.id, req.azienda.slug, url);
    res.json({ logo_url: url });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const caricaSfondo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato" });
    const url = req.file.path || req.file.secure_url;
    await paginaService.caricaSfondo(req.azienda.id, req.azienda.slug, url);
    res.json({ background_url: url });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const rimuoviSfondo = async (req, res) => {
  try {
    await paginaService.rimuoviSfondo(req.azienda.id, req.azienda.slug);
    res.json({ ok: true });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

module.exports = {
  home, ottieniPagina, salvaPagina, salvaLinks, pubblicaPagina, nascondiPagina, anteprimaPagina,
  caricaLogo, caricaSfondo, rimuoviSfondo,
};
