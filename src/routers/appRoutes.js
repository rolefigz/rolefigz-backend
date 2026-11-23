// App personale di Oskar (rolefigz.com/app): visite ai locali, NFC e etichette dal telefono.
// Qui solo i lotti NFC (contare e programmare portachiavi senza contarli due volte) e il QR per le etichette;
// kit 3D, foto e video usano le rotte admin già esistenti di /api/kit.
const express = require("express");
const { Op, UniqueConstraintError } = require("sequelize");
const { LottoNfc, ScansioneNfc, sequelize } = require("../models");
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { generaPng } = require("../modules/nfc/utils/qrGenerator");

const router = express.Router();
router.use(verifyToken, soloAdmin);

const UID = /^[0-9A-F]{2}(:[0-9A-F]{2}){3,15}$/;   // 4–16 byte, come li dà Web NFC (serialNumber)
const URL_OK = /^https?:\/\/[^\s<>"']{3,490}$/i;

function testo(v, max) { return String(v ?? "").trim().slice(0, max); }
function normalizzaUid(v) {
  const u = String(v || "").trim().toUpperCase().replace(/-/g, ":");
  return UID.test(u) ? u : null;
}
function datiLotto(body, parziale = false) {
  const d = {};
  if (!parziale || body.nome !== undefined) {
    d.nome = testo(body.nome, 120);
    if (d.nome.length < 2) throw Object.assign(new Error("Pon un nombre al lote."), { status: 400 });
  }
  if (!parziale || body.url !== undefined) {
    const url = testo(body.url, 500);
    if (url && !URL_OK.test(url)) throw Object.assign(new Error("La URL tiene que empezar por https://"), { status: 400 });
    d.url = url || null;
  }
  if (!parziale || body.obiettivo !== undefined) {
    const n = parseInt(body.obiettivo, 10);
    d.obiettivo = n > 0 && n < 100000 ? n : null;
  }
  if (body.note !== undefined) d.note = testo(body.note, 500) || null;
  if (body.chiuso !== undefined) d.chiuso = !!body.chiuso;
  return d;
}
function errore(res, err) {
  if (!err.status) console.error("App NFC:", err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : "Error del servidor, inténtalo de nuevo." });
}
async function trovaLotto(id) {
  const l = await LottoNfc.findByPk(parseInt(id, 10) || 0);
  if (!l) throw Object.assign(new Error("Lote no encontrado."), { status: 404 });
  return l;
}
const conta = lottoId => ScansioneNfc.count({ where: { lotto_id: lottoId } });

// Registra un chip nel lotto. Idempotente: lo stesso UID nello stesso lotto non conta mai due volte
// (l'indice unico lo garantisce anche con due richieste simultanee). Se era già stato contato e adesso è
// stato scritto, si aggiorna solo lo stato «scritto».
async function registra(lotto, item) {
  const uid = normalizzaUid(item.uid);
  if (!uid) throw Object.assign(new Error("Código de etiqueta no válido."), { status: 400 });
  const scritto = !!item.scritto;
  const url = item.url ? testo(item.url, 500) : null;
  const lettoIl = item.letto_il && !isNaN(Date.parse(item.letto_il)) ? new Date(item.letto_il) : new Date();
  // INSERT diretto: se l'UID c'è già, l'indice unico lo rifiuta (anche con richieste simultanee) e non conta.
  // Niente findOrCreate: apre transazioni annidate che con più letture insieme si bloccano.
  try {
    await ScansioneNfc.create({ lotto_id: lotto.id, uid, scritto, url, letto_il: lettoIl });
    return { uid, nuovo: true };
  } catch (err) {
    if (!(err instanceof UniqueConstraintError)) throw err;
  }
  if (scritto) await ScansioneNfc.update({ scritto: true, ...(url && { url }) }, { where: { lotto_id: lotto.id, uid, scritto: false } });
  return { uid, nuovo: false };
}

router.get("/lotti", async (req, res) => {
  try {
    const lotti = await LottoNfc.findAll({ order: [["chiuso", "ASC"], ["updatedAt", "DESC"]], limit: 200 });
    const conteggi = lotti.length ? await ScansioneNfc.findAll({
      attributes: ["lotto_id", [sequelize.fn("COUNT", sequelize.col("id")), "n"]],
      where: { lotto_id: { [Op.in]: lotti.map(l => l.id) } }, group: ["lotto_id"], raw: true,
    }) : [];
    const n = Object.fromEntries(conteggi.map(c => [c.lotto_id, Number(c.n)]));
    res.json(lotti.map(l => ({ ...l.toJSON(), totale: n[l.id] || 0 })));
  } catch (err) { errore(res, err); }
});

router.post("/lotti", async (req, res) => {
  try {
    const l = await LottoNfc.create(datiLotto(req.body || {}));
    res.status(201).json({ ...l.toJSON(), totale: 0 });
  } catch (err) { errore(res, err); }
});

router.put("/lotti/:id", async (req, res) => {
  try {
    const l = await trovaLotto(req.params.id);
    await l.update(datiLotto(req.body || {}, true));
    res.json({ ...l.toJSON(), totale: await conta(l.id) });
  } catch (err) { errore(res, err); }
});

router.delete("/lotti/:id", async (req, res) => {
  try {
    const l = await trovaLotto(req.params.id);
    await ScansioneNfc.destroy({ where: { lotto_id: l.id } });
    await l.destroy();
    res.json({ ok: true });
  } catch (err) { errore(res, err); }
});

// UID del lotto (per ricostruire il conteggio sul telefono e per l'elenco)
router.get("/lotti/:id/scansioni", async (req, res) => {
  try {
    const l = await trovaLotto(req.params.id);
    const righe = await ScansioneNfc.findAll({ where: { lotto_id: l.id }, order: [["createdAt", "DESC"]],
      attributes: ["uid", "scritto", "url", "letto_il", "createdAt"] });
    res.json({ lotto: { ...l.toJSON(), totale: righe.length }, scansioni: righe });
  } catch (err) { errore(res, err); }
});

// Una scansione. Risponde se è nuova, il totale del lotto e in quali altri lotti era già il chip.
router.post("/lotti/:id/scansioni", async (req, res) => {
  try {
    const l = await trovaLotto(req.params.id);
    const { uid, nuovo } = await registra(l, req.body || {});
    const altri = await ScansioneNfc.findAll({ where: { uid, lotto_id: { [Op.ne]: l.id } },
      include: [{ model: LottoNfc, attributes: ["nome"] }], limit: 3 });
    res.json({ uid, nuovo, totale: await conta(l.id), obiettivo: l.obiettivo,
      altri_lotti: altri.map(a => a.LottoNfc?.nome).filter(Boolean) });
  } catch (err) { errore(res, err); }
});

// Scansioni fatte senza connessione: arrivano tutte insieme quando torna la rete.
router.post("/lotti/:id/scansioni/sincronizza", async (req, res) => {
  try {
    const l = await trovaLotto(req.params.id);
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 1000) : [];
    let nuovi = 0, scartati = 0;
    for (const it of items) {
      try { if ((await registra(l, it)).nuovo) nuovi++; } catch (e) { if (e.status === 400) scartati++; else throw e; }
    }
    res.json({ nuovi, scartati, totale: await conta(l.id) });
  } catch (err) { errore(res, err); }
});

// Deshacer: toglie un chip dal lotto (es. portachiavi difettoso scartato)
router.delete("/lotti/:id/scansioni/:uid", async (req, res) => {
  try {
    const l = await trovaLotto(req.params.id);
    const uid = normalizzaUid(req.params.uid);
    if (!uid) return res.status(400).json({ error: "Código de etiqueta no válido." });
    const tolti = await ScansioneNfc.destroy({ where: { lotto_id: l.id, uid } });
    res.json({ tolti, totale: await conta(l.id) });
  } catch (err) { errore(res, err); }
});

router.get("/lotti/:id/export.csv", async (req, res) => {
  try {
    const l = await trovaLotto(req.params.id);
    const righe = await ScansioneNfc.findAll({ where: { lotto_id: l.id }, order: [["createdAt", "ASC"]] });
    const cella = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = ["n;uid;grabado;url;fecha"].concat(righe.map((r, i) =>
      [i + 1, r.uid, r.scritto ? "sí" : "no", r.url, (r.letto_il || r.createdAt).toISOString()].map(cella).join(";"))).join("\r\n");
    const nome = l.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lote";
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="nfc-${nome}.csv"`);
    res.send("﻿" + csv);
  } catch (err) { errore(res, err); }
});

// QR per le etichette della P21 (PNG nero su bianco)
router.get("/qr.png", async (req, res) => {
  try {
    const t = testo(req.query.t, 500);
    if (!t) return res.status(400).json({ error: "Falta el texto del QR." });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "private, max-age=86400");
    res.send(await generaPng(t));
  } catch (err) { errore(res, err); }
});

module.exports = router;
