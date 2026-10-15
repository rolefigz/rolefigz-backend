// Google Places API (New): cerca un'attività per nome + città e ne legge i dati pubblici di Google Maps
// (indirizzo, telefono, sito, orari, valutazione). Serve per la pagina NFC di prova del kit campione.
// Chiave: variabile d'ambiente GOOGLE_PLACES_API_KEY (Google Cloud, «Places API (New)» attiva).
const BASE = "https://places.googleapis.com/v1";

const CAMPI_RICERCA = [
  "places.id", "places.displayName", "places.formattedAddress", "places.primaryTypeDisplayName",
  "places.rating", "places.userRatingCount",
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
  const k = (process.env.GOOGLE_PLACES_API_KEY || "").trim();
  if (!k) throw new ErrorePlaces("Ricerca su Google Maps non disponibile al momento.", 503);
  return k;
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
  const dati = await chiama(`${BASE}/places:searchText`, {
    method: "POST",
    body: JSON.stringify({ textQuery: `${nome} ${citta}`.trim(), languageCode: "it", regionCode: "IT", pageSize: 3 }),
  }, CAMPI_RICERCA);
  return (dati.places || []).slice(0, 3).map(p => ({
    place_id: p.id,
    nome: p.displayName?.text || "",
    indirizzo: p.formattedAddress || "",
    categoria: p.primaryTypeDisplayName?.text || "",
    valutazione: p.rating || null,
    recensioni: p.userRatingCount || 0,
  }));
}

// Tutti i dati di un'attività (si rileggono sempre dal server: non ci si fida di quelli mandati dal browser)
async function dettaglioAttivita(placeId) {
  if (!ID_PLACE.test(placeId || "")) throw new ErrorePlaces("Attività non valida.", 400);
  const p = await chiama(`${BASE}/places/${encodeURIComponent(placeId)}?languageCode=it&regionCode=IT`,
                         { method: "GET" }, CAMPI_DETTAGLIO);
  return {
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
  };
}

// Link che apre direttamente la finestra «Scrivi una recensione» di Google per quell'attività
function linkRecensione(placeId) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

// Mappa incorporabile senza chiave (iframe)
function mappaEmbed(d) {
  // nome + indirizzo: Google mostra la scheda dell'attività (con le coordinate solo un segnaposto)
  const q = d.indirizzo ? `${d.nome}, ${d.indirizzo}` : `${d.lat},${d.lng}`;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}

module.exports = { cercaAttivita, dettaglioAttivita, linkRecensione, mappaEmbed, ErrorePlaces, ID_PLACE };
