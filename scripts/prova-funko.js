// Prova reale del creatore Funko con Gemini, senza toccare il sito:
//   GEMINI_API_KEY=... node scripts/prova-funko.js [foto.jpg] [NOME]
// Senza foto, Gemini ne crea una di una persona inventata (nessuna persona reale).
// Salva in scripts/prova-funko/: la foto usata e la Funko generata dalla stessa rotta del sito.
const fs = require("fs");
const path = require("path");
const express = require("express");
const gemini = require("../src/utils/geminiApi");

const CARTELLA = path.join(__dirname, "prova-funko");
const FOTO_INVENTATA =
  "A realistic smartphone photo of a fictional man in his late twenties standing in a sunny courtyard, full body, " +
  "short messy black hair, thick dark beard, black t-shirt with a small white print, a red and black plaid shirt tied around the waist, " +
  "dark shorts, white sneakers, relaxed smile, natural light. He is not a real or famous person.";

async function main() {
  if (!gemini.configurato()) throw new Error("Manca GEMINI_API_KEY nell'ambiente.");
  fs.mkdirSync(CARTELLA, { recursive: true });
  delete process.env.FAL_KEY;               // in questa prova solo Gemini: immagine + scatola
  delete process.env.CLOUDINARY_CLOUD_NAME; // niente salvataggi esterni

  let foto = process.argv[2] ? { buffer: fs.readFileSync(process.argv[2]), mime: /\.png$/i.test(process.argv[2]) ? "image/png" : "image/jpeg" } : null;
  if (!foto) {
    console.log("· creo una foto di prova (persona inventata)…");
    foto = await gemini.generaImmagine(FOTO_INVENTATA);
    fs.writeFileSync(path.join(CARTELLA, "foto-prova.png"), foto.buffer);
  }

  const app = express();
  app.use("/api/funko", require("../src/routers/funkoRoutes"));
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${srv.address().port}/api/funko`;
  try {
    const dati = new FormData();
    dati.append("foto", new Blob([foto.buffer], { type: foto.mime }), "foto");
    dati.append("tipo", "persona");
    dati.append("nome", process.argv[3] || "DANIEL");
    dati.append("consenso", "si");
    const t0 = Date.now();
    let r = await fetch(`${base}/genera`, { method: "POST", body: dati });
    let d = await r.json();
    if (r.status !== 202) throw new Error(`genera ${r.status}: ${JSON.stringify(d)}`);
    console.log("· Funko in creazione, codice", d.id);
    for (;;) {
      await new Promise(s => setTimeout(s, 2000));
      d = await (await fetch(`${base}/${d.id}`)).json();
      if (d.stato === "pronto" || d.stato === "errore") break;
    }
    if (d.stato === "errore") throw new Error(d.errore);
    const img = Buffer.from(await (await fetch(`${base}/${d.id}/immagine.png`)).arrayBuffer());
    fs.writeFileSync(path.join(CARTELLA, "funko.png"), img);
    console.log(`✓ pronta in ${Math.round((Date.now() - t0) / 1000)} s → ${path.join(CARTELLA, "funko.png")}`);
  } finally {
    srv.close();
  }
}

main().catch(e => { console.error("✗", e.message); process.exit(1); });
