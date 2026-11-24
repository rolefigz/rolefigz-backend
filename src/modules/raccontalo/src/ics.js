// Lettore minimo di calendari .ics (Google Calendar, Outlook, Apple).
// Da Google: Impostazioni calendario → "Indirizzo segreto in formato iCal".

function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function unescape(v = "") {
  return v.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim();
}

/** 20261126T090000Z | 20261126T090000 | 20261126 → ISO string */
function parseDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h = "09", mi = "00", s = "00", z] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? "Z" : ""}`;
  const date = new Date(iso);
  return isNaN(date) ? null : date.toISOString();
}

export function parseIcs(text) {
  const lines = unfold(text).split("\n");
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) cur = {};
    else if (line.startsWith("END:VEVENT")) {
      if (cur && cur.title && cur.date) events.push(cur);
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(":");
      if (idx < 0) continue;
      const key = line.slice(0, idx).split(";")[0].toUpperCase();
      const val = line.slice(idx + 1);
      if (key === "SUMMARY") cur.title = unescape(val);
      else if (key === "DESCRIPTION") cur.description = unescape(val);
      else if (key === "LOCATION") cur.location = unescape(val);
      else if (key === "UID") cur.uid = val.trim();
      else if (key === "DTSTART") cur.date = parseDate(val);
    }
  }
  return events;
}

export async function fetchIcs(url) {
  const res = await fetch(url.replace(/^webcal:/i, "https:"));
  if (!res.ok) throw new Error(`Calendario non raggiungibile (HTTP ${res.status})`);
  return parseIcs(await res.text());
}
