// Router di Raccontalo: si monta da solo (server.js) o dentro un altro sito Express.
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getDb, save, reset, newId, savePhoto, UPLOAD_DIR } from "./store.js";
import { parseIcs, fetchIcs } from "./ics.js";
import { analyzeEvents, generatePosts, aiEnabled, ideasFromTheme, suggestReplies, replyToComments, buildStrategy } from "./ai.js";
import { publish, fetchMetrics, fetchComments, socialStatus } from "./social.js";
import { pushAvailable, publicKey, subscribe, notify, sendReminders } from "./push.js";

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

/** Logo di esempio dell'azienda demo, copiato tra le foto caricate. */
function demoLogo() {
  try {
    fs.copyFileSync(path.join(here, "..", "public", "demo-logo.png"), path.join(UPLOAD_DIR, "demo-logo.png"));
    return "demo-logo.png";
  } catch {
    return null;
  }
}

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
    brand: {
      colors: ["#1f3a5f", "#f2b705", "#ffffff"],
      values: "precisione, famiglia, territorio, lavoro fatto bene",
      avoid: "toni da multinazionale, inglesismi",
      logo: demoLogo(),
    },
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
  db.watch = [
    { id: newId(), name: "MECSPE", platform: "LinkedIn", url: "https://www.linkedin.com/company/mecspe/", note: "Fiera di riferimento" },
    { id: newId(), name: "Confapi Piacenza", platform: "LinkedIn", url: "", note: "Associazione di categoria" },
  ];
  db.strategy = null;
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
    watch: db.watch,
    strategy: db.strategy,
    config: { ai: aiEnabled(), social: socialStatus(), push: pushAvailable(), devices: db.push.subs.length },
  });
});

router.put("/api/company", wrap((req, res) => {
  const old = getDb().company || {};
  const { brand, ...rest } = req.body;
  getDb().company = { ...old, ...rest, brand: { ...old.brand, ...brand } };
  save();
  res.json(getDb().company);
}));

// Logo del brand (PNG con trasparenza consigliato)
router.post("/api/company/logo", wrap((req, res) => {
  const c = (getDb().company ||= {});
  c.brand = { ...c.brand, logo: req.body.dataUrl ? savePhoto(req.body.dataUrl).file : null };
  save();
  res.json(c);
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
  const gen = await generatePosts({ event, notes, photos, company: db.company, strategy: db.strategy });
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
    image: gen.image_idea || null,
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
  const gen = await generatePosts({ event, notes: post.notes, photos: post.photos.filter((p) => !p.generated), company: db.company, strategy: db.strategy, instruction: req.body.instruction });
  post.variants = { linkedin: gen.linkedin, instagram: gen.instagram, facebook: gen.facebook };
  post.tips = { media: gen.media_suggestions, tags: gen.tag_suggestions, structure: gen.structure_tip, time: gen.best_time };
  post.image = gen.image_idea || post.image;
  save();
  res.json(post);
}));

async function doPublish(post, platforms) {
  platforms = (platforms || PLATFORMS).filter((p) => PLATFORMS.includes(p));
  const errors = {};
  for (const p of platforms) {
    try {
      post.published[p] = await publish(p, post.variants[p], post.photos);
    } catch (err) {
      errors[p] = err.message;
    }
  }
  if (Object.keys(post.published).length) {
    post.status = "pubblicato";
    delete post.scheduledAt;
  }
  const ev = getDb().events.find((x) => x.id === post.eventId);
  if (ev && post.status === "pubblicato") ev.status = "raccontato";
  save();
  return errors;
}

router.post("/api/posts/:id/publish", wrap(async (req, res) => {
  const post = findPost(req.params.id);
  const errors = await doPublish(post, req.body.platforms);
  res.json({ post, errors });
}));

// Programmare: il post esce da solo all'ora scelta
router.post("/api/posts/:id/schedule", wrap((req, res) => {
  const post = findPost(req.params.id);
  const at = new Date(req.body.at);
  if (isNaN(at)) throw new Error("Data non valida");
  if (at.getTime() < Date.now() - 60e3) throw new Error("Scegli un momento nel futuro");
  const platforms = (req.body.platforms || PLATFORMS).filter((p) => PLATFORMS.includes(p));
  if (!platforms.length) throw new Error("Scegli almeno un social");
  Object.assign(post, { status: "programmato", scheduledAt: at.toISOString(), scheduledPlatforms: platforms });
  save();
  res.json(post);
}));

router.delete("/api/posts/:id/schedule", wrap((req, res) => {
  const post = findPost(req.params.id);
  if (post.status === "programmato") post.status = "da_approvare";
  delete post.scheduledAt;
  save();
  res.json(post);
}));

// Immagine composta nel browser con logo e colori del brand: va per prima nel post
router.post("/api/posts/:id/image", wrap((req, res) => {
  const post = findPost(req.params.id);
  const photo = { ...savePhoto(req.body.dataUrl), generated: true };
  post.photos = [photo, ...post.photos.filter((p) => !p.generated)];
  save();
  res.json(post);
}));

// Commenti ricevuti + risposte proposte
router.post("/api/posts/:id/comments", wrap(async (req, res) => {
  const post = findPost(req.params.id);
  const auto = Object.entries(post.published).filter(([, pub]) => pub.mode === "automatica");
  if (!auto.length) throw new Error("I commenti si leggono solo dai post pubblicati in automatico. Per gli altri incolla il commento in Ascolto.");
  const comments = [];
  for (const [p, pub] of auto) comments.push(...(await fetchComments(p, pub)));
  const replies = await replyToComments({ comments, post, company: getDb().company });
  post.comments = comments.map((c) => ({ ...c, suggestion: replies.find((r) => r.id === c.id)?.reply || "" }));
  save();
  res.json(post);
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

// ---------- post su un tema proposto ----------

router.post("/api/themes", wrap(async (req, res) => {
  const db = getDb();
  const theme = String(req.body.theme || "").trim();
  const ideas = await ideasFromTheme({ theme, company: db.company, strategy: db.strategy, count: Number(req.body.count) || 3 });
  const date = req.body.date ? new Date(req.body.date).toISOString() : new Date().toISOString();
  for (const i of ideas) {
    db.events.push({ id: newId(), source: "tema", status: "occasione", title: i.title, date, description: `Tema: ${theme}. Serve: ${i.ask}`, angle: i.angle, theme });
  }
  save();
  res.json({ added: ideas.length, ideas });
}));

// ---------- Ascolto: profili influenti e risposte ----------

router.post("/api/watch", wrap((req, res) => {
  const { name, platform, url, note } = req.body;
  if (!name?.trim()) throw new Error("Serve il nome del profilo");
  const item = { id: newId(), name: name.trim(), platform: platform || "LinkedIn", url: url || "", note: note || "" };
  getDb().watch.push(item);
  save();
  res.json(item);
}));

router.delete("/api/watch/:id", wrap((req, res) => {
  const db = getDb();
  db.watch = db.watch.filter((w) => w.id !== req.params.id);
  save();
  res.json({ ok: true });
}));

router.post("/api/replies", wrap(async (req, res) => {
  const { text, kind, platform, author } = req.body;
  res.json({ replies: await suggestReplies({ text, kind, platform, author, company: getDb().company }) });
}));

// ---------- Fase 2: strategia ----------

router.post("/api/strategy", wrap(async (req, res) => {
  const db = getDb();
  const { goals, audience, perWeek, weeks } = req.body;
  const out = await buildStrategy({ goals, audience, perWeek, weeks, company: db.company, events: db.events });
  db.strategy = { ...out, goals, audience, perWeek, weeks, createdAt: new Date().toISOString(), applied: false };
  save();
  res.json(db.strategy);
}));

router.post("/api/strategy/apply", wrap((req, res) => {
  const db = getDb();
  if (!db.strategy?.plan?.length) throw new Error("Prima crea la strategia");
  let added = 0;
  for (const it of db.strategy.plan) {
    const uid = `strategia:${it.date}:${it.title}`;
    if (db.events.some((e) => e.uid === uid)) continue;
    const d = new Date(`${it.date}T10:00:00`);
    if (isNaN(d)) continue;
    db.events.push({ id: newId(), uid, source: "strategia", status: "occasione", title: it.title, date: d.toISOString(), angle: it.angle, description: `Filone: ${it.pillar} · ${it.platform}`, pillar: it.pillar });
    added++;
  }
  db.strategy.applied = true;
  save();
  res.json({ added });
}));

// ---------- notifiche ----------

router.get("/api/push/key", wrap((req, res) => res.json({ key: publicKey() })));
router.post("/api/push/subscribe", wrap(async (req, res) => {
  subscribe(req.body);
  res.json({ ok: true, devices: getDb().push.subs.length });
}));
router.post("/api/push/test", wrap(async (req, res) => {
  const sent = await notify({ title: "Raccontalo è collegato", body: "Ti avviserò quando c'è un'occasione da raccontare." });
  if (!sent) throw new Error("Nessun dispositivo iscritto alle notifiche");
  res.json({ sent });
}));

// ---------- lavori automatici: post programmati e promemoria ----------

async function tick() {
  const db = getDb();
  for (const post of db.posts.filter((p) => p.status === "programmato" && Date.parse(p.scheduledAt) <= Date.now())) {
    const platforms = post.scheduledPlatforms || PLATFORMS;
    const errors = await doPublish(post, platforms);
    const errs = Object.keys(errors);
    const manual = platforms.filter((p) => !socialStatus()[p] && !errors[p]);
    const NAMES = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" };
    await notify({
      title: errs.length ? `Problema con "${post.title}"` : manual.length ? `È ora di pubblicare: ${post.title}` : `Uscito: ${post.title}`,
      body: errs.length
        ? `Non pubblicato su ${errs.map((p) => NAMES[p]).join(", ")}: apri l'app.`
        : manual.length
          ? `Copia il testo dall'app e incollalo su ${manual.map((p) => NAMES[p]).join(", ")}.`
          : "Il post programmato è stato pubblicato.",
    }).catch(() => {});
  }
  await sendReminders().catch((err) => console.error("Promemoria:", err.message));
}
if (!createRouter.timer) {
  createRouter.timer = setInterval(() => tick().catch((err) => console.error("tick:", err.message)), 60e3);
  createRouter.timer.unref?.();
}

return router;
}
