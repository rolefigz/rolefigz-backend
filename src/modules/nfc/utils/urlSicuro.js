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
  try { parsed = new URL(url); } catch { throw new Error("URL non valido"); }
  if (!SCHEMI_PERMESSI.includes(parsed.protocol)) {
    throw new Error("URL non consentito: solo http, https, tel o mailto");
  }
  return url;
}

function soloCifre(valore) { return String(valore || "").replace(/[^\d]/g, ""); }

// I tipi whatsapp/phone/email si inseriscono come numero/indirizzo, non come URL:
// qui si costruisce lo schema corretto (wa.me/tel:/mailto:) prima di validare.
function costruisciUrlLink(type, valoreGrezzo) {
  const valore = String(valoreGrezzo || "").trim();
  if (!valore) throw new Error("Inserisci un valore per il link");

  if (type === "whatsapp") {
    const cifre = soloCifre(valore);
    if (cifre.length < 8) throw new Error("Numero WhatsApp non valido");
    return validaUrlSicuro(`https://wa.me/${cifre}`);
  }
  if (type === "phone") {
    const pulito = valore.replace(/[^\d+]/g, "");
    if (soloCifre(pulito).length < 6) throw new Error("Numero di telefono non valido");
    return validaUrlSicuro(`tel:${pulito}`);
  }
  if (type === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valore)) throw new Error("Email non valida");
    return validaUrlSicuro(`mailto:${valore}`);
  }
  return validaUrlSicuro(valore);
}

module.exports = { normalizzaUrl, validaUrlSicuro, costruisciUrlLink, SCHEMI_PERMESSI };
