// Archivio semplice su file JSON (data/db.json). Basta per un MVP con un'azienda.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const empty = () => ({ company: null, events: [], posts: [] });

let db = empty();
if (fs.existsSync(DB_FILE)) {
  try {
    db = { ...empty(), ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
  } catch (err) {
    console.error("db.json illeggibile, riparto da zero:", err.message);
  }
}

export function getDb() {
  return db;
}

export function save() {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function reset() {
  db = empty();
  save();
}

export const newId = () => crypto.randomUUID().slice(0, 8);

/** Salva una foto arrivata come data URL e restituisce il nome del file. */
export function savePhoto(dataUrl) {
  const m = /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/.exec(dataUrl || "");
  if (!m) throw new Error("Formato immagine non valido");
  const ext = m[2] === "jpeg" ? "jpg" : m[2];
  const name = `${newId()}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(m[3], "base64"));
  return { file: name, mediaType: m[1] === "image/jpg" ? "image/jpeg" : m[1] };
}

export function readPhotoBase64(file) {
  return fs.readFileSync(path.join(UPLOAD_DIR, file)).toString("base64");
}
