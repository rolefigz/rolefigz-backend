function escapeHtml(valore) {
  return String(valore || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function centesimiAEuro(c) {
  return (parseInt(c || 0, 10) / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cardPiano(piano, inEvidenza) {
  const features = Array.isArray(piano.features) ? piano.features : [];
  return `
    <div class="piano-card${inEvidenza ? " piano-card--evidenza" : ""}">
      ${inEvidenza ? '<div class="piano-badge">PIÙ SCELTO</div>' : ""}
      <div class="piano-nome">${escapeHtml(piano.name)}</div>
      <div class="piano-prezzo">€${centesimiAEuro(piano.monthly_price_cents)}<span>/mese</span></div>
      <div class="piano-crediti">${piano.monthly_credits} crediti merchandising ogni mese</div>
      ${features.length ? `<ul class="piano-features">${features.map(f => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : ""}
      <a class="piano-cta" href="#contatti">Richiedi informazioni</a>
    </div>`;
}

function renderLandingNfc(piani, opts = {}) {
  const telefono = process.env.SHOP_TELEFONO || "";
  const telefonoWa = telefono.replace(/[^\d]/g, "");
  const email = process.env.SHOP_EMAIL || "info@rolefigz.com";
  const nomeAzienda = process.env.SHOP_NOME || "RoleFigz";

  const pianiOrdinati = [...piani].sort((a, b) => (a.position || 0) - (b.position || 0));
  const pianoEvidenza = pianiOrdinati[Math.min(1, pianiOrdinati.length - 1)];

  const faq = [
    ["Devo pagare con carta o abbonamento automatico?", "No. RoleFigz NFC si paga solo in contanti, di persona. Nessun addebito automatico, nessuna carta salvata da nessuna parte."],
    ["Cosa succede se disdico?", "Nessun vincolo di permanenza. I crediti gia' accumulati restano utilizzabili fino alla fine del periodo gia' pagato, poi scadono."],
    ["Posso provare prima di abbonarmi?", "Si', c'e' una prova gratuita fino a 7 giorni con un gadget consegnato a mano, per vedere come funziona la tua pagina."],
    ["Se cambio Instagram o il numero WhatsApp devo ristampare i tag?", "No. I tag NFC e i QR puntano sempre alla tua pagina: aggiorni i link dal pannello e sono aggiornati ovunque, senza ristampare nulla."],
    ["Che statistiche vedo?", "Visite alla pagina, scansioni per ogni singolo tag fisico e click sui link, raccolte in modo anonimo: nessun cookie, nessun dato personale salvato."],
  ];

  return `<!DOCTYPE html><html lang="it"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>RoleFigz NFC — La tua pagina, i tuoi tag, il tuo merchandising</title>
<meta name="description" content="Pagina web per la tua attivita', tag NFC e QR fisici, e merchandising personalizzato ogni mese. Un abbonamento, gestito di persona, senza carte ne' vincoli.">
<link rel="icon" type="image/png" href="/assets/LogoSfondoNero.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org", "@graph": [
    { "@type": "Service", name: "RoleFigz NFC", provider: { "@type": "Organization", name: nomeAzienda },
      description: "Pagina web, tag NFC/QR e merchandising fisico in abbonamento per attivita' locali." },
    { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
}).replace(/</g, "\\u003c")}</script>
<style>
:root{
  --ink:#F4F1EA; --ink-dim:#B9B6AE; --void:#0A0A0A; --void2:#141412;
  --accent:#FF6A2C; --accent-dim:#C94E1A; --line: rgba(244,241,234,0.14);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--void);color:var(--ink);font-family:'Manrope',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-family:'Space Grotesk',sans-serif;font-weight:600;margin:0}
a{color:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
section{padding:72px 0}
.eyebrow{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;font-weight:700}

/* HERO */
.hero{padding:100px 0 72px;text-align:center;background:radial-gradient(120% 70% at 50% 0%, rgba(255,106,44,.14) 0%, rgba(10,10,10,0) 60%)}
.hero h1{font-size:clamp(2rem,5vw,3.4rem);line-height:1.08;letter-spacing:-.01em;max-width:820px;margin:0 auto 18px}
.hero p{color:var(--ink-dim);font-size:1.05rem;max-width:560px;margin:0 auto 32px;line-height:1.6}
.hero-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.btn{display:inline-block;padding:15px 30px;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.95rem;text-decoration:none;transition:transform .15s ease, background .2s ease}
.btn--primary{background:var(--accent);color:var(--void)}
.btn--primary:hover{background:#ff7f47;transform:translateY(-1px)}
.btn--ghost{border:1px solid var(--line);color:var(--ink)}
.btn--ghost:hover{border-color:var(--ink-dim)}

/* STEPS */
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
@media (max-width:820px){.steps{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.steps{grid-template-columns:1fr}}
.step{border:1px solid var(--line);padding:24px;background:rgba(244,241,234,.02)}
.step .n{font-family:'Space Grotesk',sans-serif;font-size:1.6rem;font-weight:700;color:var(--accent);margin-bottom:10px}
.step h3{font-size:1.05rem;margin-bottom:8px}
.step p{color:var(--ink-dim);font-size:.88rem;line-height:1.55;margin:0}

/* RICEVI / GRID ICONE */
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
@media (max-width:720px){.grid3{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.grid3{grid-template-columns:1fr}}
.chip{border:1px solid var(--line);padding:20px;text-align:center}
.chip .ic{font-size:1.8rem;margin-bottom:10px}
.chip .lbl{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.92rem}

/* MOCKUP TELEFONO */
.esempio{display:grid;grid-template-columns:340px 1fr;gap:48px;align-items:center}
@media (max-width:760px){.esempio{grid-template-columns:1fr;justify-items:center}}
.phone{width:260px;border:8px solid #222;border-radius:34px;background:var(--void2);padding:20px 16px;box-shadow:0 30px 60px rgba(0,0,0,.5)}
.phone .avatar{width:56px;height:56px;border-radius:14px;background:var(--accent);margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:700;color:var(--void)}
.phone h4{text-align:center;font-size:.95rem;margin-bottom:4px}
.phone .sub{text-align:center;font-size:.72rem;color:var(--ink-dim);margin-bottom:18px}
.phone .l{border:1px solid var(--line);padding:11px 12px;font-size:.78rem;margin-bottom:9px;display:flex;justify-content:space-between}
.esempio-testo p{color:var(--ink-dim);line-height:1.6;font-size:.95rem}

/* PIANI */
.piani{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px}
.piano-card{position:relative;border:1px solid var(--line);padding:28px 24px;background:rgba(244,241,234,.02)}
.piano-card--evidenza{border-color:var(--accent);background:rgba(255,106,44,.05)}
.piano-badge{position:absolute;top:-11px;right:20px;background:var(--accent);color:var(--void);font-size:.65rem;font-weight:700;letter-spacing:.08em;padding:3px 10px}
.piano-nome{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.1rem;margin-bottom:6px}
.piano-prezzo{font-family:'Space Grotesk',sans-serif;font-size:2.1rem;font-weight:700;margin-bottom:4px}
.piano-prezzo span{font-size:.85rem;color:var(--ink-dim);font-weight:400}
.piano-crediti{color:var(--ink-dim);font-size:.82rem;margin-bottom:16px}
.piano-features{list-style:none;padding:0;margin:0 0 20px;font-size:.85rem;color:var(--ink-dim);line-height:1.9}
.piano-features li::before{content:"— "}
.piano-cta{display:block;text-align:center;border:1px solid var(--line);padding:11px;font-size:.85rem;text-decoration:none;transition:border-color .2s}
.piano-cta:hover{border-color:var(--accent);color:var(--accent)}

/* FAQ */
details{border-bottom:1px solid var(--line);padding:16px 0}
summary{cursor:pointer;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.98rem;list-style:none}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";float:right;color:var(--accent)}
details[open] summary::after{content:"−"}
details p{color:var(--ink-dim);font-size:.88rem;line-height:1.6;margin:12px 0 0}

/* CONTATTI */
.contatti{text-align:center}
.contatti h2{margin-bottom:14px}
.contatti p{color:var(--ink-dim);max-width:480px;margin:0 auto 30px;line-height:1.6}

footer{border-top:1px solid var(--line);padding:32px 0;text-align:center;font-size:.72rem;color:rgba(185,182,174,.5)}
</style>
</head><body>

<main class="wrap hero">
  <div class="eyebrow">RoleFigz NFC</div>
  <h1>La tua pagina, i tuoi tag NFC, il tuo merchandising — tutto in un unico abbonamento</h1>
  <p>Una pagina web per la tua attivita', tag NFC e QR fisici che ci portano i clienti, e crediti di merchandising personalizzato che arrivano ogni mese.</p>
  <div class="hero-cta">
    <a class="btn btn--primary" href="#piani">Vedi i piani</a>
    <a class="btn btn--ghost" href="#contatti">Contattaci</a>
  </div>
</main>

<section class="wrap">
  <div class="eyebrow">Come funziona</div>
  <h2 style="font-size:1.7rem;margin-bottom:32px">Quattro passaggi, gestiti di persona</h2>
  <div class="steps">
    <div class="step"><div class="n">01</div><h3>Attiviamo la tua pagina</h3><p>Scegliamo insieme il piano e attiviamo rolefigz.com/nfc/il-tuo-nome, pronta da personalizzare.</p></div>
    <div class="step"><div class="n">02</div><h3>Ricevi tag e merchandising</h3><p>Tag NFC/QR fisici e i primi gadget del mese, pronti da esporre in negozio.</p></div>
    <div class="step"><div class="n">03</div><h3>I clienti scansionano</h3><p>Un tocco o un'inquadratura e arrivano dritti alla tua pagina: contatti, menu, recensioni, tutto in un posto.</p></div>
    <div class="step"><div class="n">04</div><h3>Statistiche e nuovi crediti</h3><p>Ogni mese nuovi crediti merchandising e le statistiche di visite, scansioni e click, senza cookie.</p></div>
  </div>
</section>

<section class="wrap" style="border-top:1px solid var(--line)">
  <div class="eyebrow">Cosa ricevi ogni mese</div>
  <h2 style="font-size:1.7rem;margin-bottom:32px">Non solo una pagina web</h2>
  <div class="grid3">
    <div class="chip"><div class="ic">🌐</div><div class="lbl">Pagina web personalizzabile</div></div>
    <div class="chip"><div class="ic">🏷️</div><div class="lbl">Tag NFC e QR fisici</div></div>
    <div class="chip"><div class="ic">🎁</div><div class="lbl">Crediti merchandising mensili</div></div>
    <div class="chip"><div class="ic">📊</div><div class="lbl">Statistiche di visite e scansioni</div></div>
    <div class="chip"><div class="ic">🔄</div><div class="lbl">Modifiche illimitate ai link</div></div>
    <div class="chip"><div class="ic">🤝</div><div class="lbl">Nessun vincolo, disdici quando vuoi</div></div>
  </div>
</section>

<section class="wrap esempio" style="border-top:1px solid var(--line)">
  <div class="phone">
    <div class="avatar">A</div>
    <h4>Bar Alessandra</h4>
    <div class="sub">Piacenza — aperto ora</div>
    <div class="l"><span>💬 WhatsApp</span><span>›</span></div>
    <div class="l"><span>📋 Menu</span><span>›</span></div>
    <div class="l"><span>📍 Come arrivare</span><span>›</span></div>
    <div class="l"><span>📷 Instagram</span><span>›</span></div>
  </div>
  <div class="esempio-testo">
    <div class="eyebrow">Un esempio</div>
    <h2 style="font-size:1.6rem;margin-bottom:14px">Semplice per chi la guarda, facile da aggiornare per te</h2>
    <p>Logo, descrizione, orari e i link che contano davvero — WhatsApp, menu, come arrivare, social. Se cambi il numero o il profilo Instagram, aggiorni dal pannello: i tag fisici restano gli stessi, non serve ristampare nulla.</p>
  </div>
</section>

<section class="wrap" id="piani" style="border-top:1px solid var(--line)">
  <div class="eyebrow">Piani</div>
  <h2 style="font-size:1.7rem;margin-bottom:8px">Un abbonamento mensile, pagato in contanti</h2>
  <p style="color:var(--ink-dim);margin-bottom:32px;max-width:560px">Nessuna carta, nessun addebito automatico. Paghi di persona quando passi in negozio, e ricevi i crediti del mese.</p>
  <div class="piani">
    ${piani.length ? piani.map(p => cardPiano(p, p.id === pianoEvidenza?.id)).join("") : '<p style="color:var(--ink-dim)">I piani saranno disponibili a breve — contattaci per saperne di più.</p>'}
  </div>
</section>

<section class="wrap" style="border-top:1px solid var(--line);max-width:760px">
  <div class="eyebrow">Domande frequenti</div>
  <h2 style="font-size:1.7rem;margin-bottom:24px">FAQ</h2>
  ${faq.map(([q, a]) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join("")}
</section>

<section class="wrap contatti" id="contatti" style="border-top:1px solid var(--line)">
  <div class="eyebrow">Contatti</div>
  <h2>Parliamone di persona</h2>
  <p>RoleFigz NFC si attiva in negozio: scrivici o chiamaci per organizzare un appuntamento.</p>
  <div class="hero-cta">
    ${telefonoWa ? `<a class="btn btn--primary" href="https://wa.me/${escapeHtml(telefonoWa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
    <a class="btn btn--ghost" href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
  </div>
</section>

<footer>${escapeHtml(nomeAzienda)} © ${new Date().getFullYear()} · RoleFigz NFC</footer>

</body></html>`;
}

module.exports = { renderLandingNfc };
