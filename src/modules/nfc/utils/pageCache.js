// Cache in-memory della pagina pubblica renderizzata, per slug. Invalidata
// esplicitamente quando cambia qualcosa di rilevante (pubblica/nascondi,
// modifica contenuto, pagamento, sospensione...); un TTL basso fa da rete
// di sicurezza se il processo gira in piu' istanze e l'invalidazione locale
// non le raggiunge tutte.
const TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function get(slug) {
  const voce = cache.get(slug);
  if (!voce) return null;
  if (voce.scadeAlle < Date.now()) { cache.delete(slug); return null; }
  return voce.html;
}

function set(slug, html) {
  cache.set(slug, { html, scadeAlle: Date.now() + TTL_MS });
}

function invalidate(slug) {
  if (slug) cache.delete(slug);
}

module.exports = { get, set, invalidate };
