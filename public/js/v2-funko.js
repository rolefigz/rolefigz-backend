// Creatore Funko: la foto va al server, che disegna la Funko con i tratti della persona (o dell'animale)
// e la trasforma in 3D. Se il servizio non è attivo, il cliente ci manda la foto su WhatsApp e la facciamo noi.
const $ = id => document.getElementById(id);
const app = $('fkApp');
const form = $('fkForm');
const input = $('fkFoto');
const drop = $('fkDrop');
const anteprima = $('fkAnteprima');
const crea = $('fkCrea');
const errore = $('fkErr');
const consenso = $('fkConsenso');
const viewer = $('fkViewer');
const WA = 'https://wa.me/393928225406?text=';

let foto = null;          // { blob, url, canvas }
let cronometro = null;
let attesa = null;
let immagine2d = null;    // immagine Funko generata (se c'è)
let lavoroId = null;

const tipo = () => form.querySelector('input[name="tipo"]:checked').value;
const nomeScatola = () => $('fkNome').value.toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 14);
let scatolaUrl = null;   // immagine composta: Funko + scatola con il nome
const pausa = ms => new Promise(r => setTimeout(r, ms));

// ── 1 · la foto ─────────────────────────────────────────────
async function preparaFoto(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Usa una foto JPG, PNG o WEBP.');
  if (file.size > 25 * 1024 * 1024) throw new Error('La foto è troppo pesante.');
  const src = URL.createObjectURL(file);
  const img = new Image();
  img.src = src;
  await img.decode().catch(() => { throw new Error('Non riusciamo a leggere questa foto. Prova con un\'altra.'); });
  // lato lungo 1280 px: abbastanza per i dettagli, leggera da inviare
  const s = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * s);
  canvas.height = Math.round(img.naturalHeight * s);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(src);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
  return { blob, url: URL.createObjectURL(blob), canvas };
}

async function scegliFile(file) {
  if (!file) return;
  errore.textContent = '';
  try {
    if (foto) URL.revokeObjectURL(foto.url);
    foto = await preparaFoto(file);
    anteprima.src = foto.url;
    anteprima.hidden = false;
    drop.classList.add('has-foto');
  } catch (e) {
    foto = null;
    errore.textContent = e.message;
  }
  aggiornaBottone();
}

function aggiornaBottone() { crea.disabled = !(foto && consenso.checked); }

input.addEventListener('change', () => scegliFile(input.files[0]));
consenso.addEventListener('change', aggiornaBottone);
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-over'); }));
drop.addEventListener('drop', e => scegliFile(e.dataTransfer.files[0]));

// ── stati della scheda ──────────────────────────────────────
function stato(s) {
  app.dataset.stato = s;
  const r = app.getBoundingClientRect();
  if (r.top < 0 || r.top > innerHeight * 0.6) app.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fase(n) {
  document.querySelectorAll('#fkFasi li').forEach(li => {
    const f = +li.dataset.fase;
    li.classList.toggle('is-done', f < n);
    li.classList.toggle('is-on', f === n);
  });
}

function avviaCronometro() {
  const t0 = Date.now();
  clearInterval(cronometro);
  $('fkSec').textContent = '0';
  cronometro = setInterval(() => { $('fkSec').textContent = Math.round((Date.now() - t0) / 1000); }, 1000);
}

function torna(messaggio) {
  clearInterval(cronometro);
  scatolaUrl = null;
  $('fkTabScatola').hidden = true;
  clearTimeout(attesa);
  app.classList.remove('has-2d');
  errore.textContent = messaggio || '';
  stato('scegli');
}

// ── 2 · invio e avanzamento ─────────────────────────────────
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!foto || !consenso.checked) return;
  errore.textContent = '';
  immagine2d = null;
  $('fkFotoLavoro').src = foto.url;
  $('fkFotoLavoro').hidden = false;
  app.classList.remove('has-2d');
  fase(1);
  avviaCronometro();
  stato('lavoro');

  const dati = new FormData();
  dati.append('foto', foto.blob, 'foto.jpg');
  dati.append('tipo', tipo());
  dati.append('note', $('fkNote').value.trim());
  dati.append('nome', nomeScatola());
  dati.append('consenso', 'si');

  let r, risposta = {};
  try {
    r = await fetch('/api/funko/genera', { method: 'POST', body: dati });
    risposta = await r.json().catch(() => ({}));
  } catch (_) {
    return torna('Connessione assente. Controlla la rete e riprova.');
  }
  if (r.status === 202 && risposta.id) return segui(risposta.id);
  if (risposta.demo || r.status === 503) return mostraWhatsapp();
  torna(risposta.error || 'Qualcosa è andato storto. Riprova tra poco.');
});

function segui(id) {
  lavoroId = id;
  try { history.replaceState(null, '', `${location.pathname}?f=${id}`); } catch (_) {}
  const inizio = Date.now();
  const giro = async () => {
    if (Date.now() - inizio > 7 * 60 * 1000) return torna('Ci sta mettendo più del solito. Riprova tra qualche minuto.');
    let d = null;
    try {
      const r = await fetch(`/api/funko/${id}`, { cache: 'no-store' });
      d = await r.json();
      if (r.status === 404) return torna(d.error || 'Questa Funko non è più disponibile: creane una nuova.');
    } catch (_) { /* rete instabile: si riprova */ }
    if (d) {
      // senza 3D attivo la fase "scolpiamo in 3D" non c'è
      document.querySelector('#fkFasi [data-fase="3"]').hidden = d.con3d === false;
      if (d.immagine && !immagine2d) mostra2d(d.immagine);
      else if (!d.immagine) fase(Date.now() - inizio > 5000 ? 2 : 1);
      if (d.stato === 'pronto') return risultato(d);
      if (d.stato === 'errore') return torna(d.errore);
    }
    attesa = setTimeout(giro, 2500);
  };
  giro();
}

function mostra2d(url) {
  immagine2d = url;
  const img = $('fkImg2d');
  img.onload = () => app.classList.add('has-2d');
  img.src = url;
  fase(3);
}

// ── 3 · risultato ───────────────────────────────────────────
function risultato(d) {
  clearInterval(cronometro);
  fase(4);
  if (d.immagine) immagine2d = d.immagine;
  const con3d = !!d.modello;
  $('fkTab3d').hidden = !con3d;
  viewer.parentElement.classList.toggle('no-3d', !con3d);
  if (con3d) { viewer.src = d.modello; vista('3d'); }
  preparaScatola(immagine2d, d.nome || nomeScatola(), true).then(() => { if (!con3d) vista('scatola'); });
  $('fkCodice').textContent = d.id;
  $('fkCodiceRiga').hidden = false;
  const link = `${location.origin}/funko?f=${d.id}`;
  const chi = d.nome ? ` (${d.nome})` : '';
  $('fkOrdina').href = WA + encodeURIComponent(`Ciao RoleFigz! Ho creato la mia Funko${chi} sul sito e vorrei stamparla con la sua scatola. Codice: ${d.id} ${link}`);
  stato('pronto');
}

function vista(v) {
  document.querySelectorAll('.fk-viewer-tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.vista === v)));
  $('fkViewerImg').hidden = v !== 'scatola';
  viewer.style.visibility = v === 'scatola' ? 'hidden' : '';
}
document.querySelector('.fk-viewer-tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-vista]');
  if (b) vista(b.dataset.vista);
});
viewer.addEventListener('camera-change', e => {
  if (e.detail?.source === 'user-interaction') viewer.parentElement.classList.add('is-touched');
});

$('fkScarica').addEventListener('click', async () => {
  try {
    const blob = scatolaUrl
      ? await (await fetch(scatolaUrl)).blob()
      : await viewer.toBlob({ mimeType: 'image/png', idealAspect: true });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'la-mia-funko-rolefigz.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (_) { /* il browser non permette il salvataggio */ }
});

$('fkRifai').addEventListener('click', () => {
  try { history.replaceState(null, '', location.pathname); } catch (_) {}
  lavoroId = null;
  torna('');
});

// link condiviso: /funko?f=codice mostra la Funko già creata
const condivisa = new URLSearchParams(location.search).get('f');
if (condivisa && /^[a-f0-9]{12}$/.test(condivisa)) {
  $('fkFotoLavoro').hidden = true;
  fase(2);
  avviaCronometro();
  stato('lavoro');
  segui(condivisa);
}

// ── servizio non attivo: la foto arriva a noi su WhatsApp ──
function mostraWhatsapp() {
  clearInterval(cronometro);
  $('fkWaFoto').src = foto.url;
  const nome = nomeScatola(), note = $('fkNote').value.trim();
  const testo = 'Ciao RoleFigz! Vorrei la mia Funko personalizzata' +
    (tipo() === 'animale' ? ' del mio animale' : '') +
    (nome ? `, con il nome ${nome} sulla scatola` : '') +
    (note ? `. Dettagli: ${note}` : '') + '. Vi mando la foto qui.';
  $('fkWaBtn').href = WA + encodeURIComponent(testo);
  stato('whatsapp');
}
$('fkWaIndietro').addEventListener('click', () => torna(''));

// ── la scatola personalizzata (come le Funko RoleFigz: rossa, nome, numero, logo) ──
async function preparaScatola(src, nome, sfondoBianco) {
  if (!src) return;
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    await document.fonts.load('800 80px "Barlow Condensed"').catch(() => {});
    const canvas = disegnaScatola(ritaglia(img, sfondoBianco), nome || 'LA MIA FUNKO', sfondoBianco);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    if (scatolaUrl) URL.revokeObjectURL(scatolaUrl);
    scatolaUrl = URL.createObjectURL(blob);
    $('fkViewerImg').src = scatolaUrl;
    $('fkTabScatola').hidden = false;
  } catch (e) { console.error('scatola', e); }
}

// toglie i margini vuoti (trasparenti o bianchi) così la figura poggia sulla mensola
function ritaglia(img, sfondoBianco) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0);
  const { data, width, height } = x.getImageData(0, 0, c.width, c.height);
  const pieno = i => (sfondoBianco ? Math.min(data[i], data[i + 1], data[i + 2]) < 236 : data[i + 3] > 12);
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y += 2) for (let xx = 0; xx < width; xx += 2) {
    if (!pieno((y * width + xx) * 4)) continue;
    if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 <= x0 || y1 <= y0) return img;
  const m = 6, out = document.createElement('canvas');
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(width, x1 + m); y1 = Math.min(height, y1 + m);
  out.width = x1 - x0; out.height = y1 - y0;
  out.getContext('2d').drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  out.naturalWidth = out.width; out.naturalHeight = out.height;
  return out;
}

function disegnaScatola(figura, nome, sfondoBianco) {
  const W = 1400, H = 1100;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';
  const poli = (pts, fill) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fillStyle = fill; x.fill(); };
  const lineare = (x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const scritta = (t, cx, cy, size, maxW) => {
    let s = size;
    x.font = `800 ${s}px ${FONT}`;
    while (maxW && x.measureText(t).width > maxW && s > 20) { s -= 2; x.font = `800 ${s}px ${FONT}`; }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.lineWidth = Math.max(4, s * 0.09); x.strokeStyle = '#3d0d06';
    x.strokeText(t, cx, cy);
    x.fillStyle = '#F4B63F'; x.fillText(t, cx, cy);
  };

  // sfondo: parete chiara e mensola
  x.fillStyle = lineare(0, 0, 0, H, [[0, '#f5f3ee'], [1, '#e2ded5']]); x.fillRect(0, 0, W, H);
  x.fillStyle = lineare(0, 975, 0, H, [[0, '#d5d0c6'], [1, '#c4beb2']]); x.fillRect(0, 975, W, H - 975);
  x.fillStyle = 'rgba(255,255,255,.6)'; x.fillRect(0, 975, W, 3);

  // ombra della scatola
  x.save(); x.filter = 'blur(18px)'; x.fillStyle = 'rgba(0,0,0,.28)';
  x.beginPath(); x.ellipse(450, 985, 330, 26, 0, 0, Math.PI * 2); x.fill(); x.restore();

  // scatola: fronte, lato con finestra, sopra
  const F = { x0: 150, x1: 560, y0: 300, y1: 980 }, D = { dx: 150, dy: -60 };
  poli([[F.x0, F.y0], [F.x0 + D.dx, F.y0 + D.dy], [F.x1 + D.dx, F.y0 + D.dy], [F.x1, F.y0]], '#d43b30');
  poli([[F.x1, F.y0], [F.x1 + D.dx, F.y0 + D.dy], [F.x1 + D.dx, F.y1 + D.dy], [F.x1, F.y1]], lineare(F.x1, 0, F.x1 + D.dx, 0, [[0, '#86151a'], [1, '#6a0f13']]));
  poli([[F.x0, F.y0], [F.x1, F.y0], [F.x1, F.y1], [F.x0, F.y1]], lineare(F.x0, 0, F.x1, 0, [[0, '#c3221f'], [1, '#a5191b']]));
  poli([[F.x0, F.y0], [F.x1, F.y0], [F.x1, F.y1], [F.x0, F.y1]], lineare(0, F.y0, 0, F.y1, [[0, 'rgba(255,255,255,.08)'], [1, 'rgba(0,0,0,.14)']]));

  // finestra sul lato
  const lato = (u, v) => [F.x1 + D.dx * u, F.y0 + D.dy * u + (F.y1 - F.y0) * v];
  const fin = [lato(0.14, 0.1), lato(0.9, 0.1), lato(0.9, 0.8), lato(0.14, 0.8)];
  poli(fin, lineare(F.x1, F.y0, F.x1 + D.dx, F.y1, [[0, 'rgba(214,230,244,.92)'], [1, 'rgba(150,182,214,.85)']]));
  x.save(); x.beginPath(); fin.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.clip();
  x.fillStyle = 'rgba(255,255,255,.45)';
  x.beginPath(); x.moveTo(F.x1, 420); x.lineTo(F.x1 + D.dx, 300); x.lineTo(F.x1 + D.dx, 360); x.lineTo(F.x1, 480); x.fill();
  x.restore();
  x.strokeStyle = 'rgba(0,0,0,.28)'; x.lineWidth = 3;
  x.beginPath(); fin.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.stroke();

  // spigoli
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2;
  x.strokeRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
  x.beginPath(); x.moveTo(F.x0 + 300, F.y0 + 6); x.lineTo(F.x0 + 300, F.y1 - 6); x.strokeStyle = 'rgba(0,0,0,.16)'; x.stroke();

  // fronte: nome, numero, logo
  scritta(nome, F.x0 + 150, F.y0 + 92, 112, 250);
  x.beginPath(); x.arc(F.x0 + 150, F.y0 + 300, 80, 0, Math.PI * 2);
  x.fillStyle = '#d83a2e'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#7a1010'; x.stroke();
  scritta('01', F.x0 + 150, F.y0 + 304, 92);
  x.save(); x.translate(F.x0 + 150, F.y0 + 535); x.rotate(-0.07);
  x.fillStyle = '#121212'; x.beginPath(); x.roundRect(-112, -82, 224, 164, 14); x.fill();
  x.fillStyle = '#ffffff'; x.font = `800 74px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('ROLE', 0, -32); x.fillText('FIGZ', 0, 38);
  x.restore();

  // nome in verticale sulla striscia accanto alla finestra
  const lettere = [...nome].filter(l => l !== ' ');
  const passo = Math.min(100, 620 / Math.max(lettere.length, 1));
  lettere.forEach((l, i) => scritta(l, F.x0 + 355, F.y0 + 30 + passo * (i + 0.5), passo * 0.95, 96));

  // la figura, appoggiata sulla mensola accanto alla scatola
  const areaW = 560, areaH = 830, base = 985, cx = 1065;
  const s = Math.min(areaW / figura.naturalWidth, areaH / figura.naturalHeight);
  const w = figura.naturalWidth * s, h = figura.naturalHeight * s;
  x.save(); x.filter = 'blur(14px)'; x.fillStyle = 'rgba(0,0,0,.25)';
  x.beginPath(); x.ellipse(cx, base - 4, w * 0.36, 18, 0, 0, Math.PI * 2); x.fill(); x.restore();
  if (sfondoBianco) x.globalCompositeOperation = 'multiply';   // lo sfondo bianco dell'immagine sparisce
  x.drawImage(figura, cx - w / 2, base - h, w, h);
  x.globalCompositeOperation = 'source-over';
  return c;
}
