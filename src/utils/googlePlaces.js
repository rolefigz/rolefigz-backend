// Google Places API (New): cerca un'attività per nome + città e ne legge i dati pubblici di Google Maps
// (indirizzo, telefono, sito, orari, valutazione). Serve per la pagina NFC di prova del kit campione.
// Chiave: variabile d'ambiente GOOGLE_PLACES_API_KEY (Google Cloud, «Places API (New)» attiva).
//
// Per non pagare mai: (1) tetto di chiamate al giorno salvato nel DB (PLACES_RICERCHE_GIORNO e
// PLACES_DETTAGLI_GIORNO, sotto la quota gratuita mensile divisa per 31); (2) la ricerca chiede solo campi
// «Pro» (niente valutazione, che la porterebbe a «Enterprise» con meno chiamate gratis); (3) cache di 24 h.
const { Op } = require("sequelize");
const ContatoreApi = require("../models/ContatoreApi");

const BASE = "https://places.googleapis.com/v1";
const TETTO = {
  ricerca: parseInt(process.env.PLACES_RICERCHE_GIORNO || "30", 10),
  dettaglio: parseInt(process.env.PLACES_DETTAGLI_GIORNO || "30", 10),
};
const CACHE_MS = 24 * 60 * 60 * 1000;
const cache = new Map();                                  // chiave → { scade, valore }

const CAMPI_RICERCA = [
  "places.id", "places.displayName", "places.formattedAddress", "places.primaryTypeDisplayName",
].join(",");

const CAMPI_DETTAGLIO = [
  "id", "displayName", "formattedAddress", "primaryTypeDisplayName", "nationalPhoneNumber",
  "internationalPhoneNumber", "websiteUri", "googleMapsUri", "regularOpeningHours.weekdayDescriptions",
  "rating", "userRatingCount", "location",
].join(",");

const ID_PLACE = /^[A-Za-z0-9_-]{10,300}$/;

class ErrorePlaces extends Error {
  constructor(messaggio, status = 502) { super(messaggio); this.status = status; }
}

function chiave() {
  // GOOGLE_PLACES_API_KEY; si accettano anche i nomi più comuni con cui si salva una chiave di Google Maps
  const nome = ["GOOGLE_PLACES_API_KEY", "GOOGLE_MAPS_API_KEY", "PLACES_API_KEY", "GOOGLE_API_KEY"]
    .find(n => (process.env[n] || "").trim());
  if (!nome) {
    console.error("Google Places: manca la variabile GOOGLE_PLACES_API_KEY nel servizio web");
    throw new ErrorePlaces("Ricerca su Google Maps non disponibile al momento.", 503);
  }
  const k = process.env[nome].trim();
  return k;
}

// Una chiamata in più di questo tipo oggi (fuso di Roma), se non si è al tetto; se sì, errore senza chiamare Google
async function consuma(tipo) {
  const giorno = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());   // AAAA-MM-GG
  const [riga] = await ContatoreApi.findOrCreate({ where: { giorno, chiave: "places_" + tipo }, defaults: { n: 0 } });
  // incremento condizionato in una sola query («n = n + 1 dove n < tetto»): due richieste insieme non lo superano
  const [aggiornate] = await ContatoreApi.update({ n: ContatoreApi.sequelize.literal("n + 1") },
    { where: { id: riga.id, n: { [Op.lt]: TETTO[tipo] } } });
  if (!aggiornate) {
    console.error(`Google Places: raggiunto il tetto giornaliero di ${tipo} (${TETTO[tipo]})`);
    throw new ErrorePlaces("Ricerca su Google Maps non disponibile oggi: riprova domani (puoi prenotare lo stesso).", 429);
  }
}

function daCache(k) {
  const c = cache.get(k);
  if (c && c.scade > Date.now()) return c.valore;
  cache.delete(k);
  return undefined;
}

function inCache(k, valore) {
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  cache.set(k, { scade: Date.now() + CACHE_MS, valore });
  return valore;
}

async function chiama(url, opzioni, campi) {
  let r;
  try {
    r = await fetch(url, {
      ...opzioni,
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": chiave(), "X-Goog-FieldMask": campi,
                 ...(opzioni.headers || {}) },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    if (err instanceof ErrorePlaces) throw err;
    throw new ErrorePlaces("Google Maps non risponde. Riprova tra poco.");
  }
  if (!r.ok) {
    const testo = (await r.text().catch(() => "")).slice(0, 300);
    console.error(`Google Places ${r.status}: ${testo}`);
    throw new ErrorePlaces(r.status === 404 ? "Attività non trovata su Google Maps." : "Ricerca su Google Maps non riuscita.",
                           r.status === 404 ? 404 : 502);
  }
  return r.json();
}

// Fino a 3 attività che corrispondono a «nome città» (in Italia, in italiano)
async function cercaAttivita(nome, citta) {
  const k = "r:" + `${nome} ${citta}`.toLowerCase().replace(/\s+/g, " ").trim();
  const inMemoria = daCache(k);
  if (inMemoria) return inMemoria;
  chiave();                                               // senza chiave non si conta la chiamata
  await consuma("ricerca");
  const dati = await chiama(`${BASE}/places:searchText`, {
    method: "POST",
    body: JSON.stringify({ textQuery: `${nome} ${citta}`.trim(), languageCode: "it", regionCode: "IT", pageSize: 3 }),
  }, CAMPI_RICERCA);
  return inCache(k, (dati.places || []).slice(0, 3).map(p => ({
    place_id: p.id,
    nome: p.displayName?.text || "",
    indirizzo: p.formattedAddress || "",
    categoria: p.primaryTypeDisplayName?.text || "",
  })));
}

// Tutti i dati di un'attività (si rileggono sempre dal server: non ci si fida di quelli mandati dal browser)
async function dettaglioAttivita(placeId) {
  if (!ID_PLACE.test(placeId || "")) throw new ErrorePlaces("Attività non valida.", 400);
  const inMemoria = daCache("d:" + placeId);
  if (inMemoria) return inMemoria;
  chiave();
  await consuma("dettaglio");
  const p = await chiama(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=it&regionCode=IT`,
                         { method: "GET" }, CAMPI_DETTAGLIO);
  return inCache("d:" + placeId, {
    place_id: p.id,
    nome: p.displayName?.text || "",
    indirizzo: p.formattedAddress || "",
    categoria: p.primaryTypeDisplayName?.text || "",
    telefono: p.nationalPhoneNumber || "",
    telefono_int: p.internationalPhoneNumber || "",
    sito: p.websiteUri || "",
    maps_url: p.googleMapsUri || "",
    orari: p.regularOpeningHours?.weekdayDescriptions || [],
    valutazione: p.rating || null,
    recensioni: p.userRatingCount || 0,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
  });
}

// Link che apre direttamente la finestra «Scrivi una recensione» di Google per quell'attività
function linkRecensione(placeId) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

// Mappa incorporabile senza chiave: lo stesso formato del codice iframe di Google («Condividi → Incorpora una
// mappa», /maps/embed?pb=…). Il vecchio «maps?q=…&output=embed» passa da un redirect con X-Frame-Options:
// SAMEORIGIN e alcuni browser lasciavano il riquadro vuoto.
function mappaEmbed(d) {
  // nome + indirizzo: Google mostra la scheda dell'attività (con le coordinate solo un segnaposto)
  const q = d.indirizzo ? `${d.nome}, ${d.indirizzo}` : `${d.lat},${d.lng}`;
  // nel parametro pb il «!» separa i campi: va codificato anche lui
  const testo = encodeURIComponent(q).replace(/%20/g, "+").replace(/!/g, "%21");
  return `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${testo}!6i16`;
}

module.exports = { cercaAttivita, dettaglioAttivita, linkRecensione, mappaEmbed, ErrorePlaces, ID_PLACE };
