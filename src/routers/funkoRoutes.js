// Creatore Funko (/funko): il cliente carica una foto di sé, di un amico o del suo animale e riceve
// la sua Funko Pop. Foto → immagine in stile Funko che conserva i tratti: Gemini se c'è GEMINI_API_KEY (il migliore),
// altrimenti Cloudflare Workers AI se c'è CF_API_TOKEN (gratis ma più approssimativo), altrimenti fal.ai.
// Poi, se c'è FAL_KEY, immagine → modello 3D (GLB). Senza 3D resta immagine + scatola. Niente database: i lavori in corso stanno in memoria, il risultato
// finale (immagine + GLB, non la foto originale) si salva su Cloudinary per poterlo stampare se ordinato.
const express   = require("express");
const multer    = require("multer");
const rateLimit = require("express-rate-limit");
const crypto    = require("crypto");
const { Readable } = require("stream");
const cloudinary = require("cloudinary").v2;
const fal = require("../utils/falApi");
const gemini = require("../utils/geminiApi");
const cf = require("../utils/cloudflareApi");
const { sendMessage } = require("../utils/telegram");

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MODELLO_IMMAGINE = process.env.FUNKO_MODELLO_IMMAGINE || "fal-ai/flux-pro/kontext";
const MODELLO_3D       = process.env.FUNKO_MODELLO_3D || "fal-ai/trellis";
const MAX_GIORNO       = parseInt(process.env.FUNKO_MAX_GIORNO || "60", 10);   // tetto di spesa giornaliero
const CARTELLA         = "rolefigz/funko";
const DURATA_LAVORO    = 3 * 60 * 60 * 1000;
const ID = /^[a-f0-9]{12}$/;

const limite = (max, ore) => rateLimit({
  windowMs: ore * 60 * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, skipFailedRequests: true,
  message: { error: "Hai creato parecchie Funko oggi: riprova più tardi o scrivici su WhatsApp." },
});
const limiteOra    = limite(3, 1);
const limiteGiorno = limite(6, 24);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : Object.assign(new Error("Usa una foto JPG, PNG o WEBP."), { status: 415 }), ok);
  },
});

// ── prompt: lo stile Funko, senza perdere quello che rende riconoscibile la persona (o l'animale) ──
const STILE =
  "Style of a custom RoleFigz collectible, like a Funko Pop that is 3D printed and painted by hand: oversized rounded-square head, " +
  "big round glossy black eyes with a small white highlight, expressive sculpted eyebrows, small nose, chunky sculpted hair with visible locks, " +
  "small body with short arms and legs, simple hands, satin painted finish. The figure stands on a small square red base. " +
  "Front view, the whole figure visible from the top of the head to the base, centered, on a plain white background with soft studio lighting. " +
  "No box, no packaging, no text, no logo";
const PROMPT = {
  persona:
    "Turn the person in this photo into a collectible figure, full body, standing. " +
    "Keep everything that makes them recognizable: the exact hairstyle and hair color, beard or moustache, glasses, skin tone, eyebrows, " +
    "earrings and other accessories, and the same clothes with the same colors, patterns and prints. " + STILE + ", no other people.",
  animale:
    "Turn the animal in this photo into a collectible figure, full body. " +
    "Keep everything that makes it recognizable: species and breed, fur or feather colors and markings in the same places, " +
    "ear shape, tail, collar and accessories. " + STILE + ", no people.",
};

function prompt(tipo, note) {
  const extra = note ? ` Also include these details requested by the customer: ${note}.` : "";
  return PROMPT[tipo] + extra;
}

// Cloudflare Workers AI usa Stable Diffusion 1.5: legge solo le prime ~77 parole del prompt,
// quindi qui va dritto al punto invece delle istruzioni lunghe usate per Gemini e fal.ai.
const PROMPT_BREVE = {
  persona: "funko pop vinyl figure of the person in the photo, same hairstyle, same clothes and colors, big round head, big black eyes, standing on a small red square base, white background, product photo",
  animale: "funko pop vinyl figure of the animal in the photo, same fur colors and markings, big round head, big black eyes, standing on a small red square base, white background, product photo",
};
function promptBreve(tipo, note) {
  return PROMPT_BREVE[tipo] + (note ? `, ${note}` : "");
}

function input3d(urlImmagine) {
  return /hunyuan/i.test(MODELLO_3D)
    ? { input_image_url: urlImmagine, textured_mesh: true }
    : { image_url: urlImmagine, texture_size: 1024 };
}

// ── lavori in memoria ──
const lavori = new Map();
let contatoreGiorno = { giorno: new Date().toDateString(), n: 0 };

setInterval(() => {
  const ora = Date.now();
  for (const [id, l] of lavori) if (ora - l.creato > DURATA_LAVORO) lavori.delete(id);
}, 10 * 60 * 1000).unref();

function pubblico(id, l) {
  return {
    id,
    stato: l.stato,                     // immagine → modello → pronto | errore
    tipo: l.tipo,
    nome: l.nome || "",
    con3d: !!l.con3d,
    immagine: (l.urlImmagine || l.immagineBuf) ? `/api/funko/${id}/immagine.png` : null,
    modello:  l.urlModello  ? `/api/funko/${id}/modello.glb`  : null,
    errore:   l.stato === "errore" ? l.errore : null,
    whatsapp: l.stato === "errore" && !!l.whatsapp,   // servizio esaurito o giù: la Funko la facciamo noi
  };
}

async function salvaSuCloudinary(id, l) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return;
  const sorgente = l.immagineBuf ? `data:${l.immagineMime};base64,${l.immagineBuf.toString("base64")}` : l.urlImmagine;
  const img = await cloudinary.uploader.upload(sorgente, { folder: CARTELLA, public_id: id, overwrite: true, resource_type: "image", format: "png" });
  l.urlImmagine = img.secure_url;
  if (l.urlModello) {
    const glb = await cloudinary.uploader.upload(l.urlModello, { folder: CARTELLA, public_id: `${id}.glb`, overwrite: true, resource_type: "raw" });
    l.urlModello = glb.secure_url;
  }
}

async function eseguiLavoro(id, foto) {
  const l = lavori.get(id);
  try {
    if (gemini.configurato()) {
      const img = await gemini.generaImmagine(prompt(l.tipo, l.note), [foto]);
      l.immagineBuf = img.buffer;
      l.immagineMime = img.mime;
    } else if (cf.configurato()) {
      // motore gratuito di riserva: la somiglianza è approssimativa, non ha il livello di Gemini
      const img = await cf.generaImmagine(promptBreve(l.tipo, l.note), foto);
      l.immagineBuf = img.buffer;
      l.immagineMime = img.mime;
    } else {
      const ris1 = await fal.esegui(MODELLO_IMMAGINE, {
        prompt: prompt(l.tipo, l.note), image_url: `data:${foto.mime};base64,${foto.buffer.toString("base64")}`,
        num_images: 1, output_format: "png", safety_tolerance: "2",
      }, { timeoutMs: 120000 });
      l.urlImmagine = fal.trovaUrl(ris1, u => /^https?:/.test(u));
      if (!l.urlImmagine) throw new Error("immagine mancante nella risposta");
    }

    if (l.con3d) {
      l.stato = "modello";
      const sorgente = l.urlImmagine || `data:${l.immagineMime};base64,${l.immagineBuf.toString("base64")}`;
      const ris2 = await fal.esegui(MODELLO_3D, input3d(sorgente), { timeoutMs: 300000, intervalloMs: 4000 });
      l.urlModello = fal.trovaUrl(ris2, (u, f) => /\.glb(\?|$)/i.test(u) || /gltf-binary/.test(f.content_type || ""));
      if (!l.urlModello) throw new Error("modello 3D mancante nella risposta");
    }

    await salvaSuCloudinary(id, l).catch(e => console.error("Funko Cloudinary:", e.message));
    l.stato = "pronto";
    const link = /^https:/.test(l.urlImmagine || "") ? l.urlImmagine : `https://rolefigz.com/funko?f=${id}`;
    sendMessage(`🧸 <b>Nuova Funko creata</b> (${l.tipo}${l.nome ? ` · ${l.nome}` : ""})\nCodice: <code>${id}</code>\n${link}`).catch(() => {});
  } catch (e) {
    console.error(`Funko ${id}:`, e.message);
    l.stato = "errore";
    // quota finita o servizio non disponibile: si passa a WhatsApp, non è colpa della foto
    l.whatsapp = /\b(429|5\d\d)\b|quota|RESOURCE_EXHAUSTED|UNAVAILABLE|tempo scaduto|timeout|fetch failed/i.test(e.message);
    // il filtro di sicurezza del modello rifiuta alcune foto: messaggio chiaro, senza dettagli tecnici
    l.errore = /nsfw|safety|content|moderat/i.test(e.message)
      ? "Questa foto non può essere usata. Prova con un'altra, ben illuminata e con il viso visibile."
      : "Non siamo riusciti a creare la tua Funko. Riprova tra poco con la stessa foto o con un'altra.";
  }
}

// ── POST /api/funko/genera ── foto (multipart) + tipo + note + consenso
router.post("/genera", limiteOra, limiteGiorno, upload.single("foto"), (req, res) => {
  if (!gemini.configurato() && !cf.configurato() && !fal.configurato()) {
    return res.status(503).json({ demo: true, error: "Il creatore Funko non è ancora attivo." });
  }
  const tipo = req.body.tipo === "animale" ? "animale" : "persona";
  // nome sulla scatola, come le Funko RoleFigz (es. DANIEL)
  const nome = String(req.body.nome || "").toUpperCase().replace(/[^A-ZÀ-Ü0-9 '.-]+/g, "").replace(/\s+/g, " ").trim().slice(0, 14);
  const note = String(req.body.note || "").replace(/[\r\n<>{}]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  if (req.body.consenso !== "si") return res.status(400).json({ error: "Conferma di poter usare questa foto." });
  if (!req.file) return res.status(400).json({ error: "Carica una foto." });

  const oggi = new Date().toDateString();
  if (contatoreGiorno.giorno !== oggi) contatoreGiorno = { giorno: oggi, n: 0 };
  if (contatoreGiorno.n >= MAX_GIORNO) {
    return res.status(429).json({ error: "Oggi il creatore ha lavorato tantissimo: riprova domani o scrivici su WhatsApp." });
  }
  contatoreGiorno.n++;

  const id = crypto.randomBytes(6).toString("hex");
  // il 3D (fal.ai) resta facoltativo; con Cloudflare come unico motore niente 3D, resta immagine + scatola
  const con3d = fal.configurato();
  lavori.set(id, { stato: "immagine", tipo, note, nome, con3d, creato: Date.now() });
  // la foto resta solo in questa chiamata: non si salva da nessuna parte
  eseguiLavoro(id, { buffer: req.file.buffer, mime: req.file.mimetype });
  res.status(202).json({ id });
});

// risultato salvato su Cloudinary (dopo un riavvio o per il link condiviso)
async function daCloudinary(id) {
  if (!process.env.CLOUDINARY_CLOUD_NAME) return null;
  const urlImmagine = cloudinary.url(`${CARTELLA}/${id}`, { resource_type: "image", format: "png", secure: true });
  const urlModello  = cloudinary.url(`${CARTELLA}/${id}.glb`, { resource_type: "raw", secure: true });
  const c = u => fetch(u, { method: "HEAD" }).then(r => r.ok).catch(() => false);
  const [haImmagine, haModello] = await Promise.all([c(urlImmagine), c(urlModello)]);
  if (!haImmagine) return null;
  return { stato: "pronto", tipo: null, urlImmagine, urlModello: haModello ? urlModello : null, con3d: haModello, creato: Date.now() };
}

async function trova(id) {
  if (!ID.test(id)) return null;
  let l = lavori.get(id);
  if (!l) {
    l = await daCloudinary(id);
    if (l) lavori.set(id, l);
  }
  return l;
}

// ── GET /api/funko/:id ── stato del lavoro
router.get("/:id", async (req, res) => {
  const l = await trova(req.params.id);
  if (!l) return res.status(404).json({ error: "Funko non trovata o scaduta." });
  res.set("Cache-Control", "no-store").json(pubblico(req.params.id, l));
});

// ── file: passano dal nostro dominio (niente problemi di CORS nel visore 3D) ──
async function inoltra(res, url, tipo) {
  const r = await fetch(url);
  if (!r.ok || !r.body) return res.status(502).json({ error: "File non disponibile." });
  res.set({ "Content-Type": tipo, "Cache-Control": "public, max-age=86400" });
  Readable.fromWeb(r.body).pipe(res);
}

router.get("/:id/immagine.png", async (req, res) => {
  const l = await trova(req.params.id);
  if (l?.immagineBuf) return res.set({ "Content-Type": l.immagineMime, "Cache-Control": "public, max-age=86400" }).send(l.immagineBuf);
  if (!l?.urlImmagine) return res.status(404).end();
  inoltra(res, l.urlImmagine, "image/png").catch(() => res.status(502).end());
});

router.get("/:id/modello.glb", async (req, res) => {
  const l = await trova(req.params.id);
  if (!l?.urlModello) return res.status(404).end();
  inoltra(res, l.urlModello, "model/gltf-binary").catch(() => res.status(502).end());
});

// errori di upload (formato, dimensione)
router.use((err, req, res, next) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "La foto è troppo pesante (max 8 MB)." });
  res.status(err?.status || 500).json({ error: err?.message || "Errore" });
});

module.exports = router;
