const { validaUrlSicuro } = require("../utils/urlSicuro");

function escapeHtml(valore) {
  return String(valore || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
const escapeAttr = escapeHtml;

// Stessa famiglia di icone a tratto usata in nfc.html (stroke 1.6, round caps),
// estesa ai tipi di link che quella pagina non aveva.
const ICONE_SVG = {
  whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.9c0 4.7-3.9 8.6-8.6 8.6-1.5 0-3-.4-4.2-1.1L3 20.5l1.2-4.5a8.5 8.5 0 0 1-1.3-4.5c0-4.7 3.9-8.6 8.6-8.6s8.6 3.8 8.6 8.4z"/><path d="M8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.4l.7 1.7c.1.2 0 .5-.1.6l-.5.6c-.1.2-.1.3 0 .5.4.7 1.6 1.9 2.8 2.4.2.1.4.1.5-.1l.5-.6c.2-.2.4-.2.6-.1l1.6.9c.2.1.3.3.3.5-.1.9-1 1.6-1.9 1.6-2.7 0-6.1-2.9-6.6-6.6-.1-.5.2-1 .4-1.3z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg>',
  website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.2 2.3 3.4 5.2 3.4 8.5s-1.2 6.2-3.4 8.5c-2.2-2.3-3.4-5.2-3.4-8.5S9.8 5.8 12 3.5z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M14.5 21v-7.2h2.4l.4-2.8h-2.8V9.2c0-.8.2-1.4 1.4-1.4h1.5V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H9v2.8h2.5V21h3z"/></svg>',
  maps: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12z"/><circle cx="12" cy="9" r="2.3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5h16M4 12h16M4 17.5h10"/></svg>',
  booking: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
  tripadvisor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 3.5l2.5 5.7 6.2.6-4.7 4.1 1.4 6.1L12 16.8l-5.4 3.2 1.4-6.1-4.7-4.1 6.2-.6L12 3.5z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.6a3.4 3.4 0 1 1-2.9-3.36"/><path d="M14 4c.3 2.1 1.9 3.6 4.1 3.9"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="8.3" cy="8.7" r=".9" fill="currentColor" stroke="none"/><path d="M8.3 11.5V17M12.3 17v-3.8c0-1.4.9-2.2 1.9-2.2s1.7.8 1.7 2.2V17"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.3" y="6" width="17.4" height="12" rx="3"/><path d="M10.3 9.7l5 2.3-5 2.3z" fill="currentColor" stroke="none"/></svg>',
  custom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15l6-6M9.5 9h-1a3 3 0 0 0 0 6h1M14.5 15h1a3 3 0 0 0 0-6h-1"/></svg>',
};

function renderPaginaAnimata(azienda, pagina, links, opts = {}) {
  const { anteprima = false } = opts;
  const coloreAccento = (pagina?.design?.primaryColor && /^#[0-9a-f]{6}$/i.test(pagina.design.primaryColor))
    ? pagina.design.primaryColor : "#FF6A2C";
  const DIMENSIONI_LOGO = { piccolo: { centro: 84, header: 48 }, medio: { centro: 120, header: 68 }, grande: { centro: 162, header: 92 } };
  const dimensioneLogo = DIMENSIONI_LOGO[pagina?.design?.logoSize] || DIMENSIONI_LOGO.medio;

  const nome = escapeHtml(azienda.name);
  const titolo = escapeHtml(pagina?.seo_title || azienda.name);
  const descrizioneSeo = escapeHtml(pagina?.seo_description || pagina?.description || `${azienda.name} su RoleFigz NFC`);
  const ogImage = pagina?.og_image || pagina?.logo_url || pagina?.background_url || "";

  const blocLogo = pagina?.logo_url
    ? `<img src="${escapeAttr(pagina.logo_url)}" alt="${escapeAttr(nome)}">`
    : `<div class="logo-fallback">${escapeHtml(nome.slice(0, 1).toUpperCase())}</div>`;

  const righeLink = links.map((l, i) => {
    const urlSicuro = (() => { try { return validaUrlSicuro(l.url); } catch { return null; } })();
    if (!urlSicuro) return "";
    const target = urlSicuro.startsWith("http") ? ' target="_blank" rel="noopener"' : "";
    const icona = ICONE_SVG[l.type] || ICONE_SVG.custom;
    return `<a class="link" style="--d:${i * 70}ms" href="${escapeAttr(urlSicuro)}"${target}>
      <span class="link__icon">${icona}</span>
      <span class="link__text"><span class="link__label">${escapeHtml(l.label)}</span></span>
      <span class="link__go">›</span>
    </a>`;
  }).join("");

  const jsonLd = (pagina?.description || pagina?.hours) ? `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "LocalBusiness",
    name: azienda.name, description: pagina?.description || undefined, image: ogImage || undefined,
  }).replace(/</g, "\\u003c")}</script>` : "";

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${titolo}</title>
<meta name="theme-color" content="#0a0a0a">
<meta name="description" content="${escapeAttr(descrizioneSeo)}">
${anteprima ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:title" content="${escapeAttr(titolo)}">
<meta property="og:description" content="${escapeAttr(descrizioneSeo)}">
${ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : ""}
${jsonLd}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --ink:#F4F1EA; --ink-dim:#B9B6AE; --void:#0A0A0A;
  --accent:${coloreAccento}; --line: rgba(244,241,234,0.14); --card-w: 440px;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;min-height:100%;background:var(--void);color:var(--ink);font-family:'Manrope',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
@media (prefers-reduced-motion: reduce){ *{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important} }

.scene{position:fixed;inset:0;overflow:hidden;z-index:0}
.scene__photo{position:absolute;inset:-3%;width:106%;height:106%;background-image:url('${escapeAttr(pagina.background_url)}');background-size:cover;background-position:center;filter:grayscale(70%) brightness(.42) contrast(1.05);opacity:0;transform:scale(1);animation:kenburns 18s ease-in-out infinite alternate;animation-play-state:paused;transition:opacity 1.6s cubic-bezier(.22,.61,.36,1)}
.scene__tint{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 0%, rgba(10,10,10,0) 0%, rgba(10,10,10,.55) 60%, rgba(10,10,10,.92) 100%), rgba(12,12,12,.35)}
body.revealed .scene__photo{opacity:1;animation-play-state:running}
@keyframes kenburns{from{transform:scale(1)}to{transform:scale(1.07) translate(-1%,0%)}}

.intro{position:fixed;inset:0;background:var(--void);z-index:20;display:flex;align-items:center;justify-content:center;transition:opacity 1.4s cubic-bezier(.22,.61,.36,1)}
body.revealed .intro{opacity:0;pointer-events:none}

.logo-wrap{position:fixed;top:50%;left:50%;width:${dimensioneLogo.centro}px;height:${dimensioneLogo.centro}px;transform:translate(-50%,-50%) scale(.86);opacity:0;z-index:21;transition:top 1.5s cubic-bezier(.22,.61,.36,1),width 1.5s cubic-bezier(.22,.61,.36,1),height 1.5s cubic-bezier(.22,.61,.36,1),transform 1.5s cubic-bezier(.22,.61,.36,1),opacity 1s ease}
.logo-wrap img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 0 40px rgba(255,106,44,.12))}
.logo-fallback{width:100%;height:100%;border-radius:24px;background:var(--accent);color:var(--void);display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:${(dimensioneLogo.centro * 0.02).toFixed(2)}rem}
body.logo-in .logo-wrap{opacity:1;transform:translate(-50%,-50%) scale(1);animation:breathe 2.6s ease-in-out .2s 1}
@keyframes breathe{0%{transform:translate(-50%,-50%) scale(.94)}50%{transform:translate(-50%,-50%) scale(1.03)}100%{transform:translate(-50%,-50%) scale(1)}}
body.revealed .logo-wrap{top:60px;width:${dimensioneLogo.header}px;height:${dimensioneLogo.header}px;transform:translate(-50%,0) scale(1)}

.stage{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:156px 24px 48px}
.identity{text-align:center;max-width:var(--card-w);opacity:0;transform:translateY(14px);transition:opacity .9s ease,transform .9s cubic-bezier(.22,.61,.36,1)}
body.content-in .identity{opacity:1;transform:translateY(0)}
.identity h1{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.5rem;letter-spacing:.01em;margin:0 0 6px}
.identity .sub{margin:0;color:var(--ink-dim);font-size:.92rem;letter-spacing:.02em}
.identity .descr{margin:14px 0 0;color:var(--ink-dim);font-size:.86rem;line-height:1.55}
.identity .hours{margin:10px 0 0;font-size:.78rem;color:var(--ink-dim);letter-spacing:.02em}

.links{width:100%;max-width:var(--card-w);margin-top:30px;display:flex;flex-direction:column;gap:12px}
.link{--d:0ms;position:relative;display:flex;align-items:center;gap:14px;padding:15px 18px;text-decoration:none;color:var(--ink);background:rgba(244,241,234,.045);border:1px solid var(--line);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transform:translateY(16px);transition:opacity .7s cubic-bezier(.22,.61,.36,1) var(--d),transform .7s cubic-bezier(.22,.61,.36,1) var(--d),background .25s ease,border-color .25s ease}
body.content-in .link{opacity:1;transform:translateY(0)}
.link::before,.link::after{content:'';position:absolute;width:9px;height:9px;border-color:var(--accent);opacity:.9}
.link::before{top:-1px;left:-1px;border-top:1.5px solid var(--accent);border-left:1.5px solid var(--accent)}
.link::after{bottom:-1px;right:-1px;border-bottom:1.5px solid var(--accent);border-right:1.5px solid var(--accent)}
@media (hover:hover){.link:hover{background:rgba(244,241,234,.09);border-color:rgba(244,241,234,.28)}}
.link__icon{flex:none;width:21px;height:21px;color:var(--accent)}
.link__icon svg{width:100%;height:100%;display:block}
.link__label{font-family:'Space Grotesk',sans-serif;font-size:.96rem;font-weight:600}
.link__go{margin-left:auto;color:var(--ink-dim);font-size:1.1rem;transition:transform .2s ease}
.link:hover .link__go{transform:translateX(3px)}

.foot{margin-top:40px;font-size:.72rem;letter-spacing:.06em;color:rgba(185,182,174,.55);opacity:0;transition:opacity 1s ease .3s}
body.content-in .foot{opacity:1}
${anteprima ? '.banner{position:fixed;top:0;left:0;right:0;z-index:30;background:var(--accent);color:#0a0a0a;text-align:center;padding:8px;font-family:\'Space Grotesk\',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:1px}' : ""}
</style></head>
<body>
${anteprima ? '<div class="banner">ANTEPRIMA — QUESTA PAGINA NON E\' ANCORA PUBBLICA</div>' : ""}
<div class="scene" aria-hidden="true"><div class="scene__photo"></div><div class="scene__tint"></div></div>
<div class="intro" aria-hidden="true"></div>
<div class="logo-wrap">${blocLogo}</div>

<main class="stage">
  <section class="identity">
    <h1>${nome}</h1>
    ${azienda.sector ? `<p class="sub">${escapeHtml(azienda.sector)}</p>` : ""}
    ${pagina?.description ? `<p class="descr">${escapeHtml(pagina.description)}</p>` : ""}
    ${pagina?.hours ? `<p class="hours">🕒 ${escapeHtml(pagina.hours)}</p>` : ""}
  </section>
  <nav class="links" aria-label="Link">${righeLink}</nav>
  <p class="foot">Powered by RoleFigz NFC</p>
</main>

<script>
  var body = document.body;
  setTimeout(function(){ body.classList.add('logo-in'); }, 300);
  setTimeout(function(){ body.classList.add('revealed'); }, 2200);
  setTimeout(function(){ body.classList.add('content-in'); }, 2200 + 1500);
</script>
</body></html>`;
}

module.exports = { renderPaginaAnimata };
