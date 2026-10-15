// Pagina /kit: il cliente carica il logo, vede il suo kit in 3D, scarica il preventivo e prenota il kit campione.
// Il lavoro pesante (analisi del logo, 3D, PDF) lo fa il servizio rolemaker-api; qui: limiti, validazione,
// prenotazioni (tabella richieste_kit), email e pannello admin.
const express   = require("express");
const multer    = require("multer");
const rateLimit = require("express-rate-limit");
const crypto    = require("crypto");
const { Readable } = require("stream");
const cloudinary = require("cloudinary").v2;
const { RichiestaKit } = require("../models");
const { verifyToken, soloAdmin } = require("../middleware/auth");
const api = require("../utils/rolemakerApi");
const { emailKitCliente, emailKitAdmin } = require("../utils/mailer");
const { sendMessage } = require("../utils/telegram");

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
const FILE_ADMIN    = /^(pezzo_[a-z_]+\.glb|piatto\.glb|preventivo\.pdf|kit_[a-z0-9-]+\.3mf|hoja_montaje\.html|aptitud\.json|analisis_ia\.json|logo_original\.png|kit\.json)$/;
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
router.post("/analizza", limiteAnalisi, (req, res, next) => {
  upload.single("logo")(req, res, err => {
    if (!err) return next();
    const msg = err.code === "LIMIT_FILE_SIZE" ? "Il file è troppo grande (massimo 10 MB)." : err.message;
    res.status(err.status || 400).json({ error: msg });
  });
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Carica il logo." });
  try {
    const r = await api.analizzaLogo(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.json({ logo_id: r.logo_id, verdetto: r.verdetto, problemi: r.problemi, motivi: r.motivi,
               consigli: r.consigli, marca: r.marca });
  } catch (err) { rispondiErrore(res, err); }
});

// ── 2. Generazione del kit ──────────────────────────────────────────
router.post("/genera", limiteGenera, async (req, res) => {
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
    });
  } catch (err) { rispondiErrore(res, err); }
});

// ── 3. File pubblici del kit (3D e preventivo) ──────────────────────
router.get("/file/:kitId/:file", async (req, res) => {
  const { kitId, file } = req.params;
  if (!ID_KIT.test(kitId) || !FILE_PUBBLICI.test(file)) return res.status(404).json({ error: "File non trovato" });
  try { await inoltraFile(res, kitId, file, 3600); } catch (err) { rispondiErrore(res, err); }
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
    const r = await RichiestaKit.create({
      numero: k.numero, tipo: "kit", kit_id: b.kit_id, logo_id: k.logo_id, verdetto: k.verdetto,
      ...dati, logo_url, qr_url: k.qr_url, prezzo: k.kit_campione?.prezzo ?? 19.90,
    });
    const preventivo = `${process.env.BASE_URL || "https://www.rolefigz.com"}/api/kit/file/${b.kit_id}/preventivo.pdf`;
    emailKitCliente(r, preventivo).catch(err => console.error("Email kit cliente:", err.message));
    emailKitAdmin(r).catch(err => console.error("Email kit admin:", err.message));
    notifica(r);
    console.log(`✅ Kit campione ${r.numero} — ${r.azienda} (${r.email})`);
    res.json({ success: true, numero: r.numero });
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
  if (STATI.includes(req.query.stato)) where.stato = req.query.stato;
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
