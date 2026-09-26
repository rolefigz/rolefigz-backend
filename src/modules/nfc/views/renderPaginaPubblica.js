const { validaUrlSicuro } = require("../utils/urlSicuro");

function escapeHtml(valore) {
  return String(valore || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
const escapeAttr = escapeHtml;

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

const DIMENSIONI_LOGO = { piccolo: { centro: 84, header: 48 }, medio: { centro: 120, header: 68 }, grande: { centro: 162, header: 92 } };

function colorEsadecimaleValido(v) { return /^#[0-9a-f]{6}$/i.test(v || ""); }

function esColoreChiaro(hex) {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

function hexARgba(hex, alphaPercento) {
  const alpha = Math.max(0, Math.min(100, parseInt(alphaPercento, 10) || 0)) / 100;
  const c = colorEsadecimaleValido(hex) ? hex.replace("#", "") : "F4F1EA";
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// azienda: Company, pagina: CompanyPage|null, links: PageLink[]
// opts.anteprima: mostra un banner "anteprima" e blocca l'indicizzazione
// opts.accessibile: false -> mostra il messaggio di abbonamento scaduto invece del contenuto
function renderPaginaPubblica(azienda, pagina, links, opts = {}) {
  const { anteprima = false, accessibile = true } = opts;
  const d = pagina?.design || {};

  const titolo = escapeHtml(pagina?.seo_title || azienda.name);
  const descrizioneSeo = escapeHtml(pagina?.seo_description || pagina?.description || `${azienda.name} su RoleFigz NFC`);
  const ogImage = pagina?.og_image || pagina?.logo_url || pagina?.background_url || "";

  if (!accessibile) {
    const contatto = process.env.SHOP_EMAIL || "info@rolefigz.com";
    return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${titolo}</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0A0A0A;color:#F4F1EA;font-family:Manrope,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
.box{max-width:420px}h1{font-size:1.2rem;margin-bottom:10px}p{color:#B9B6AE;font-size:.9rem;line-height:1.5}</style></head>
<body><div class="box"><h1>Pagina momentaneamente non disponibile</h1>
<p>Contatta RoleFigz per riattivare la pagina: <a href="mailto:${escapeAttr(contatto)}" style="color:#FF6A2C">${escapeHtml(contatto)}</a></p></div></body></html>`;
  }

  // ── Opzioni di aspetto, tutte con un fallback sicuro ──
  const coloreAccento = colorEsadecimaleValido(d.primaryColor) ? d.primaryColor : "#FF6A2C";
  const dimensioneLogo = DIMENSIONI_LOGO[d.logoSize] || DIMENSIONI_LOGO.medio;
  // backgroundType esplicito; se assente ma c'e' una foto gia' caricata (pagine create prima
  // di questa opzione), si comporta come "foto" per compatibilita'.
  const tipoSfondo = d.backgroundType || (pagina?.background_url ? "foto" : "nessuno");
  const coloreSfondo = colorEsadecimaleValido(d.backgroundColor) ? d.backgroundColor : "#0A0A0A";
  // 0 = foto a colori pieni senza filtro, 100 = filtro scuro/grigio al massimo
  // (utile per la leggibilita' del testo sopra foto molto chiare o vivaci).
  const backgroundOpacityNum = parseInt(d.backgroundOpacity, 10);
  const opacitaFoto = Math.max(0, Math.min(100, Number.isNaN(backgroundOpacityNum) ? 70 : backgroundOpacityNum)) / 100;
  const grigioFoto = Math.round(70 * opacitaFoto);
  const luminFoto = (1 - 0.58 * opacitaFoto).toFixed(2);
  const coloreBottoni = colorEsadecimaleValido(d.buttonColor) ? d.buttonColor : "#F4F1EA";
  const opacitaBottoni = d.buttonOpacity !== undefined ? d.buttonOpacity : 5;
  const coloreCaricamento = colorEsadecimaleValido(d.loadingColor) ? d.loadingColor : "#0A0A0A";

  const usaFoto = tipoSfondo === "foto" && pagina?.background_url;
  const coloreFondoBase = tipoSfondo === "colore" ? coloreSfondo : "#0A0A0A";
  const chiaro = tipoSfondo === "colore" && esColoreChiaro(coloreFondoBase);
  const coloreInk = chiaro ? "#141412" : "#F4F1EA";
  const coloreInkDim = chiaro ? "#5A574F" : "#B9B6AE";
  const coloreLinea = chiaro ? "rgba(20,20,18,0.14)" : "rgba(244,241,234,0.14)";
  const sfondoBottoni = hexARgba(coloreBottoni, opacitaBottoni);

  const nome = escapeHtml(azienda.name);
  const blocLogo = pagina?.logo_url
    ? `<img src="${escapeAttr(pagina.logo_url)}" alt="${escapeAttr(nome)}">`
    : `<div class="logo-fallback">${escapeHtml(nome.slice(0, 1).toUpperCase())}</div>`;

  // Il link punta al redirect interno /nfc/go/:id (non all'URL esterno
  // direttamente), cosi' ogni click passa da vaiAlLink e viene registrato
  // come evento link_click prima del redirect 302 verso la destinazione reale.
  // Path assoluto rispetto alla root del dominio (non dipende da
  // NFC_PUBLIC_BASE_URL) cosi' funziona anche se quella variabile manca.
  const righeLink = links.map((l, i) => {
    const urlSicuro = (() => { try { return validaUrlSicuro(l.url); } catch { return null; } })();
    if (!urlSicuro) return "";
    const target = urlSicuro.startsWith("http") ? ' target="_blank" rel="noopener"' : "";
    const icona = ICONE_SVG[l.type] || ICONE_SVG.custom;
    return `<a class="link" style="--d:${i * 70}ms" href="/nfc/go/${l.id}"${target}>
      <span class="link__icon">${icona}</span>
      <span class="link__label">${escapeHtml(l.label)}</span>
      <span class="link__go">›</span>
    </a>`;
  }).join("");

  const blocMappa = pagina?.map_embed_url ? `
    <div class="mappa">
      <iframe src="${escapeAttr(pagina.map_embed_url)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
    </div>` : "";

  const jsonLd = (pagina?.description || pagina?.hours) ? `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "LocalBusiness",
    name: azienda.name, description: pagina?.description || undefined, image: ogImage || undefined,
  }).replace(/</g, "\\u003c")}</script>` : "";

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${titolo}</title>
<meta name="theme-color" content="${coloreFondoBase}">
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
  --ink:${coloreInk}; --ink-dim:${coloreInkDim}; --void:${coloreFondoBase};
  --accent:${coloreAccento}; --line:${coloreLinea}; --card-w:440px; --btn-bg:${sfondoBottoni};
  --loading-bg:${coloreCaricamento};
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;min-height:100%;background:var(--void);color:var(--ink);font-family:'Manrope',sans-serif;-webkit-font-smoothing:antialiased;overflow-x:hidden}
@media (prefers-reduced-motion: reduce){ *{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important} }

${usaFoto ? `
.scene{position:fixed;inset:0;overflow:hidden;z-index:0}
.scene__photo{position:absolute;inset:-3%;width:106%;height:106%;background-image:url('${escapeAttr(pagina.background_url)}');background-size:cover;background-position:center;filter:grayscale(${grigioFoto}%) brightness(${luminFoto}) contrast(1.05);opacity:0;transform:scale(1);animation:kenburns 18s ease-in-out infinite alternate;animation-play-state:paused;transition:opacity 1.6s cubic-bezier(.22,.61,.36,1)}
.scene__tint{position:absolute;inset:0;background:radial-gradient(120% 90% at 50% 0%, rgba(10,10,10,0) 0%, rgba(10,10,10,.55) 60%, rgba(10,10,10,.92) 100%), rgba(12,12,12,.35)}
body.revealed .scene__photo{opacity:1;animation-play-state:running}
@keyframes kenburns{from{transform:scale(1)}to{transform:scale(1.07) translate(-1%,0%)}}
` : ""}

.intro{position:fixed;inset:0;background:var(--loading-bg);z-index:20;display:flex;align-items:center;justify-content:center;transition:opacity 1.4s cubic-bezier(.22,.61,.36,1)}
body.revealed .intro{opacity:0;pointer-events:none}

.logo-wrap{position:fixed;top:50%;left:50%;width:${dimensioneLogo.centro}px;height:${dimensioneLogo.centro}px;transform:translate(-50%,-50%) scale(.86);opacity:0;z-index:21;transition:top 1.5s cubic-bezier(.22,.61,.36,1),width 1.5s cubic-bezier(.22,.61,.36,1),height 1.5s cubic-bezier(.22,.61,.36,1),transform 1.5s cubic-bezier(.22,.61,.36,1),opacity 1s ease}
/* dopo che l'animazione si e' assestata, passa da "fixed" (ancorato allo
   schermo) ad "assoluto" (ancorato alla pagina) cosi' scorre col contenuto
   invece di restare incollato durante lo scroll */
body.assestato .logo-wrap{position:absolute}
.logo-wrap img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 0 40px rgba(255,106,44,.12))}
.logo-fallback{width:100%;height:100%;border-radius:24px;background:var(--accent);color:var(--void);display:flex;align-items:center;justify-content:center;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:${(dimensioneLogo.centro * 0.02).toFixed(2)}rem}
body.logo-in .logo-wrap{opacity:1;transform:translate(-50%,-50%) scale(1);animation:breathe 2.6s ease-in-out .2s 1}
@keyframes breathe{0%{transform:translate(-50%,-50%) scale(.94)}50%{transform:translate(-50%,-50%) scale(1.03)}100%{transform:translate(-50%,-50%) scale(1)}}
body.revealed .logo-wrap{top:60px;width:${dimensioneLogo.header}px;height:${dimensioneLogo.header}px;transform:translate(-50%,0) scale(1)}

.stage{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:${60 + dimensioneLogo.header + 40}px 24px 48px}
.identity{text-align:center;max-width:var(--card-w);opacity:0;transform:translateY(14px);transition:opacity .9s ease,transform .9s cubic-bezier(.22,.61,.36,1)}
body.content-in .identity{opacity:1;transform:translateY(0)}
.identity h1{font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:1.5rem;letter-spacing:.01em;margin:0 0 6px}
.identity .sub{margin:0;color:var(--ink-dim);font-size:.92rem;letter-spacing:.02em}
.identity .descr{margin:14px 0 0;color:var(--ink-dim);font-size:.86rem;line-height:1.55}
.identity .hours{margin:10px 0 0;font-size:.78rem;color:var(--ink-dim);letter-spacing:.02em}

.links{width:100%;max-width:var(--card-w);margin-top:30px;display:flex;flex-direction:column;gap:12px}
.link{--d:0ms;position:relative;display:flex;align-items:center;gap:14px;padding:15px 18px;text-decoration:none;color:var(--ink);background:var(--btn-bg);border:1px solid var(--line);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transform:translateY(16px);transition:opacity .7s cubic-bezier(.22,.61,.36,1) var(--d),transform .7s cubic-bezier(.22,.61,.36,1) var(--d),background .25s ease,border-color .25s ease}
body.content-in .link{opacity:1;transform:translateY(0)}
.link::before,.link::after{content:'';position:absolute;width:9px;height:9px;border-color:var(--accent);opacity:.9}
.link::before{top:-1px;left:-1px;border-top:1.5px solid var(--accent);border-left:1.5px solid var(--accent)}
.link::after{bottom:-1px;right:-1px;border-bottom:1.5px solid var(--accent);border-right:1.5px solid var(--accent)}
@media (hover:hover){.link:hover{border-color:var(--accent)}}
.link__icon{flex:none;width:21px;height:21px;color:var(--accent)}
.link__icon svg{width:100%;height:100%;display:block}
.link__label{font-family:'Space Grotesk',sans-serif;font-size:.96rem;font-weight:600}
.link__go{margin-left:auto;color:var(--ink-dim);font-size:1.1rem;transition:transform .2s ease}
.link:hover .link__go{transform:translateX(3px)}

.mappa{width:100%;max-width:var(--card-w);margin-top:24px;opacity:0;transition:opacity .9s ease .3s}
body.content-in .mappa{opacity:1}
.mappa iframe{width:100%;height:220px;border:1px solid var(--line);display:block}

.foot{margin-top:40px;font-size:.72rem;letter-spacing:.06em;color:var(--ink-dim);opacity:0;transition:opacity 1s ease .3s}
body.content-in .foot{opacity:1}
${anteprima ? '.banner{position:fixed;top:0;left:0;right:0;z-index:30;background:var(--accent);color:#0a0a0a;text-align:center;padding:8px;font-family:\'Space Grotesk\',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:1px}' : ""}
</style></head>
<body>
${anteprima ? '<div class="banner">ANTEPRIMA — QUESTA PAGINA NON E\' ANCORA PUBBLICA</div>' : ""}
${usaFoto ? '<div class="scene" aria-hidden="true"><div class="scene__photo"></div><div class="scene__tint"></div></div>' : ""}
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
  ${blocMappa}
  <p class="foot">Powered by RoleFigz NFC</p>
</main>

<script>
  var body = document.body;
  setTimeout(function(){ body.classList.add('logo-in'); }, 300);
  setTimeout(function(){ body.classList.add('revealed'); }, 2200);
  setTimeout(function(){ body.classList.add('content-in'); }, 2200 + 1500);
  setTimeout(function(){ body.classList.add('assestato'); }, 2200 + 1500 + 50);
</script>
</body></html>`;
}

module.exports = { renderPaginaPubblica };
