// Motor de etiquetas: el mismo formato .p21.json y el mismo algoritmo que P21 Studio de RoleMaker
// (app/etiquetas/p21studio/render.py y label.py), pero dibujado en el navegador con canvas.
// Lo que se ve en el editor es exactamente lo que se imprime (1 bit, umbral 128).
const EtqRender = (() => {
  const HEAD = 96;
  const MEDIA = {
    '14x40': { width_mm: 14, length_mm: 40 }, '14x50': { width_mm: 14, length_mm: 50 }, '14x30': { width_mm: 14, length_mm: 30 },
    '14x75': { width_mm: 14, length_mm: 75 }, '12x40': { width_mm: 12, length_mm: 40 }, '15x30': { width_mm: 15, length_mm: 30 },
    '15x40': { width_mm: 15, length_mm: 40 }, '15x50': { width_mm: 15, length_mm: 50 },
  };
  const COMUNES = { x: 0, y: 0, w: 50, h: 30, rotate: 0, color: 'black' };
  const DEF = {
    text: { text: '', font: 'auto', size: 'auto', min_size: 8, max_size: 200, bold: false, align: 'center', valign: 'middle', line_spacing: 1.15, letter_spacing: 0, wrap: true, vertical: false, stroke: 0 },
    qr: { data: '', ecc: 'M', border: 0 },
    barcode: { data: '', symbology: 'code128', show_text: true, text_size: 14, font: 'auto' },
    image: { src: '', fit: 'contain', dither: 'floyd', threshold: 128, invert: false, brightness: 1, contrast: 1 },
    rect: { fill: false, stroke: 2, radius: 0 },
    ellipse: { fill: false, stroke: 2 },
    line: { x1: 0, y1: 0, x2: 50, y2: 0, width: 2 },
  };
  const NOMBRES = { text: 'Texto', qr: 'QR', barcode: 'Código de barras', image: 'Imagen', rect: 'Rectángulo', ellipse: 'Elipse', line: 'Línea' };

  // fuentes: «auto» = Inter, la web más parecida en anchura a Yu Gothic (la «automática» de P21 Studio en el PC de
  // Oskar, medido el 2026-11-24); las de Windows se cambian por equivalentes web
  const FUENTE_AUTO = 'Inter';
  const EQUIVALENTES = { 'Segoe UI Symbol': 'Noto Sans Symbols 2', 'Segoe UI Emoji': 'Noto Emoji', 'Arial': 'Arimo', 'Arial Black': 'Archivo Black',
    'Segoe UI': 'Inter', 'Yu Gothic': 'Inter', 'Meiryo': 'Inter', 'Calibri': 'Carlito', 'Times New Roman': 'Tinos', 'Courier New': 'Cousine', 'Impact': 'Anton' };
  const familia = f => {
    const n = !f || f === 'auto' ? FUENTE_AUTO : (EQUIVALENTES[f] || f);
    return `"${n}", "${FUENTE_AUTO}", "Noto Sans Symbols 2", "Noto Emoji", sans-serif`;
  };

  const lengthDots = mm => Math.max(8, Math.floor(mm * 8 + 0.5) - 16);
  function canvasSize(label) {
    const len = label.media.length_dots || lengthDots(label.media.length_mm);
    return label.orientation === 'portrait' ? [HEAD, len] : [len, HEAD];
  }
  const nuevo = () => ({ version: 1, name: '', media: { width_mm: 14, length_mm: 40 }, orientation: 'landscape', invert: false, density: 15, copies: 1, variables: {}, elements: [] });
  function completar(el) {
    const e = { ...COMUNES, ...DEF[el.type], ...el };
    if (e.type === 'line') { e.x = Math.min(e.x1, e.x2); e.y = Math.min(e.y1, e.y2); e.w = Math.abs(e.x2 - e.x1); e.h = Math.abs(e.y2 - e.y1); }
    return e;
  }
  function normalizar(lab) {
    const L = { ...nuevo(), ...lab };
    L.media = typeof lab.media === 'string' ? { ...(MEDIA[lab.media] || MEDIA['14x40']) } : { ...nuevo().media, ...(lab.media || {}) };
    L.elements = (lab.elements || []).filter(e => e && DEF[e.type]);
    L.variables = { ...(lab.variables || {}) };
    return L;
  }

  // ── variables: {{nombre}}, {{date:%d/%m/%Y}}, {{time}}, {{datetime}}, {{n}}, {{n:03}} ──
  const VAR = /\{\{\s*([^{}\s:]+)\s*(?::([^}]*))?\}\}/g;
  const CAMPOS = ['text', 'data', 'src'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  function strftime(d, fmt) {
    const p2 = n => String(n).padStart(2, '0');
    return fmt.replace(/%(-?)([a-zA-Z%])/g, (m, sin, c) => {
      const v = { d: p2(d.getDate()), m: p2(d.getMonth() + 1), Y: d.getFullYear(), y: p2(d.getFullYear() % 100), H: p2(d.getHours()),
        I: p2(d.getHours() % 12 || 12), M: p2(d.getMinutes()), S: p2(d.getSeconds()), p: d.getHours() < 12 ? 'AM' : 'PM',
        b: MESES[d.getMonth()].slice(0, 3), B: MESES[d.getMonth()], a: DIAS[d.getDay()].slice(0, 3), A: DIAS[d.getDay()],
        j: String(Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5)).padStart(3, '0'), '%': '%' }[c];
      if (v === undefined) return m;
      return sin ? String(+v || v) : String(v);
    });
  }
  function formatoN(n, fmt) {
    if (!fmt) return String(n);
    const m = /^0?(\d+)d?$/.exec(fmt.trim());
    return m ? String(n).padStart(+m[1], '0') : String(n);
  }
  function variables(label) {
    const out = [];
    for (const el of label.elements) for (const f of CAMPOS) for (const m of String(el[f] ?? '').matchAll(VAR))
      if (!out.includes(m[1]) && !['date', 'time', 'datetime', 'n'].includes(m[1])) out.push(m[1]);
    return out;
  }
  function sustituir(label, valores = {}, n = 1) {
    const vals = { ...(label.variables || {}), ...Object.fromEntries(Object.entries(valores || {}).filter(([, v]) => v != null)) };
    const ahora = new Date();
    const rep = (m, nombre, fmt) => {
      if (nombre in vals) return String(vals[nombre]);
      if (nombre === 'date') return strftime(ahora, fmt || '%Y-%m-%d');
      if (nombre === 'time') return strftime(ahora, fmt || '%H:%M');
      if (nombre === 'datetime') return strftime(ahora, fmt || '%Y-%m-%d %H:%M');
      if (nombre === 'n') return formatoN(n, fmt);
      return m;
    };
    const out = JSON.parse(JSON.stringify(label));
    for (const el of out.elements) for (const f of CAMPOS) if (typeof el[f] === 'string' && el[f].includes('{{')) el[f] = el[f].replace(VAR, rep);
    return out;
  }
  const sinResolver = label => label.elements.flatMap(el => CAMPOS.flatMap(f => [...String(el[f] ?? '').matchAll(VAR)].map(m => m[0])));

  // ── utilidades de canvas ──
  function lienzo(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  // máscara: canal alfa >= 128 → tinta
  function pegar(dst, W, H, mask, ox, oy, valor) {
    const mw = mask.width, mh = mask.height, md = mask.getContext('2d').getImageData(0, 0, mw, mh).data;
    for (let y = 0; y < mh; y++) {
      const Y = oy + y; if (Y < 0 || Y >= H) continue;
      for (let x = 0; x < mw; x++) {
        const X = ox + x; if (X < 0 || X >= W) continue;
        if (md[(y * mw + x) * 4 + 3] >= 128) dst[Y * W + X] = valor;
      }
    }
  }

  // ── formas (sobre una máscara del tamaño de la etiqueta) ──
  function forma(ctx, el) {
    ctx.fillStyle = ctx.strokeStyle = '#000';
    if (el.type === 'line') {
      // como ImageDraw.line de Pillow: el grosor se reparte alrededor del punto (impar → centrado en el píxel)
      const lw = Math.max(1, el.width), o = (lw % 2) * 0.5;
      ctx.lineWidth = lw; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(el.x1 + o, el.y1 + o); ctx.lineTo(el.x2 + o, el.y2 + o); ctx.stroke();
      return;
    }
    const s = Math.max(1, el.stroke);
    if (el.type === 'rect') {
      const r = Math.max(0, Math.min(el.radius, Math.floor(Math.min(el.w, el.h) / 2)));
      if (el.fill) { ctx.beginPath(); ctx.roundRect(el.x, el.y, el.w, el.h, r); ctx.fill(); }
      else { ctx.lineWidth = s; ctx.beginPath(); ctx.roundRect(el.x + s / 2, el.y + s / 2, el.w - s, el.h - s, Math.max(0, r - s / 2)); ctx.stroke(); }
    } else {
      ctx.beginPath();
      if (el.fill) { ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.lineWidth = s; ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.max(0, el.w / 2 - s / 2), Math.max(0, el.h / 2 - s / 2), 0, 0, Math.PI * 2); ctx.stroke(); }
    }
  }

  // ── texto (mismo ajuste automático que render.py) ──
  const REF = 'Hgyjáé';
  const PALABRA = /[A-Za-z0-9À-ɏ'’\-_.@/#%&+]+\s*|\s+|./gsu;
  const medidor = lienzo(4, 4).getContext('2d');
  function cara(el, size) {
    medidor.font = `${el.bold ? 700 : 400} ${size}px ${familia(el.font)}`;
    const m = medidor.measureText(REF);
    const stroke = el.stroke || 0;
    return { size, font: medidor.font, stroke, spacing: el.letter_spacing || 0,
      top: -Math.ceil(m.actualBoundingBoxAscent) - stroke, bottom: Math.ceil(m.actualBoundingBoxDescent) + stroke };
  }
  function ancho(f, s) {
    if (!s) return 0;
    medidor.font = f.font;
    if (f.spacing) return [...s].reduce((t, c) => t + medidor.measureText(c).width, 0) + f.spacing * ([...s].length - 1) + 2 * f.stroke;
    return medidor.measureText(s).width + 2 * f.stroke;
  }
  function partir(texto, f, maxW, wrap, romper) {
    const lineas = [];
    for (const para of texto.split('\n')) {
      if (!wrap || ancho(f, para) <= maxW) { lineas.push(para); continue; }
      let cur = '';
      for (const tok of para.match(PALABRA) || []) {
        if (ancho(f, cur + tok) <= maxW || !cur) {
          if (ancho(f, tok) > maxW && [...tok].length > 1 && romper) {
            for (const c of tok) { if (ancho(f, cur + c) <= maxW || !cur) cur += c; else { lineas.push(cur.trimEnd()); cur = c; } }
          } else cur += tok;
        } else if (/^[,.;:!?)\]}»]/.test(tok)) cur += tok;
        else { lineas.push(cur.trimEnd()); cur = tok.trimStart(); }
      }
      lineas.push(cur.trimEnd());
    }
    return lineas;
  }
  function maquetaH(texto, el, size, w, romper) {
    const f = cara(el, size);
    const lineas = partir(texto, f, w, el.wrap, romper);
    const paso = size * el.line_spacing;
    return { f, lineas, paso, ancho: Math.max(0, ...lineas.map(l => ancho(f, l))), alto: (lineas.length - 1) * paso + (f.bottom - f.top) };
  }
  function maquetaV(texto, el, size, w, h) {
    const f = cara(el, size);
    const celda = Math.max(1, size + (el.letter_spacing || 0));
    const filas = el.wrap ? Math.max(1, Math.floor((h + (el.letter_spacing || 0)) / celda)) : 1e6;
    const cols = [];
    for (let para of texto.split('\n')) { const cs = [...para]; if (!cs.length) cols.push([]); while (cs.length) cols.push(cs.splice(0, filas)); }
    const paso = size * el.line_spacing;
    return { f, lineas: cols, paso, celda, ancho: (cols.length - 1) * paso + size, alto: Math.max(0, ...cols.map(c => c.length)) * celda - (el.letter_spacing || 0) };
  }
  function texto(el, w, h, avisos, i, info) {
    const c = lienzo(w, h), ctx = c.getContext('2d');
    const t = el.text;
    if (!t.trim()) return c;
    let romper = false;
    const maqueta = s => (el.vertical ? maquetaV(t, el, s, w, h) : maquetaH(t, el, s, w, romper));
    const cabe = s => { const m = maqueta(s); return m.ancho <= w && m.alto <= h; };
    let size;
    if (el.size === 'auto' || el.size == null) {
      let lo = Math.max(1, el.min_size), hi = Math.max(el.min_size, Math.min(el.max_size, el.vertical ? w * 2 : h * 2));
      const tope = hi;
      const primero = s0 => { for (let s = s0; s <= Math.min(tope, s0 + 40); s++) if (cabe(s)) return s; return null; };
      let hallado = primero(lo);
      if (hallado == null) { romper = true; hallado = primero(lo); }
      if (hallado == null) { size = lo; avisos.push(`elements[${i}] (texto): no cabe en el marco ni con el tamaño mínimo ${lo}px`); }
      else {
        lo = hallado;
        while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2); if (cabe(mid)) lo = mid; else hi = mid - 1; }
        size = lo;
        for (let s = Math.min(tope, size + 12); s > size; s--) if (cabe(s)) { size = s; break; }
      }
    } else {
      size = Math.round(el.size); romper = true;
      if (!cabe(size)) avisos.push(`elements[${i}] (texto): con ${size}px se sale del marco`);
    }
    const m = maqueta(size);
    info.font_size = size;
    if (size < 10) avisos.push(`elements[${i}] (texto): mide solo ${size}px y puede leerse mal`);
    ctx.font = m.f.font; ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineJoin = 'round';
    ctx.lineWidth = m.f.stroke * 2;
    const y0 = el.valign === 'top' ? 0 : el.valign === 'bottom' ? h - m.alto : (h - m.alto) / 2;
    const pinta = (s, x, y) => {
      if (m.f.stroke) ctx.strokeText(s, x, y);
      ctx.fillText(s, x, y);
    };
    if (el.vertical) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const xr = el.align === 'right' ? w - size : el.align === 'left' ? m.ancho - size : (w + m.ancho) / 2 - size;
      m.lineas.forEach((col, ci) => col.forEach((ch, ri) => { if (ch.trim()) pinta(ch, xr - ci * m.paso + size / 2, y0 + ri * m.celda + size / 2); }));
      return c;
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    m.lineas.forEach((l, li) => {
      const lw = ancho(m.f, l);
      let x = (el.align === 'left' ? 0 : el.align === 'right' ? w - lw : (w - lw) / 2) + m.f.stroke;
      const base = y0 - m.f.top + li * m.paso;
      if (!m.f.spacing) pinta(l, x, base);
      else for (const ch of l) { pinta(ch, x, base); medidor.font = m.f.font; x += medidor.measureText(ch).width + m.f.spacing; }
    });
    return c;
  }

  // ── QR ──
  function qr(el, w, h, avisos, i) {
    if (!el.data) throw new Error('El contenido del QR está vacío');
    const q = qrcode(0, el.ecc || 'M');
    q.addData(el.data, 'Byte');
    try { q.make(); } catch { throw new Error(`El contenido no cabe en el QR (${el.data.length} caracteres)`); }
    const b = Math.max(0, el.border | 0), n0 = q.getModuleCount(), n = n0 + 2 * b;
    const px = Math.floor(Math.min(w, h) / n);
    if (px < 1) throw new Error(`El marco del QR es demasiado pequeño (${n} módulos: mínimo ${n}px)`);
    if (px < 2) avisos.push(`elements[${i}] (QR): cada módulo mide 1px y puede no leerse (usa ${2 * n}px o más)`);
    const c = lienzo(w, h), ctx = c.getContext('2d'); ctx.fillStyle = '#000';
    const ox = Math.floor((w - n * px) / 2) + b * px, oy = Math.floor((h - n * px) / 2) + b * px;
    for (let r = 0; r < n0; r++) for (let k = 0; k < n0; k++) if (q.isDark(r, k)) ctx.fillRect(ox + k * px, oy + r * px, px, px);
    return c;
  }

  // ── código de barras ──
  function barras(el, w, h, avisos, i) {
    if (!el.data) throw new Error('El contenido del código de barras está vacío');
    let r;
    try { r = EtqBarcode.codificar(el.symbology, el.data); } catch (e) { throw new Error(e.message); }
    const n = r.modulos.length, px = Math.floor(w / n);
    if (px < 1) throw new Error(`No cabe a lo ancho (${n} módulos: mínimo ${n}px, recomendado ${2 * n}px)`);
    if (px < 2) avisos.push(`elements[${i}] (código): cada barra mide 1px y puede no leerse (usa ${2 * n}px de ancho)`);
    if (r.aviso) avisos.push(`elements[${i}] (código): ${r.aviso}`);
    const c = lienzo(w, h), ctx = c.getContext('2d'); ctx.fillStyle = '#000';
    let altoTexto = 0;
    if (el.show_text) {
      let ts = Math.max(6, Math.min(el.text_size, Math.floor(h / 3)));
      const f = () => `400 ${ts}px ${familia(el.font)}`;
      ctx.font = f(); while (ts > 6 && ctx.measureText(r.texto).width > w) { ts--; ctx.font = f(); }
      const m = ctx.measureText(r.texto);
      altoTexto = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 2;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(r.texto, w / 2, h - Math.ceil(m.actualBoundingBoxDescent));
    }
    const altoBarra = Math.max(1, h - altoTexto), guarda = Math.min(h, altoBarra + Math.floor(altoTexto / 2));
    const ox = Math.floor((w - n * px) / 2);
    for (let x = 0; x < n; x++) {
      const k = r.modulos[x];
      if (k === '1' || k === 'G') ctx.fillRect(ox + x * px, 0, px, k === 'G' ? guarda : altoBarra);
    }
    return c;
  }

  // ── imágenes (caché de decodificadas: el dibujo es síncrono) ──
  const imagenes = new Map();
  let alCargar = null;
  function imagenLista(src) {
    let e = imagenes.get(src);
    if (!e) {
      e = { ok: false, error: null, img: new Image() };
      imagenes.set(src, e);
      e.img.onload = () => { e.ok = true; alCargar && alCargar(); };
      e.img.onerror = () => { e.error = 'No se puede leer la imagen'; alCargar && alCargar(); };
      e.img.src = src;
    }
    return e;
  }
  function imagen(el, w, h) {
    if (!el.src) throw new Error('No se ha indicado la imagen');
    const e = imagenLista(el.src);
    if (e.error) throw new Error(e.error);
    if (!e.ok) return null;
    const im = e.img;
    let dw, dh, sx = 0, sy = 0, sw = im.naturalWidth, sh = im.naturalHeight;
    if (el.fit === 'stretch') { dw = w; dh = h; }
    else if (el.fit === 'cover') {
      const k = Math.max(w / sw, h / sh); dw = w; dh = h;
      const cw = w / k, ch = h / k; sx = (sw - cw) / 2; sy = (sh - ch) / 2; sw = cw; sh = ch;
    } else { const k = Math.min(w / sw, h / sh); dw = Math.max(1, Math.floor(sw * k)); dh = Math.max(1, Math.floor(sh * k)); }
    const t = lienzo(dw, dh), tc = t.getContext('2d');
    tc.fillStyle = '#fff'; tc.fillRect(0, 0, dw, dh);
    tc.imageSmoothingQuality = 'high';
    tc.drawImage(im, sx, sy, sw, sh, 0, 0, dw, dh);
    const a = lienzo(dw, dh), ac = a.getContext('2d'); ac.drawImage(im, sx, sy, sw, sh, 0, 0, dw, dh);
    const px = tc.getImageData(0, 0, dw, dh), d = px.data, al = ac.getImageData(0, 0, dw, dh).data;
    // gris (sobre blanco), brillo y contraste como ImageEnhance de Pillow
    const g = new Float32Array(dw * dh);
    let suma = 0;
    for (let k = 0; k < g.length; k++) { g[k] = (d[k * 4] * 299 + d[k * 4 + 1] * 587 + d[k * 4 + 2] * 114) / 1000 * el.brightness; suma += g[k]; }
    if (el.contrast !== 1) { const media = Math.round(suma / g.length); for (let k = 0; k < g.length; k++) g[k] = media + (g[k] - media) * el.contrast; }
    const tinta = new Uint8Array(g.length);
    if (el.dither === 'floyd') {
      for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
        const k = y * dw + x, v = Math.max(0, Math.min(255, g[k])), n = v < 128 ? 0 : 255, err = v - n;
        tinta[k] = n === 0;
        if (x + 1 < dw) g[k + 1] += err * 7 / 16;
        if (y + 1 < dh) { if (x > 0) g[k + dw - 1] += err * 3 / 16; g[k + dw] += err * 5 / 16; if (x + 1 < dw) g[k + dw + 1] += err / 16; }
      }
    } else for (let k = 0; k < g.length; k++) tinta[k] = g[k] < el.threshold;
    const out = lienzo(w, h), oc = out.getContext('2d'), od = oc.createImageData(dw, dh);
    for (let k = 0; k < g.length; k++) {
      let t1 = el.invert ? !tinta[k] : tinta[k];
      if (al[k * 4 + 3] < 128) t1 = false;   // lo transparente nunca lleva tinta
      od.data[k * 4 + 3] = t1 ? 255 : 0;
    }
    oc.putImageData(od, Math.floor((w - dw) / 2), Math.floor((h - dh) / 2));
    return out;
  }

  const DIBUJA = { text: texto, qr, barcode: barras, image: imagen };

  // label (ya con las variables sustituidas) → { canvas 1 bit, cajas, avisos, errores, pendiente }
  function dibujar(label) {
    label = normalizar(label);
    const [W, H] = canvasSize(label);
    const px = new Uint8Array(W * H).fill(255);
    const res = { W, H, cajas: [], avisos: [], errores: [], pendiente: false };
    for (const ph of new Set(sinResolver(label))) res.avisos.push(`${ph} no tiene valor (se imprimirá tal cual)`);
    label.elements.forEach((raw, i) => {
      const el = completar(raw), t = el.type, info = { index: i, type: t, x: el.x, y: el.y, w: el.w, h: el.h };
      res.cajas.push(info);
      if (raw.hidden) return;
      if (el.x < 0 || el.y < 0 || el.x + el.w > W || el.y + el.h > H) res.avisos.push(`elements[${i}] (${NOMBRES[t]}) se sale de la etiqueta`);
      const valor = el.color === 'white' ? 255 : 0;
      try {
        if (t === 'rect' || t === 'ellipse' || t === 'line') {
          const m = lienzo(W, H); forma(m.getContext('2d'), el); pegar(px, W, H, m, 0, 0, valor); return;
        }
        if (el.w > 4 * W + 100 || el.h > 4 * H + 100) throw new Error(`El marco es demasiado grande (${el.w}×${el.h})`);
        const rot = [90, 180, 270].includes(+el.rotate) ? +el.rotate : 0;
        const cw = rot === 90 || rot === 270 ? el.h : el.w, ch = rot === 90 || rot === 270 ? el.w : el.h;
        let m = DIBUJA[t](el, Math.round(cw), Math.round(ch), res.avisos, i, info);
        if (!m) { res.pendiente = true; return; }
        if (rot) {
          const r = lienzo(el.w, el.h), rc = r.getContext('2d');
          rc.imageSmoothingEnabled = false;
          rc.translate(el.w / 2, el.h / 2); rc.rotate(rot * Math.PI / 180); rc.drawImage(m, -cw / 2, -ch / 2);
          m = r;
        }
        pegar(px, W, H, m, el.x, el.y, valor);
      } catch (e) {
        const msg = `elements[${i}] (${NOMBRES[t]}) no se puede dibujar: ${e.message}`;
        res.errores.push(msg); res.avisos.push(msg);
      }
    });
    if (label.invert) for (let k = 0; k < px.length; k++) px[k] = 255 - px[k];
    const c = lienzo(W, H), ctx = c.getContext('2d'), img = ctx.createImageData(W, H);
    for (let k = 0; k < px.length; k++) { img.data[k * 4] = img.data[k * 4 + 1] = img.data[k * 4 + 2] = px[k]; img.data[k * 4 + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    res.canvas = c;
    return res;
  }

  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

  return { HEAD, MEDIA, DEF, COMUNES, NOMBRES, canvasSize, lengthDots, nuevo, normalizar, completar, variables, sustituir, dibujar, familia,
    set alCargar(f) { alCargar = f; } };
})();
