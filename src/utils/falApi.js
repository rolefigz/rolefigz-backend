// Client minimo per fal.ai (coda asincrona): invia un lavoro, aspetta che finisca, restituisce il risultato.
// Serve solo FAL_KEY; senza chiave il creatore Funko risponde "non configurato".
require("dotenv").config();

const BASE = "https://queue.fal.run";

function configurato() { return !!process.env.FAL_KEY; }

function intestazioni() {
  return { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" };
}

const attesa = ms => new Promise(r => setTimeout(r, ms));

async function leggiJson(r, cosa) {
  const testo = await r.text();
  let dati = null;
  try { dati = JSON.parse(testo); } catch (_) { /* risposta non JSON */ }
  if (!r.ok) {
    const dettaglio = dati?.detail ? JSON.stringify(dati.detail).slice(0, 300) : testo.slice(0, 300);
    throw Object.assign(new Error(`fal.ai ${cosa}: ${r.status} ${dettaglio}`), { status: r.status, dati });
  }
  return dati;
}

// Invia il lavoro e aspetta il risultato (polling sullo stato). timeoutMs protegge da code bloccate.
async function esegui(modello, input, { timeoutMs = 240000, intervalloMs = 2500 } = {}) {
  const invio = await leggiJson(await fetch(`${BASE}/${modello}`, {
    method: "POST", headers: intestazioni(), body: JSON.stringify(input),
  }), "invio");
  const { status_url: statoUrl, response_url: rispostaUrl } = invio || {};
  if (!statoUrl || !rispostaUrl) throw new Error("fal.ai: risposta di invio inattesa");

  const inizio = Date.now();
  while (Date.now() - inizio < timeoutMs) {
    await attesa(intervalloMs);
    const stato = await leggiJson(await fetch(statoUrl, { headers: intestazioni() }), "stato");
    if (stato?.status === "COMPLETED") {
      if (stato.error) throw new Error(`fal.ai: ${String(stato.error).slice(0, 300)}`);
      return leggiJson(await fetch(rispostaUrl, { headers: intestazioni() }), "risultato");
    }
    if (stato?.status && !["IN_QUEUE", "IN_PROGRESS"].includes(stato.status)) {
      throw new Error(`fal.ai: stato ${stato.status}`);
    }
  }
  throw new Error("fal.ai: tempo scaduto");
}

// I modelli non usano tutti gli stessi nomi di campo: si cerca il primo URL che corrisponde.
function trovaUrl(oggetto, prova) {
  const visti = new Set();
  const cerca = v => {
    if (!v || typeof v !== "object" || visti.has(v)) return null;
    visti.add(v);
    if (typeof v.url === "string" && prova(v.url, v)) return v.url;
    for (const k of Object.keys(v)) {
      const trovato = cerca(v[k]);
      if (trovato) return trovato;
    }
    return null;
  };
  return cerca(oggetto);
}

module.exports = { configurato, esegui, trovaUrl };
