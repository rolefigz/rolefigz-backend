// Router di Raccontalo: si monta da solo (server.js) o dentro un altro sito Express.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb, save, reset, newId, savePhoto, UPLOAD_DIR } from "./store.js";
import { parseIcs, fetchIcs } from "./ics.js";
import { analyzeEvents, generatePosts, aiEnabled } from "./ai.js";
import { publish, fetchMetrics, socialStatus } from "./social.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export function createRouter() {
const router = express.Router();
// La dettatura vocale ha bisogno del microfono (il sito ospite può averlo spento)
router.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(self), usb=(), interest-cohort=()");
  // /prova-linkedin → /prova-linkedin/ così i percorsi relativi funzionano
  if (req.method === "GET" && req.url === "/" && !req.originalUrl.split("?")[0].endsWith("/")) {
    return res.redirect(301, req.originalUrl.split("?")[0] + "/");
  }
  next();
});
router.use(express.json({ limit: "40mb" }));
router.use(express.static(path.join(here, "..", "public")));
router.use("/uploads", express.static(UPLOAD_DIR));

const PLATFORMS = ["linkedin", "instagram", "facebook"];
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(400).json({ error: err.message || String(err) });
  });

// ---------- dati demo ----------

function seedDemo() {
  const db = getDb();
  const day = (offset, h = 9) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(h, 0, 0, 0);
    return d.toISOString();
  };
  db.company = {
    name: "Officina Meccanica Bianchi",
    sector: "Lavorazioni meccaniche di precisione conto terzi",
    city: "Piacenza",
    tone: "Diretto, concreto, orgoglioso del lavoro fatto bene",
    about: "Azienda di famiglia dal 1987, 18 persone, torni e centri di lavoro CNC per clienti dell'automotive e dell'agricoltura.",
  };
  const events = [
    { title: "Fiera MECSPE – stand B12", date: day(2), location: "BolognaFiere", description: "Tre giorni in fiera con il nuovo centro di lavoro a 5 assi." },
    { title: "Consegna lotto flange per cliente agricolo", date: day(-1, 15), description: "Primo lotto da 2.000 pezzi, collaudo superato." },
    { title: "Primo giorno di Marco in officina", date: day(0, 8), description: "Nuovo operatore CNC dall'ITIS Marconi." },
    { title: "Riunione interna produzione", date: day(1, 11) },
    { title: "Dentista", date: day(3, 17) },
    { title: "Visita clienti tedeschi in stabilimento", date: day(6, 10), location: "Stabilimento", description: "Audit fornitori e giro reparto." },
  ];
  db.events = events.map((e) => ({ id: newId(), source: "demo", status: "new", ...e }));
  db.posts = [];
  save();
}

if (!getDb().company && !getDb().events.length) seedDemo();

// ---------- API ----------

router.get("/api/state", (req, res) => {
  const db = getDb();
  res.json({
    company: db.company,
    events: [...db.events].sort((a, b) => a.date.localeCompare(b.date)),
    posts: [...db.posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    config: { ai: aiEnabled(), social: socialStatus() },
  });
});

router.put("/api/company", wrap((req, res) => {
  getDb().company = { ...getDb().company, ...req.body };
  save();
  res.json(getDb().company);
}));

router.post("/api/demo/reset", wrap((req, res) => {
  reset();
  seedDemo();
  res.json({ ok: true });
}));

function addEvents(list, source) {
  const db = getDb();
  let added = 0;
  for (const e of list) {
    if (e.uid && db.events.some((x) => x.uid === e.uid)) continue;
    db.events.push({ id: newId(), source, status: "new", ...e });
    added++;
  }
  save();
  return added;
}

router.post("/api/events", wrap((req, res) => {
  const { title, date, description, location } = req.body;
  if (!title || !date) throw new Error("Servono titolo e data");
  addEvents([{ title, date: new Date(date).toISOString(), description, location }], "manuale");
  res.json({ ok: true });
}));

router.post("/api/events/import", wrap(async (req, res) => {
  const { ics, url } = req.body;
  const list = url ? await fetchIcs(url) : parseIcs(ics || "");
  if (!list.length) throw new Error("Nessun evento trovato nel calendario");
  // Solo da una settimana fa a 30 giorni avanti: il resto non serve
  const from = Date.now() - 7 * 864e5, to = Date.now() + 30 * 864e5;
  const recent = list.filter((e) => { const t = Date.parse(e.date); return t >= from && t <= to; });
  res.json({ found: list.length, added: addEvents(recent, url ? "calendario" : "file .ics") });
}));

router.post("/api/events/analyze", wrap(async (req, res) => {
  const db = getDb();
  const todo = db.events.filter((e) => e.status === "new");
  const results = await analyzeEvents(todo, db.company);
  for (const r of results) {
    const e = db.events.find((x) => x.id === r.id);
    if (!e) continue;
    Object.assign(e, { status: r.worth ? "occasione" : "scartato", angle: r.angle, reason: r.reason });
  }
  save();
  res.json({ analyzed: results.length });
}));

router.post("/api/events/:id/status", wrap((req, res) => {
  const e = getDb().events.find((x) => x.id === req.params.id);
  if (!e) throw new Error("Evento non trovato");
  e.status = req.body.status;
  save();
  res.json(e);
}));

router.post("/api/posts", wrap(async (req, res) => {
  const db = getDb();
  const event = db.events.find((x) => x.id === req.body.eventId);
  if (!event) throw new Error("Evento non trovato");
  const photos = (req.body.photos || []).map(savePhoto);
  const notes = req.body.notes || "";
  const gen = await generatePosts({ event, notes, photos, company: db.company });
  const post = {
    id: newId(),
    eventId: event.id,
    title: event.title,
    date: event.date,
    notes,
    photos,
    status: "da_approvare",
    variants: { linkedin: gen.linkedin, instagram: gen.instagram, facebook: gen.facebook },
    tips: { media: gen.media_suggestions, tags: gen.tag_suggestions, structure: gen.structure_tip, time: gen.best_time },
    demo: Boolean(gen.demo),
    published: {},
    metrics: {},
    createdAt: new Date().toISOString(),
  };
  db.posts.push(post);
  event.status = "in_lavorazione";
  save();
  res.json(post);
}));

const findPost = (id) => {
  const p = getDb().posts.find((x) => x.id === id);
  if (!p) throw new Error("Post non trovato");
  return p;
};

router.put("/api/posts/:id", wrap((req, res) => {
  const post = findPost(req.params.id);
  for (const k of PLATFORMS) if (req.body.variants?.[k]) post.variants[k] = { ...post.variants[k], ...req.body.variants[k] };
  save();
  res.json(post);
}));

router.post("/api/posts/:id/regenerate", wrap(async (req, res) => {
  const db = getDb();
  const post = findPost(req.params.id);
  const event = db.events.find((x) => x.id === post.eventId) || { title: post.title, date: post.date };
  const gen = await generatePosts({ event, notes: post.notes, photos: post.photos, company: db.company, instruction: req.body.instruction });
  post.variants = { linkedin: gen.linkedin, instagram: gen.instagram, facebook: gen.facebook };
  post.tips = { media: gen.media_suggestions, tags: gen.tag_suggestions, structure: gen.structure_tip, time: gen.best_time };
  save();
  res.json(post);
}));

router.post("/api/posts/:id/publish", wrap(async (req, res) => {
  const post = findPost(req.params.id);
  const platforms = (req.body.platforms || PLATFORMS).filter((p) => PLATFORMS.includes(p));
  const errors = {};
  for (const p of platforms) {
    try {
      post.published[p] = await publish(p, post.variants[p], post.photos);
    } catch (err) {
      errors[p] = err.message;
    }
  }
  if (Object.keys(post.published).length) post.status = "pubblicato";
  const ev = getDb().events.find((x) => x.id === post.eventId);
  if (ev && post.status === "pubblicato") ev.status = "raccontato";
  save();
  res.json({ post, errors });
}));

router.post("/api/posts/:id/metrics", wrap(async (req, res) => {
  const post = findPost(req.params.id);
  for (const [p, pub] of Object.entries(post.published)) {
    try {
      const m = await fetchMetrics(p, pub);
      if (m) post.metrics[p] = { ...m, at: new Date().toISOString() };
    } catch (err) {
      post.metrics[p] = { errore: err.message };
    }
  }
  save();
  res.json(post);
}));

router.delete("/api/posts/:id", wrap((req, res) => {
  const db = getDb();
  const post = findPost(req.params.id);
  db.posts = db.posts.filter((x) => x !== post);
  const ev = db.events.find((x) => x.id === post.eventId);
  if (ev && ev.status === "in_lavorazione") ev.status = "occasione";
  save();
  res.json({ ok: true });
}));


return router;
}
