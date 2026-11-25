// Notifiche sul telefono (Web Push): promemoria delle occasioni e post usciti.
// L'app si installa dal browser come app (PWA) e riceve le notifiche anche chiusa.
import { getDb, save } from "./store.js";

let webpush = null;
try {
  const mod = await import("web-push");
  webpush = mod.default ?? mod;
} catch {
  console.warn("web-push non installato: niente notifiche sul telefono");
}

export const pushAvailable = () => Boolean(webpush);

function keys() {
  const db = getDb();
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  if (!db.push.vapid) {
    db.push.vapid = webpush.generateVAPIDKeys();
    save();
  }
  return db.push.vapid;
}

export function publicKey() {
  if (!webpush) throw new Error("Notifiche non disponibili su questo server");
  return keys().publicKey;
}

export function subscribe(sub) {
  if (!sub?.endpoint) throw new Error("Iscrizione non valida");
  const db = getDb();
  db.push.subs = db.push.subs.filter((s) => s.endpoint !== sub.endpoint);
  db.push.subs.push({ ...sub, at: new Date().toISOString() });
  save();
}

/** Manda una notifica a tutti i dispositivi iscritti; toglie quelli scaduti. */
export async function notify({ title, body, url = "./" }) {
  if (!webpush) return 0;
  const db = getDb();
  if (!db.push.subs.length) return 0;
  const k = keys();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://rolefigz.com", k.publicKey, k.privateKey);
  let ok = 0;
  const dead = [];
  for (const s of db.push.subs) {
    try {
      await webpush.sendNotification(s, JSON.stringify({ title, body, url }), { TTL: 6 * 3600 });
      ok++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) dead.push(s.endpoint);
      else console.error("Notifica non inviata:", err.message);
    }
  }
  if (dead.length) {
    db.push.subs = db.push.subs.filter((s) => !dead.includes(s.endpoint));
    save();
  }
  return ok;
}

/** Promemoria: il giorno prima ("ricordati le foto") e subito dopo ("com'è andata?"). */
export async function sendReminders() {
  const db = getDb();
  if (!webpush || !db.push.subs.length) return;
  const now = Date.now();
  for (const e of db.events) {
    if (e.status !== "occasione") continue;
    const t = Date.parse(e.date);
    const sent = (db.push.sent[e.id] ||= {});
    if (!sent.before && t > now && t - now < 24 * 3600e3) {
      sent.before = true;
      save();
      await notify({ title: `Domani: ${e.title}`, body: "Ricordati di fare qualche foto: poi lo raccontiamo insieme.", url: `./?collect=${e.id}` });
    } else if (!sent.after && t < now && now - t < 36 * 3600e3) {
      sent.after = true;
      save();
      await notify({ title: `Com'è andata? ${e.title}`, body: "Mandami un vocale e due foto: il post lo scrivo io.", url: `./?collect=${e.id}` });
    }
  }
}
