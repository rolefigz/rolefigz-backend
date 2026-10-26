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
const { sequelize, RichiestaKit, PaginaDemo, Company } = require("../models");
const { risolviProprietario } = require("../modules/nfc/services/ownerService");
const { verifyToken, soloAdmin } = require("../middleware/auth");
const api = require("../utils/rolemakerApi");
const { emailKitCliente, emailKitAdmin } = require("../utils/mailer");
const { sendMessage } = require("../utils/telegram");
const places = require("../utils/googlePlaces");
const { creaPaginaDemo, creaPaginaProva, aggiornaPaginaProva, ricaricaPaginaProva, slugDaNome, aziendaDaDemo,
        logoSuPiastrella, linkDemo, designDemo, pulisciDesign, pulisciLinks } = require("../utils/paginaDemo");
const uploadImmagine = require("../utils/upload");

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
// e striscia bianca per scrivere a matita. Il preventivo per numero di tavoli lo calcola la pagina e arriva
// nell'email della prenotazione (listino in public/js/prezzi-segnaposti.js).
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
  const tavoli = b.tavoli == null || b.tavoli === "" ? null : Math.floor(Number(b.tavoli));
  if (tavoli !== null && !(tavoli >= 1 && tavoli <= 500)) return res.status(400).json({ error: "Il numero di tavoli va da 1 a 500." });
  try {
    const esistente = await RichiestaKit.findOne({ where: { kit_id: b.kit_id } });
    if (esistente) return res.json({ success: true, numero: esistente.numero, gia_prenotato: true });

    const k = await api.infoKit(b.kit_id);
    await api.conserva("kit", b.kit_id).catch(err => console.error("Conserva kit:", err.message));
    const logo_url = await caricaLogoCloudinary(k.logo_id);
    const segnaposti = k.tipo === "segnaposti";
    if (segnaposti && tavoli === null) return res.status(400).json({ error: "Indica quanti tavoli avete." });
    const r = await RichiestaKit.create({
      numero: k.numero, tipo: "kit", kit_id: b.kit_id, logo_id: k.logo_id, verdetto: k.verdetto,
      ...dati, logo_url, qr_url: k.qr_url, prezzo: k.kit_campione?.prezzo ?? 19.90,
      kit_tipo: segnaposti ? "segnaposti" : "merch", tavoli: segnaposti ? tavoli : null,
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
    const lista = await RichiestaKit.findAll({ where, order: [["createdAt", "DESC"]], limit: 300 });
    // per ogni prenotazione: la sua pagina NFC di prova e, se c'è già, l'azienda del modulo NFC con quello slug
    const demo = await PaginaDemo.findAll({ where: { richiesta_id: { [Op.in]: lista.map(r => r.id) } } });
    const aziende = demo.length
      ? await Company.findAll({ where: { slug: { [Op.in]: demo.map(d => d.slug) } }, attributes: ["id", "slug"] })
      : [];
    res.json(lista.map(r => {
      const d = demo.find(x => x.richiesta_id === r.id);
      const a = d && aziende.find(x => x.slug === d.slug);
      return { ...r.toJSON(), pagina_demo: d ? { slug: d.slug, nome: d.nome } : null, azienda_id: a ? a.id : null };
    }));
  } catch (err) { rispondiErrore(res, err); }
});

// «Crea azienda» (lo decide l'admin): la pagina di prova della prenotazione diventa un'azienda del modulo NFC
// (si modifica da Aziende). proprietario: "admin" (chi clicca, provvisorio) o "cliente" (account con l'email della
// prenotazione: se non esiste si crea, e la password generata si mostra una sola volta all'admin).
router.post("/admin/richieste/:id/azienda", verifyToken, soloAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const r = await RichiestaKit.findByPk(req.params.id, { transaction: t });
    const demo = r && await PaginaDemo.findOne({ where: { richiesta_id: r.id }, transaction: t });
    if (!demo) throw Object.assign(new Error("Questa prenotazione non ha una pagina NFC di prova."), { status: 400 });
    let owner = { id: req.usuario.id }, passwordGenerata = null, email = null;
    if (req.body?.proprietario === "cliente") {
      const p = await risolviProprietario({ owner_nombre: r.nome, owner_email: r.email }, t);
      owner = p.utente; passwordGenerata = p.passwordGenerata; email = p.utente.email;
    }
    const azienda = await aziendaDaDemo(demo, owner.id, req.usuario.id, t);
    await demo.update({ attiva: false }, { transaction: t });            // ora c'è la pagina vera dell'azienda
    await t.commit();
    console.log(`🏢 Pagina di prova /nfc/${demo.slug} → azienda #${azienda.id} (${r.numero})`);
    res.json({ azienda_id: azienda.id, slug: azienda.slug, email, passwordGenerata });
  } catch (err) {
    await t.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    rispondiErrore(res, err);
  }
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

// ── Admin → Profili NFC di prova ────────────────────────────────────
// Pagine /nfc/<slug> create a mano dall'admin con i dati di Google Maps, senza prenotazione del kit (richiesta_id
// vuoto): per mostrare a un locale la sua pagina prima della visita. Solo admin, noindex come le altre di prova.
const uploadLogoProva = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.mimetype);
    cb(ok ? null : Object.assign(new Error("Logo: usa PNG, JPG, WEBP o SVG."), { status: 415 }), ok);
  },
});

function erroreProva(res, err) {
  if (err instanceof places.ErrorePlaces || err.status) return res.status(err.status || 502).json({ error: err.message });
  rispondiErrore(res, err);
}

// ricerca su Google Maps senza il limite orario della pagina pubblica (resta il tetto giornaliero di Places)
router.post("/admin/attivita", verifyToken, soloAdmin, async (req, res) => {
  const nome = testo(req.body?.azienda, 100), citta = testo(req.body?.citta, 80);
  if (nome.length < 2) return res.status(400).json({ error: "Inserisci il nome dell'attività." });
  try {
    const risultati = await places.cercaAttivita(nome, citta);
    res.json({ risultati: risultati.map(r => ({ ...r, slug: slugDaNome(r.nome) })) });
  } catch (err) { erroreProva(res, err); }
});

router.get("/admin/prove", verifyToken, soloAdmin, async (req, res) => {
  try {
    const lista = await PaginaDemo.findAll({ where: { richiesta_id: null }, order: [["createdAt", "DESC"]], limit: 300 });
    const aziende = lista.length
      ? await Company.findAll({ where: { slug: { [Op.in]: lista.map(p => p.slug) } }, attributes: ["id", "slug"] })
      : [];
    res.json(lista.map(p => ({
      id: p.id, slug: p.slug, nome: p.nome, categoria: p.categoria, indirizzo: p.indirizzo, logo_url: p.logo_url,
      valutazione: p.valutazione, recensioni: p.recensioni, scadenza: p.scadenza, createdAt: p.createdAt,
      attiva: p.attiva && new Date(p.scadenza) > new Date(),
      azienda_id: aziende.find(a => a.slug === p.slug)?.id || null,
    })));
  } catch (err) { rispondiErrore(res, err); }
});

function riceviLogoProva(req, res, next) {
  uploadLogoProva.single("logo")(req, res, err => {
    if (!err) return next();
    res.status(err.status || 400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Logo troppo grande (massimo 5 MB)." : err.message });
  });
}

// stessa cartella dei loghi del kit: logoSuPiastrella legge i colori da «kit-logos/kit-<logoId>»
async function caricaLogoProva(buffer, slug) {
  const logoId = `prova-${slug}`;
  const logoUrl = await new Promise((ok, ko) => {
    cloudinary.uploader.upload_stream(
      { folder: "rolefigz/kit-logos", public_id: `kit-${logoId}`, overwrite: true, resource_type: "image" },
      (err, r) => (err ? ko(err) : ok(r.secure_url)),
    ).end(buffer);
  });
  return { logoUrl, logoId };
}

const SLUG_PROVA = /^[a-z0-9-]{2,50}$/;
const URL_WEB = /^https?:\/\/[^\s<>"']+$/i;

async function trovaProva(id) {
  return PaginaDemo.findOne({ where: { id: parseInt(id, 10) || 0, richiesta_id: null } });
}

router.post("/admin/prove", verifyToken, soloAdmin, riceviLogoProva, async (req, res) => {
  const b = req.body || {};
  const slug = testo(b.slug, 50).toLowerCase();
  if (!places.ID_PLACE.test(b.place_id || "")) return res.status(400).json({ error: "Scegli un'attività dalla ricerca." });
  // prima del caricamento del logo, che usa lo slug nel nome del file (creaPaginaProva lo ricontrolla)
  if (!SLUG_PROVA.test(slug)) return res.status(400).json({ error: "Slug non valido: 2–50 caratteri tra a-z, 0-9 e trattino." });
  try {
    const { logoUrl = null, logoId = null } = req.file ? await caricaLogoProva(req.file.buffer, slug) : {};
    const p = await creaPaginaProva({ placeId: b.place_id, slug, logoUrl, logoId, giorni: b.giorni });
    console.log(`🧪 Profilo NFC di prova /nfc/${p.slug} — ${p.nome} (admin #${req.usuario.id})`);
    res.json({ id: p.id, slug: p.slug, nome: p.nome, scadenza: p.scadenza });
  } catch (err) { erroreProva(res, err); }
});

// Tutti i campi di un profilo, per il form di modifica
router.get("/admin/prove/:id", verifyToken, soloAdmin, async (req, res) => {
  try {
    const p = await trovaProva(req.params.id);
    if (!p) return res.status(404).json({ error: "Profilo di prova non trovato." });
    // design: quello che si vede ora (automatico + scelto a mano); links_auto: i bottoni dai dati di Google
    res.json({ ...p.toJSON(), attiva_db: p.attiva, attiva: p.attiva && new Date(p.scadenza) > new Date(),
               design: designDemo(p), links_auto: linkDemo(p) });
  } catch (err) { rispondiErrore(res, err); }
});

// Pagina del profilo (JSON): aspetto, video YouTube, allergeni, descrizione e bottoni.
// links: null = torna ai bottoni automatici dai dati di Google; un elenco = bottoni scelti a mano.
router.put("/admin/prove/:id/pagina", verifyToken, soloAdmin, async (req, res) => {
  const b = req.body || {};
  try {
    const p = await trovaProva(req.params.id);
    if (!p) return res.status(404).json({ error: "Profilo di prova non trovato." });
    const campi = {};
    if (b.design !== undefined) campi.design = pulisciDesign(b.design);
    if (b.descrizione !== undefined) campi.descrizione = String(b.descrizione || "").trim().slice(0, 1000) || null;
    if (b.links !== undefined) campi.links = b.links === null ? null : pulisciLinks(b.links);
    await p.update(campi);
    res.json({ ok: true });
  } catch (err) { erroreProva(res, err); }
});

// Foto di sfondo (come per le aziende: Cloudinary, JPG/PNG/WEBP fino a 5 MB)
router.post("/admin/prove/:id/sfondo", verifyToken, soloAdmin, (req, res, next) => {
  uploadImmagine.single("background")(req, res, err => {
    if (!err) return next();
    res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "Foto troppo grande (massimo 5 MB)." : "Foto: usa JPG, PNG o WEBP." });
  });
}, async (req, res) => {
  try {
    const p = await trovaProva(req.params.id);
    if (!p) return res.status(404).json({ error: "Profilo di prova non trovato." });
    if (!req.file) return res.status(400).json({ error: "Nessuna foto caricata." });
    // con una foto nuova lo sfondo diventa «foto», se non era già così
    await p.update({ background_url: req.file.path || req.file.secure_url,
                     design: { ...(p.design || {}), backgroundType: "foto" } });
    res.json({ background_url: p.background_url });
  } catch (err) { rispondiErrore(res, err); }
});

router.delete("/admin/prove/:id/sfondo", verifyToken, soloAdmin, async (req, res) => {
  try {
    const p = await trovaProva(req.params.id);
    if (!p) return res.status(404).json({ error: "Profilo di prova non trovato." });
    const design = { ...(p.design || {}) };
    if (design.backgroundType === "foto") delete design.backgroundType;          // torna allo sfondo automatico
    await p.update({ background_url: null, design });
    res.json({ ok: true });
  } catch (err) { rispondiErrore(res, err); }
});

// Biglietto da visita NFC pronto da stampare (3MF per la Bambu: la «tarjeta» del kit) con l'URL della pagina da scrivere
// nel chip. Logo: quello caricato ora (meglio SVG/PDF) o l'originale del profilo, senza la «piastrella».
// forza=true: anche con un logo che il metodo automatico boccia (lo decide l'admin guardando il 3D).
router.post("/admin/prove/:id/tarjeta", verifyToken, soloAdmin, caricaLogo, async (req, res) => {
  try {
    const p = await trovaProva(req.params.id);
    if (!p) return res.status(404).json({ error: "Profilo di prova non trovato." });
    let buffer, nome, tipo;
    if (req.file) {
      ({ buffer, originalname: nome, mimetype: tipo } = req.file);
    } else {
      if (!p.logo_url) return res.status(400).json({ error: "Il profilo non ha un logo: caricane uno qui." });
      const originale = p.logo_url.replace(/\/c_pad,w_600,h_600,b_rgb:[0-9A-Fa-f]{6},r_60\//, "/");
      const r = await fetch(originale, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) return res.status(502).json({ error: "Non riesco a leggere il logo del profilo: caricalo qui." });
      buffer = Buffer.from(await r.arrayBuffer());
      tipo = r.headers.get("content-type") || "image/png";
      nome = "logo" + ({ "image/svg+xml": ".svg", "image/jpeg": ".jpg", "image/webp": ".webp" }[tipo] || ".png");
    }
    const logo = await api.analizzaLogo(buffer, nome, tipo);
    const forza = req.body?.forza === "true";
    if (logo.verdetto === "manual" && !forza) {
      return res.status(422).json({ error: "Logo difficile per il metodo automatico.", manual: true,
                                    motivi: logo.motivi || [], consigli: logo.consigli || [] });
    }
    const base = process.env.BASE_URL || "https://www.rolefigz.com";
    const urlChip = `${base}/nfc/${p.slug}`;
    const t = await api.generaTarjeta(logo.logo_id, p.nome, urlChip, forza);
    await api.conserva("kit", t.kit_id).catch(err => console.error("Conserva biglietto NFC:", err.message));
    const tarjeta = {
      kit_id: t.kit_id, numero: t.numero, file_3mf: t.file_3mf, glb: t.pezzi[0]?.glb, misure: t.pezzi[0]?.misure,
      verdetto: t.verdetto, avvisi: (t.avvisi || []).slice(0, 10), url_chip: urlChip, creata: new Date(),
    };
    await p.update({ tarjeta });
    console.log(`🪪 Biglietto NFC ${t.numero} per /nfc/${p.slug} (${t.secondi} s)`);
    res.json(tarjeta);
  } catch (err) { rispondiErrore(res, err); }
});

// Modifica a mano (multipart, per il logo): testi, link, orari, slug, scadenza, attiva/disattiva, logo.
// Un campo vuoto si svuota; un campo non mandato resta com'era.
router.put("/admin/prove/:id", verifyToken, soloAdmin, riceviLogoProva, async (req, res) => {
  const b = req.body || {};
  const campi = {};
  const vuoto = v => v === "" ? null : v;
  try {
    const p = await trovaProva(req.params.id);
    if (!p) return res.status(404).json({ error: "Profilo di prova non trovato." });
    if (b.nome !== undefined) {
      campi.nome = testo(b.nome, 120);
      if (campi.nome.length < 2) return res.status(400).json({ error: "Il nome è obbligatorio." });
    }
    if (b.categoria !== undefined) campi.categoria = vuoto(testo(b.categoria, 120));
    if (b.indirizzo !== undefined) campi.indirizzo = vuoto(testo(b.indirizzo, 250));
    if (b.telefono !== undefined) {
      campi.telefono = vuoto(testo(b.telefono, 40));
      if (campi.telefono && !/^\+?[\d\s./-]{6,}$/.test(campi.telefono)) return res.status(400).json({ error: "Telefono non valido." });
    }
    for (const k of ["sito", "maps_url"]) {
      if (b[k] === undefined) continue;
      campi[k] = vuoto(testo(b[k], 500));
      if (campi[k] && !URL_WEB.test(campi[k])) {
        return res.status(400).json({ error: `${k === "sito" ? "Sito web" : "Link di Google Maps"}: deve iniziare con https://` });
      }
    }
    // una riga per giorno, come le dà Google («lunedì: 9:00–19:00»): così funziona anche «Oggi: …»
    if (b.orari !== undefined) {
      campi.orari = String(b.orari).split(/\r?\n/).map(r => testo(r, 120)).filter(Boolean).slice(0, 7);
    }
    if (b.nascondi_voto === "true") Object.assign(campi, { valutazione: null, recensioni: 0 });
    if (b.slug !== undefined) {
      campi.slug = testo(b.slug, 50).toLowerCase();
      if (!SLUG_PROVA.test(campi.slug)) return res.status(400).json({ error: "Slug non valido: 2–50 caratteri tra a-z, 0-9 e trattino." });
    }
    if (b.giorni !== undefined && b.giorni !== "") {
      const g = parseInt(b.giorni, 10);
      if (!(g >= 1 && g <= 365)) return res.status(400).json({ error: "Giorni: da 1 a 365." });
      campi.scadenza = new Date(Date.now() + g * 24 * 60 * 60 * 1000);
    }
    if (b.attiva !== undefined) campi.attiva = b.attiva === "true";
    if (b.togli_logo === "true") campi.logo_url = null;
    if (req.file) {
      const { logoUrl, logoId } = await caricaLogoProva(req.file.buffer, campi.slug || p.slug);
      campi.logo_url = await logoSuPiastrella(logoUrl, logoId);
    }
    await aggiornaPaginaProva(p, campi);
    res.json({ ...p.toJSON(), attiva_db: p.attiva, attiva: p.attiva && new Date(p.scadenza) > new Date() });
  } catch (err) { erroreProva(res, err); }
});

router.post("/admin/prove/:id/ricarica", verifyToken, soloAdmin, async (req, res) => {
  try {
    const p = await trovaProva(req.params.id);
    if (!p) return res.status(404).json({ error: "Profilo di prova non trovato." });
    await ricaricaPaginaProva(p);
    res.json(p);
  } catch (err) { erroreProva(res, err); }
});

// Solo le pagine di prova create dall'admin: quelle delle prenotazioni si gestiscono da Kit campione
router.delete("/admin/prove/:id", verifyToken, soloAdmin, async (req, res) => {
  try {
    const n = await PaginaDemo.destroy({ where: { id: parseInt(req.params.id, 10) || 0, richiesta_id: null } });
    if (!n) return res.status(404).json({ error: "Profilo di prova non trovato." });
    res.json({ eliminati: n });
  } catch (err) { rispondiErrore(res, err); }
});

// Come «Crea azienda» del kit campione, con l'admin come proprietario (provvisorio: si cambia da Aziende)
router.post("/admin/prove/:id/azienda", verifyToken, soloAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const demo = await PaginaDemo.findOne({ where: { id: parseInt(req.params.id, 10) || 0, richiesta_id: null }, transaction: t });
    if (!demo) throw Object.assign(new Error("Profilo di prova non trovato."), { status: 404 });
    const azienda = await aziendaDaDemo(demo, req.usuario.id, req.usuario.id, t);
    await demo.update({ attiva: false }, { transaction: t });
    await t.commit();
    console.log(`🏢 Profilo di prova /nfc/${demo.slug} → azienda #${azienda.id}`);
    res.json({ azienda_id: azienda.id, slug: azienda.slug });
  } catch (err) {
    await t.rollback();
    if (err.status) return res.status(err.status).json({ error: err.message });
    rispondiErrore(res, err);
  }
});

router.get("/admin/logo/:logoId", verifyToken, soloAdmin, async (req, res) => {
  if (!ID_LOGO.test(req.params.logoId)) return res.status(404).json({ error: "Logo non trovato" });
  try {
    res.setHeader("Content-Type", "image/png");
    res.send(await api.logoPng(req.params.logoId));
  } catch (err) { rispondiErrore(res, err); }
});

module.exports = router;
