const { Locandina } = require("../../../models");

const DURATA_DEFAULT_MS = 2 * 60 * 60 * 1000; // evento senza fine: 2 ore

// Una locandina e' visibile se e' attiva, la finestra mostra_dal/mostra_fino
// comprende "adesso" e, quando mostra_fino e' vuoto, l'evento non e' ancora
// finito (fine_evento, o inizio + 1 giorno se manca la fine).
function eVisibile(l, adesso = new Date()) {
  if (!l || !l.attiva) return false;
  if (l.mostra_dal && new Date(l.mostra_dal) > adesso) return false;
  if (l.mostra_fino) return new Date(l.mostra_fino) >= adesso;
  if (l.fine_evento) return new Date(l.fine_evento) >= adesso;
  if (l.inizio_evento) return new Date(l.inizio_evento).getTime() + 24 * 60 * 60 * 1000 >= adesso.getTime();
  return true;
}

// La pagina pubblica mostra una sola locandina: la piu' recente tra quelle visibili.
async function locandinaVisibile(companyId) {
  const candidate = await Locandina.findAll({
    where: { company_id: companyId, attiva: true },
    order: [["updatedAt", "DESC"]],
    limit: 20,
  });
  const adesso = new Date();
  return candidate.find(l => eVisibile(l, adesso)) || null;
}

function fineEvento(l) {
  if (l.fine_evento) return new Date(l.fine_evento);
  return new Date(new Date(l.inizio_evento).getTime() + DURATA_DEFAULT_MS);
}

// 20261205T190000Z
function dataUtcCompatta(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function linkGoogleCalendar(l, nomeAzienda) {
  if (!l.inizio_evento) return null;
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: l.titolo,
    dates: `${dataUtcCompatta(l.inizio_evento)}/${dataUtcCompatta(fineEvento(l))}`,
    details: [l.descrizione, nomeAzienda].filter(Boolean).join("\n\n"),
  });
  if (l.luogo) p.set("location", l.luogo);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

// RFC 5545: escape di \ ; , e a capo, righe piegate a 75 ottetti.
function escIcs(v) {
  return String(v || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function piegaRiga(riga) {
  const out = [];
  let resto = Buffer.from(riga, "utf8");
  while (resto.length > 75) {
    let taglio = 75;
    while (taglio > 0 && (resto[taglio] & 0xc0) === 0x80) taglio--; // non spezzare un carattere UTF-8
    out.push(resto.subarray(0, taglio).toString("utf8"));
    resto = Buffer.concat([Buffer.from(" "), resto.subarray(taglio)]);
  }
  out.push(resto.toString("utf8"));
  return out.join("\r\n");
}

function fileIcs(l, nomeAzienda, urlPagina) {
  const righe = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RoleFigz//NFC Locandine//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:locandina-${l.id}@rolefigz.com`,
    `DTSTAMP:${dataUtcCompatta(new Date())}`,
    `DTSTART:${dataUtcCompatta(l.inizio_evento)}`,
    `DTEND:${dataUtcCompatta(fineEvento(l))}`,
    `SUMMARY:${escIcs(l.titolo)}`,
    l.descrizione || nomeAzienda ? `DESCRIPTION:${escIcs([l.descrizione, nomeAzienda].filter(Boolean).join("\n\n"))}` : null,
    l.luogo ? `LOCATION:${escIcs(l.luogo)}` : null,
    urlPagina ? `URL:${escIcs(urlPagina)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return righe.map(piegaRiga).join("\r\n") + "\r\n";
}

module.exports = { eVisibile, locandinaVisibile, linkGoogleCalendar, fileIcs };
