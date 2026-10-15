// Client del servizio rolemaker-api (analisi del logo e generazione del kit per /kit).
// Su Railway il servizio è raggiungibile solo dalla rete privata (nessun dominio pubblico):
//   ROLEMAKER_API_URL=http://rolemaker-api.railway.internal:8000
// ROLEMAKER_API_CHIAVE è facoltativa (header X-Servizio-Chiave, se il servizio la richiede).
require("dotenv").config();

function base() {
  return (process.env.ROLEMAKER_API_URL || "http://localhost:8000").replace(/\/$/, "");
}

function intestazioni(extra = {}) {
  const h = { ...extra };
  if (process.env.ROLEMAKER_API_CHIAVE) h["X-Servizio-Chiave"] = process.env.ROLEMAKER_API_CHIAVE;
  return h;
}

// Errore con lo status e il messaggio (in italiano) del servizio, da girare al cliente
class ErroreServizio extends Error {
  constructor(status, messaggio) { super(messaggio); this.status = status; }
}

async function chiama(percorso, opzioni = {}, timeoutMs = 120000) {
  let r;
  try {
    r = await fetch(base() + percorso, {
      ...opzioni,
      headers: intestazioni(opzioni.headers),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    console.error("rolemaker-api non raggiungibile:", err.message);
    throw new ErroreServizio(503, "Il generatore 3D non è disponibile in questo momento. Riprova tra qualche minuto.");
  }
  if (!r.ok) {
    let msg = "Errore del generatore 3D. Riprova tra qualche minuto.";
    try { const j = await r.json(); if (j && typeof j.detail === "string") msg = j.detail; } catch (_) {}
    throw new ErroreServizio(r.status >= 500 ? 502 : r.status, msg);
  }
  return r;
}

async function analizzaLogo(buffer, nomeFile, mimetype) {
  const form = new FormData();
  form.append("logo", new Blob([buffer], { type: mimetype || "application/octet-stream" }), nomeFile || "logo.png");
  const r = await chiama("/analizza", { method: "POST", body: form }, 120000);  // IA: 2 modelli × 2 tentativi da 20 s
  return r.json();
}

async function generaKit(logoId, azienda) {
  const r = await chiama("/kit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logo_id: logoId, azienda: azienda || "" }),
  }, 240000);
  return r.json();
}

// Response grezza (per inoltrare il file in streaming al browser)
async function fileKit(kitId, nomeFile) {
  return chiama(`/kit/${encodeURIComponent(kitId)}/${encodeURIComponent(nomeFile)}`, {}, 60000);
}

async function infoKit(kitId) {
  return (await fileKit(kitId, "kit.json")).json();
}

async function logoPng(logoId) {
  const r = await chiama(`/logo/${encodeURIComponent(logoId)}`, {}, 30000);
  return Buffer.from(await r.arrayBuffer());
}

async function conserva(tipo, id) {
  const percorso = tipo === "kit" ? `/kit/${encodeURIComponent(id)}/conserva` : `/logo/${encodeURIComponent(id)}/conserva`;
  await chiama(percorso, { method: "POST" }, 30000);
}

module.exports = { analizzaLogo, generaKit, fileKit, infoKit, logoPng, conserva, ErroreServizio };
