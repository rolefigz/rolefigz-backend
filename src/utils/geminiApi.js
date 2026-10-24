// Client minimo per l'API Gemini (modello immagini): foto + istruzioni → nuova immagine.
// Serve solo GEMINI_API_KEY (https://aistudio.google.com/apikey).
require("dotenv").config();

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function configurato() { return !!process.env.GEMINI_API_KEY; }
function modello() { return process.env.GEMINI_MODELLO_IMMAGINE || "gemini-2.5-flash-image"; }

// immagini: [{ buffer, mime }] (anche nessuna, per creare da zero). Restituisce { buffer, mime }.
async function generaImmagine(prompt, immagini = [], { timeoutMs = 120000 } = {}) {
  const parti = immagini.map(i => ({ inline_data: { mime_type: i.mime, data: i.buffer.toString("base64") } }));
  parti.push({ text: prompt });
  const r = await fetch(`${BASE}/${modello()}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: parti }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const testo = await r.text();
  let dati = null;
  try { dati = JSON.parse(testo); } catch (_) { /* risposta non JSON */ }
  if (!r.ok) throw new Error(`Gemini ${r.status}: ${(dati?.error?.message || testo).slice(0, 300)}`);

  // la risposta può bloccarsi per i filtri di sicurezza: si segnala come tale
  const blocco = dati?.promptFeedback?.blockReason;
  const candidato = dati?.candidates?.[0];
  if (blocco) throw new Error(`Gemini safety: ${blocco}`);
  const parteImg = (candidato?.content?.parts || []).find(p => p.inlineData?.data || p.inline_data?.data);
  if (!parteImg) {
    throw new Error(`Gemini: nessuna immagine (${candidato?.finishReason || "senza motivo"}${/SAFETY|PROHIBITED|IMAGE_SAFETY/.test(candidato?.finishReason || "") ? ", safety" : ""})`);
  }
  const d = parteImg.inlineData || parteImg.inline_data;
  return { buffer: Buffer.from(d.data, "base64"), mime: d.mimeType || d.mime_type || "image/png" };
}

module.exports = { configurato, modello, generaImmagine };
