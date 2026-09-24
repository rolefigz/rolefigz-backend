function escapeHtml(valore) {
  return String(valore || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function centesimiAEuro(c) {
  return (parseInt(c || 0, 10) / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Stesse icone a tratto usate nelle pagine reali delle aziende (renderPaginaPubblica.js),
// cosi' il telefono nella hero e' un'anteprima fedele del prodotto vero, non un mockup finto.
const ICONA_WHATSAPP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.9c0 4.7-3.9 8.6-8.6 8.6-1.5 0-3-.4-4.2-1.1L3 20.5l1.2-4.5a8.5 8.5 0 0 1-1.3-4.5c0-4.7 3.9-8.6 8.6-8.6s8.6 3.8 8.6 8.4z"/><path d="M8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.4l.7 1.7c.1.2 0 .5-.1.6l-.5.6c-.1.2-.1.3 0 .5.4.7 1.6 1.9 2.8 2.4.2.1.4.1.5-.1l.5-.6c.2-.2.4-.2.6-.1l1.6.9c.2.1.3.3.3.5-.1.9-1 1.6-1.9 1.6-2.7 0-6.1-2.9-6.6-6.6-.1-.5.2-1 .4-1.3z"/></svg>';
const ICONA_MAPS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12z"/><circle cx="12" cy="9" r="2.3"/></svg>';
const ICONA_INSTAGRAM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/></svg>';
const ICONA_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16M4 12h16M4 17.5h10"/></svg>';

function cardPiano(piano, inEvidenza) {
  const features = Array.isArray(piano.features) ? piano.features : [];
  return `
    <div class="piano-card${inEvidenza ? " piano-card--evidenza" : ""}">
      ${inEvidenza ? '<div class="piano-badge">Piu scelto</div>' : ""}
      <div class="piano-nome">${escapeHtml(piano.name)}</div>
      <div class="piano-prezzo">€${centesimiAEuro(piano.monthly_price_cents)}<span>/mese</span></div>
      <div class="piano-crediti">${piano.monthly_credits} crediti merchandising al mese</div>
      ${features.length ? `<ul class="piano-features">${features.map(f => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : ""}
      <a class="piano-cta" href="#contatti">Contattaci</a>
    </div>`;
}

function renderLandingNfc(piani) {
  const telefono = process.env.SHOP_TELEFONO || "";
  const telefonoWa = telefono.replace(/[^\d]/g, "");
  const email = process.env.SHOP_EMAIL || "info@rolefigz.com";
  const nomeAzienda = process.env.SHOP_NOME || "RoleFigz";

  const pianiOrdinati = [...piani].sort((a, b) => (a.position || 0) - (b.position || 0));
  const pianoEvidenza = pianiOrdinati[Math.min(1, pianiOrdinati.length - 1)];

  const faq = [
    ["Si paga con carta o addebito automatico?", "No. Si paga solo in contanti, di persona. Nessuna carta salvata, nessun addebito a sorpresa."],
    ["Cosa succede se disdico?", "Nessun vincolo di permanenza. I crediti gia' accumulati restano validi fino alla fine del periodo pagato, poi scadono."],
    ["Posso provare prima di abbonarmi?", "Si', fino a 7 giorni di prova gratuita con un gadget consegnato a mano, per vedere come funziona la tua pagina."],
    ["Se cambio Instagram o WhatsApp devo ristampare i tag?", "No. I tag puntano sempre alla tua pagina. Aggiorni i link dal pannello e sono aggiornati ovunque, senza ristampare nulla."],
    ["Che statistiche vedo?", "Visite alla pagina, scansioni per ogni tag fisico e click sui link, in forma anonima: nessun cookie, nessun dato personale salvato."],
  ];

  return `<!DOCTYPE html><html lang="it"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>RoleFigz NFC per attivita' locali</title>
<meta name="description" content="Pagina web per la tua attivita', tag NFC e QR fisici, merchandising personalizzato ogni mese. Un abbonamento pagato in contanti, di persona.">
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
  --accent:#FF6A2C; --line: rgba(244,241,234,0.14);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion: reduce){ html{scroll-behavior:auto} }
body{margin:0;background:var(--void);color:var(--ink);font-family:'Manrope',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-family:'Space Grotesk',sans-serif;font-weight:600;margin:0;text-wrap:balance}
a{color:inherit}
img{max-width:100%;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
section{padding:76px 0}
.eyebrow{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;font-weight:700}

/* NAV */
nav.top{position:sticky;top:0;z-index:30;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:rgba(10,10,10,.86);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:8px;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:.98rem;text-decoration:none}
.brand .dot{width:8px;height:8px;background:var(--accent);border-radius:50%}
.nav-cta{border:1px solid var(--line);padding:9px 18px;font-size:.85rem;text-decoration:none;white-space:nowrap;transition:border-color .2s ease,color .2s ease}
.nav-cta:hover{border-color:var(--accent);color:var(--accent)}

/* BOTTONI */
.btn{display:inline-block;padding:15px 28px;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.95rem;text-decoration:none;white-space:nowrap;transition:transform .15s ease,background .2s ease,border-color .2s ease}
.btn--primary{background:var(--accent);color:var(--void)}
.btn--primary:hover{background:#ff7f47;transform:translateY(-1px)}
.btn--ghost{border:1px solid var(--line);color:var(--ink)}
.btn--ghost:hover{border-color:var(--ink-dim)}

/* HERO */
.hero{padding:56px 0 80px;display:grid;grid-template-columns:1.05fr .95fr;gap:56px;align-items:center}
@media (max-width:860px){.hero{grid-template-columns:1fr;padding-top:36px}}
.hero h1{font-size:clamp(2rem,4.4vw,3rem);line-height:1.1;letter-spacing:-.01em;margin-bottom:18px;max-width:15ch}
.hero p{color:var(--ink-dim);font-size:1.05rem;max-width:46ch;margin:0 0 30px;line-height:1.55}
.hero-cta{display:flex;gap:14px;flex-wrap:wrap}

/* TELEFONO (anteprima reale del prodotto) */
.phone-wrap{display:flex;justify-content:center}
.phone{width:100%;max-width:280px;border:1px solid var(--line);border-radius:28px;background:linear-gradient(180deg,var(--void2),#0d0d0c);padding:26px 18px;box-shadow:0 40px 80px rgba(0,0,0,.5)}
.phone-top{display:flex;align-items:center;gap:12px;margin-bottom:22px}
.phone-badge{width:44px;height:44px;border-radius:12px;background:var(--accent);color:var(--void);display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.2rem;flex:none}
.phone-name{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.98rem}
.phone-sub{color:var(--ink-dim);font-size:.74rem}
.phone-link{position:relative;display:flex;align-items:center;gap:11px;padding:12px 13px;margin-bottom:9px;border:1px solid var(--line);text-decoration:none;color:var(--ink);background:rgba(244,241,234,.03)}
.phone-link::before,.phone-link::after{content:'';position:absolute;width:7px;height:7px;border-color:var(--accent)}
.phone-link::before{top:-1px;left:-1px;border-top:1.5px solid var(--accent);border-left:1.5px solid var(--accent)}
.phone-link::after{bottom:-1px;right:-1px;border-bottom:1.5px solid var(--accent);border-right:1.5px solid var(--accent)}
.phone-link svg{width:17px;height:17px;color:var(--accent);flex:none}
.phone-link span{font-size:.82rem;font-weight:600;font-family:'Space Grotesk',sans-serif}
.phone-link .go{margin-left:auto;color:var(--ink-dim)}
.phone-caption{text-align:center;color:var(--ink-dim);font-size:.72rem;margin-top:14px}

/* STEP */
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
@media (max-width:820px){.steps{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.steps{grid-template-columns:1fr}}
.step{border-top:2px solid var(--accent);padding-top:16px}
.step .n{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700;color:var(--accent);margin-bottom:8px}
.step h3{font-size:1.02rem;margin-bottom:7px}
.step p{color:var(--ink-dim);font-size:.87rem;line-height:1.55;margin:0}

/* INCLUSO */
.incluso{display:grid;grid-template-columns:repeat(2,1fr);gap:0 40px}
@media (max-width:640px){.incluso{grid-template-columns:1fr}}
.incluso-voce{padding:18px 0;border-top:1px solid var(--line)}
.incluso-voce h3{font-size:.98rem;margin-bottom:5px}
.incluso-voce p{color:var(--ink-dim);font-size:.86rem;margin:0;line-height:1.5}

/* MERCHANDISING */
.merch{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
@media (max-width:820px){.merch{grid-template-columns:1fr}}
.merch img{width:100%;height:320px;object-fit:cover;border:1px solid var(--line)}
.merch p{color:var(--ink-dim);line-height:1.6;font-size:.95rem;max-width:44ch}

/* PIANI */
.piani{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px}
.piano-card{position:relative;border:1px solid var(--line);padding:28px 24px;background:rgba(244,241,234,.02)}
.piano-card--evidenza{border-color:var(--accent);background:rgba(255,106,44,.05)}
.piano-badge{position:absolute;top:-11px;right:20px;background:var(--accent);color:var(--void);font-size:.65rem;font-weight:700;letter-spacing:.06em;padding:3px 10px}
.piano-nome{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.1rem;margin-bottom:6px}
.piano-prezzo{font-family:'Space Grotesk',sans-serif;font-size:2.1rem;font-weight:700;margin-bottom:4px}
.piano-prezzo span{font-size:.85rem;color:var(--ink-dim);font-weight:400}
.piano-crediti{color:var(--ink-dim);font-size:.82rem;margin-bottom:16px}
.piano-features{list-style:none;padding:0;margin:0 0 20px;font-size:.85rem;color:var(--ink-dim);line-height:1.9}
.piano-features li::before{content:"• ";color:var(--accent)}
.piano-cta{display:block;text-align:center;border:1px solid var(--line);padding:11px;font-size:.85rem;text-decoration:none;transition:border-color .2s ease,color .2s ease}
.piano-cta:hover{border-color:var(--accent);color:var(--accent)}

/* FAQ */
details{border-top:1px solid var(--line);padding:18px 0}
details:last-of-type{border-bottom:1px solid var(--line)}
summary{cursor:pointer;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:.98rem;list-style:none;display:flex;justify-content:space-between;gap:16px}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";color:var(--accent);flex:none}
details[open] summary::after{content:"−"}
details p{color:var(--ink-dim);font-size:.88rem;line-height:1.6;margin:12px 0 0;max-width:60ch}

/* CONTATTI */
.contatti{text-align:center}
.contatti p{color:var(--ink-dim);max-width:44ch;margin:0 auto 30px;line-height:1.6}
.hero-cta.centro{justify-content:center}

footer{border-top:1px solid var(--line);padding:32px 0;text-align:center;font-size:.72rem;color:rgba(185,182,174,.55)}
</style>
</head><body>

<nav class="top">
  <a class="brand" href="/nfc"><span class="dot"></span>RoleFigz NFC</a>
  <a class="nav-cta" href="#contatti">Contattaci</a>
</nav>

<main class="wrap hero">
  <div>
    <h1>I tuoi clienti, a un tocco di distanza.</h1>
    <p>Pagina web, tag NFC/QR fisici e merchandising personalizzato ogni mese. Un abbonamento pagato in contanti, di persona.</p>
    <div class="hero-cta">
      <a class="btn btn--primary" href="#piani">Vedi i piani</a>
      <a class="btn btn--ghost" href="#contatti">Contattaci</a>
    </div>
  </div>
  <div class="phone-wrap">
    <div>
      <div class="phone">
        <div class="phone-top">
          <div class="phone-badge">B</div>
          <div>
            <div class="phone-name">Bar Alessandra</div>
            <div class="phone-sub">Piacenza</div>
          </div>
        </div>
        <a class="phone-link"><span>${ICONA_WHATSAPP}</span><span>WhatsApp</span><span class="go">›</span></a>
        <a class="phone-link"><span>${ICONA_MENU}</span><span>Menu</span><span class="go">›</span></a>
        <a class="phone-link"><span>${ICONA_MAPS}</span><span>Come arrivare</span><span class="go">›</span></a>
        <a class="phone-link"><span>${ICONA_INSTAGRAM}</span><span>Instagram</span><span class="go">›</span></a>
      </div>
      <p class="phone-caption">Cosi' appare una pagina reale, non un fac-simile</p>
    </div>
  </div>
</main>

<section class="wrap" style="border-top:1px solid var(--line)">
  <h2 style="font-size:1.6rem;margin-bottom:32px">Come funziona</h2>
  <div class="steps">
    <div class="step"><div class="n">01</div><h3>Attiviamo la tua pagina</h3><p>Scegliamo il piano insieme e attiviamo rolefigz.com/nfc/tuonome, pronta da personalizzare.</p></div>
    <div class="step"><div class="n">02</div><h3>Ricevi tag e merchandising</h3><p>Tag NFC e QR fisici, piu' i primi gadget del mese, pronti da esporre in negozio.</p></div>
    <div class="step"><div class="n">03</div><h3>I clienti scansionano</h3><p>Un tocco o un'inquadratura e arrivano dritti alla tua pagina: contatti, menu, social, tutto insieme.</p></div>
    <div class="step"><div class="n">04</div><h3>Nuovi crediti ogni mese</h3><p>Statistiche di visite e scansioni, piu' nuovi crediti merchandising da spendere quando vuoi.</p></div>
  </div>
</section>

<section class="wrap" style="border-top:1px solid var(--line)">
  <h2 style="font-size:1.6rem;margin-bottom:8px">Cosa include l'abbonamento</h2>
  <div class="incluso">
    <div class="incluso-voce"><h3>Pagina web personalizzabile</h3><p>Logo, descrizione, orari e i link che contano davvero, senza scrivere una riga di codice.</p></div>
    <div class="incluso-voce"><h3>Tag NFC e QR fisici</h3><p>Li porti tu, li scansiona chi entra nel tuo locale. Riassegnabili in qualsiasi momento.</p></div>
    <div class="incluso-voce"><h3>Statistiche senza cookie</h3><p>Visite, scansioni per ogni tag e click sui link, raccolti in forma anonima.</p></div>
    <div class="incluso-voce"><h3>Nessun vincolo</h3><p>Disdici quando vuoi. I crediti gia' pagati restano tuoi fino a fine periodo.</p></div>
  </div>
</section>

<section class="wrap merch" style="border-top:1px solid var(--line)">
  <img src="https://picsum.photos/seed/rolefigz-nfc-merch/900/700" alt="Esempio di merchandising personalizzato" loading="lazy">
  <div>
    <div class="eyebrow">Il merchandising</div>
    <h2 style="font-size:1.5rem;margin-bottom:14px">Portachiavi, calamite, tessere e display, stampati da noi</h2>
    <p>Ogni mese usi i crediti del tuo piano per ordinare merchandising fisico personalizzato. Se ti serve di piu', paghi solo l'eccedenza alla consegna.</p>
  </div>
</section>

<section class="wrap" id="piani" style="border-top:1px solid var(--line)">
  <div class="eyebrow">Piani</div>
  <h2 style="font-size:1.6rem;margin-bottom:8px">Un abbonamento mensile, pagato in contanti</h2>
  <p style="color:var(--ink-dim);margin-bottom:32px;max-width:50ch">Nessuna carta, nessun addebito automatico. Paghi di persona quando passi in negozio.</p>
  <div class="piani">
    ${piani.length ? piani.map(p => cardPiano(p, p.id === pianoEvidenza?.id)).join("") : '<p style="color:var(--ink-dim)">I piani saranno disponibili a breve. Contattaci per saperne di piu\'.</p>'}
  </div>
</section>

<section class="wrap" style="border-top:1px solid var(--line);max-width:760px">
  <h2 style="font-size:1.6rem;margin-bottom:24px">Domande frequenti</h2>
  ${faq.map(([q, a]) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join("")}
</section>

<section class="wrap contatti" id="contatti" style="border-top:1px solid var(--line)">
  <h2 style="margin-bottom:14px">Parliamone di persona</h2>
  <p>RoleFigz NFC si attiva in negozio. Scrivici o chiamaci per organizzare un appuntamento.</p>
  <div class="hero-cta centro">
    ${telefonoWa ? `<a class="btn btn--primary" href="https://wa.me/${escapeHtml(telefonoWa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
    <a class="btn btn--ghost" href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
  </div>
</section>

<footer>${escapeHtml(nomeAzienda)} © ${new Date().getFullYear()} · RoleFigz NFC</footer>

</body></html>`;
}

module.exports = { renderLandingNfc };
