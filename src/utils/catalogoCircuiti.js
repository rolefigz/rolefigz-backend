// Catalogo dei circuiti 3D per il pannello (form ordini a mano e analytics).
// Copia dei dati di public/circuiti/index.html (INFO, SIZES, CALENDARS, GADGETS):
// se cambia il catalogo li', va aggiornato anche qui.

const CIRCUITI = [
  ["melbourne", "Albert Park"], ["shanghai", "Shanghai"], ["suzuka", "Suzuka"], ["sakhir", "Sakhir"],
  ["jeddah", "Jeddah"], ["miami", "Miami"], ["montreal", "Montréal"], ["monaco", "Monaco"],
  ["barcelona", "Barcellona"], ["spielberg", "Red Bull Ring"], ["silverstone", "Silverstone"],
  ["spa", "Spa-Francorchamps"], ["hungaroring", "Hungaroring"], ["zandvoort", "Zandvoort"],
  ["monza", "Monza"], ["madrid", "Madrid"], ["baku", "Baku"], ["austin", "Austin"],
  ["mexico-city", "Città del Messico"], ["interlagos", "Interlagos"], ["las-vegas", "Las Vegas"],
  ["lusail", "Lusail"], ["yas-marina", "Yas Marina"], ["le-mans", "Le Mans"], ["nordschleife", "Nordschleife"],
  ["daytona", "Daytona"], ["bathurst", "Bathurst"], ["sebring", "Sebring"], ["paul-ricard", "Paul Ricard"],
  ["brands-hatch", "Brands Hatch"], ["misano", "Misano"], ["magny-cours", "Magny-Cours"],
  ["nurburgring", "Nürburgring"], ["portimao", "Portimão"], ["imola", "Imola"], ["mugello", "Mugello"],
  ["vallelunga", "Vallelunga"],
].map(([slug, nome]) => ({ slug, nome }));

const TAGLIE = [
  { id: "S", label: "Piccolo", prezzo: 17.99 },
  { id: "M", label: "Medio",   prezzo: 24.99 },
  { id: "L", label: "Grande",  prezzo: 32.99 },
];

const PRODOTTI = [
  ...["2024", "2025", "2026", "2027"].map(y => ({ slug: `calendario-f1-${y}`, nome: `Calendario F1 ${y}`, categoria: "Calendario", prezzo: 24.99 })),
  { slug: "mensola-alettone-gt3rs", nome: "Mensola alettone GT3 RS",        categoria: "Mensola",        prezzo: null },
  { slug: "portachiavi-f1-rosso",   nome: "Portachiavi F1 rosso",           categoria: "Portachiavi",    prezzo: null },
  { slug: "portachiavi-f1-nero",    nome: "Portachiavi F1 nero",            categoria: "Portachiavi",    prezzo: null },
  { slug: "sagoma-spa",             nome: "Sagoma da parete Spa",           categoria: "Decorazione",    prezzo: null },
  { slug: "sottobicchieri-f1",      nome: "Sottobicchieri F1 con supporto", categoria: "Sottobicchieri", prezzo: null },
];

const CANALI = [
  { id: "web",       label: "Sito web" },
  { id: "whatsapp",  label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "evento",    label: "Evento / fiera" },
  { id: "persona",   label: "Di persona" },
  { id: "nrg",       label: "NRG Sim Racing" },
  { id: "altro",     label: "Altro" },
];

const nomeCircuito = new Map(CIRCUITI.map(c => [c.slug, c.nome]));
const tagliaDaLabel = new Map(TAGLIE.map(t => [t.label.toLowerCase(), t.id]));
const prodottoPerNome = new Map(PRODOTTI.map(p => [p.nome.toLowerCase(), p]));

// Porta ogni riga d'ordine alla stessa forma, anche quelle salvate prima che
// la pagina mandasse tipo/slug/taglia (allora c'erano solo nome e meta testuali).
function normalizzaArticolo(a) {
  const quantita = Math.max(1, parseInt(a.quantita, 10) || 1);
  const prezzo = Number(a.prezzo) || 0;
  if (a.tipo) {
    return {
      tipo: a.tipo, slug: a.slug || null, taglia: a.taglia || null,
      nome: a.tipo === "circuito" ? (nomeCircuito.get(a.slug) || a.nome) : a.nome,
      categoria: a.tipo === "circuito" ? "Circuito" : (a.categoria || "Altro"),
      prezzo, quantita,
    };
  }
  const meta = String(a.meta || "");
  if (meta.includes(" · ")) {
    const label = (meta.split(" · ")[1] || "").split(",")[0].trim().toLowerCase();
    return { tipo: "circuito", slug: null, taglia: tagliaDaLabel.get(label) || null,
      nome: String(a.nome || "").split(" — ")[0], categoria: "Circuito", prezzo, quantita };
  }
  const p = prodottoPerNome.get(String(a.nome || "").toLowerCase());
  return { tipo: "prodotto", slug: p?.slug || null, taglia: null, nome: a.nome,
    categoria: p?.categoria || meta || "Altro", prezzo, quantita };
}

module.exports = { CIRCUITI, TAGLIE, PRODOTTI, CANALI, normalizzaArticolo };
