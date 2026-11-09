const { sequelize, Locandina, IscrizioneLocandina, CompanyPage } = require("../../../models");
const pageCache = require("../utils/pageCache");
const { validaUrlSicuro } = require("../utils/urlSicuro");

// Pannello cliente: CRUD delle locandine dell'azienda in sessione (req.azienda).
// I campi arrivano da un form multipart (immagine opzionale), quindi sono stringhe.

function testo(v, max) {
  const t = String(v ?? "").trim();
  return t ? t.slice(0, max) : null;
}
function booleano(v) { return v === true || v === "true" || v === "1" || v === "on"; }
function data(v, campo) {
  if (v === undefined || v === null || String(v).trim() === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) { const e = new Error(`Data non valida: ${campo}`); e.status = 400; throw e; }
  return d;
}

function leggiCampi(body) {
  const campi = {
    titolo:         testo(body.titolo, 120),
    descrizione:    testo(body.descrizione, 1000),
    luogo:          testo(body.luogo, 200),
    inizio_evento:  data(body.inizio_evento, "inizio evento"),
    fine_evento:    data(body.fine_evento, "fine evento"),
    mostra_dal:     data(body.mostra_dal, "mostra dal"),
    mostra_fino:    data(body.mostra_fino, "mostra fino al"),
    raccogli_email: booleano(body.raccogli_email),
    testo_email:    testo(body.testo_email, 120),
    link_label:     testo(body.link_label, 60),
    link_url:       null,
    attiva:         body.attiva === undefined ? true : booleano(body.attiva),
  };
  const errore = (msg) => { const e = new Error(msg); e.status = 400; return e; };
  if (!campi.titolo) throw errore("Il titolo e' obbligatorio");
  if (campi.fine_evento && !campi.inizio_evento) throw errore("Indica anche l'inizio dell'evento");
  if (campi.fine_evento && campi.fine_evento < campi.inizio_evento) throw errore("La fine dell'evento e' prima dell'inizio");
  if (campi.mostra_fino && campi.mostra_dal && campi.mostra_fino < campi.mostra_dal) throw errore("Il periodo di visualizzazione non e' valido");
  const url = testo(body.link_url, 500);
  if (url) {
    try { campi.link_url = validaUrlSicuro(url); } catch { throw errore("Link non valido"); }
    if (!campi.link_url) throw errore("Link non valido");
  }
  return campi;
}

async function invalidaPagina(azienda) {
  const pagina = await CompanyPage.findOne({ where: { company_id: azienda.id }, attributes: ["is_published"] });
  if (pagina?.is_published) pageCache.invalidate(azienda.slug);
}

const lista = async (req, res) => {
  try {
    const locandine = await Locandina.findAll({
      where: { company_id: req.azienda.id },
      order: [["updatedAt", "DESC"]],
    });
    const conteggi = await IscrizioneLocandina.findAll({
      where: { company_id: req.azienda.id },
      attributes: ["locandina_id", [sequelize.fn("COUNT", sequelize.col("id")), "totale"]],
      group: ["locandina_id"], raw: true,
    });
    const perId = Object.fromEntries(conteggi.map(c => [c.locandina_id, parseInt(c.totale, 10)]));
    res.json(locandine.map(l => ({ ...l.toJSON(), iscritti: perId[l.id] || 0 })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const crea = async (req, res) => {
  try {
    const campi = leggiCampi(req.body);
    const immagine = req.file ? (req.file.path || req.file.secure_url) : null;
    if (!immagine) return res.status(400).json({ error: "Carica l'immagine della locandina" });
    const l = await Locandina.create({ ...campi, immagine_url: immagine, company_id: req.azienda.id });
    await invalidaPagina(req.azienda);
    res.status(201).json(l);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const aggiorna = async (req, res) => {
  try {
    const l = await Locandina.findOne({ where: { id: req.params.id, company_id: req.azienda.id } });
    if (!l) return res.status(404).json({ error: "Locandina non trovata" });
    const campi = leggiCampi(req.body);
    if (req.file) campi.immagine_url = req.file.path || req.file.secure_url;
    await l.update(campi);
    await invalidaPagina(req.azienda);
    res.json(l);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const elimina = async (req, res) => {
  try {
    const l = await Locandina.findOne({ where: { id: req.params.id, company_id: req.azienda.id } });
    if (!l) return res.status(404).json({ error: "Locandina non trovata" });
    await IscrizioneLocandina.destroy({ where: { locandina_id: l.id, company_id: req.azienda.id } });
    await l.destroy();
    await invalidaPagina(req.azienda);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

function cellaCsv(v) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // niente formule quando si apre in Excel
  return `"${s.replace(/"/g, '""')}"`;
}

const iscrittiCsv = async (req, res) => {
  try {
    const l = await Locandina.findOne({ where: { id: req.params.id, company_id: req.azienda.id } });
    if (!l) return res.status(404).json({ error: "Locandina non trovata" });
    const iscritti = await IscrizioneLocandina.findAll({
      where: { locandina_id: l.id, company_id: req.azienda.id }, order: [["createdAt", "ASC"]],
    });
    const righe = [["Email", "Nome", "Data iscrizione", "Consenso"].map(cellaCsv).join(";")]
      .concat(iscritti.map(i => [
        i.email, i.nome || "", new Date(i.createdAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
        new Date(i.consenso_at).toLocaleString("it-IT", { timeZone: "Europe/Rome" }),
      ].map(cellaCsv).join(";")));
    const nomeFile = `iscritti-${String(l.titolo).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || l.id}.csv`;
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="${nomeFile}"`);
    res.send("﻿" + righe.join("\r\n"));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { lista, crea, aggiorna, elimina, iscrittiCsv, leggiCampi };
