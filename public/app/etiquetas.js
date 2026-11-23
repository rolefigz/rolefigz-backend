// Editor de etiquetas para la Nelko P21: P21 Studio de RoleMaker llevado al teléfono.
// Mismo formato (.p21.json), mismas funciones (texto, QR, códigos de barras, imágenes, formas, fecha, símbolos,
// número en serie, variables con CSV/Excel, plantillas, historial, alinear/repartir, imán y cuadrícula de 1 mm)
// y elementos que se mueven y se redimensionan con el dedo. El dibujo lo hace EtqRender en el propio teléfono.
const Etiquetas = (() => {
  const { $, esc, vista, aviso, local, compartir, descargar } = App;
  const R = EtqRender;
  const clone = o => JSON.parse(JSON.stringify(o));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const S = {
    label: null, sel: -1, multi: [], zoom: 0, values: {}, csv: null, csvRow: 0, csvNombre: '',
    history: [], future: [], lastCheckpoint: 0, res: null, vars: [], grid: false, marcos: true, varios: false, paso: 1, imprimiendo: false,
  };

  // ── fuentes ──
  const WEB = ['Inter', 'DM Sans', 'Barlow Condensed', 'Archivo Black', 'Bebas Neue', 'Anton', 'Oswald', 'Montserrat', 'Roboto Condensed', 'Arimo',
    'Tinos', 'Playfair Display', 'Pacifico', 'Lobster', 'Dancing Script', 'Roboto Mono', 'Cousine', 'Carlito', 'Noto Sans Symbols 2', 'Noto Emoji'];
  const CON_NEGRITA = new Set(['Inter', 'DM Sans', 'Barlow Condensed', 'Oswald', 'Montserrat', 'Roboto Condensed', 'Arimo', 'Tinos', 'Playfair Display', 'Roboto Mono', 'Cousine', 'Carlito', 'Dancing Script']);
  let fuentesPropias = [];
  let fuentesCargadas = false;
  function cargarFuentes() {
    if (fuentesCargadas) return;
    fuentesCargadas = true;
    const fam = WEB.map(f => `family=${f.replace(/ /g, '+')}${CON_NEGRITA.has(f) ? ':wght@400;700' : ''}`).join('&');
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?${fam}&display=swap`;
    document.head.appendChild(l);
    document.fonts.addEventListener('loadingdone', () => pedirDibujo());
    local.todas('fuentes').then(fs => { fuentesPropias = fs; fs.forEach(registrarFuente); }).catch(() => {});
  }
  function registrarFuente(f) {
    try { const ff = new FontFace(f.familia, f.datos); document.fonts.add(ff); ff.load().then(() => pedirDibujo()).catch(() => {}); } catch {}
  }
  // antes de imprimir: que todas las fuentes del diseño estén cargadas
  async function fuentesListas(label) {
    const fams = new Set(label.elements.filter(e => e.type === 'text' || e.type === 'barcode').map(e => (e.bold ? '700 ' : '400 ') + '40px ' + R.familia(e.font)));
    await Promise.all([...fams].map(f => document.fonts.load(f).catch(() => null)));
  }

  // ── historia (deshacer) ──
  function checkpoint(force = true) {
    const now = Date.now();
    if (!force && now - S.lastCheckpoint < 900) return;
    S.lastCheckpoint = now;
    S.history.push(JSON.stringify(S.label));
    if (S.history.length > 150) S.history.shift();
    S.future = [];
    pintaUndo();
  }
  function undo() { if (!S.history.length) return; S.future.push(JSON.stringify(S.label)); S.label = JSON.parse(S.history.pop()); S.sel = Math.min(S.sel, S.label.elements.length - 1); S.multi = []; cambiado(true); }
  function redo() { if (!S.future.length) return; S.history.push(JSON.stringify(S.label)); S.label = JSON.parse(S.future.pop()); S.sel = Math.min(S.sel, S.label.elements.length - 1); S.multi = []; cambiado(true); }
  function pintaUndo() { const u = $('#eUndo'), r = $('#eRedo'); if (u) u.disabled = !S.history.length; if (r) r.disabled = !S.future.length; }

  let tGuardar;
  function guardarLocal() { try { localStorage.setItem('etq-label', JSON.stringify(S.label)); } catch {} }
  function cambiado(props = false) {
    pintaUndo(); pintaOverlay(); pintaCapas();
    if (props) pintaProps(); else syncCaja();
    pedirDibujo();
    clearTimeout(tGuardar); tGuardar = setTimeout(guardarLocal, 400);
  }

  // ── selección ──
  function seleccion() {
    const n = S.label ? S.label.elements.length : 0;
    const ids = S.multi.length ? S.multi : (S.sel >= 0 ? [S.sel] : []);
    return [...new Set(ids)].filter(i => i >= 0 && i < n).sort((a, b) => a - b);
  }
  function caja(raw) { const e = R.completar(raw); return { x: e.x, y: e.y, w: e.w, h: e.h }; }
  function mover(el, dx, dy) { if (el.type === 'line') { el.x1 += dx; el.x2 += dx; el.y1 += dy; el.y2 += dy; } else { el.x = (el.x ?? 0) + dx; el.y = (el.y ?? 0) + dy; } }
  function seleccionar(i) { S.sel = i; S.multi = []; pintaOverlay(); pintaCapas(); pintaProps(); }
  function fijarSeleccion(ids, principal) {
    ids = [...new Set(ids)].sort((a, b) => a - b);
    S.multi = ids.length > 1 ? ids : [];
    S.sel = ids.length ? (ids.includes(principal) ? principal : ids[ids.length - 1]) : -1;
    pintaOverlay(); pintaCapas(); pintaProps();
  }

  // ── dibujo ──
  const valoresVista = () => ({ ...S.values, ...(S.csv && S.csv[S.csvRow] ? S.csv[S.csvRow] : {}) });
  let pedido = false;
  function pedirDibujo() { if (pedido) return; pedido = true; requestAnimationFrame(() => { pedido = false; dibujar(); }); }
  R.alCargar = pedirDibujo;
  function dibujar() {
    const cv = $('#ePrev'); if (!cv || !S.label) return;
    const res = R.dibujar(R.sustituir(S.label, valoresVista(), 1));
    S.res = res;
    cv.width = res.W; cv.height = res.H;
    cv.getContext('2d').drawImage(res.canvas, 0, 0);
    const z = zoom();
    cv.style.width = res.W * z + 'px'; cv.style.height = res.H * z + 'px';
    $('#eAvisos').innerHTML = res.avisos.map(w => (res.errores.includes(w) ? '⛔ ' : '⚠ ') + esc(w)).join('<br>')
      + (res.errores.length ? '<br><b>Los elementos con ⛔ no se pueden dibujar: así no se puede imprimir.</b>' : '');
    const vars = R.variables(S.label);
    if (JSON.stringify(vars) !== JSON.stringify(S.vars)) { S.vars = vars; pintaVars(); }
    const nota = $('#eTamAuto'); const b = res.cajas[S.sel];
    if (nota) nota.textContent = b && b.font_size ? `Ahora ${b.font_size}px` : '';
  }

  // ── escenario y overlay ──
  function zoom() {
    if (S.zoom) return S.zoom;
    const [W, H] = R.canvasSize(S.label), wrap = $('#eWrap');
    const fitW = ((wrap?.clientWidth || 340) - 20) / W, fitH = Math.max(window.innerHeight * 0.42, 200) / H;
    return clamp(Math.floor(Math.min(fitW, fitH) * 4) / 4, 0.75, 8);
  }
  function dotsMm() { const [W] = R.canvasSize(S.label); return W / (S.label.orientation === 'portrait' ? S.label.media.width_mm : S.label.media.length_mm); }
  function pintaOverlay() {
    const st = $('#eStage'); if (!st) return;
    const [W, H] = R.canvasSize(S.label), z = zoom();
    st.style.width = W * z + 'px'; st.style.height = H * z + 'px';
    st.classList.toggle('invertida', !!S.label.invert);
    st.classList.toggle('varios', S.varios);
    $('#eInfo').textContent = `${S.label.media.width_mm}×${S.label.media.length_mm} mm · ${W}×${H} puntos · ${z}×`;
    const ov = $('#eOver');
    ov.classList.toggle('sin-marcos', !S.marcos);
    ov.innerHTML = '';
    if (S.grid) {
      const g = document.createElement('div'); g.className = 'rejilla';
      const a = `${dotsMm() * z}px ${dotsMm() * z}px`, b = `${dotsMm() * 5 * z}px ${dotsMm() * 5 * z}px`;
      g.style.backgroundSize = `${a}, ${a}, ${b}, ${b}`; ov.appendChild(g);
    }
    const sels = new Set(seleccion()), uno = sels.size === 1;
    S.label.elements.forEach((raw, i) => {
      const el = R.completar(raw), b = caja(raw), pad = el.type === 'line' ? 6 : 0;
      const d = document.createElement('div');
      d.className = 'caja' + (sels.has(i) ? ' sel' : '') + (sels.has(i) && !uno ? ' multi' : '') + (raw.hidden ? ' oculta' : '');
      d.dataset.i = i;
      Object.assign(d.style, { left: b.x * z - pad + 'px', top: b.y * z - pad + 'px', width: Math.max(b.w * z + 2 * pad, 8) + 'px', height: Math.max(b.h * z + 2 * pad, 8) + 'px' });
      if (i === S.sel && uno) {
        const tag = document.createElement('span'); tag.className = 'etq'; tag.textContent = `${R.NOMBRES[el.type]} ${b.x},${b.y} ${b.w}×${b.h}`; d.appendChild(tag);
        for (const h of el.type === 'line' ? ['p1', 'p2'] : ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']) {
          const hd = document.createElement('span'); hd.className = 'h ' + h; hd.dataset.h = h;
          if (h === 'p1' || h === 'p2') {
            const px = (h === 'p1' ? el.x1 : el.x2) - b.x, py = (h === 'p1' ? el.y1 : el.y2) - b.y;
            hd.style.left = px * z + pad + 'px'; hd.style.top = py * z + pad + 'px';
          }
          d.appendChild(hd);
        }
      }
      ov.appendChild(d);
    });
  }

  // imán: bordes y centro de la etiqueta y de los demás elementos (y la cuadrícula si está activa)
  function objetivos(skip) {
    const [W, H] = R.canvasSize(S.label), xs = [0, W / 2, W], ys = [0, H / 2, H];
    S.label.elements.forEach((raw, k) => { if (skip.includes(k)) return; const b = caja(raw); xs.push(b.x, b.x + b.w / 2, b.x + b.w); ys.push(b.y, b.y + b.h / 2, b.y + b.h); });
    if (S.grid) { const s = dotsMm(); for (let x = 0; x <= W; x += s) xs.push(Math.round(x)); for (let y = 0; y <= H; y += s) ys.push(Math.round(y)); }
    return { xs, ys };
  }
  function iman(v, size, ts, thr) {
    let best = null;
    for (const t of ts) for (const off of [0, size / 2, size]) { const d = t - (v + off); if (Math.abs(d) <= thr && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, line: t }; }
    return best;
  }

  let drag = null, ultimoToque = { i: -1, t: 0 };
  function alPulsar(e) {
    const box = e.target.closest('.caja');
    if (!box) {
      if (S.varios) {
        drag = { modo: 'marco', sx: e.clientX, sy: e.clientY, r: $('#eStage').getBoundingClientRect(), base: seleccion(), movido: false };
        capturar(e); e.preventDefault();
      } else drag = { modo: 'vacio', sx: e.clientX, sy: e.clientY, movido: false };
      return;
    }
    const i = +box.dataset.i, cur = seleccion();
    // doble toque en un texto: editar el texto
    const ahora = Date.now();
    if (!e.target.dataset.h && ultimoToque.i === i && ahora - ultimoToque.t < 350 && S.label.elements[i].type === 'text') {
      ultimoToque = { i: -1, t: 0 }; seleccionar(i);
      setTimeout(() => { const t = $('#pText'); if (t) { t.focus(); t.select(); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 30);
      return;
    }
    ultimoToque = { i, t: ahora };
    if (S.varios) {
      const ids = cur.includes(i) ? cur.filter(k => k !== i) : [...cur, i];
      fijarSeleccion(ids, i);
      if (!ids.includes(i)) return;
    } else if (!cur.includes(i) || (cur.length === 1 && i !== S.sel)) seleccionar(i);
    const ids = seleccion(), grupo = ids.length > 1 && !e.target.dataset.h;
    drag = { i, modo: grupo ? 'grupo' : e.target.dataset.h ? 'tam' : 'mover', h: e.target.dataset.h, sx: e.clientX, sy: e.clientY,
      orig: R.completar(clone(S.label.elements[i])), antes: JSON.stringify(S.label), movido: false, ids, origs: ids.map(k => R.completar(clone(S.label.elements[k]))) };
    e.preventDefault();
    capturar(e);
  }
  function capturar(e) { try { $('#eStage').setPointerCapture(e.pointerId); } catch {} }
  function alMover(e) {
    if (!drag) return;
    const z = zoom(), dx = Math.round((e.clientX - drag.sx) / z), dy = Math.round((e.clientY - drag.sy) / z);
    if (!drag.movido && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 4) return;
    drag.movido = true;
    if (drag.modo === 'vacio') return;
    const gv = $('#eGv'), gh = $('#eGh');
    gv.style.display = gh.style.display = 'none';
    const thr = Math.max(2, Math.round(7 / z));
    if (drag.modo === 'marco') {
      let m = $('#eMarco'); if (!m) { m = document.createElement('div'); m.id = 'eMarco'; $('#eStage').appendChild(m); }
      const r = drag.r, x1 = Math.min(drag.sx, e.clientX) - r.left, y1 = Math.min(drag.sy, e.clientY) - r.top, x2 = Math.max(drag.sx, e.clientX) - r.left, y2 = Math.max(drag.sy, e.clientY) - r.top;
      Object.assign(m.style, { left: x1 + 'px', top: y1 + 'px', width: x2 - x1 + 'px', height: y2 - y1 + 'px' });
      drag.rect = [x1 / z, y1 / z, x2 / z, y2 / z];
      return;
    }
    if (drag.modo === 'grupo') {
      const bs = drag.origs.map(o => ({ x: o.x, y: o.y, w: o.w, h: o.h }));
      const gx = Math.min(...bs.map(b => b.x)), gy = Math.min(...bs.map(b => b.y));
      const gw = Math.max(...bs.map(b => b.x + b.w)) - gx, ghh = Math.max(...bs.map(b => b.y + b.h)) - gy;
      let ddx = dx, ddy = dy;
      const t = objetivos(drag.ids), sx = iman(gx + dx, gw, t.xs, thr), sy = iman(gy + dy, ghh, t.ys, thr);
      if (sx) { ddx += sx.d; gv.style.left = sx.line * z + 'px'; gv.style.display = 'block'; }
      if (sy) { ddy += sy.d; gh.style.top = sy.line * z + 'px'; gh.style.display = 'block'; }
      drag.ids.forEach((k, n) => {
        const o = drag.origs[n], el = S.label.elements[k];
        if (o.type === 'line') Object.assign(el, { x1: o.x1 + ddx, y1: o.y1 + ddy, x2: o.x2 + ddx, y2: o.y2 + ddy });
        else { el.x = Math.round(o.x + ddx); el.y = Math.round(o.y + ddy); }
      });
      pintaOverlay(); pedirDibujo(); return;
    }
    const o = drag.orig, el = S.label.elements[drag.i];
    if (o.type === 'line') {
      if (drag.modo === 'mover') Object.assign(el, { x1: o.x1 + dx, y1: o.y1 + dy, x2: o.x2 + dx, y2: o.y2 + dy });
      else {
        const k = drag.h === 'p1' ? ['x1', 'y1'] : ['x2', 'y2'];
        let nx = o[k[0]] + dx, ny = o[k[1]] + dy;
        const ox = drag.h === 'p1' ? o.x2 : o.x1, oy = drag.h === 'p1' ? o.y2 : o.y1;
        if (Math.abs(ny - oy) <= thr) ny = oy; else if (Math.abs(nx - ox) <= thr) nx = ox;   // recta horizontal/vertical
        el[k[0]] = nx; el[k[1]] = ny;
      }
    } else if (drag.modo === 'mover') {
      let nx = o.x + dx, ny = o.y + dy;
      const t = objetivos([drag.i]), sx = iman(nx, o.w, t.xs, thr), sy = iman(ny, o.h, t.ys, thr);
      if (sx) { nx += sx.d; gv.style.left = sx.line * z + 'px'; gv.style.display = 'block'; }
      if (sy) { ny += sy.d; gh.style.top = sy.line * z + 'px'; gh.style.display = 'block'; }
      el.x = Math.round(nx); el.y = Math.round(ny);
    } else {
      let { x, y, w, h } = o; const hd = drag.h;
      if (hd.includes('e')) w = o.w + dx; if (hd.includes('s')) h = o.h + dy;
      if (hd.includes('w')) w = o.w - dx; if (hd.includes('n')) h = o.h - dy;
      w = Math.max(4, w); h = Math.max(4, h);
      if ((S.proporcion || o.type === 'qr') && hd.length === 2) {
        const r = o.w / o.h;
        if (Math.abs(w - o.w) > Math.abs(h - o.h) * r) h = Math.round(w / r); else w = Math.round(h * r);
      }
      w = Math.max(4, w); h = Math.max(4, h);
      if (hd.includes('w')) x = o.x + o.w - w; if (hd.includes('n')) y = o.y + o.h - h;
      Object.assign(el, { x, y, w, h });
    }
    pintaOverlay(); syncCaja(); pedirDibujo();
  }
  function alSoltar() {
    if (!drag) return;
    $('#eGv').style.display = $('#eGh').style.display = 'none';
    if (drag.modo === 'vacio') { if (!drag.movido) fijarSeleccion([], -1); drag = null; return; }
    if (drag.modo === 'marco') {
      $('#eMarco')?.remove();
      if (drag.movido && drag.rect) {
        const [x1, y1, x2, y2] = drag.rect, hit = [];
        S.label.elements.forEach((raw, k) => { const b = caja(raw); if (b.x < x2 && b.x + b.w > x1 && b.y < y2 && b.y + b.h > y1) hit.push(k); });
        fijarSeleccion([...drag.base, ...hit], hit[hit.length - 1]);
      } else fijarSeleccion([], -1);
      drag = null; return;
    }
    if (drag.modo === 'grupo' && !drag.movido && !S.varios) { const i = drag.i; drag = null; seleccionar(i); return; }
    if (drag.movido) { S.history.push(drag.antes); S.future = []; cambiado(); }
    drag = null;
  }

  // ── elementos ──
  function anadir(tipo, extra = {}) {
    const [W, H] = R.canvasSize(S.label), m = 6;
    let el;
    switch (tipo) {
      case 'text': {
        const primero = !S.label.elements.some(e => e.type === 'text');
        el = primero ? { type: 'text', x: m, y: m, w: W - 2 * m, h: H - 2 * m, text: 'Texto' } : { type: 'text', x: Math.round(W / 4), y: Math.round(H / 3), w: Math.round(W / 2), h: Math.round(H / 3), text: 'Texto' };
        break;
      }
      case 'date': el = { type: 'text', x: Math.round(W / 4), y: Math.round(H / 3), w: Math.round(W / 2), h: Math.round(H / 3), text: '{{date:%d/%m/%Y}}' }; break;
      case 'qr': { const s = Math.min(W, H) - 2 * m; el = { type: 'qr', x: m, y: m, w: s, h: s, data: 'https://rolefigz.com' }; break; }
      case 'barcode': el = { type: 'barcode', x: m, y: m, w: Math.min(W - 2 * m, 220), h: H - 2 * m, data: '123456789012', symbology: 'code128' }; break;
      case 'rect': el = { type: 'rect', x: 2, y: 2, w: W - 4, h: H - 4, stroke: 3, radius: 8 }; break;
      case 'ellipse': { const s = Math.min(W, H) - 2 * m; el = { type: 'ellipse', x: Math.round(W / 2 - s / 2), y: m, w: s, h: s, stroke: 3 }; break; }
      case 'line': el = W >= H ? { type: 'line', x1: m, y1: Math.round(H / 2), x2: W - m, y2: Math.round(H / 2), width: 2 } : { type: 'line', x1: Math.round(W / 2), y1: m, x2: Math.round(W / 2), y2: H - m, width: 2 }; break;
      case 'image': el = { type: 'image', x: 0, y: 0, w: Math.min(W, H), h: Math.min(W, H), ...extra }; break;
      default: return;
    }
    checkpoint();
    S.label.elements.push(el);
    S.sel = S.label.elements.length - 1; S.multi = [];
    cambiado(true);
    if (el.type === 'text') setTimeout(() => { const t = $('#pText'); if (t) { t.focus(); t.select(); } }, 60);
  }
  function borrar() { const ids = seleccion(); if (!ids.length) return; checkpoint(); for (const k of [...ids].reverse()) S.label.elements.splice(k, 1); S.multi = []; S.sel = Math.min(ids[0], S.label.elements.length - 1); cambiado(true); }
  function insertar(els) { const ini = S.label.elements.length; S.label.elements.push(...els); const ids = els.map((_, n) => ini + n); S.multi = ids.length > 1 ? ids : []; S.sel = ids[ids.length - 1]; cambiado(true); }
  function duplicar() { const ids = seleccion(); if (!ids.length) return; checkpoint(); insertar(ids.map(k => { const el = clone(S.label.elements[k]); mover(el, 6, 6); return el; })); }
  function copiar() { const ids = seleccion(); if (!ids.length) return; try { localStorage.setItem('etq-portapapeles', JSON.stringify(ids.map(k => S.label.elements[k]))); } catch {} aviso(ids.length > 1 ? `${ids.length} elementos copiados` : 'Elemento copiado'); }
  function pegar() {
    let els = null; try { els = JSON.parse(localStorage.getItem('etq-portapapeles') || 'null'); } catch {}
    if (!Array.isArray(els) || !els.length) return aviso('No hay nada copiado.');
    checkpoint(); insertar(els.map(el => { el = clone(el); mover(el, 8, 8); return el; }));
  }
  function capa(delta) { const i = S.sel, j = i + delta; if (i < 0 || j < 0 || j >= S.label.elements.length) return; checkpoint(); const e = S.label.elements; [e[i], e[j]] = [e[j], e[i]]; S.sel = j; cambiado(true); }
  function empujar(dx, dy) { const ids = seleccion(); if (!ids.length) return; checkpoint(false); for (const k of ids) mover(S.label.elements[k], dx, dy); cambiado(); }

  function alinear(como) {
    const ids = seleccion(); if (!ids.length) return;
    const [W, H] = R.canvasSize(S.label), cajas = ids.map(k => caja(S.label.elements[k]));
    const ref = ids.length === 1 ? { x: 0, y: 0, w: W, h: H } : (() => {
      const x = Math.min(...cajas.map(b => b.x)), y = Math.min(...cajas.map(b => b.y));
      return { x, y, w: Math.max(...cajas.map(b => b.x + b.w)) - x, h: Math.max(...cajas.map(b => b.y + b.h)) - y };
    })();
    checkpoint();
    if (como === 'dist-h' || como === 'dist-v') {
      if (ids.length < 3) return aviso('Para repartir hacen falta 3 elementos o más.');
      const hz = como === 'dist-h';
      const orden = ids.map((k, n) => ({ k, b: cajas[n] })).sort((a, b) => (hz ? a.b.x - b.b.x : a.b.y - b.b.y));
      const total = orden.reduce((s, o) => s + (hz ? o.b.w : o.b.h), 0), hueco = ((hz ? ref.w : ref.h) - total) / (orden.length - 1);
      let pos = hz ? ref.x : ref.y;
      for (const o of orden) { const d = Math.round(pos - (hz ? o.b.x : o.b.y)); mover(S.label.elements[o.k], hz ? d : 0, hz ? 0 : d); pos += (hz ? o.b.w : o.b.h) + hueco; }
    } else if (como === 'mismo-w' || como === 'mismo-h') {
      const p = S.label.elements[S.sel];
      for (const k of ids) { const el = S.label.elements[k]; if (el.type === 'line' || p.type === 'line') continue; if (como === 'mismo-w') el.w = p.w; else el.h = p.h; }
    } else ids.forEach((k, n) => {
      const b = cajas[n];
      const dx = como === 'izq' ? ref.x - b.x : como === 'der' ? ref.x + ref.w - b.x - b.w : como === 'hcentro' ? Math.round(ref.x + (ref.w - b.w) / 2 - b.x) : 0;
      const dy = como === 'arriba' ? ref.y - b.y : como === 'abajo' ? ref.y + ref.h - b.y - b.h : como === 'vcentro' ? Math.round(ref.y + (ref.h - b.h) / 2 - b.y) : 0;
      mover(S.label.elements[k], dx, dy);
    });
    cambiado(true);
  }
  const ALINEAR = [['izq', '⇤', 'A la izquierda'], ['hcentro', '↔', 'Centrar en horizontal'], ['der', '⇥', 'A la derecha'], ['arriba', '⤒', 'Arriba'], ['vcentro', '↕', 'Centrar en vertical'], ['abajo', '⤓', 'Abajo']];
  function barraAlinear(p, repartir) {
    const bar = document.createElement('div'); bar.className = 'etq-iconos';
    const items = [...ALINEAR]; if (repartir) items.push(['dist-h', '⋯', 'Repartir en horizontal'], ['dist-v', '⋮', 'Repartir en vertical']);
    for (const [como, ic, t] of items) { const b = boton(ic, () => alinear(como), 'ico'); b.title = t; bar.appendChild(b); }
    p.appendChild(bar); return bar;
  }

  // ── capas ──
  function titulo(el) { const t = el.text ?? el.data ?? ''; return t ? String(t).replace(/\n/g, ' ').slice(0, 26) : R.NOMBRES[el.type]; }
  function pintaCapas() {
    const ol = $('#eCapas'); if (!ol) return;
    const sels = new Set(seleccion());
    ol.innerHTML = S.label.elements.length ? '' : '<li class="mono">Todavía no hay nada</li>';
    S.label.elements.forEach((el, i) => {
      const li = document.createElement('li'); li.className = sels.has(i) ? 'sel' : '';
      li.innerHTML = `<span class="tipo">${esc(R.NOMBRES[el.type])}</span><span class="crece">${esc(titulo(el))}</span>`;
      const ojo = document.createElement('button'); ojo.className = 'ojo'; ojo.textContent = el.hidden ? '◌' : '●'; ojo.title = el.hidden ? 'Mostrar' : 'Ocultar';
      ojo.onclick = ev => { ev.stopPropagation(); checkpoint(); if (el.hidden) delete el.hidden; else el.hidden = true; cambiado(); };
      li.appendChild(ojo);
      li.onclick = () => { if (S.varios) { const c = seleccion(); fijarSeleccion(c.includes(i) ? c.filter(k => k !== i) : [...c, i], i); } else seleccionar(i); };
      ol.appendChild(li);
    });
  }

  // ── panel de propiedades ──
  function boton(texto, fn, cls = '') { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn peq ' + cls; b.textContent = texto; b.onclick = fn; return b; }
  function campo(cont, obj, k, etiqueta, tipo, op = {}) {
    const w = document.createElement('label'); w.className = tipo === 'check' ? 'check' : 'campo';
    const val = obj[k] ?? R.DEF[obj.type]?.[k] ?? R.COMUNES[k];
    const fijar = v => { checkpoint(false); obj[k] = v; cambiado(); };
    let inp;
    if (tipo === 'area') { inp = document.createElement('textarea'); inp.rows = op.filas || 2; inp.value = val ?? ''; inp.oninput = () => fijar(inp.value); }
    else if (tipo === 'select') {
      inp = document.createElement('select');
      for (const [v, t] of op.opciones) { const o = document.createElement('option'); o.value = v; o.textContent = t; if (String(v) === String(val)) o.selected = true; inp.appendChild(o); }
      inp.onchange = () => fijar(op.numero ? +inp.value : inp.value);
    } else if (tipo === 'check') { inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = !!val; inp.onchange = () => fijar(inp.checked); }
    else if (tipo === 'rango') {
      inp = document.createElement('input'); inp.type = 'range'; Object.assign(inp, { min: op.min, max: op.max, step: op.step || 1, value: val });
      const out = document.createElement('b'); out.textContent = ' ' + val;
      inp.oninput = () => { out.textContent = ' ' + inp.value; fijar(+inp.value); };
      const sp = document.createElement('span'); sp.append(etiqueta, out); w.append(sp, inp); cont.appendChild(w); return inp;
    } else {
      inp = document.createElement('input'); inp.type = tipo === 'num' ? 'number' : 'text';
      if (tipo === 'num') inp.inputMode = 'numeric';
      if (op.step) inp.step = op.step;
      inp.value = val ?? '';
      inp.oninput = () => { if (tipo === 'num') { if (inp.value === '' || isNaN(+inp.value)) return; fijar(+inp.value); } else fijar(inp.value); };
    }
    if (op.id) inp.id = op.id;
    if (tipo === 'check') w.append(inp, etiqueta); else { const sp = document.createElement('span'); sp.textContent = etiqueta; w.append(sp, inp); }
    cont.appendChild(w); return inp;
  }
  function seg(cont, obj, k, etiqueta, opciones) {
    const w = document.createElement('div'); w.className = 'campo';
    const sp = document.createElement('span'); sp.textContent = etiqueta; w.appendChild(sp);
    const s = document.createElement('div'); s.className = 'seg';
    const cur = obj[k] ?? R.DEF[obj.type]?.[k];
    for (const [v, t] of opciones) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t; if (v === cur) b.className = 'on';
      b.onclick = () => { checkpoint(); obj[k] = v; [...s.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); cambiado(); };
      s.appendChild(b);
    }
    w.appendChild(s); cont.appendChild(w);
  }
  function rejilla(cont, n = 2) { const g = document.createElement('div'); g.className = 'etq-grid' + n; cont.appendChild(g); return g; }
  function seccion(cont, t) { const s = document.createElement('div'); s.className = 'etq-sec'; if (t) { const h = document.createElement('h3'); h.textContent = t; s.appendChild(h); } cont.appendChild(s); return s; }
  function syncCaja() {
    if (S.sel < 0) return;
    const el = S.label.elements[S.sel]; if (!el) return;
    for (const k of ['x', 'y', 'w', 'h', 'x1', 'y1', 'x2', 'y2']) { const i = document.getElementById('p-' + k); if (i && document.activeElement !== i && el[k] !== undefined) i.value = el[k]; }
  }

  function pintaProps() {
    const p = $('#eProps'); if (!p) return;
    p.innerHTML = '';
    const ids = seleccion();
    if (ids.length > 1) return propsGrupo(p, ids);
    if (S.sel < 0 || !S.label.elements[S.sel]) return propsEtiqueta(p);
    const el = S.label.elements[S.sel];
    const cab = document.createElement('div'); cab.className = 'fila';
    cab.innerHTML = `<h2 class="crece">${R.NOMBRES[el.type]}</h2>`;
    cab.appendChild(boton('✕', () => fijarSeleccion([], -1), 'ico'));
    p.appendChild(cab);
    // mover con botones (en el móvil, más preciso que el dedo)
    const nud = document.createElement('div'); nud.className = 'etq-empuje';
    nud.append(boton('◀', () => empujar(-S.paso, 0), 'ico'), boton('▲', () => empujar(0, -S.paso), 'ico'), boton('▼', () => empujar(0, S.paso), 'ico'), boton('▶', () => empujar(S.paso, 0), 'ico'));
    const pb = boton(S.paso === 1 ? '1 pt' : '1 mm', () => { S.paso = S.paso === 1 ? 8 : 1; pb.textContent = S.paso === 1 ? '1 pt' : '1 mm'; });
    nud.appendChild(pb);
    p.appendChild(nud);

    if (el.type === 'text') {
      campo(p, el, 'text', 'Texto (admite saltos de línea)', 'area', { id: 'pText', filas: 2 });
      if (/\{\{/.test(el.text || '')) p.insertAdjacentHTML('beforeend', '<p class="mono" style="margin:-6px 0 10px">{{nombre}} = campo o columna del CSV/Excel · {{date:%d/%m/%Y}} = fecha del día · {{n}} = número de la serie</p>');
      selectorFuente(p, el);
      const sz = document.createElement('div'); sz.className = 'campo';
      sz.innerHTML = '<span>Tamaño de letra</span>';
      const fila = document.createElement('div'); fila.className = 'fila';
      const auto = document.createElement('label'); auto.className = 'check'; auto.style.margin = '0';
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = el.size === undefined || el.size === 'auto' || el.size === null;
      auto.append(cb, 'Ajustar al marco');
      const num = document.createElement('input'); num.type = 'number'; num.min = 4; num.max = 400; num.style.width = '80px';
      num.value = cb.checked ? (S.res?.cajas[S.sel]?.font_size || 24) : el.size; num.disabled = cb.checked;
      const nota = document.createElement('span'); nota.id = 'eTamAuto'; nota.className = 'mono';
      cb.onchange = () => { checkpoint(); el.size = cb.checked ? 'auto' : (+num.value || 24); num.disabled = cb.checked; cambiado(); };
      num.oninput = () => { if (+num.value > 0) { checkpoint(false); el.size = +num.value; cambiado(); } };
      fila.append(auto, num, nota); sz.appendChild(fila); p.appendChild(sz);
      const g = document.createElement('div'); g.className = 'fila envuelve';
      campo(g, el, 'bold', 'Negrita', 'check'); campo(g, el, 'wrap', 'Salto automático', 'check'); campo(g, el, 'vertical', 'Vertical', 'check');
      p.appendChild(g);
      seg(p, el, 'align', 'Horizontal', [['left', 'Izq.'], ['center', 'Centro'], ['right', 'Der.']]);
      seg(p, el, 'valign', 'Vertical', [['top', 'Arriba'], ['middle', 'Centro'], ['bottom', 'Abajo']]);
      const adv = document.createElement('details'); adv.innerHTML = '<summary>Avanzado</summary>'; p.appendChild(adv);
      const g2 = rejilla(adv);
      campo(g2, el, 'line_spacing', 'Interlineado', 'num', { step: 0.05 }); campo(g2, el, 'letter_spacing', 'Espaciado (px)', 'num');
      campo(g2, el, 'stroke', 'Engrosar (px)', 'num'); campo(g2, el, 'min_size', 'Tamaño mínimo', 'num');
    } else if (el.type === 'qr') {
      campo(p, el, 'data', 'Contenido (URL o texto)', 'area');
      const g = rejilla(p);
      campo(g, el, 'ecc', 'Corrección de errores', 'select', { opciones: [['L', 'L (7%)'], ['M', 'M (15%)'], ['Q', 'Q (25%)'], ['H', 'H (30%)']] });
      campo(g, el, 'border', 'Margen (módulos)', 'num');
    } else if (el.type === 'barcode') {
      campo(p, el, 'data', 'Contenido', 'texto');
      campo(p, el, 'symbology', 'Tipo', 'select', { opciones: EtqBarcode.TIPOS.map(s => [s, s.toUpperCase()]) });
      const g = rejilla(p); campo(g, el, 'show_text', 'Mostrar números', 'check'); campo(g, el, 'text_size', 'Tamaño de los números', 'num');
    } else if (el.type === 'image') {
      p.appendChild(boton('Cambiar imagen…', () => elegirImagen(src => { checkpoint(); el.src = src; cambiado(); })));
      seg(p, el, 'fit', 'Encaje', [['contain', 'Entera'], ['cover', 'Recortar'], ['stretch', 'Estirar']]);
      seg(p, el, 'dither', 'Blanco y negro', [['floyd', 'Tramado (foto)'], ['threshold', 'Umbral (logo)']]);
      campo(p, el, 'threshold', 'Umbral', 'rango', { min: 1, max: 254 });
      campo(p, el, 'brightness', 'Brillo', 'rango', { min: 0.2, max: 2, step: 0.05 });
      campo(p, el, 'contrast', 'Contraste', 'rango', { min: 0.2, max: 3, step: 0.05 });
      campo(p, el, 'invert', 'Invertir', 'check');
    } else if (el.type === 'rect' || el.type === 'ellipse') {
      const g = rejilla(p); campo(g, el, 'stroke', 'Grosor de línea', 'num'); if (el.type === 'rect') campo(g, el, 'radius', 'Esquinas redondeadas', 'num');
      campo(p, el, 'fill', 'Relleno', 'check');
    } else if (el.type === 'line') {
      const g = rejilla(p, 4); for (const k of ['x1', 'y1', 'x2', 'y2']) campo(g, el, k, k, 'num', { id: 'p-' + k });
      campo(p, el, 'width', 'Grosor', 'num');
    }

    const pos = seccion(p, 'Posición y tamaño (puntos)');
    if (el.type !== 'line') {
      const g = rejilla(pos, 4); for (const k of ['x', 'y', 'w', 'h']) campo(g, el, k, k.toUpperCase(), 'num', { id: 'p-' + k });
      const g2 = rejilla(pos);
      campo(g2, el, 'rotate', 'Rotación', 'select', { numero: true, opciones: [[0, '0°'], [90, '90°'], [180, '180°'], [270, '270°']] });
      campo(g2, el, 'color', 'Color', 'select', { opciones: [['black', 'Negro'], ['white', 'Blanco (calado)']] });
      const al = barraAlinear(pos, false);
      const [W, H] = R.canvasSize(S.label);
      const full = boton('⛶', () => { checkpoint(); Object.assign(el, { x: 0, y: 0, w: W, h: H }); cambiado(); syncCaja(); }, 'ico'); full.title = 'Ocupar toda la etiqueta';
      al.appendChild(full);
      const prop = document.createElement('label'); prop.className = 'check';
      const pc = document.createElement('input'); pc.type = 'checkbox'; pc.checked = !!S.proporcion; pc.onchange = () => { S.proporcion = pc.checked; };
      prop.append(pc, 'Mantener la proporción al estirar desde las esquinas'); pos.appendChild(prop);
    } else campo(pos, el, 'color', 'Color', 'select', { opciones: [['black', 'Negro'], ['white', 'Blanco (calado)']] });

    const acc = document.createElement('div'); acc.className = 'etq-acciones';
    acc.append(boton('Delante', () => capa(1)), boton('Detrás', () => capa(-1)), boton('Copiar', copiar), boton('Duplicar', duplicar), boton('Eliminar', borrar, 'peligro'));
    p.appendChild(acc);
  }

  function propsGrupo(p, ids) {
    const cab = document.createElement('div'); cab.className = 'fila';
    cab.innerHTML = `<h2 class="crece">${ids.length} elementos</h2>`; cab.appendChild(boton('✕', () => fijarSeleccion([], -1), 'ico'));
    p.appendChild(cab);
    const nud = document.createElement('div'); nud.className = 'etq-empuje';
    nud.append(boton('◀', () => empujar(-S.paso, 0), 'ico'), boton('▲', () => empujar(0, -S.paso), 'ico'), boton('▼', () => empujar(0, S.paso), 'ico'), boton('▶', () => empujar(S.paso, 0), 'ico'));
    p.appendChild(nud);
    const a = seccion(p, 'Alinear y repartir'); barraAlinear(a, true);
    const f = document.createElement('div'); f.className = 'fila'; f.append(boton('Mismo ancho', () => alinear('mismo-w')), boton('Mismo alto', () => alinear('mismo-h'))); a.appendChild(f);
    a.insertAdjacentHTML('beforeend', '<p class="mono">Con varios, se alinean entre ellos; con uno, respecto a la etiqueta. Mismo ancho/alto = igual que el último tocado.</p>');
    const acc = document.createElement('div'); acc.className = 'etq-acciones';
    acc.append(boton('Copiar', copiar), boton('Duplicar', duplicar), boton('Eliminar', borrar, 'peligro'));
    p.appendChild(acc);
  }

  function propsEtiqueta(p) {
    const L = S.label;
    p.insertAdjacentHTML('beforeend', '<h2>Ajustes de la etiqueta</h2>');
    campo(p, L, 'name', 'Nombre', 'texto');
    const g = rejilla(p);
    const sel = document.createElement('label'); sel.className = 'campo'; sel.innerHTML = '<span>Rollo</span>';
    const s = document.createElement('select');
    const clave = `${L.media.width_mm}x${L.media.length_mm}`;
    s.innerHTML = Object.keys(R.MEDIA).map(k => `<option value="${k}" ${k === clave ? 'selected' : ''}>${k.replace('x', ' × ')} mm</option>`).join('') + `<option value="otro" ${R.MEDIA[clave] ? '' : 'selected'}>Otra medida</option>`;
    s.onchange = () => { if (s.value === 'otro') return pintaProps(); const [W0, H0] = R.canvasSize(L); checkpoint(); L.media = { ...R.MEDIA[s.value] }; reescalar(W0, H0); S.zoom = 0; cambiado(true); };
    sel.appendChild(s); g.appendChild(sel);
    const ori = document.createElement('div'); ori.className = 'campo'; ori.innerHTML = '<span>Orientación</span>';
    const so = document.createElement('div'); so.className = 'seg';
    for (const [v, t] of [['landscape', 'Horiz.'], ['portrait', 'Vert.']]) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t; if ((L.orientation || 'landscape') === v) b.className = 'on';
      b.onclick = () => { if (L.orientation === v) return; const [W0, H0] = R.canvasSize(L); checkpoint(); L.orientation = v; reescalar(W0, H0); S.zoom = 0; cambiado(true); };
      so.appendChild(b);
    }
    ori.appendChild(so); g.appendChild(ori);
    if (!R.MEDIA[clave] || s.value === 'otro') {
      const g2 = rejilla(p);
      const mw = campo(g2, L.media, 'width_mm', 'Ancho (mm)', 'num'), ml = campo(g2, L.media, 'length_mm', 'Largo (mm)', 'num');
      mw.oninput = () => { if (+mw.value > 0) { checkpoint(false); L.media.width_mm = +mw.value; cambiado(); } };
      ml.oninput = () => { if (+ml.value > 4) { checkpoint(false); L.media.length_mm = +ml.value; delete L.media.length_dots; S.zoom = 0; cambiado(); } };
    }
    campo(p, L, 'invert', 'Invertir toda la etiqueta', 'check');
    p.insertAdjacentHTML('beforeend', `<p class="mono">Toca «Añadir» para poner elementos. Arrástralos con el dedo para moverlos y usa los puntos de las esquinas para cambiar el tamaño.
      Doble toque en un texto para escribirlo. Con «Varios» seleccionas más de uno (o arrastras un rectángulo en vacío). Unos 8 puntos = 1 mm.</p>`);
  }
  function reescalar(oldW, oldH) {
    const [W, H] = R.canvasSize(S.label);
    if ((oldW === W && oldH === H) || !S.label.elements.length) return;
    const kx = W / oldW, ky = H / oldH;
    for (const el of S.label.elements) {
      if (el.type === 'line') { el.x1 = Math.round(el.x1 * kx); el.x2 = Math.round(el.x2 * kx); el.y1 = Math.round(el.y1 * ky); el.y2 = Math.round(el.y2 * ky); }
      else {
        el.x = Math.round((el.x ?? 0) * kx); el.y = Math.round((el.y ?? 0) * ky);
        el.w = Math.max(4, Math.round((el.w ?? 50) * kx)); el.h = Math.max(4, Math.round((el.h ?? 30) * ky));
        if (el.type === 'qr') { const s2 = Math.min(el.w, el.h); el.x += Math.round((el.w - s2) / 2); el.y += Math.round((el.h - s2) / 2); el.w = el.h = s2; }
      }
    }
    aviso('He ajustado los elementos a la nueva medida (puedes deshacerlo).');
  }

  // ── selector de fuentes (con vista de cada letra y fuentes propias) ──
  function selectorFuente(p, el) {
    const w = document.createElement('div'); w.className = 'campo';
    w.innerHTML = '<span>Fuente</span>';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'etq-fuente';
    const pinta = () => { b.textContent = !el.font || el.font === 'auto' ? 'Automática' : el.font; b.style.fontFamily = R.familia(el.font); };
    pinta();
    b.onclick = () => abrirFuentes(el, pinta);
    w.appendChild(b); p.appendChild(w);
  }
  function abrirFuentes(el, pinta) {
    const d = dialogo('Fuente', `<input type="text" id="fBus" placeholder="Buscar fuente…"/><div class="etq-lista-fuentes" id="fLista"></div>
      <label class="btn peq" style="margin-top:10px">+ Añadir fuente (.ttf / .otf)<input type="file" id="fArch" accept=".ttf,.otf,font/ttf,font/otf" multiple hidden/></label>`);
    const lista = d.querySelector('#fLista'), bus = d.querySelector('#fBus'), cur = el.font || 'auto';
    const item = (n, borrable) => {
      const it = document.createElement('div'); it.className = 'etq-fuente-item' + (n === cur ? ' on' : '');
      const t = document.createElement('span'); t.textContent = n === 'auto' ? 'Automática' : n; t.style.fontFamily = R.familia(n); it.appendChild(t);
      if (borrable) { const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.onclick = async ev => { ev.stopPropagation(); if (!confirm(`¿Quitar la fuente «${n}»?`)) return; await local.borrar('fuentes', n); fuentesPropias = fuentesPropias.filter(f => f.familia !== n); draw(); }; it.appendChild(x); }
      it.onclick = () => { checkpoint(); if (n === 'auto') delete el.font; else el.font = n; pinta(); cambiado(); d.close(); };
      return it;
    };
    const draw = () => {
      const q = bus.value.trim().toLowerCase(), ok = n => !q || n.toLowerCase().includes(q);
      lista.innerHTML = '';
      if (ok('automática auto')) lista.appendChild(item('auto'));
      const pro = fuentesPropias.filter(f => ok(f.familia));
      if (pro.length) { lista.insertAdjacentHTML('beforeend', '<div class="mono">Mis fuentes</div>'); pro.forEach(f => lista.appendChild(item(f.familia, true))); }
      const web = WEB.filter(ok);
      if (web.length) { lista.insertAdjacentHTML('beforeend', '<div class="mono">Fuentes de la app</div>'); web.forEach(n => lista.appendChild(item(n))); }
      if (el.font && !WEB.includes(el.font) && !fuentesPropias.some(f => f.familia === el.font) && ok(el.font)) {
        lista.insertAdjacentHTML('beforeend', '<div class="mono">Del diseño (del PC)</div>'); lista.appendChild(item(el.font));
      }
    };
    bus.oninput = draw;
    d.querySelector('#fArch').onchange = async e => {
      let ultima = null;
      for (const f of e.target.files) {
        try {
          const datos = await f.arrayBuffer(), familia = f.name.replace(/\.(ttf|otf)$/i, '').replace(/[-_]+/g, ' ').trim();
          const reg = { familia, datos, archivo: f.name };
          await local.guardar('fuentes', reg); fuentesPropias = fuentesPropias.filter(x => x.familia !== familia).concat(reg); registrarFuente(reg); ultima = familia;
          aviso(`Fuente «${familia}» añadida`);
        } catch (er) { aviso(`No se ha podido añadir ${f.name}: ${er.message}`, true); }
      }
      if (ultima) { checkpoint(); el.font = ultima; pinta(); cambiado(); d.close(); } else draw();
    };
    draw();
  }

  // ── diálogos ──
  function dialogo(titulo, html) {
    document.querySelector('dialog.etq-dlg')?.remove();
    const d = document.createElement('dialog'); d.className = 'etq-dlg';
    d.innerHTML = `<div class="fila" style="margin-bottom:10px"><h2 class="crece">${esc(titulo)}</h2><button class="btn peq ico" data-cerrar>✕</button></div>${html}`;
    document.body.appendChild(d);
    d.querySelector('[data-cerrar]').onclick = () => d.close();
    d.addEventListener('close', () => d.remove());
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.showModal();
    return d;
  }

  // símbolos (como pro.js de RoleMaker)
  const SIMBOLOS = {
    'Avisos': '⚠ ⛔ ☢ ☣ ⚡ 🔥 ❄ ☠ ✋ ⚑ ⚐ ❗ ❓ ℹ ✔ ✖ ✓ ✗ ☑ ☒ ⊘ ⓘ', 'Flechas': '← → ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇐ ⇒ ⇑ ⇓ ➜ ➔ ➤ ⮕ ⬅ ⬆ ⬇ ↻ ↺ ⤴ ⤵',
    'Formas': '★ ☆ ✦ ✧ ● ○ ◆ ◇ ■ □ ▲ △ ▼ ▽ ◀ ▶ ♥ ♡ ♦ ♣ ♠ ✿ ❀ ❁ ✽ ❖', 'Cocina y hogar': '☕ 🍴 ♨ 🍷 🍺 🧂 🥛 🍞 🍕 🍰 🍎 🌶 🧁 🍯 🥫 🧊 🛒 🏠 🛏 🛁 🚿 🧺 🧹 💡 🔌',
    'Oficina': '✂ ✉ ☎ ✆ ✎ ✏ ✒ 📎 📌 📍 📁 📂 📅 📦 🏷 🔑 🔒 🔓 💾 🖨 ⌨ 🖱 ⏰ ⌛ ⏳', 'Eco y lavado': '♻ ♲ ♳ ♴ ♵ ♶ ♷ ♸ ♹ ♺ ⚘ ☘ 🌱 🌿 🍃 💧 ☀ ☁ ☂ ☔ ⛅',
    'Música y ocio': '♪ ♫ ♬ ♩ ♭ ♮ ♯ ⚽ ⚾ 🏀 🎾 🎲 ♔ ♕ ♖ ♗ ♘ ♙ 🎁 🎂 🎈 🎉', 'Mates y monedas': '€ $ £ ¥ ¢ % ‰ ± × ÷ ≈ ≠ ≤ ≥ ∞ √ ∑ π Ω µ ° ½ ¼ ¾ № © ® ™',
  };
  function abrirSimbolos() {
    const cats = Object.keys(SIMBOLOS);
    const d = dialogo('Símbolos', `<div class="seg etq-tabs">${cats.map((c, i) => `<button data-c="${i}" ${i ? '' : 'class="on"'}>${c}</button>`).join('')}</div><div class="etq-simbolos" id="sGrid"></div>`);
    const show = i => {
      d.querySelectorAll('.etq-tabs button').forEach(b => b.classList.toggle('on', +b.dataset.c === i));
      d.querySelector('#sGrid').innerHTML = SIMBOLOS[cats[i]].split(' ').map(ch => `<button>${ch}</button>`).join('');
    };
    d.querySelector('.etq-tabs').onclick = e => { const b = e.target.closest('button'); if (b) show(+b.dataset.c); };
    d.querySelector('#sGrid').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const [W, H] = R.canvasSize(S.label), s = Math.min(W, H) - 12;
      checkpoint(); S.label.elements.push({ type: 'text', x: 6, y: Math.round((H - s) / 2), w: s, h: s, text: b.textContent, font: 'Segoe UI Symbol', align: 'center', valign: 'middle' });
      S.sel = S.label.elements.length - 1; S.multi = []; cambiado(true); d.close();
    };
    show(0);
  }
  function anadirNumero() {
    const [W, H] = R.canvasSize(S.label);
    checkpoint(); S.label.elements.push({ type: 'text', x: Math.round(W * 0.55), y: 6, w: Math.round(W * 0.42), h: H - 12, text: '{{n}}', bold: true, align: 'right', valign: 'middle' });
    S.sel = S.label.elements.length - 1; S.multi = []; cambiado(true);
    aviso('Número añadido: cambia en cada etiqueta al imprimir con «Serie…» o con una lista CSV/Excel', false, 5000);
  }

  // ── imágenes y logos ──
  function leerImagen(blob) {
    return new Promise((ok, ko) => {
      const url = URL.createObjectURL(blob), im = new Image();
      im.onload = () => {
        const k = Math.min(1, 800 / Math.max(im.width, im.height)), c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const g = c.getContext('2d'); g.drawImage(im, 0, 0, c.width, c.height);
        const px = g.getImageData(0, 0, c.width, c.height).data, vistos = new Set();
        for (let i = 0; i < px.length && vistos.size < 40; i += 28) vistos.add((px[i] >> 4) * 256 + (px[i + 1] >> 4) * 16 + (px[i + 2] >> 4));
        URL.revokeObjectURL(url);
        ok({ src: c.toDataURL('image/png'), ratio: im.width / im.height, dither: vistos.size < 40 ? 'threshold' : 'floyd' });
      };
      im.onerror = () => { URL.revokeObjectURL(url); ko(new Error('No se puede abrir la imagen')); };
      im.src = url;
    });
  }
  function elegirImagen(cb) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { const r = await leerImagen(f); cb(r.src, r); } catch (e) { aviso(e.message, true); } };
    inp.click();
  }
  function anadirImagenDe(r) {
    const [W, H] = R.canvasSize(S.label);
    let h = H, w = Math.round(H * r.ratio); if (w > W) { w = W; h = Math.round(W / r.ratio); }
    anadir('image', { src: r.src, w, h, x: Math.round((W - w) / 2), y: Math.round((H - h) / 2), dither: r.dither });
  }
  async function elegirLogoVisita() {
    const vs = (await local.todas('visitas')).filter(v => v.logo && !/svg|pdf/.test(v.logo.type || '')).sort((a, b) => b.creada - a.creada);
    const d = dialogo('Logo de una visita', vs.length ? `<div class="lista">${vs.map(v => `<button class="item" data-id="${esc(v.id)}"><div class="crece t">${esc(v.nombre)}</div></button>`).join('')}</div>
      <button class="btn peq" id="lRf" style="margin-top:10px">Logo de RoleFigz</button>` : '<p class="mono">No hay visitas con logo. Puedes poner el de RoleFigz:</p><button class="btn peq" id="lRf">Logo de RoleFigz</button>');
    d.querySelectorAll('.item').forEach(b => { b.onclick = async () => { const v = vs.find(x => x.id === b.dataset.id); d.close(); anadirImagenDe(await leerImagen(v.logo)); }; });
    d.querySelector('#lRf').onclick = async () => { d.close(); const [W, H] = R.canvasSize(S.label), s = Math.min(W, H) - 8; checkpoint(); S.label.elements.push(await logoRf(4, Math.round((H - s) / 2), s, s)); S.sel = S.label.elements.length - 1; S.multi = []; cambiado(true); };
  }
  let logoRfSrc = null;
  async function logoRf(x, y, w, h) {
    if (!logoRfSrc) try { logoRfSrc = (await leerImagen(await (await fetch('/app/rolefigz-logo.png')).blob())).src; } catch {}
    return logoRfSrc ? { type: 'image', x, y, w, h, src: logoRfSrc, fit: 'contain', dither: 'threshold', threshold: 190 }
                     : { type: 'text', x, y, w, h, text: 'ROLE\nFIGZ', bold: true, align: 'center', valign: 'middle' };
  }

  // ── plantillas ──
  const BASICAS = [
    ['Texto de una línea', (W, H) => [{ type: 'text', x: 6, y: 4, w: W - 12, h: H - 8, text: 'Etiqueta', bold: true }], true],
    ['Título + subtítulo', (W, H) => [{ type: 'text', x: 6, y: 4, w: W - 12, h: Math.round(H * 0.6) - 4, text: 'Título', bold: true },
      { type: 'line', x1: 10, y1: Math.round(H * 0.62), x2: W - 10, y2: Math.round(H * 0.62), width: 2 },
      { type: 'text', x: 6, y: Math.round(H * 0.66), w: W - 12, h: Math.round(H * 0.32), text: 'Subtítulo' }]],
    ['QR + texto', (W, H) => [{ type: 'qr', x: 6, y: 6, w: H - 12, h: H - 12, data: 'https://rolefigz.com' },
      { type: 'text', x: H, y: 6, w: W - H - 6, h: Math.round(H * 0.58), text: 'Título', bold: true },
      { type: 'text', x: H, y: Math.round(H * 0.62), w: W - H - 6, h: Math.round(H * 0.32), text: 'rolefigz.com' }]],
    ['Código de barras', (W, H) => [{ type: 'barcode', x: 8, y: 6, w: W - 16, h: H - 12, data: '4901234567894', symbology: 'ean13' }]],
    ['Nombre con marco', (W, H) => [{ type: 'rect', x: 1, y: 1, w: W - 2, h: H - 2, stroke: 3, radius: 12 }, { type: 'text', x: 12, y: 10, w: W - 24, h: H - 20, text: 'Nombre', bold: true }], true],
    ['Cabecera invertida', (W, H) => [{ type: 'rect', x: 0, y: 0, w: W, h: Math.round(H * 0.4), fill: true, radius: 0 },
      { type: 'text', x: 6, y: 2, w: W - 12, h: Math.round(H * 0.4) - 4, text: 'Cabecera', bold: true, color: 'white' },
      { type: 'text', x: 6, y: Math.round(H * 0.44), w: W - 12, h: Math.round(H * 0.54), text: 'Texto principal' }]],
    ['Etiqueta con fecha', (W, H) => [{ type: 'text', x: 6, y: 4, w: W - 12, h: Math.round(H * 0.5), text: '{{producto}}', bold: true },
      { type: 'text', x: 6, y: Math.round(H * 0.56), w: W - 12, h: Math.round(H * 0.4), text: '{{date:%d/%m/%Y}}' }]],
    ['Bandera para cable', (W, H) => { const wr = Math.round(W * 0.22), sd = Math.round((W - wr) / 2); return [
      { type: 'text', x: 3, y: 4, w: sd - 6, h: H - 8, text: 'LAN-01', bold: true },
      { type: 'line', x1: sd, y1: 4, x2: sd, y2: 12, width: 1 }, { type: 'line', x1: sd, y1: H - 12, x2: sd, y2: H - 4, width: 1 },
      { type: 'line', x1: W - sd, y1: 4, x2: W - sd, y2: 12, width: 1 }, { type: 'line', x1: W - sd, y1: H - 12, x2: W - sd, y2: H - 4, width: 1 },
      { type: 'text', x: W - sd + 3, y: 4, w: sd - 6, h: H - 8, text: 'LAN-01', bold: true }]; }],
    ['Vertical', (W, H) => [{ type: 'text', x: 4, y: 4, w: W - 8, h: H - 8, text: 'Etiqueta vertical', vertical: true, bold: true }], true],
  ];
  const ROLEFIGZ = [
    ['Producto y precio', async (W, H) => [await logoRf(4, 4, H - 8, H - 8),
      { type: 'text', x: H + 2, y: 4, w: W - H - 8, h: Math.round(H * 0.55) - 4, text: '{{producto}}', bold: true },
      { type: 'line', x1: H + 2, y1: Math.round(H * 0.58), x2: W - 6, y2: Math.round(H * 0.58), width: 1 },
      { type: 'text', x: H + 2, y: Math.round(H * 0.62), w: W - H - 8, h: Math.round(H * 0.34), text: '{{precio}} €', align: 'right' }]],
    ['Logo + QR', async (W, H) => [await logoRf(4, 4, H - 8, H - 8),
      { type: 'text', x: H + 2, y: 6, w: W - 2 * H, h: H - 12, text: '{{texto}}', bold: true, align: 'center', valign: 'middle' },
      { type: 'qr', x: W - H + 4, y: 4, w: H - 8, h: H - 8, data: '{{url}}' }]],
    ['Nombre con marco', async (W, H) => [{ type: 'rect', x: 2, y: 2, w: W - 4, h: H - 4, stroke: 2, radius: 14 },
      { type: 'text', x: 12, y: 8, w: W - 24, h: H - 16, text: '{{nombre}}', bold: true, align: 'center', valign: 'middle' }]],
    ['Pedido numerado', async (W, H) => [{ type: 'rect', x: 0, y: 0, w: Math.round(W * 0.34), h: H, fill: true, radius: 6 },
      { type: 'text', x: 4, y: 6, w: Math.round(W * 0.34) - 8, h: H - 12, text: '{{n}}', bold: true, color: 'white', align: 'center', valign: 'middle' },
      { type: 'text', x: Math.round(W * 0.34) + 6, y: 4, w: Math.round(W * 0.66) - 10, h: Math.round(H * 0.56), text: '{{cliente}}', bold: true },
      { type: 'text', x: Math.round(W * 0.34) + 6, y: Math.round(H * 0.6), w: Math.round(W * 0.66) - 10, h: Math.round(H * 0.36), text: '{{date:%d/%m/%Y}}' }]],
    ['Solo el logo', async (W, H) => [await logoRf(4, 4, W - 8, H - 8)], true],
  ];
  async function abrirPlantillas() {
    const mias = (await local.todas('plantillas')).sort((a, b) => b.fecha - a.fecha);
    const d = dialogo('Plantillas', `
      <h3>Mis plantillas</h3>
      <div class="lista" id="tMias">${mias.length ? mias.map(t => `<div class="item"><button class="crece t etq-btn-plano" data-n="${esc(t.nombre)}">${esc(t.nombre)}</button>
        <button class="btn peq" data-exp="${esc(t.nombre)}">⇪</button><button class="btn peq peligro" data-del="${esc(t.nombre)}">×</button></div>`).join('')
        : '<p class="mono">Guarda tus diseños habituales y aparecerán aquí.</p>'}</div>
      <button class="btn peq" id="tGuardar" style="margin:8px 0 14px">+ Guardar el diseño actual</button>
      <h3>RoleFigz</h3><div class="etq-chips" id="tRf">${ROLEFIGZ.map(([n], i) => `<button data-i="${i}">${n}</button>`).join('')}</div>
      <h3 style="margin-top:12px">Básicas</h3><div class="etq-chips" id="tBas">${BASICAS.map(([n], i) => `<button data-i="${i}">${n}</button>`).join('')}</div>`);
    const aplicar = async (fn, vertOk) => {
      if (S.label.elements.length && !confirm('¿Sustituir el diseño actual? (puedes deshacerlo)')) return;
      checkpoint();
      if (S.label.orientation === 'portrait' && !vertOk) { S.label.orientation = 'landscape'; S.zoom = 0; aviso('Esta plantilla es horizontal: he puesto la orientación en «Horiz.»'); }
      const [W, H] = R.canvasSize(S.label);
      S.label.elements = await fn(W, H); S.sel = -1; S.multi = []; cambiado(true); d.close();
    };
    d.querySelector('#tRf').onclick = e => { const b = e.target.closest('button'); if (b) aplicar(ROLEFIGZ[+b.dataset.i][1], ROLEFIGZ[+b.dataset.i][2]); };
    d.querySelector('#tBas').onclick = e => { const b = e.target.closest('button'); if (b) aplicar(BASICAS[+b.dataset.i][1], BASICAS[+b.dataset.i][2]); };
    d.querySelector('#tMias').onclick = async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.n) { const p = mias.find(x => x.nombre === t.dataset.n); if (S.label.elements.length && !confirm('¿Sustituir el diseño actual? (puedes deshacerlo)')) return; cargar(clone(p.label)); d.close(); }
      else if (t.dataset.exp) { const p = mias.find(x => x.nombre === t.dataset.exp); exportarJson({ ...p.label, name: p.nombre }); }
      else if (t.dataset.del) { if (!confirm(`¿Borrar la plantilla «${t.dataset.del}»?`)) return; await local.borrar('plantillas', t.dataset.del); d.close(); abrirPlantillas(); }
    };
    d.querySelector('#tGuardar').onclick = async () => {
      const nombre = (prompt('Nombre de la plantilla:', S.label.name || '') || '').trim(); if (!nombre) return;
      if (mias.some(x => x.nombre === nombre) && !confirm(`Ya existe «${nombre}». ¿Sustituirla?`)) return;
      await local.guardar('plantillas', { nombre, label: { ...clone(S.label), name: nombre }, fecha: Date.now() });
      aviso(`Plantilla «${nombre}» guardada`); d.close(); abrirPlantillas();
    };
  }

  // ── variables y datos CSV / Excel ──
  function pintaVars() {
    const card = $('#eVars'); if (!card) return;
    card.hidden = !S.vars.length && !S.csv;
    const g = $('#eVarsGrid'); g.innerHTML = '';
    for (const n of S.vars) {
      const f = document.createElement('label'); f.className = 'campo';
      const sp = document.createElement('span'); sp.textContent = `{{${n}}}`;
      const inp = document.createElement('input'); inp.type = 'text';
      inp.value = S.values[n] ?? S.label.variables?.[n] ?? '';
      inp.placeholder = S.csv ? '(se usa el valor del CSV/Excel)' : '';
      inp.oninput = () => { S.values[n] = inp.value; S.label.variables = { ...(S.label.variables || {}), [n]: inp.value }; pedirDibujo(); clearTimeout(tGuardar); tGuardar = setTimeout(guardarLocal, 400); };
      f.append(sp, inp); g.appendChild(f);
    }
    const info = $('#eCsvInfo'); info.hidden = !S.csv; $('#eCsvQuitar').hidden = !S.csv;
    if (S.csv) {
      const cols = Object.keys(S.csv[0] || {});
      info.innerHTML = `${esc(S.csvNombre || 'Datos')}: <b>${S.csv.length}</b> filas (${esc(cols.join(', '))}) → ${S.csv.length} etiquetas. Fila de la vista previa:
        <div class="etq-filas">${S.csv.slice(0, 200).map((r, i) => `<button data-i="${i}" class="${i === S.csvRow ? 'on' : ''}" title="${esc(Object.values(r).join(' / '))}">${i + 1}</button>`).join('')}</div>`;
      info.querySelector('.etq-filas').onclick = e => { const b = e.target.closest('button'); if (b) { S.csvRow = +b.dataset.i; pintaVars(); pedirDibujo(); } };
    }
    pintaBotonImprimir();
  }
  async function cargarDatos(f) {
    try {
      if (/\.xlsx$/i.test(f.name)) {
        const r = await EtqXlsx.leer(await f.arrayBuffer());
        if (!r.filas.length) return aviso('El Excel no tiene filas de datos (la primera fila son los nombres de las columnas)', true);
        S.csv = r.filas; S.csvNombre = `${f.name} · ${r.hoja}`;
      } else {
        const filas = EtqXlsx.csv(await f.text());
        if (!filas.length) return aviso('El archivo no tiene filas de datos', true);
        S.csv = filas; S.csvNombre = f.name;
      }
      S.csvRow = 0;
      const faltan = S.vars.filter(v => !(v in S.csv[0]));
      aviso(faltan.length ? `Columnas que faltan: ${faltan.join(', ')} (se usa el valor del campo)` : `${S.csv.length} filas cargadas`, false, 5000);
      pintaVars(); pedirDibujo();
    } catch (e) { aviso('No se ha podido leer: ' + e.message, true); }
  }

  // ── archivos ──
  function nombreArchivo() { return (S.label.name || 'etiqueta').replace(/[\\/:*?"<>|]/g, '_'); }
  function exportarJson(lab = S.label) {
    const f = new File([JSON.stringify(lab, null, 2)], `${(lab.name || 'etiqueta').replace(/[\\/:*?"<>|]/g, '_')}.p21.json`, { type: 'application/json' });
    compartir([f], lab.name || 'Etiqueta');
  }
  function exportarPng() {
    if (!S.res) return;
    const k = 4, c = document.createElement('canvas'); c.width = S.res.W * k; c.height = S.res.H * k;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(S.res.canvas, 0, 0, c.width, c.height);
    c.toBlob(b => compartir([new File([b], nombreArchivo() + '.png', { type: 'image/png' })], S.label.name || 'Etiqueta'));
  }
  async function abrirArchivo(f) {
    if (f.type.startsWith('image/')) { try { anadirImagenDe(await leerImagen(f)); } catch (e) { aviso(e.message, true); } return; }
    let d; try { d = JSON.parse(await f.text()); } catch { return aviso(`${f.name} no es un archivo de etiqueta (.p21.json)`, true); }
    if (!d || !Array.isArray(d.elements)) return aviso(`${f.name} no es un archivo de etiqueta (.p21.json)`, true);
    cargar(d); aviso(`${f.name} abierto`);
  }
  function cargar(lab, sinHistoria = false) {
    if (!sinHistoria && S.label) checkpoint();
    S.label = R.normalizar(lab);
    S.values = { ...(S.label.variables || {}) };
    S.sel = -1; S.multi = []; S.zoom = 0;
    pintaBarraImpresion(); cambiado(true);
  }

  // ── impresión ──
  function totalEtiquetas(filas) { return (filas ? filas.length : 1) * (S.label.copies || 1); }
  function pintaBotonImprimir() { const b = $('#eImp'); if (b && !S.imprimiendo) { const n = totalEtiquetas(S.csv); b.textContent = n > 1 ? `🖨️ Imprimir (${n})` : '🖨️ Imprimir'; } }
  function pintaBarraImpresion() { const c = $('#eCop'), d = $('#eDen'), o = $('#eDenV'); if (c) c.value = S.label.copies || 1; if (d) d.value = S.label.density || 15; if (o) o.textContent = S.label.density || 15; pintaBotonImprimir(); }
  async function imprimir(filas = S.csv) {
    if (S.imprimiendo) return;
    const total = totalEtiquetas(filas);
    if (total > 1 && !confirm(`Se imprimirán ${total} etiquetas. ¿Continuar?`)) return;
    S.imprimiendo = true;
    const b = $('#eImp'), est = $('#eEst');
    b.disabled = true; est.classList.remove('err');
    const lista = filas && filas.length ? filas : [null];
    let hechas = 0;
    try {
      await fuentesListas(S.label);
      const L = R.normalizar(S.label);
      const vertical = L.orientation === 'portrait';
      // primero se comprueban todas (si una no se puede dibujar no se imprime nada)
      const lienzos = [];
      for (let k = 0; k < lista.length; k++) {
        const vals = { ...S.values, ...(lista[k] || {}) };
        const res = R.dibujar(R.sustituir(L, vals, k + 1));
        if (res.pendiente) throw new Error('Todavía se están cargando las imágenes: espera un segundo y vuelve a pulsar.');
        if (res.errores.length) throw new Error(res.errores[0]);
        lienzos.push(res.canvas);
      }
      for (let k = 0; k < lienzos.length; k++) {
        est.textContent = lienzos.length > 1 ? `Imprimiendo ${k + 1} / ${lienzos.length}…` : 'Imprimiendo…';
        await P21.imprimir(lienzos[k], { largo: L.media.length_mm, ancho: L.media.width_mm, separacion: L.media.gap_mm ?? null, densidad: L.density, copias: L.copies, vertical });
        hechas++;
      }
      est.textContent = 'Hecho ✓';
      $('#eCon').textContent = `${P21.nombre() || 'P21'} ✓`;
      anotarHistorial(filas, hechas, true);
    } catch (e) {
      if (e.name === 'NotFoundError') est.textContent = '';
      else { est.textContent = 'Error: ' + e.message; est.classList.add('err'); if (hechas) anotarHistorial(filas, hechas, false); }
    }
    S.imprimiendo = false; b.disabled = false; pintaBotonImprimir();
  }
  async function anotarHistorial(filas, hechas, ok) {
    try {
      const mini = S.res ? S.res.canvas.toDataURL('image/png') : '';
      await local.guardar('historial', { id: App.id(), fecha: Date.now(), nombre: S.label.name || titulo(S.label.elements.find(e => e.type === 'text') || {}) || 'Etiqueta',
        label: clone(S.label), values: { ...S.values }, filas: filas ? clone(filas) : null, hechas: hechas * (S.label.copies || 1), ok, png: mini });
      const todos = (await local.todas('historial')).sort((a, b) => b.fecha - a.fecha);
      for (const h of todos.slice(30)) await local.borrar('historial', h.id);
      pintaRecientes();
    } catch {}
  }
  async function pintaRecientes() {
    const box = $('#eRecientes'); if (!box) return;
    const items = (await local.todas('historial')).sort((a, b) => b.fecha - a.fecha).slice(0, 12);
    if (!items.length) { box.innerHTML = '<p class="mono">Aquí aparecerán las últimas etiquetas que imprimas, para repetirlas con un toque.</p>'; return; }
    box.innerHTML = items.map(h => `<div class="etq-hist" data-id="${h.id}">${h.png ? `<img src="${h.png}" alt=""/>` : '<span></span>'}
      <div class="crece"><div class="t">${esc(h.nombre)}</div><div class="mono">${App.fecha(h.fecha)} · ${h.hechas} uds.${h.ok ? '' : ' · ⚠'}</div></div>
      <button class="btn peq" data-a="abrir">Abrir</button><button class="btn peq" data-a="repetir">↻</button><button class="btn peq" data-a="quitar">×</button></div>`).join('');
    box.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const h = items.find(x => x.id === b.closest('.etq-hist').dataset.id);
      if (b.dataset.a === 'quitar') { await local.borrar('historial', h.id); return pintaRecientes(); }
      if (S.label.elements.length && JSON.stringify(S.label.elements) !== JSON.stringify(h.label.elements) && !confirm('¿Sustituir el diseño actual por el del historial? (puedes deshacerlo)')) return;
      cargar(clone(h.label));
      S.values = { ...h.values };
      S.csv = h.filas && !h.filas.every(r => Object.keys(r).length === 1 && 'n' in r) ? clone(h.filas) : null;
      S.csvNombre = S.csv ? 'Datos del historial' : ''; S.csvRow = 0;
      pintaVars(); pedirDibujo();
      if (b.dataset.a === 'repetir') imprimir(h.filas || null);
    };
  }

  // serie numerada (001, 002…)
  function abrirSerie() {
    if (!JSON.stringify(S.label.elements).includes('{{n')) {
      if (!confirm('El diseño no tiene ningún número ({{n}}). ¿Añado el elemento «Número»?')) return;
      anadirNumero();
    }
    let g = {}; try { g = JSON.parse(localStorage.getItem('etq-serie') || '{}'); } catch {}
    const v = (k, d) => esc(g[k] ?? d);
    const d = dialogo('Imprimir una serie', `<p class="mono" style="margin-top:0">Una etiqueta por número. Usa el elemento «Número» o escribe {{n}} en un texto, QR o código.</p>
      <div class="etq-grid2">
        <label class="campo"><span>Desde</span><input type="number" id="sDe" value="${v('de', 1)}" min="0"/></label>
        <label class="campo"><span>Hasta</span><input type="number" id="sA" value="${v('a', 10)}" min="0"/></label>
        <label class="campo"><span>Paso</span><input type="number" id="sPaso" value="${v('paso', 1)}" min="1"/></label>
        <label class="campo"><span>Cifras (ceros)</span><input type="number" id="sCif" value="${v('cif', 3)}" min="1" max="9"/></label>
        <label class="campo"><span>Prefijo</span><input type="text" id="sPre" value="${v('pre', '')}" placeholder="RF-"/></label>
        <label class="campo"><span>Sufijo</span><input type="text" id="sSuf" value="${v('suf', '')}" placeholder="/2026"/></label>
      </div><p class="mono" id="sVista"></p><button class="btn prim ancho" id="sIr">Imprimir serie</button>`);
    const filas = () => {
      const de = +d.querySelector('#sDe').value || 0, a = +d.querySelector('#sA').value || 0, paso = Math.max(1, +d.querySelector('#sPaso').value || 1);
      const cif = clamp(+d.querySelector('#sCif').value || 1, 1, 9), pre = d.querySelector('#sPre').value, suf = d.querySelector('#sSuf').value, out = [];
      for (let x = de; x <= a && out.length <= 1000; x += paso) out.push({ n: pre + String(x).padStart(cif, '0') + suf });
      return out;
    };
    const vistaSerie = () => {
      const r = filas(), o = d.querySelector('#sVista');
      if (!r.length) return (o.textContent = '«Hasta» debe ser mayor o igual que «Desde».');
      if (r.length > 1000) return (o.textContent = 'Como mucho 1000 etiquetas por serie.');
      const c = S.label.copies || 1;
      o.textContent = `${r.length <= 4 ? r.map(x => x.n).join(', ') : `${r[0].n}, ${r[1].n}, … ${r[r.length - 1].n}`} → ${r.length * c} etiquetas${c > 1 ? ` (${c} copias de cada)` : ''}`;
    };
    d.addEventListener('input', vistaSerie); vistaSerie();
    d.querySelector('#sIr').onclick = () => {
      const r = filas(); if (!r.length || r.length > 1000) return;
      localStorage.setItem('etq-serie', JSON.stringify({ de: d.querySelector('#sDe').value, a: d.querySelector('#sA').value, paso: d.querySelector('#sPaso').value,
        cif: d.querySelector('#sCif').value, pre: d.querySelector('#sPre').value, suf: d.querySelector('#sSuf').value }));
      if (S.csv) return aviso('Quita primero los datos CSV/Excel: la serie y la lista no se combinan', true);
      d.close(); imprimir(r);
    };
  }

  // ── pantalla ──
  async function mostrar(opciones = {}) {
    cargarFuentes();
    if (!S.label) { let g = null; try { g = JSON.parse(localStorage.getItem('etq-label') || 'null'); } catch {} S.label = R.normalizar(g || R.nuevo()); S.values = { ...(S.label.variables || {}) }; }
    try { S.grid = localStorage.getItem('etq-rejilla') === '1'; } catch {}
    vista().innerHTML = `
      <div class="cab"><h1>Etiquetas</h1><button class="btn peq" id="eCon">${P21.conectada() ? `${esc(P21.nombre() || 'P21')} ✓` : 'Conectar P21'}</button></div>
      ${P21.soporta ? '' : '<div class="tarjeta" style="border-color:var(--aviso)"><b>Sin Bluetooth en este navegador.</b><div class="mono">Para imprimir usa Chrome en Android. Aquí puedes diseñar, guardar y exportar.</div></div>'}
      <div class="etq-barra">
        <button class="btn peq ico" id="eUndo" title="Deshacer">↶</button><button class="btn peq ico" id="eRedo" title="Rehacer">↷</button>
        <button class="btn peq" id="ePlant">Plantillas</button><button class="btn peq" id="eNuevo">Nuevo</button>
        <label class="btn peq">Abrir<input type="file" id="eAbrir" accept=".json,application/json,image/*" hidden/></label>
        <button class="btn peq" id="eGuardarJ">Guardar</button><button class="btn peq" id="ePng">PNG</button>
      </div>
      <div class="etq-wrap" id="eWrap"><div class="etq-stage" id="eStage"><canvas id="ePrev"></canvas><div id="eOver"></div><div class="guia v" id="eGv"></div><div class="guia h" id="eGh"></div></div></div>
      <div class="etq-zoom">
        <button class="btn peq ico" id="eZm">−</button><button class="btn peq" id="eZf">Ajustar</button><button class="btn peq ico" id="eZp">+</button>
        <label class="check"><input type="checkbox" id="eMarcos"/> Marcos</label>
        <label class="check"><input type="checkbox" id="eRej"/> Cuadrícula mm</label>
        <label class="check"><input type="checkbox" id="eVarios"/> Varios</label>
      </div>
      <div class="mono" id="eInfo" style="text-align:center;margin:-4px 0 6px"></div>
      <div class="etq-avisos" id="eAvisos"></div>
      <div class="etq-anadir" id="eAnadir">
        <button data-a="text"><b>T</b>Texto</button><button data-a="qr"><b>▦</b>QR</button><button data-a="barcode"><b>║</b>Código</button>
        <button data-a="image"><b>▣</b>Imagen</button><button data-a="logo"><b>◆</b>Logo</button><button data-a="rect"><b>□</b>Rectángulo</button>
        <button data-a="ellipse"><b>○</b>Elipse</button><button data-a="line"><b>╱</b>Línea</button><button data-a="date"><b>📅</b>Fecha</button>
        <button data-a="simbolo"><b>★</b>Símbolo</button><button data-a="numero"><b>#</b>Número</button>
      </div>
      <div class="tarjeta" id="eProps"></div>
      <div class="tarjeta" id="eVars" hidden>
        <div class="fila"><h3 class="crece">Variables</h3>
          <label class="btn peq">CSV / Excel<input type="file" id="eCsv" accept=".csv,.txt,.xlsx" hidden/></label><button class="btn peq" id="eCsvQuitar" hidden>Quitar datos</button></div>
        <div class="etq-grid2" id="eVarsGrid" style="margin-top:8px"></div><div class="mono" id="eCsvInfo" hidden></div>
      </div>
      <div class="tarjeta etq-imprimir">
        <div class="fila envuelve">
          <label class="campo" style="width:90px;margin:0"><span>Copias</span><input type="number" id="eCop" min="1" max="99" inputmode="numeric"/></label>
          <label class="campo crece" style="margin:0"><span>Intensidad <b id="eDenV"></b></span><input type="range" id="eDen" min="1" max="15"/></label>
        </div>
        <div class="botones" style="margin-top:10px"><button class="btn" id="eSerie">Serie…</button><button class="btn prim" id="eImp">🖨️ Imprimir</button></div>
        <div class="estado" id="eEst"></div>
      </div>
      <details class="tarjeta"><summary><b>Capas</b></summary><ol class="etq-capas" id="eCapas"></ol></details>
      <details class="tarjeta"><summary><b>Recientes</b></summary><div id="eRecientes"></div></details>`;

    const st = $('#eStage');
    st.addEventListener('pointerdown', alPulsar);
    st.addEventListener('pointermove', alMover);
    st.addEventListener('pointerup', alSoltar);
    st.addEventListener('pointercancel', alSoltar);
    $('#eWrap').addEventListener('pointerdown', e => { if (e.target.id === 'eWrap') fijarSeleccion([], -1); });
    $('#eUndo').onclick = undo; $('#eRedo').onclick = redo;
    $('#ePlant').onclick = abrirPlantillas;
    $('#eNuevo').onclick = () => { if (S.label.elements.length && !confirm('¿Empezar una etiqueta nueva? (puedes deshacerlo)')) return; const m = S.label.media, o = S.label.orientation; cargar({ ...R.nuevo(), media: m, orientation: o }); };
    $('#eAbrir').onchange = e => { const f = e.target.files[0]; if (f) abrirArchivo(f); e.target.value = ''; };
    $('#eGuardarJ').onclick = () => exportarJson();
    $('#ePng').onclick = exportarPng;
    $('#eZm').onclick = () => { S.zoom = clamp(zoom() - 0.5, 0.75, 8); pintaOverlay(); pedirDibujo(); };
    $('#eZp').onclick = () => { S.zoom = clamp(zoom() + 0.5, 0.75, 8); pintaOverlay(); pedirDibujo(); };
    $('#eZf').onclick = () => { S.zoom = 0; pintaOverlay(); pedirDibujo(); };
    $('#eMarcos').checked = S.marcos; $('#eMarcos').onchange = e => { S.marcos = e.target.checked; pintaOverlay(); };
    $('#eRej').checked = S.grid; $('#eRej').onchange = e => { S.grid = e.target.checked; try { localStorage.setItem('etq-rejilla', S.grid ? '1' : ''); } catch {} pintaOverlay(); };
    $('#eVarios').checked = S.varios; $('#eVarios').onchange = e => { S.varios = e.target.checked; pintaOverlay(); };
    $('#eAnadir').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const a = b.dataset.a;
      if (a === 'image') elegirImagen((src, r) => anadirImagenDe(r));
      else if (a === 'logo') elegirLogoVisita();
      else if (a === 'simbolo') abrirSimbolos();
      else if (a === 'numero') anadirNumero();
      else anadir(a);
    };
    $('#eCsv').onchange = e => { const f = e.target.files[0]; if (f) cargarDatos(f); e.target.value = ''; };
    $('#eCsvQuitar').onclick = () => { S.csv = null; S.csvRow = 0; pintaVars(); pedirDibujo(); };
    $('#eCop').oninput = e => { const v = +e.target.value; if (v >= 1) { S.label.copies = Math.min(99, v); pintaBotonImprimir(); guardarLocal(); } };
    $('#eDen').oninput = e => { S.label.density = +e.target.value; $('#eDenV').textContent = e.target.value; guardarLocal(); };
    $('#eSerie').onclick = abrirSerie;
    $('#eImp').onclick = () => imprimir();
    $('#eCon').onclick = async () => {
      try { const n = await P21.conectar(); $('#eCon').textContent = `${n} ✓`; aviso('Impresora conectada.'); }
      catch (e) { if (e.name !== 'NotFoundError') aviso(e.message, true); }
    };
    document.onkeydown = teclas;

    pintaBarraImpresion(); pintaUndo(); pintaOverlay(); pintaCapas(); pintaProps(); pintaVars(); pintaRecientes(); pedirDibujo();
    window.onresize = () => { if ($('#eStage') && !S.zoom) { pintaOverlay(); pedirDibujo(); } };

    // desde una visita: plantilla «logo + nombre» con su logo
    if (opciones.visita) {
      const v = opciones.visita;
      if (S.label.elements.length && !confirm(`¿Hacer una etiqueta nueva con el logo de «${v.nombre}»? (puedes deshacerlo)`)) return;
      const [W, H] = R.canvasSize(S.label);
      const els = [];
      if (v.logo && !/svg|pdf/.test(v.logo.type || '')) {
        const r = await leerImagen(v.logo);
        els.push({ type: 'image', x: 4, y: 4, w: H - 8, h: H - 8, src: r.src, fit: 'contain', dither: r.dither, threshold: 150 });
      }
      els.push({ type: 'text', x: els.length ? H + 2 : 6, y: 6, w: els.length ? W - H - 8 : W - 12, h: H - 12, text: v.nombre, bold: true });
      checkpoint(); S.label.elements = els; S.label.name = v.nombre; S.sel = -1; cambiado(true);
    }
  }

  function teclas(e) {
    if (!$('#eStage') || e.target.closest?.('input, textarea, select') || document.querySelector('dialog[open]')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    if (e.key === 'Delete' || e.key === 'Backspace') { borrar(); e.preventDefault(); }
    else if (ctrl && e.key.toLowerCase() === 'z') { e.shiftKey ? redo() : undo(); e.preventDefault(); }
    else if (ctrl && e.key.toLowerCase() === 'y') { redo(); e.preventDefault(); }
    else if (ctrl && e.key.toLowerCase() === 'd') { duplicar(); e.preventDefault(); }
    else if (ctrl && e.key.toLowerCase() === 'c') copiar();
    else if (ctrl && e.key.toLowerCase() === 'v') pegar();
    else if (ctrl && e.key.toLowerCase() === 'a') { fijarSeleccion(S.label.elements.map((_, i) => i), S.label.elements.length - 1); e.preventDefault(); }
    else if (e.key.startsWith('Arrow')) {
      const p = e.shiftKey ? 8 : 1;
      empujar(e.key === 'ArrowLeft' ? -p : e.key === 'ArrowRight' ? p : 0, e.key === 'ArrowUp' ? -p : e.key === 'ArrowDown' ? p : 0);
      e.preventDefault();
    } else if (e.key === 'Escape') fijarSeleccion([], -1);
  }

  return { mostrar, get estado() { return S; } };
})();
