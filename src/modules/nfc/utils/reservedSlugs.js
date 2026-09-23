// Slug non assegnabili alle aziende: rotte del modulo NFC + rotte gia'
// esistenti a livello radice del sito, per evitare collisioni con /nfc/{slug}.
const SLUG_RISERVATI = [
  "t", "go", "prezzi", "come-funziona", "faq", "admin", "dashboard",
  "login", "register", "api", "shop", "demo", "contatti", "privacy", "termini",
  "blog", "checkout", "producto", "uploads", "css", "js", "assets",
  "index.html", "404", "gadget3d", "llavero3d", "rolefigz",
];

module.exports = { SLUG_RISERVATI };
