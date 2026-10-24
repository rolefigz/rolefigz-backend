// SEO per /producto/:slug — la SPA riceve già nel primo HTML titolo, descrizione,
// Open Graph e dati strutturati del prodotto, così Google e le IA lo leggono senza JS.
// Solo letture dal DB; in caso di errore si serve index.html così com'è.
const fs   = require("fs");
const path = require("path");
const { Prodotto, Categoria, ImmagineProdotto } = require("../models");

const BASE = "https://www.rolefigz.com";
const INDEX = path.join(__dirname, "..", "..", "public", "index.html");

let indexCache = null;
let indexMtime = 0;
function leggiIndex() {
  const st = fs.statSync(INDEX);
  if (!indexCache || st.mtimeMs !== indexMtime) {
    indexCache = fs.readFileSync(INDEX, "utf8");
    indexMtime = st.mtimeMs;
  }
  return indexCache;
}

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const testoPiano = s => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const taglia = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);

async function htmlProdotto(slug) {
  const html = leggiIndex();
  const where = /^\d+$/.test(slug) ? { id: slug, activo: true } : { slug, activo: true };
  const p = await Prodotto.findOne({
    where,
    include: [
      { model: Categoria, attributes: ["nombre"] },
      { model: ImmagineProdotto, as: "imagenes", attributes: ["url", "orden"] }
    ],
    order: [[{ model: ImmagineProdotto, as: "imagenes" }, "orden", "ASC"]]
  });
  if (!p) return null;

  const url = `${BASE}/producto/${p.slug || p.id}`;
  const cat = p.Categoria ? p.Categoria.nombre : "";
  const titolo = `${p.nombre}${cat ? " — " + cat : ""} | Stampa 3D RoleFigz`;
  const desc = taglia(testoPiano(p.descripcion) || `${p.nombre} stampato in 3D a Piacenza da RoleFigz. Personalizzabile, spedizione in Italia ed Europa.`, 158);
  const immagini = (p.imagenes || []).map(i => i.url).filter(Boolean);
  if (!immagini.length && p.imagen) immagini.push(p.imagen);
  const img = immagini[0] || `${BASE}/assets/LogoSfondoNero.png`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.nombre,
    description: desc,
    image: immagini.length ? immagini : [img],
    sku: `RF-${String(p.id).padStart(4, "0")}`,
    brand: { "@type": "Brand", name: "RoleFigz" },
    category: cat || undefined,
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: parseFloat(p.precio).toFixed(2),
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "RoleFigz" }
    }
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Negozio", item: BASE },
      ...(cat ? [{ "@type": "ListItem", position: 2, name: cat, item: `${BASE}/#catalogo` }] : []),
      { "@type": "ListItem", position: cat ? 3 : 2, name: p.nombre, item: url }
    ]
  };

  const meta = `
  <meta name="description" content="${esc(desc)}"/>
  <link rel="canonical" href="${esc(url)}"/>
  <meta property="og:type" content="product"/>
  <meta property="og:title" content="${esc(titolo)}"/>
  <meta property="og:description" content="${esc(desc)}"/>
  <meta property="og:image" content="${esc(img)}"/>
  <meta property="og:url" content="${esc(url)}"/>
  <meta property="product:price:amount" content="${parseFloat(p.precio).toFixed(2)}"/>
  <meta property="product:price:currency" content="EUR"/>
  <meta name="twitter:title" content="${esc(titolo)}"/>
  <meta name="twitter:description" content="${esc(desc)}"/>
  <meta name="twitter:image" content="${esc(img)}"/>
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumb).replace(/</g, "\\u003c")}</script>`;

  return html
    // via i meta generici della home: li sostituiscono quelli del prodotto
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(titolo)}</title>`)
    .replace(/\s*<meta name="description"[^>]*>/, "")
    .replace(/\s*<link rel="canonical"[^>]*>/, "")
    .replace(/\s*<meta property="og:(title|description|image|url|type)"[^>]*>/g, "")
    .replace(/\s*<meta name="twitter:(title|description|image)"[^>]*>/g, "")
    .replace("</head>", `${meta}\n</head>`);
}

module.exports = { htmlProdotto };
