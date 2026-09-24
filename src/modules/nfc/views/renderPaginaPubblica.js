const { validaUrlSicuro } = require("../utils/urlSicuro");
const { renderPaginaAnimata } = require("./renderPaginaAnimata");

const ICONA_LINK = {
  whatsapp: "💬", phone: "📞", email: "✉️", website: "🌐", instagram: "📷",
  facebook: "📘", tiktok: "🎵", linkedin: "💼", youtube: "▶️", menu: "📋",
  booking: "📅", maps: "📍", tripadvisor: "⭐", custom: "🔗",
};

function escapeHtml(valore) {
  return String(valore || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function escapeAttr(valore) {
  return escapeHtml(valore);
}

// azienda: Company, pagina: CompanyPage|null, links: PageLink[]
// opts.anteprima: mostra un banner "anteprima" e blocca l'indicizzazione
// opts.accessibile: false -> mostra il messaggio di abbonamento scaduto invece del contenuto
function renderPaginaPubblica(azienda, pagina, links, opts = {}) {
  const { anteprima = false, accessibile = true } = opts;
  const coloreAccento = (pagina?.design?.primaryColor && /^#[0-9a-f]{6}$/i.test(pagina.design.primaryColor))
    ? pagina.design.primaryColor : "#FF6A2C";
  const DIMENSIONI_LOGO = { piccolo: 64, medio: 96, grande: 136 };
  const dimensioneLogo = DIMENSIONI_LOGO[pagina?.design?.logoSize] || DIMENSIONI_LOGO.medio;

  const nome = escapeHtml(azienda.name);
  const titolo = escapeHtml(pagina?.seo_title || azienda.name);
  const descrizioneSeo = escapeHtml(pagina?.seo_description || pagina?.description || `${azienda.name} su RoleFigz NFC`);
  const ogImage = pagina?.og_image || pagina?.logo_url || "";

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

  // Un'azienda che ha caricato un'immagine di sfondo ottiene la versione
  // animata (stesso linguaggio visivo di /nfc/rolefigz); senza sfondo resta
  // la versione leggera, coerente con l'obiettivo di caricamento <1s.
  if (pagina?.background_url) {
    return renderPaginaAnimata(azienda, pagina, links, opts);
  }

  const righeLink = links.map(l => {
    const urlSicuro = (() => { try { return validaUrlSicuro(l.url); } catch { return null; } })();
    if (!urlSicuro) return "";
    const target = urlSicuro.startsWith("http") ? ' target="_blank" rel="noopener"' : "";
    return `<a class="link" href="${escapeAttr(urlSicuro)}"${target}>
      <span class="link__icon">${ICONA_LINK[l.type] || "🔗"}</span>
      <span class="link__label">${escapeHtml(l.label)}</span>
      <span class="link__go">›</span>
    </a>`;
  }).join("");

  const blocDescrizione = pagina?.description
    ? `<p class="descrizione">${escapeHtml(pagina.description)}</p>` : "";
  const blocOrario = pagina?.hours
    ? `<p class="orario">🕒 ${escapeHtml(pagina.hours)}</p>` : "";
  const blocLogo = pagina?.logo_url
    ? `<img class="logo" src="${escapeAttr(pagina.logo_url)}" alt="${escapeAttr(nome)}">`
    : `<div class="logo logo--placeholder">${escapeHtml(nome.slice(0, 1).toUpperCase())}</div>`;

  const jsonLd = (pagina?.description || pagina?.hours) ? `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": "LocalBusiness",
    name: azienda.name, description: pagina?.description || undefined,
    image: ogImage || undefined,
  }).replace(/</g, "\\u003c")}</script>` : "";

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>${titolo}</title>
<meta name="description" content="${escapeAttr(descrizioneSeo)}">
${anteprima ? '<meta name="robots" content="noindex">' : ""}
<meta property="og:title" content="${escapeAttr(titolo)}">
<meta property="og:description" content="${escapeAttr(descrizioneSeo)}">
${ogImage ? `<meta property="og:image" content="${escapeAttr(ogImage)}">` : ""}
${jsonLd}
<style>
:root{--accent:${coloreAccento}}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#0A0A0A;color:#F4F1EA;font-family:Manrope,-apple-system,sans-serif}
.stage{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:48px 20px}
.logo{width:${dimensioneLogo}px;height:${dimensioneLogo}px;border-radius:20px;object-fit:cover;margin-bottom:16px}
.logo--placeholder{display:flex;align-items:center;justify-content:center;background:var(--accent);color:#0A0A0A;font-size:${(dimensioneLogo * 0.025).toFixed(2)}rem;font-weight:700}
h1{font-size:1.4rem;margin:0 0 6px;text-align:center}
.descrizione{color:#B9B6AE;font-size:.92rem;text-align:center;max-width:420px;margin:0 0 4px;line-height:1.5}
.orario{color:#B9B6AE;font-size:.82rem;margin:0 0 24px}
.links{width:100%;max-width:420px;display:flex;flex-direction:column;gap:12px;margin-top:12px}
.link{display:flex;align-items:center;gap:14px;padding:16px 18px;text-decoration:none;color:#F4F1EA;background:rgba(244,241,234,.045);border:1px solid rgba(244,241,234,.14)}
.link__icon{font-size:1.3rem}
.link__label{font-weight:600;flex:1}
.link__go{color:#B9B6AE}
.foot{margin-top:40px;font-size:.7rem;color:rgba(185,182,174,.55)}
${anteprima ? '.banner{position:sticky;top:0;width:100%;background:var(--accent);color:#0A0A0A;text-align:center;padding:8px;font-size:.75rem;font-weight:700;letter-spacing:1px}' : ""}
</style></head>
<body>
${anteprima ? '<div class="banner">ANTEPRIMA — QUESTA PAGINA NON E\' ANCORA PUBBLICA</div>' : ""}
<main class="stage">
  ${blocLogo}
  <h1>${nome}</h1>
  ${blocDescrizione}
  ${blocOrario}
  <nav class="links" aria-label="Link">${righeLink}</nav>
  <p class="foot">Powered by RoleFigz NFC</p>
</main>
</body></html>`;
}

module.exports = { renderPaginaPubblica };
