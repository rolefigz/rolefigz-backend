const { Company } = require("../../../models");
const paginaService = require("../services/paginaService");

// Stesso servizio del pannello cliente, ma l'azienda si sceglie dall'id
// nell'URL invece che dalla sessione — solo qui l'admin puo' operare su
// qualsiasi azienda (protetto da soloAdmin a livello di router).
async function risolviAzienda(req, res) {
  const azienda = await Company.findByPk(req.params.id);
  if (!azienda) { res.status(404).json({ error: "Azienda non trovata" }); return null; }
  return azienda;
}

const ottieniPagina = async (req, res) => {
  try {
    const azienda = await risolviAzienda(req, res);
    if (!azienda) return;
    res.json(await paginaService.ottieniPaginaEModifica(azienda.id));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const salvaPagina = async (req, res) => {
  try {
    const azienda = await risolviAzienda(req, res);
    if (!azienda) return;
    res.json(await paginaService.salvaContenuto(azienda.id, azienda.slug, req.body));
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const salvaLinks = async (req, res) => {
  try {
    const azienda = await risolviAzienda(req, res);
    if (!azienda) return;
    res.json(await paginaService.salvaLinks(azienda.id, azienda.slug, req.body.links));
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const pubblicaPagina = async (req, res) => {
  try {
    const azienda = await risolviAzienda(req, res);
    if (!azienda) return;
    res.json(await paginaService.pubblica(azienda.id, azienda.slug));
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const nascondiPagina = async (req, res) => {
  try {
    const azienda = await risolviAzienda(req, res);
    if (!azienda) return;
    res.json(await paginaService.nascondi(azienda.id, azienda.slug));
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const anteprimaPagina = async (req, res) => {
  try {
    const azienda = await risolviAzienda(req, res);
    if (!azienda) return;
    const html = await paginaService.anteprimaHtml(azienda);
    res.set("Content-Type", "text/html; charset=utf-8").send(html);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const caricaLogo = async (req, res) => {
  try {
    const azienda = await risolviAzienda(req, res);
    if (!azienda) return;
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato" });
    const url = req.file.path || req.file.secure_url;
    await paginaService.caricaLogo(azienda.id, azienda.slug, url);
    res.json({ logo_url: url });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const caricaSfondo = async (req, res) => {
  try {
    const azienda = await risolviAzienda(req, res);
    if (!azienda) return;
    if (!req.file) return res.status(400).json({ error: "Nessun file caricato" });
    const url = req.file.path || req.file.secure_url;
    await paginaService.caricaSfondo(azienda.id, azienda.slug, url);
    res.json({ background_url: url });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const rimuoviSfondo = async (req, res) => {
  try {
    const azienda = await risolviAzienda(req, res);
    if (!azienda) return;
    await paginaService.rimuoviSfondo(azienda.id, azienda.slug);
    res.json({ ok: true });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

module.exports = {
  ottieniPagina, salvaPagina, salvaLinks, pubblicaPagina, nascondiPagina, anteprimaPagina,
  caricaLogo, caricaSfondo, rimuoviSfondo,
};
