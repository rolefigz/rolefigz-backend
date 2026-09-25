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
    <div class="piano-card${inEvidenza ? " piano-card--evidenza" : ""} reveal">
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
  const pianiPrincipali = pianiOrdinati.slice(0, 3);
  const pianiExtra = pianiOrdinati.slice(3);

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
<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org", "@graph": [
    { "@type": "Service", name: "RoleFigz NFC", provider: { "@type": "Organization", name: nomeAzienda },
      description: "Pagina web, tag NFC/QR e merchandising fisico in abbonamento per attivita' locali." },
    { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ],
}).replace(/</g, "\\u003c")}</script>
<style>
:root{
  --ink:#1D1D1F; --ink-dim:rgba(29,29,31,.62); --void:#FBFBFD; --line: rgba(0,0,0,.08);
  --accent:#0071E3; --pill:999px; --card:22px; --surface:#FFFFFF;
  --phone-void:#0E0E0F; --phone-ink:#F5F5F7; --phone-ink-dim:rgba(245,245,247,.62); --phone-accent:#FF6A2C;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion: reduce){ html{scroll-behavior:auto} }
body{margin:0;background:var(--void);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3{font-weight:600;margin:0;letter-spacing:-.015em;text-wrap:balance}
a{color:inherit}
img{max-width:100%;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
section{padding:100px 0}
.eyebrow{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-bottom:10px;font-weight:600}

/* REVEAL ON SCROLL */
.reveal{opacity:0;transform:translateY(26px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:translateY(0)}
@media (prefers-reduced-motion: reduce){ .reveal{opacity:1;transform:none;transition:none} }

/* NAV */
nav.top{position:sticky;top:0;z-index:30;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:rgba(251,251,253,.78);backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);border-bottom:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:9px;text-decoration:none}
.brand img{height:24px;width:24px;object-fit:contain}
.brand span{font-weight:600;font-size:.92rem;letter-spacing:-.01em}
.nav-cta{background:var(--ink);color:var(--void);border-radius:var(--pill);padding:8px 18px;font-size:.82rem;font-weight:600;text-decoration:none;white-space:nowrap;transition:transform .2s cubic-bezier(.16,1,.3,1),opacity .2s ease}
.nav-cta:hover{opacity:.85}
.nav-cta:active{transform:scale(.96)}
.nav-right{display:flex;align-items:center;gap:8px}
.nav-login{font-size:.82rem;font-weight:600;color:var(--ink);text-decoration:none;padding:8px 14px;white-space:nowrap}
.nav-login:hover{color:var(--accent)}

/* BOTTONI */
.btn{display:inline-block;border-radius:var(--pill);padding:15px 30px;font-weight:600;font-size:.95rem;text-decoration:none;white-space:nowrap;transition:transform .2s cubic-bezier(.16,1,.3,1),background .2s ease,opacity .2s ease}
.btn--primary{background:var(--accent);color:#fff}
.btn--primary:hover{transform:translateY(-2px)}
.btn--primary:active{transform:scale(.97)}
.btn--ghost{background:rgba(0,0,0,.05);color:var(--ink)}
.btn--ghost:hover{background:rgba(0,0,0,.08)}
.btn--ghost:active{transform:scale(.97)}

/* HERO */
.hero{padding:72px 0 96px;display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center}
@media (max-width:860px){.hero{grid-template-columns:1fr;padding-top:44px;text-align:center}}
.hero-logo{width:52px;height:52px;object-fit:contain;margin-bottom:26px;opacity:0;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .05s both}
@media (max-width:860px){.hero-logo{margin-left:auto;margin-right:auto}}
.hero h1{font-size:clamp(2.1rem,4.6vw,3.3rem);line-height:1.08;margin-bottom:20px;max-width:15ch;opacity:0;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .15s both}
@media (max-width:860px){.hero h1{max-width:none;margin-left:auto;margin-right:auto}}
.hero p{color:var(--ink-dim);font-size:1.1rem;max-width:46ch;margin:0 0 34px;line-height:1.55;opacity:0;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .25s both}
@media (max-width:860px){.hero p{margin-left:auto;margin-right:auto}}
.hero-cta{display:flex;gap:14px;flex-wrap:wrap;opacity:0;animation:fadeUp .8s cubic-bezier(.16,1,.3,1) .35s both}
@media (max-width:860px){.hero-cta{justify-content:center}}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@media (prefers-reduced-motion: reduce){ .hero-logo,.hero h1,.hero p,.hero-cta{animation:none;opacity:1} }

/* TELEFONO (anteprima reale del prodotto) */
.phone-wrap{display:flex;justify-content:center;opacity:0;animation:fadeUp 1s cubic-bezier(.16,1,.3,1) .3s both}
@media (prefers-reduced-motion: reduce){ .phone-wrap{animation:none;opacity:1} }
.phone{width:100%;max-width:280px;border-radius:36px;background:linear-gradient(165deg,var(--phone-void),#050506);padding:28px 20px;box-shadow:0 30px 70px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.06)}
.phone-top{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.phone-badge{width:44px;height:44px;border-radius:14px;background:var(--phone-accent);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.2rem;flex:none}
.phone-name{font-weight:600;font-size:.98rem;color:var(--phone-ink)}
.phone-sub{color:var(--phone-ink-dim);font-size:.74rem}
.phone-link{display:flex;align-items:center;gap:11px;padding:13px 15px;margin-bottom:9px;border-radius:16px;text-decoration:none;color:var(--phone-ink);background:rgba(255,255,255,.05);transition:background .2s ease}
.phone-link svg{width:17px;height:17px;color:var(--phone-accent);flex:none}
.phone-link span{font-size:.84rem;font-weight:500}
.phone-link .go{margin-left:auto;color:var(--phone-ink-dim)}
.phone-caption{text-align:center;color:var(--ink-dim);font-size:.72rem;margin-top:16px}

/* STEP */
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:36px 28px}
@media (max-width:820px){.steps{grid-template-columns:1fr 1fr}}
@media (max-width:480px){.steps{grid-template-columns:1fr;gap:40px}}
.step .n{font-size:1.4rem;font-weight:700;color:var(--accent);margin-bottom:12px}
.step h3{font-size:1.04rem;margin-bottom:10px}
.step p{color:var(--ink-dim);font-size:.88rem;line-height:1.55;margin:0}

/* INCLUSO */
.incluso{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
@media (max-width:640px){.incluso{grid-template-columns:1fr}}
.incluso-voce{padding:26px;border-radius:var(--card);background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.05)}
.incluso-voce h3{font-size:.98rem;margin-bottom:8px}
.incluso-voce p{color:var(--ink-dim);font-size:.86rem;margin:0;line-height:1.5}

/* MERCHANDISING */
.merch{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
@media (max-width:820px){.merch{grid-template-columns:1fr}}
.merch p{color:var(--ink-dim);line-height:1.6;font-size:.95rem;max-width:44ch}

.merch-carousel{position:relative;border-radius:var(--card);overflow:hidden;background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.05)}
.merch-track{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.merch-track::-webkit-scrollbar{display:none}
.merch-slide{flex:0 0 100%;scroll-snap-align:center}
.merch-slide img{width:100%;height:380px;object-fit:contain;display:block;padding:20px}
.merch-nav{position:absolute;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.9);border:1px solid var(--line);color:var(--ink);font-size:1.2rem;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s ease}
.merch-nav:hover{background:#fff}
.merch-nav--prev{left:12px}
.merch-nav--next{right:12px}
.merch-dots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px}
.merch-dot{width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,.2);cursor:pointer;transition:background .2s ease,width .2s ease;border:none;padding:0}
.merch-dot.active{background:var(--accent);width:18px;border-radius:3px}

/* PIANI */
.piani{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:28px}
.piano-card{position:relative;border-radius:var(--card);padding:30px 26px;background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.05);transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s ease}
.piano-card:hover{transform:translateY(-4px);box-shadow:0 4px 8px rgba(0,0,0,.05),0 16px 36px rgba(0,0,0,.08)}
.piano-card--evidenza{box-shadow:0 0 0 1.5px var(--accent),0 8px 24px rgba(0,0,0,.06)}
.piano-badge{position:absolute;top:-11px;right:22px;background:var(--accent);color:#fff;font-size:.65rem;font-weight:700;letter-spacing:.04em;padding:4px 12px;border-radius:var(--pill)}
.piano-nome{font-weight:600;font-size:1.1rem;margin-bottom:6px}
.piano-prezzo{font-size:2.2rem;font-weight:700;margin-bottom:4px}
.piano-prezzo span{font-size:.85rem;color:var(--ink-dim);font-weight:400}
.piano-crediti{color:var(--ink-dim);font-size:.82rem;margin-bottom:18px}
.piano-features{list-style:none;padding:0;margin:0 0 22px;font-size:.85rem;color:var(--ink-dim);line-height:1.9}
.piano-features li::before{content:"• ";color:var(--accent)}
.piano-cta{display:block;text-align:center;border-radius:var(--pill);padding:12px;font-size:.85rem;font-weight:600;text-decoration:none;background:rgba(0,0,0,.05);transition:background .2s ease}
.piano-cta:hover{background:rgba(0,0,0,.08)}
.piani-extra{display:grid;grid-template-rows:0fr;transition:grid-template-rows .5s cubic-bezier(.16,1,.3,1)}
.piani-extra>div{overflow:hidden}
.piani-extra.in{grid-template-rows:1fr}
.piani-extra .piani{margin-top:28px}
.piani-toggle{display:flex;align-items:center;gap:8px;margin:28px auto 0;cursor:pointer;border:none;font-family:inherit}
.piani-toggle svg{width:15px;height:15px;transition:transform .3s cubic-bezier(.16,1,.3,1)}
.piani-toggle[aria-expanded="true"] svg{transform:rotate(180deg)}
@media (prefers-reduced-motion: reduce){ .piani-extra,.piani-toggle svg{transition:none} }

/* FAQ */
details{border-top:1px solid var(--line);padding:20px 0}
details:last-of-type{border-bottom:1px solid var(--line)}
summary{cursor:pointer;font-weight:600;font-size:.98rem;list-style:none;display:flex;justify-content:space-between;gap:16px}
summary::-webkit-details-marker{display:none}
summary::after{content:"+";color:var(--accent);flex:none;transition:transform .25s ease}
details[open] summary::after{content:"+";transform:rotate(45deg)}
details p{color:var(--ink-dim);font-size:.88rem;line-height:1.6;margin:12px 0 0;max-width:60ch}

/* CONTATTI */
.contatti{text-align:center}
.contatti p{color:var(--ink-dim);max-width:44ch;margin:0 auto 30px;line-height:1.6}
.hero-cta.centro{justify-content:center;opacity:1;animation:none}
.lead-form{max-width:520px;margin:18px auto 0;text-align:left;display:flex;flex-direction:column;gap:12px}
.lead-form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:560px){.lead-form-row{grid-template-columns:1fr}}
.lead-form input,.lead-form textarea{width:100%;border:1px solid var(--line);border-radius:14px;padding:13px 16px;font:inherit;font-size:.92rem;color:var(--ink);background:var(--surface);transition:border-color .2s ease}
.lead-form input:focus,.lead-form textarea:focus{outline:none;border-color:var(--accent)}
.lead-form textarea{resize:vertical;min-height:80px}
.lead-form button{align-self:flex-start}
.lead-form button:disabled{opacity:.6;pointer-events:none}
.lead-form-esito{font-size:.85rem;min-height:1.2em;margin:0}
.lead-form-esito.ok{color:#1a7f4b}
.lead-form-esito.err{color:#c0392b}

footer{border-top:1px solid var(--line);padding:32px 0;text-align:center;font-size:.72rem;color:var(--ink-dim)}
</style>
</head><body>

<nav class="top">
  <a class="brand" href="/nfc"><img src="/assets/LogoSfondoNero.png" alt="RoleFigz"><span>RoleFigz NFC</span></a>
  <div class="nav-right">
    <a class="nav-login" href="/index.html?nfcLogin=1">Accedi</a>
    <a class="nav-cta" href="#contatti">Contattaci</a>
  </div>
</nav>

<main class="wrap hero">
  <div>
    <img class="hero-logo" src="/assets/LogoSfondoNero.png" alt="RoleFigz">
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
  <h2 class="reveal" style="font-size:1.7rem;margin-bottom:36px">Come funziona</h2>
  <div class="steps">
    <div class="step reveal"><div class="n">01</div><h3>Attiviamo la tua pagina</h3><p>Scegliamo il piano insieme e attiviamo rolefigz.com/nfc/tuonome, pronta da personalizzare.</p></div>
    <div class="step reveal" style="transition-delay:.06s"><div class="n">02</div><h3>Ricevi tag e merchandising</h3><p>Tag NFC e QR fisici, piu' i primi gadget del mese, pronti da esporre in negozio.</p></div>
    <div class="step reveal" style="transition-delay:.12s"><div class="n">03</div><h3>I clienti scansionano</h3><p>Un tocco o un'inquadratura e arrivano dritti alla tua pagina: contatti, menu, social, tutto insieme.</p></div>
    <div class="step reveal" style="transition-delay:.18s"><div class="n">04</div><h3>Nuovi crediti ogni mese</h3><p>Statistiche di visite e scansioni, piu' nuovi crediti merchandising da spendere quando vuoi.</p></div>
  </div>
</section>

<section class="wrap" style="border-top:1px solid var(--line)">
  <h2 class="reveal" style="font-size:1.7rem;margin-bottom:10px">Cosa include l'abbonamento</h2>
  <div class="incluso" style="margin-top:26px">
    <div class="incluso-voce reveal"><h3>Pagina web personalizzabile</h3><p>Logo, descrizione, orari e i link che contano davvero, senza scrivere una riga di codice.</p></div>
    <div class="incluso-voce reveal" style="transition-delay:.06s"><h3>Tag NFC e QR fisici</h3><p>Li porti tu, li scansiona chi entra nel tuo locale. Riassegnabili in qualsiasi momento.</p></div>
    <div class="incluso-voce reveal" style="transition-delay:.12s"><h3>Statistiche senza cookie</h3><p>Visite, scansioni per ogni tag e click sui link, raccolti in forma anonima.</p></div>
    <div class="incluso-voce reveal" style="transition-delay:.18s"><h3>Nessun vincolo</h3><p>Disdici quando vuoi. I crediti gia' pagati restano tuoi fino a fine periodo.</p></div>
  </div>
</section>

<section class="wrap merch" style="border-top:1px solid var(--line)">
  <div class="merch-carousel reveal">
    <div class="merch-track" id="merch-track">
      <div class="merch-slide"><img src="/assets/presentationbadge1.jpeg" alt="Badge di presentazione RoleFigz" loading="lazy"></div>
      <div class="merch-slide"><img src="/assets/llaveros.jpeg" alt="Portachiavi NFC personalizzati" loading="lazy"></div>
      <div class="merch-slide"><img src="/assets/Identificador.jpeg" alt="Identificativo personalizzato" loading="lazy"></div>
      <div class="merch-slide"><img src="/assets/stand.jpeg" alt="Stand recensioni" loading="lazy"></div>
      <div class="merch-slide"><img src="/assets/iman.jpeg" alt="Calamita personalizzata" loading="lazy"></div>
      <div class="merch-slide"><img src="/assets/presentationbadge2.jpeg" alt="Badge di presentazione RoleFigz" loading="lazy"></div>
    </div>
    <button type="button" class="merch-nav merch-nav--prev" aria-label="Foto precedente" onclick="merchCarouselVai(-1)">‹</button>
    <button type="button" class="merch-nav merch-nav--next" aria-label="Foto successiva" onclick="merchCarouselVai(1)">›</button>
    <div class="merch-dots" id="merch-dots"></div>
  </div>
  <div class="reveal" style="transition-delay:.1s">
    <div class="eyebrow">Il merchandising</div>
    <h2 style="font-size:1.5rem;margin-bottom:14px">Portachiavi, calamite, tessere e display, stampati da noi</h2>
    <p>Ogni mese usi i crediti del tuo piano per ordinare merchandising fisico personalizzato. Se ti serve di piu', paghi solo l'eccedenza alla consegna.</p>
  </div>
</section>

<section class="wrap" id="piani" style="border-top:1px solid var(--line)">
  <div class="eyebrow reveal">Piani</div>
  <h2 class="reveal" style="font-size:1.7rem;margin-bottom:10px">Un abbonamento mensile, pagato in contanti</h2>
  <p class="reveal" style="color:var(--ink-dim);margin-bottom:36px;max-width:50ch">Nessuna carta, nessun addebito automatico. Paghi di persona quando passi in negozio.</p>
  <div class="piani">
    ${pianiPrincipali.length ? pianiPrincipali.map(p => cardPiano(p, p.id === pianoEvidenza?.id)).join("") : '<p style="color:var(--ink-dim)">I piani saranno disponibili a breve. Contattaci per saperne di piu\'.</p>'}
  </div>
  ${pianiExtra.length ? `
  <div class="piani-extra" id="piani-extra">
    <div><div class="piani">${pianiExtra.map(p => cardPiano(p, p.id === pianoEvidenza?.id)).join("")}</div></div>
  </div>
  <button type="button" class="btn btn--ghost piani-toggle" id="piani-toggle" aria-expanded="false" aria-controls="piani-extra">
    <span>Hai bisogno di piu'?</span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
  </button>` : ""}
</section>

<section class="wrap" style="border-top:1px solid var(--line);max-width:760px">
  <h2 class="reveal" style="font-size:1.7rem;margin-bottom:26px">Domande frequenti</h2>
  ${faq.map(([q, a]) => `<details class="reveal"><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join("")}
</section>

<section class="wrap contatti" id="contatti" style="border-top:1px solid var(--line)">
  <h2 class="reveal" style="margin-bottom:14px">Parliamone di persona</h2>
  <p class="reveal">RoleFigz NFC si attiva in negozio. Scrivici o chiamaci per organizzare un appuntamento.</p>
  <div class="hero-cta centro">
    ${telefonoWa ? `<a class="btn btn--primary" href="https://wa.me/${escapeHtml(telefonoWa)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
    <a class="btn btn--ghost" href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
  </div>

  <p class="reveal" style="color:var(--ink-dim);font-size:.82rem;margin:34px 0 0">Oppure lascia i tuoi dati, ti richiamiamo noi</p>
  <form id="lead-form" class="lead-form reveal" novalidate>
    <div class="lead-form-row">
      <input type="text" name="company_name" placeholder="Nome azienda" maxlength="160" required>
      <input type="text" name="contact_name" placeholder="Il tuo nome" maxlength="160" required>
    </div>
    <div class="lead-form-row">
      <input type="email" name="email" placeholder="Email" maxlength="160" required>
      <input type="tel" name="phone" placeholder="Telefono (facoltativo)" maxlength="30">
    </div>
    <textarea name="message" placeholder="Raccontaci qualcosa sulla tua attivita' (facoltativo)" maxlength="1000" rows="3"></textarea>
    <button type="submit" class="btn btn--primary" id="lead-form-submit">Richiedi informazioni</button>
    <p class="lead-form-esito" id="lead-form-esito" role="status" aria-live="polite"></p>
  </form>
</section>

<footer>${escapeHtml(nomeAzienda)} © ${new Date().getFullYear()} · RoleFigz NFC</footer>

<script>
(function(){
  try {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function(el){ el.classList.add('in'); }); return; }
    var obs = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) { entry.target.classList.add('in'); obs.unobserve(entry.target); }
      });
    }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function(el){ obs.observe(el); });
  } catch(e) {}

  try {
    var toggle = document.getElementById('piani-toggle');
    var extra = document.getElementById('piani-extra');
    if (toggle && extra) {
      toggle.addEventListener('click', function(){
        var aperto = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!aperto));
        extra.classList.toggle('in', !aperto);
        toggle.querySelector('span').textContent = aperto ? "Hai bisogno di piu'?" : 'Mostra meno piani';
      });
    }
  } catch(e) {}

  try {
    var form = document.getElementById('lead-form');
    if (form) {
      var esito = document.getElementById('lead-form-esito');
      var submitBtn = document.getElementById('lead-form-submit');
      form.addEventListener('submit', function(ev){
        ev.preventDefault();
        esito.textContent = '';
        esito.className = 'lead-form-esito';
        submitBtn.disabled = true;
        var dati = {
          company_name: form.company_name.value,
          contact_name: form.contact_name.value,
          email: form.email.value,
          phone: form.phone.value,
          message: form.message.value,
        };
        fetch('/api/nfc-leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dati),
        }).then(function(r){ return r.json().then(function(d){ return { ok: r.ok, dati: d }; }); })
          .then(function(res){
            submitBtn.disabled = false;
            if (res.ok) {
              esito.textContent = res.dati.mensaje || 'Richiesta inviata. Ti contatteremo presto.';
              esito.className = 'lead-form-esito ok';
              form.reset();
            } else {
              esito.textContent = (res.dati.dettagli && res.dati.dettagli[0] && res.dati.dettagli[0].messaggio) || res.dati.error || 'Errore, riprova.';
              esito.className = 'lead-form-esito err';
            }
          })
          .catch(function(){
            submitBtn.disabled = false;
            esito.textContent = 'Errore di connessione, riprova.';
            esito.className = 'lead-form-esito err';
          });
      });
    }
  } catch(e) {}

  try {
    var track = document.getElementById('merch-track');
    var dotsWrap = document.getElementById('merch-dots');
    if (track && dotsWrap) {
      var slides = track.children.length;
      for (var i = 0; i < slides; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'merch-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Vai alla foto ' + (i + 1));
        dot.addEventListener('click', (function(idx){ return function(){ merchVaiA(idx); }; })(i));
        dotsWrap.appendChild(dot);
      }
      var corrente = 0;
      var autoTimer = null;
      var ridotto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      function aggiornaDots() {
        Array.prototype.forEach.call(dotsWrap.children, function(d, idx){ d.classList.toggle('active', idx === corrente); });
      }
      window.merchVaiA = function(idx) {
        corrente = idx;
        track.scrollTo({ left: track.clientWidth * corrente, behavior: 'smooth' });
        aggiornaDots();
      };
      window.merchCarouselVai = function(delta) {
        merchVaiA((corrente + delta + slides) % slides);
      };
      function avviaAuto() {
        if (ridotto) return;
        fermaAuto();
        autoTimer = setInterval(function(){ merchVaiA((corrente + 1) % slides); }, 3500);
      }
      function fermaAuto() { if (autoTimer) clearInterval(autoTimer); }

      var scrollTimeout;
      track.addEventListener('scroll', function() {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
          corrente = Math.round(track.scrollLeft / track.clientWidth);
          aggiornaDots();
        }, 100);
      });
      track.addEventListener('mouseenter', fermaAuto);
      track.addEventListener('mouseleave', avviaAuto);
      track.addEventListener('touchstart', fermaAuto, { passive: true });
      track.addEventListener('touchend', avviaAuto);

      avviaAuto();
    }
  } catch(e) {}
})();
</script>
</body></html>`;
}

module.exports = { renderLandingNfc };
