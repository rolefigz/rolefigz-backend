const crypto = require("crypto");

// Codici a 6 cifre per verifica email e recupero password.
// crypto.randomInt invece di Math.random: Math.random non è pensato per segreti.
const generaCodice = () => crypto.randomInt(100000, 1000000).toString();

// Un codice a 6 cifre si indovina per forza bruta se si possono fare tentativi
// illimitati (il rate limit per IP non basta: basta cambiare IP). Dopo
// MAX_TENTATIVI errori sullo stesso account il codice si invalida e bisogna
// chiederne uno nuovo. In memoria: il server gira in una sola istanza.
const MAX_TENTATIVI = 5;
const tentativi = new Map();

const chiave = (email) => String(email || "").trim().toLowerCase();

// true se il codice va invalidato (troppi errori)
const registraErrore = (email) => {
  const k = chiave(email);
  const n = (tentativi.get(k) || 0) + 1;
  tentativi.set(k, n);
  if (n >= MAX_TENTATIVI) {
    tentativi.delete(k);
    return true;
  }
  return false;
};

const azzeraTentativi = (email) => tentativi.delete(chiave(email));

const codiceUguale = (atteso, ricevuto) => {
  const a = Buffer.from(String(atteso || ""));
  const b = Buffer.from(String(ricevuto || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { generaCodice, registraErrore, azzeraTentativi, codiceUguale };
