// Client minimo per Cloudflare Workers AI (motore immagine gratuito, di riserva).
// Serve CF_API_TOKEN; CF_ACCOUNT_ID è facoltativo, si trova da solo alla prima chiamata.
//
// Attenzione: il modello disponibile gratis (Stable Diffusion 1.5 img2img) non è pensato per
// mantenere il volto di una persona come fanno Gemini o fal.ai — trasforma lo stile e la posa,
// ma la somiglianza del viso è approssimativa. Va bene come ripiego gratuito, non come prima scelta.
require("dotenv").config();

const MODELLO = "@cf/runwayml/stable-diffusion-v1-5-img2img";
let accountIdCache = null;

function configurato() { return !!process.env.CF_API_TOKEN; }

function intestazioni() {
  return { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, "Content-Type": "application/json" };
}

async function trovaAccountId() {
  if (process.env.CF_ACCOUNT_ID) return process.env.CF_ACCOUNT_ID;
  if (accountIdCache) return accountIdCache;
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts", { headers: intestazioni() });
  const d = await r.json();
  const id = d?.result?.[0]?.id;
  if (!r.ok || !id) throw new Error(`Cloudflare: account non trovato (${d?.errors?.[0]?.message || r.status})`);
  accountIdCache = id;
  return id;
}

// foto: { buffer, mime }. Restituisce { buffer, mime }.
async function generaImmagine(prompt, foto, { strength = 0.6, timeoutMs = 60000 } = {}) {
  const accountId = await trovaAccountId();
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODELLO}`, {
    method: "POST",
    headers: intestazioni(),
    body: JSON.stringify({
      prompt, strength, num_steps: 20,
      image: [...new Uint8Array(foto.buffer)],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const tipo = r.headers.get("content-type") || "";
  if (r.ok && tipo.startsWith("image/")) {
    return { buffer: Buffer.from(await r.arrayBuffer()), mime: tipo.split(";")[0] };
  }
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.success) throw new Error(`Cloudflare ${r.status}: ${(d?.errors?.[0]?.message || "errore sconosciuto").slice(0, 300)}`);
  const base64 = d.result?.image;
  if (!base64) throw new Error("Cloudflare: immagine mancante nella risposta");
  return { buffer: Buffer.from(base64, "base64"), mime: "image/png" };
}

module.exports = { configurato, generaImmagine };
