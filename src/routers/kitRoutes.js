// Pagina /kit: il cliente carica il logo, vede il suo kit in 3D, scarica il preventivo e prenota il kit campione.
// Il lavoro pesante (analisi del logo, 3D, PDF) lo fa il servizio rolemaker-api; qui: limiti, validazione,
// prenotazioni (tabella richieste_kit), email e pannello admin.
const express   = require("express");
const multer    = require("multer");
const rateLimit = require("express-rate-limit");
const crypto    = require("crypto");
const { Readable } = require("stream");
const cloudinary = require("cloudinary").v2;
const { Op } = require("sequelize");
const { RichiestaKit, PaginaDemo } = require("../models");
const { verifyToken, soloAdmin } = require("../middleware/auth");
const api = require("../utils/rolemakerApi");
const { emailKitCliente, emailKitAdmin } = require("../utils/mailer");
const { sendMessage } = require("../utils/telegram");
const places = require("../utils/googlePlaces");
const { creaPaginaDemo } = require("../utils/paginaDemo");

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// skipFailedRequests: un errore di validazione (email sbagliata…) non consuma il limite
const limite = (max, ore, messaggio) => rateLimit({
  windowMs: ore * 60 * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, skipFailedRequests: true,
  message: { error: messaggio },
});
const limiteAnalisi    = limite(20, 1, "Hai caricato troppi loghi in poco tempo. Riprova tra un'ora.");
const limiteGenera     = limite(10, 1, "Hai generato troppi kit in poco tempo. Riprova tra un'ora.");
const limitePrenota    = limite(5, 1, "Troppe richieste. Riprova più tardi o scrivici a rolefigz@gmail.com.");
const limiteRevisione  = limite(5, 1, "Troppe richieste. Riprova più tardi o scrivici a rolefigz@gmail.com.");
const limiteAttivita   = limite(15, 1, "Troppe ricerche in poco tempo. Riprova tra un'ora.");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // i vettoriali (SVG, PDF, AI) sono il formato migliore: il servizio li renderizza senza perdite
    const ok = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "application/pdf", "application/postscript",
                "application/illustrator"].includes(file.mimetype) || /\.(png|jpe?g|webp|svg|pdf|ai)$/i.test(file.originalname || "");
    cb(ok ? null : Object.assign(new Error("Formato non supportato. Usa PNG, SVG, PDF, AI, JPG o WEBP."), { status: 415 }), ok);
  },
});

const ID_LOGO = /^[a-f0-9]{24}$/;
const ID_KIT  = /^[a-f0-9]{16}$/;
const FILE_PUBBLICI = /^(pezzo_[a-z_]+\.glb|piatto\.glb|preventivo\.pdf)$/;
const FILE_ADMIN    = /^(pezzo_[a-z_]+\.glb|piatto\.glb|preventivo\.pdf|kit_[a-z0-9-]+\.3mf|segnaposti_[a-z0-9-]+_(placas|basi)\.3mf|hoja_montaje\.html|aptitud\.json|analisis_ia\.json|logo_original\.png|kit\.json)$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function testo(v, max) {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function rispondiErrore(res, err) {
  if (err instanceof api.ErroreServizio) return res.status(err.status).json({ error: err.message });
  console.error("❌ Kit errore:", err.message);
  res.status(500).json({ error: "Errore del server. Riprova tra qualche minuto." });
}

// Inoltra un file del servizio al browser
async function inoltraFile(res, kitId, nomeFile, cacheSecondi) {
  const r = await api.fileKit(kitId, nomeFile);
  res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
  const disp = r.headers.get("content-disposition");
  if (disp) res.setHeader("Content-Disposition", nomeFile.endsWith(".pdf") ? disp.replace(/^attachment/, "inline") : disp);
  if (cacheSecondi) res.setHeader("Cache-Control", `private, max-age=${cacheSecondi}`);
  Readable.fromWeb(r.body).pipe(res);
}

async function caricaLogoCloudinary(logoId) {
  try {
    const png = await api.logoPng(logoId);
    return await new Promise((ok, ko) => {
      cloudinary.uploader.upload_stream(
        { folder: "rolefigz/kit-logos", public_id: `kit-${logoId}`, overwrite: true, resource_type: "image" },
        (err, r) => (err ? ko(err) : ok(r.secure_url)),
      ).end(png);
    });
  } catch (err) {
    console.error("Logo kit su Cloudinary:", err.message);
    return null;
  }
}

function notifica(r, extra = "") {
  const tipo = r.tipo === "kit" ? "🧰 Kit campione prenotato" : "✋ Revisione logo richiesta";
  sendMessage(`<b>${tipo}</b> · ${r.numero}\n${r.azienda} — ${r.nome}\n${r.email}${r.telefono ? " · " + r.telefono : ""}${extra}`)
    .catch(err => console.error("Telegram kit:", err.message));
}

// ── 1. Analisi del logo ─────────────────────────────────────────────
function caricaLogo(req, res, next) {
  upload.single("logo")(req, res, err => {
    if (!err) return next();
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Il file è troppo grande (massimo 10 MB)." : err.message;
    res.status(err.status || 400).json({ error: msg });
  });
}

async function analizza(req, res) {
  if (!req.file) return res.status(400).json({ error: "Carica il logo." });
  try {
    const r = await api.analizzaLogo(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ logo_id: r.logo_id, verdetto: r.verdetto, problemi: r.problemi, motivi: r.motivi,
               consigli: r.consigli, marca: r.marca });
  } catch (err) { rispondiErrore(res, err); }
}
router.post("/analizza", limiteAnalisi, caricaLogo, analizza);

// ── 2. Generazione del kit ──────────────────────────────────────────
async function genera(req, res) {
  const { logo_id } = req.body || {};
  if (!ID_LOGO.test(logo_id || "")) return res.status(400).json({ error: "Logo non valido: caricalo di nuovo." });
  try {
    const k = await api.generaKit(logo_id, testo(req.body.azienda, 80));
    const url = f => `/api/kit/file/${k.kit_id}/${f}`;
    res.json({
      kit_id: k.kit_id, numero: k.numero, cliente: k.cliente, verdetto: k.verdetto,
      pezzi: k.pezzi.map(p => ({ chiave: p.chiave, nome: p.nome, misure: p.misure, glb: url(p.glb) })),
      piatto_glb: url(k.piatto_glb), preventivo_pdf: url(k.preventivo_pdf),
      preventivo: k.preventivo, kit_campione: k.kit_campione,
      controllo: (k.controllo && k.controllo.esito) || "non_fatto",   // controllo qualità con IA
    });
  } catch (err) { rispondiErrore(res, err); }
}
router.post("/genera", limiteGenera, genera);

// ── 2b. Generazione dei segnaposti (pagina /kit/segnaposti) ─────────
// URL del menù facoltativo (vuoto → 4bytemenu.it/demo), testo sotto il QR (max 14 caratteri, come «Scopri il menù»)
// e striscia bianca per scrivere a matita. Ancora senza preventivo: i prezzi li sta rifacendo Oskar.
const URL_MENU = /^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/[^\s<>"']*)?$/i;
async function generaSegnaposti(req, res) {
  const b = req.body || {};
  if (!ID_LOGO.test(b.logo_id || "")) return res.status(400).json({ error: "Logo non valido: caricalo di nuovo." });
  const qr_url = testo(b.qr_url, 300);
  if (qr_url && !URL_MENU.test(qr_url)) return res.status(400).json({ error: "L'indirizzo del menù non è valido." });
  try {
    const k = await api.generaSegnaposti(b.logo_id, testo(b.azienda, 80),
      { qr_url, testo: testo(b.testo, 14), striscia: b.striscia === true });
    const url = f => `/api/kit/file/${k.kit_id}/${f}`;
    res.json({
      kit_id: k.kit_id, numero: k.numero, cliente: k.cliente, verdetto: k.verdetto, qr_url: k.qr_url, testo: k.testo,
      pezzi: k.pezzi.map(p => ({ chiave: p.chiave, nome: p.nome, misure: p.misure, glb: url(p.glb) })),
      piatto_glb: url(k.piatto_glb), tipo: "segnaposti",
    });
  } catch (err) { rispondiErrore(res, err); }
}
router.post("/segnaposti", limiteGenera, generaSegnaposti);

// ── 3. File pubblici del kit (3D e preventivo) ──────────────────────
router.get("/file/:kitId/:file", async (req, res) => {
  const { kitId, file } = req.params;
  if (!ID_KIT.test(kitId) || !FILE_PUBBLICI.test(file)) return res.status(404).json({ error: "File non trovato" });
  try { await inoltraFile(res, kitId, file, 3600); } catch (err) { rispondiErrore(res, err); }
});

// ── 3b. Ricerca dell'attività su Google Maps (per la pagina NFC di prova) ──
router.post("/attivita", limiteAttivita, async (req, res) => {
  const nome = testo(req.body?.azienda, 100), citta = testo(req.body?.citta, 80);
  if (nome.length < 2 || citta.length < 2) return res.status(400).json({ error: "Inserisci azienda e città." });
  try {
    res.json({ risultati: await places.cercaAttivita(nome, citta) });
  } catch (err) {
    if (err instanceof places.ErrorePlaces) return res.status(err.status).json({ error: err.message });
    rispondiErrore(res, err);
  }
});

// ── 4. Prenotazione del kit campione ────────────────────────────────
router.post("/prenota", limitePrenota, async (req, res) => {
  const b = req.body || {};
  const dati = {
    nome: testo(b.nome, 100), azienda: testo(b.azienda, 100), email: testo(b.email, 120).toLowerCase(),
    telefono: testo(b.telefono, 40) || null, note: String(b.note ?? "").trim().slice(0, 1000) || null,
  };
  if (!ID_KIT.test(b.kit_id || "")) return res.status(400).json({ error: "Kit non valido: generalo di nuovo." });
  if (!dati.nome || !dati.azienda) return res.status(400).json({ error: "Inserisci nome e azienda." });
  if (!EMAIL.test(dati.email)) return res.status(400).json({ error: "Email non valida." });
  if (b.consenso !== true) return res.status(400).json({ error: "Devi accettare le condizioni per prenotare." });
  try {
    const esistente = await RichiestaKit.findOne({ where: { kit_id: b.kit_id } });
    if (esistente) return res.json({ success: true, numero: esistente.numero, gia_prenotato: true });

    const k = await api.infoKit(b.kit_id);
    await api.conserva("kit", b.kit_id).catch(err => console.error("Conserva kit:", err.message));
    const logo_url = await caricaLogoCloudinary(k.logo_id);
    const segnaposti = k.tipo === "segnaposti";
    const r = await RichiestaKit.create({
      numero: k.numero, tipo: "kit", kit_id: b.kit_id, logo_id: k.logo_id, verdetto: k.verdetto,
      ...dati, logo_url, qr_url: k.qr_url, prezzo: k.kit_campione?.prezzo ?? 19.90,
      kit_tipo: segnaposti ? "segnaposti" : "merch",
    });
    // pagina NFC di prova con i dati di Google Maps (se il cliente ha scelto la sua attività): se Google non
    // risponde la prenotazione va avanti lo stesso
    let demo = null;
    if (!segnaposti && places.ID_PLACE.test(b.place_id || "")) {
      demo = await creaPaginaDemo(r, b.place_id).catch(err => { console.error("Pagina demo:", err.message); return null; });
    }
    const base = process.env.BASE_URL || "https://www.rolefigz.com";
    const pagina_demo = demo ? `${base}/nfc/${demo.slug}` : null;
    if (pagina_demo) {
      r.note_admin = `Pagina NFC di prova: ${pagina_demo} (scade il ${new Date(demo.scadenza).toLocaleDateString("it-IT")})`;
      await r.save();
    }
    const preventivo = segnaposti ? null : `${base}/api/kit/file/${b.kit_id}/preventivo.pdf`;
    emailKitCliente(r, preventivo, pagina_demo).catch(err => console.error("Email kit cliente:", err.message));
    emailKitAdmin(r).catch(err => console.error("Email kit admin:", err.message));
    notifica(r, pagina_demo ? `\n🌐 ${pagina_demo}` : "");
    console.log(`✅ Kit campione ${r.numero} — ${r.azienda} (${r.email})${pagina_demo ? " · " + pagina_demo : ""}`);
    res.json({ success: true, numero: r.numero, pagina_demo });
  } catch (err) { rispondiErrore(res, err); }
});

// ── 5. Revisione manuale (logo non adatto al metodo automatico) ────
router.post("/revisione", limiteRevisione, async (req, res) => {
  const b = req.body || {};
  const dati = {
    nome: testo(b.nome, 100), azienda: testo(b.azienda, 100), email: testo(b.email, 120).toLowerCase(),
    telefono: testo(b.telefono, 40) || null, note: String(b.note ?? "").trim().slice(0, 1000) || null,
  };
  if (!ID_LOGO.test(b.logo_id || "")) return res.status(400).json({ error: "Logo non valido: caricalo di nuovo." });
  if (!dati.nome || !dati.azienda) return res.status(400).json({ error: "Inserisci nome e azienda." });
  if (!EMAIL.test(dati.email)) return res.status(400).json({ error: "Email non valida." });
  if (b.consenso !== true) return res.status(400).json({ error: "Devi accettare l'informativa per inviare la richiesta." });
  try {
    const esistente = await RichiestaKit.findOne({ where: { logo_id: b.logo_id, email: dati.email, tipo: "revisione" } });
    if (esistente) return res.json({ success: true, numero: esistente.numero, gia_inviata: true });
    await api.conserva("logo", b.logo_id).catch(err => console.error("Conserva logo:", err.message));
    const logo_url = await caricaLogoCloudinary(b.logo_id);
    const oggi = new Date();
    const numero = `R${String(oggi.getFullYear()).slice(2)}${String(oggi.getMonth() + 1).padStart(2, "0")}${String(oggi.getDate()).padStart(2, "0")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const r = await RichiestaKit.create({
      numero, tipo: "revisione", logo_id: b.logo_id, verdetto: "manual", ...dati, logo_url, prezzo: 0,
    });
    emailKitCliente(r).catch(err => console.error("Email revisione cliente:", err.message));
    emailKitAdmin(r).catch(err => console.error("Email revisione admin:", err.message));
    notifica(r);
    res.json({ success: true, numero: r.numero });
  } catch (err) { rispondiErrore(res, err); }
});

// ── Admin ───────────────────────────────────────────────────────────
const STATI = ["prenotato", "in_stampa", "pronto", "ritirato", "annullato"];

router.get("/admin/richieste", verifyToken, soloAdmin, async (req, res) => {
  const where = {};
  // gli annullati non compaiono nell'elenco normale: solo scegliendo il filtro ANNULLATO (per eliminarli)
  if (STATI.includes(req.query.stato)) where.stato = req.query.stato;
  else where.stato = { [Op.ne]: "annullato" };
  if (["kit", "revisione"].includes(req.query.tipo)) where.tipo = req.query.tipo;
  try {
    res.json(await RichiestaKit.findAll({ where, order: [["createdAt", "DESC"]], limit: 300 }));
  } catch (err) { rispondiErrore(res, err); }
});

router.patch("/admin/richieste/:id", verifyToken, soloAdmin, async (req, res) => {
  try {
    const r = await RichiestaKit.findByPk(req.params.id);
    if (!r) return res.status(404).json({ error: "Richiesta non trovata" });
    const { stato, note_admin } = req.body || {};
    if (stato !== undefined) {
      if (!STATI.includes(stato)) return res.status(400).json({ error: "Stato non valido" });
      r.stato = stato;
      // al ritiro parte lo sconto: 60 giorni per un primo ordine da almeno 100 €
      if (stato === "ritirato" && r.tipo === "kit" && !r.data_ritiro) {
        r.data_ritiro = new Date();
        r.scadenza_sconto = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
        r.codice_sconto = "KIT-" + crypto.randomBytes(3).toString("hex").toUpperCase();
      }
    }
    if (note_admin !== undefined) r.note_admin = String(note_admin).slice(0, 2000);
    await r.save();
    res.json(r);
  } catch (err) { rispondiErrore(res, err); }
});

// Eliminazione definitiva (dal pannello, la decide l'admin): solo richieste ANNULLATE. Si cancella anche la loro
// pagina NFC di prova. :id = un numero, oppure «annullati» per tutte le annullate.
router.delete("/admin/richieste/:id", verifyToken, soloAdmin, async (req, res) => {
  try {
    const where = req.params.id === "annullati"
      ? { stato: "annullato" }
      : { id: parseInt(req.params.id, 10) || 0, stato: "annullato" };
    const righe = await RichiestaKit.findAll({ where, attributes: ["id", "numero"] });
    if (!righe.length) {
      return res.status(req.params.id === "annullati" ? 200 : 400)
        .json(req.params.id === "annullati" ? { eliminati: 0 } : { error: "Si possono eliminare solo le richieste annullate." });
    }
    const ids = righe.map(r => r.id);
    const pagine = await PaginaDemo.destroy({ where: { richiesta_id: { [Op.in]: ids } } });
    const eliminati = await RichiestaKit.destroy({ where: { id: { [Op.in]: ids }, stato: "annullato" } });
    console.log(`🗑️ Kit campione eliminati: ${righe.map(r => r.numero).join(", ")} (pagine NFC di prova: ${pagine})`);
    res.json({ eliminati, pagine_demo: pagine });
  } catch (err) { rispondiErrore(res, err); }
});

// Pannello admin → Video kit: stessi passi della pagina pubblica ma senza limiti orari (kit per i locali da visitare)
router.post("/admin/analizza", verifyToken, soloAdmin, caricaLogo, analizza);
router.post("/admin/genera", verifyToken, soloAdmin, genera);
router.post("/admin/segnaposti", verifyToken, soloAdmin, generaSegnaposti);

router.get("/admin/file/:kitId/:file", verifyToken, soloAdmin, async (req, res) => {
  const { kitId, file } = req.params;
  if (!ID_KIT.test(kitId) || !FILE_ADMIN.test(file)) return res.status(404).json({ error: "File non trovato" });
  try { await inoltraFile(res, kitId, file, 0); } catch (err) { rispondiErrore(res, err); }
});

router.get("/admin/logo/:logoId", verifyToken, soloAdmin, async (req, res) => {
  if (!ID_LOGO.test(req.params.logoId)) return res.status(404).json({ error: "Logo non trovato" });
  try {
    res.setHeader("Content-Type", "image/png");
    res.send(await api.logoPng(req.params.logoId));
  } catch (err) { rispondiErrore(res, err); }
});

module.exports = router;
