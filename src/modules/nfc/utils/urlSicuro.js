const ErroreAzienda = require("./erroreAzienda");

const SCHEMI_PERMESSI = ["http:", "https:", "tel:", "mailto:"];

function normalizzaUrl(valore) {
  const pulito = String(valore || "").trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(pulito)) return pulito;
  return "https://" + pulito;
}

// Rifiuta javascript:, data:, file: e simili — accetta solo http/https/tel/mailto.
function validaUrlSicuro(valoreGrezzo) {
  const url = normalizzaUrl(valoreGrezzo);
  let parsed;
  try { parsed = new URL(url); } catch { throw new ErroreAzienda("URL non valido", 400); }
  if (!SCHEMI_PERMESSI.includes(parsed.protocol)) {
    throw new ErroreAzienda("URL non consentito: solo http, https, tel o mailto", 400);
  }
  return url;
}

function soloCifre(valore) { return String(valore || "").replace(/[^\d]/g, ""); }

// I tipi whatsapp/phone/email si inseriscono come numero/indirizzo, non come URL:
// qui si costruisce lo schema corretto (wa.me/tel:/mailto:) prima di validare.
function costruisciUrlLink(type, valoreGrezzo) {
  const valore = String(valoreGrezzo || "").trim();
  if (!valore) throw new ErroreAzienda("Inserisci un valore per il link", 400);

  if (type === "whatsapp") {
    const cifre = soloCifre(valore);
    if (cifre.length < 8) throw new ErroreAzienda("Numero WhatsApp non valido", 400);
    return validaUrlSicuro(`https://wa.me/${cifre}`);
  }
  if (type === "phone") {
    const pulito = valore.replace(/[^\d+]/g, "");
    if (soloCifre(pulito).length < 6) throw new ErroreAzienda("Numero di telefono non valido", 400);
    return validaUrlSicuro(`tel:${pulito}`);
  }
  if (type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore)) throw new ErroreAzienda("Email non valida", 400);
    return validaUrlSicuro(`mailto:${valore}`);
  }
  return validaUrlSicuro(valore);
}

const DOMINI_MAPPA_PERMESSI = [
  "www.google.com", "google.com", "maps.google.com",
  "www.openstreetmap.org", "openstreetmap.org",
];

// Accetta sia l'URL nudo sia l'intero <iframe src="..."> che Google Maps /
// OpenStreetMap forniscono con "Incorpora una mappa" — estrae il src.
function estraiSrcIframe(valoreGrezzo) {
  const pulito = String(valoreGrezzo || "").trim();
  const match = pulito.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : pulito;
}

function validaUrlMappa(valoreGrezzo) {
  const url = estraiSrcIframe(valoreGrezzo);
  if (!url) return null;
  let parsed;
  try { parsed = new URL(url); } catch { throw new ErroreAzienda("URL della mappa non valido", 400); }
  if (parsed.protocol !== "https:") throw new ErroreAzienda("La mappa deve usare https", 400);
  if (!DOMINI_MAPPA_PERMESSI.includes(parsed.hostname)) {
    throw new ErroreAzienda("Dominio mappa non consentito: usa Google Maps o OpenStreetMap", 400);
  }
  return parsed.toString();
}

module.exports = {
  normalizzaUrl, validaUrlSicuro, costruisciUrlLink, SCHEMI_PERMESSI,
  validaUrlMappa,
};
