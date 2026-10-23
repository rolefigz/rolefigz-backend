// Pagina NFC di prova del kit campione: /nfc/<slug> con i dati di Google Maps dell'attività, il suo logo come
// sfondo, la mappa e il bottone per lasciare una recensione su Google. Il QR dello stand campione la apre.
const { PaginaDemo, Company, RichiestaKit } = require("../models");
const places = require("./googlePlaces");
const { renderPaginaPubblica } = require("../modules/nfc/views/renderPaginaPubblica");

const GIORNI_VALIDITA = parseInt(process.env.NFC_DEMO_GIORNI || "60", 10);
// anche 2 caratteri: il QR del kit usa il nome dell'azienda così com'è (es. «2M» → /nfc/2m)
const SLUG = /^[a-z0-9-]{2,50}$/;

// slug del QR del kit: «rolefigz.com/nfc/bar-stella» → «bar-stella»
function slugDaQr(qrUrl) {
  const m = String(qrUrl || "").match(/\/nfc\/([a-z0-9-]+)\/?$/);
  return m && SLUG.test(m[1]) ? m[1] : null;
}

// Il logo caricato dal cliente (copia su Cloudinary) su una «piastrella» del colore che lo fa leggere: il PNG è
// trasparente e la pagina è scura, quindi un logo nero sparirebbe. Cloudinary dice i colori del logo: se è chiaro
// va su fondo scuro, altrimenti su fondo bianco. Ritorna l'URL trasformato (o quello originale se qualcosa va male).
async function logoSuPiastrella(logoUrl, logoId) {
  if (!logoUrl || !logoUrl.includes("/image/upload/")) return logoUrl || null;
  let fondo = "FFFFFF";
  try {
    const cloudinary = require("cloudinary").v2;
    const info = await cloudinary.api.resource(`rolefigz/kit-logos/kit-${logoId}`, { colors: true });
    // luminosità media dei colori del logo, pesata per la loro percentuale
    let somma = 0, peso = 0;
    for (const [hex, pct] of info.colors || []) {
      const c = parseInt(String(hex).slice(1, 7), 16);
      const lum = (0.299 * (c >> 16 & 255) + 0.587 * (c >> 8 & 255) + 0.114 * (c & 255)) / 255;
      somma += lum * pct; peso += pct;
    }
    if (peso && somma / peso > 0.75) fondo = "141412";
  } catch (err) {
    console.error("Colori del logo (Cloudinary):", err.message);
  }
  return logoUrl.replace("/image/upload/", `/image/upload/c_pad,w_600,h_600,b_rgb:${fondo},r_60/`);
}

// Colore dello sfondo (liso) della pagina: quello della piastrella del logo → bianco per un logo scuro, nero per
// un logo chiaro, così la piastrella si fonde con la pagina e si vede solo il logo
function coloreSfondo(logoUrl) {
  const m = String(logoUrl || "").match(/\/c_pad,w_600,h_600,b_rgb:([0-9A-F]{6}),r_60\//);
  return m && m[1] === "141412" ? "#141412" : "#FFFFFF";
}

// Crea (o aggiorna) la pagina di prova per una prenotazione. Ritorna la PaginaDemo o null se non si può
// (slug già usato da un'azienda vera del modulo NFC, o da un'altra prova ancora attiva di un altro cliente).
async function creaPaginaDemo(richiesta, placeId) {
  const slug = slugDaQr(richiesta.qr_url);
  if (!slug || slug === "rolefigz") return null;
  if (await Company.findOne({ where: { slug } })) return null;          // la pagina vera ha la precedenza
  const d = await places.dettaglioAttivita(placeId);                    // dati riletti da Google, mai dal browser
  const dati = {
    slug, richiesta_id: richiesta.id, place_id: d.place_id, nome: d.nome || richiesta.azienda,
    categoria: d.categoria || null, indirizzo: d.indirizzo || null, telefono: d.telefono || null,
    telefono_int: d.telefono_int || null, sito: d.sito || null, maps_url: d.maps_url || null, orari: d.orari,
    valutazione: d.valutazione, recensioni: d.recensioni, lat: d.lat, lng: d.lng,
    logo_url: await logoSuPiastrella(richiesta.logo_url, richiesta.logo_id),     // il logo che ha caricato il cliente
    scadenza: new Date(Date.now() + GIORNI_VALIDITA * 24 * 60 * 60 * 1000), attiva: true,
  };
  const esistente = await PaginaDemo.findOne({ where: { slug } });
  if (esistente) {
    if (esistente.attiva && new Date(esistente.scadenza) > new Date() && esistente.richiesta_id !== richiesta.id &&
        !(await prenotazioneLibera(esistente.richiesta_id, richiesta.email))) {
      return null;                                                      // è di un altro cliente
    }
    return esistente.update(dati);
  }
  return PaginaDemo.create(dati);
}

// La pagina di prova di un'altra prenotazione si può riprendere se quella prenotazione è annullata o non esiste
// più, o se è dello stesso cliente (stessa email): così rifare la prova per la stessa attività non resta bloccato
async function prenotazioneLibera(richiestaId, email) {
  const precedente = richiestaId ? await RichiestaKit.findByPk(richiestaId) : null;
  return !precedente || precedente.stato === "annullato" ||
    String(precedente.email || "").toLowerCase() === String(email || "").toLowerCase();
}

// L'orario di oggi (fuso di Roma) dalla lista settimanale di Google, es. «Oggi: 9:00–13:00, 15:00–19:30»
function orarioDiOggi(orari) {
  if (!Array.isArray(orari) || orari.length !== 7) return "";
  const giorno = new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: "Europe/Rome" }).format(new Date());
  const riga = orari.find(o => o.toLowerCase().startsWith(giorno.toLowerCase()));
  return riga ? "Oggi: " + riga.slice(riga.indexOf(":") + 1).trim() : "";
}

function cifre(v) { return String(v || "").replace(/[^\d]/g, ""); }

function linkDemo(p) {
  const links = [];
  const aggiungi = (type, label, url) => links.push({ id: links.length + 1, type, label, url });
  if (p.telefono_int || p.telefono) aggiungi("phone", "Chiama", `tel:${(p.telefono_int || p.telefono).replace(/[^\d+]/g, "")}`);
  // i cellulari italiani iniziano per 3: lì si può scrivere su WhatsApp
  const naz = cifre(p.telefono);
  if (naz.startsWith("3") && naz.length >= 9) aggiungi("whatsapp", "Scrivici su WhatsApp", `https://wa.me/39${naz}`);
  if (p.sito) aggiungi("website", "Sito web", p.sito);
  if (p.maps_url) aggiungi("maps", "Come arrivare", p.maps_url);
  aggiungi("tripadvisor", "Lascia una recensione su Google", places.linkRecensione(p.place_id));
  return links;
}

function renderPaginaDemo(p) {
  const voto = p.valutazione ? ` · ★ ${String(Number(p.valutazione).toFixed(1)).replace(".", ",")}` +
    (p.recensioni ? ` (${p.recensioni} recensioni)` : "") : "";
  const azienda = { name: p.nome, sector: (p.categoria || "") + voto || null };
  const pagina = {
    // sfondo liso, bianco o nero secondo il logo del cliente
    logo_url: p.logo_url, background_url: null,
    design: { backgroundType: "colore", backgroundColor: coloreSfondo(p.logo_url), logoSize: "grande",
              buttonColor: coloreSfondo(p.logo_url) === "#FFFFFF" ? "#141412" : "#F4F1EA", buttonOpacity: 6,
              loadingColor: coloreSfondo(p.logo_url) },
    map_embed_url: places.mappaEmbed(p), description: p.indirizzo, hours: orarioDiOggi(p.orari),
    seo_title: `${p.nome} — anteprima RoleFigz NFC`,
  };
  return renderPaginaPubblica(azienda, pagina, linkDemo(p), {
    anteprima: true, linkDiretti: true, testoBanner: "ANTEPRIMA DI PROVA CREATA DA ROLEFIGZ",
  });
}

// Da pagina di prova ad azienda del modulo NFC (Aziende nel pannello), quando lo decide l'admin dal bottone
// «Crea azienda» del Kit campione: azienda attiva con la pagina pubblicata (logo, mappa, link e recensione),
// abbonamento in prova fino alla scadenza della pagina di prova. `ownerUserId`: chi ha scelto l'admin.
async function aziendaDaDemo(p, ownerUserId, actorUserId, transaction) {
  const { CompanyPage, PageLink, Subscription, Plan } = require("../models");
  const { registraAzione } = require("../modules/nfc/services/auditLogService");
  const ErroreAzienda = require("../modules/nfc/utils/erroreAzienda");
  const t = { transaction };
  if (await Company.findOne({ where: { slug: p.slug }, paranoid: false, ...t })) {
    throw new ErroreAzienda(`Esiste già un'azienda con lo slug «${p.slug}»`, 400);
  }
  const piano = await Plan.findOne({ where: { active: true }, order: [["monthly_price_cents", "ASC"], ["id", "ASC"]], ...t });
  if (!piano) throw new ErroreAzienda("Nessun piano attivo: creane uno in NFC → Piani", 400);
  const fondo = coloreSfondo(p.logo_url);
  const azienda = await Company.create({ owner_user_id: ownerUserId, name: p.nome, slug: p.slug,
                                         sector: p.categoria || null }, t);
  await CompanyPage.create({
    company_id: azienda.id, is_published: true, published_at: new Date(),
    logo_url: p.logo_url, map_embed_url: places.mappaEmbed(p), description: p.indirizzo || null, seo_title: p.nome,
    design: { backgroundType: "colore", backgroundColor: fondo, logoSize: "grande",
              buttonColor: fondo === "#FFFFFF" ? "#141412" : "#F4F1EA", buttonOpacity: 6, loadingColor: fondo },
  }, t);
  for (const [i, l] of linkDemo(p).entries()) {
    await PageLink.create({ company_id: azienda.id, type: l.type, label: l.label, url: l.url, position: i }, t);
  }
  const fine = new Date(p.scadenza) > new Date() ? p.scadenza : new Date(Date.now() + GIORNI_VALIDITA * 864e5);
  await Subscription.create({ company_id: azienda.id, plan_id: piano.id, status: "trial", started_at: new Date(),
                              trial_ends_at: fine }, t);
  await registraAzione({ actorUserId, companyId: azienda.id, action: "company_created",
                         details: { da: "pagina di prova del kit campione", richiesta_id: p.richiesta_id } }, transaction);
  return azienda;
}

// La pagina di prova attiva per questo slug, o null
async function trovaPaginaDemo(slug) {
  const p = await PaginaDemo.findOne({ where: { slug, attiva: true } });
  return p && new Date(p.scadenza) > new Date() ? p : null;
}

module.exports = { creaPaginaDemo, aziendaDaDemo, renderPaginaDemo, trovaPaginaDemo, slugDaQr, linkDemo, orarioDiOggi, coloreSfondo,
                   logoSuPiastrella };
