// Etiquetas para la Nelko P21 (rollos de 14 mm): plantillas sencillas dibujadas en un lienzo de 96 puntos de alto
// y el largo del rollo. Lo que se ve en la vista previa es exactamente lo que se imprime (ya en blanco y negro).
const Etiquetas = (() => {
  const { $, esc, vista, api, aviso, local } = App;
  const PLANTILLAS = [
    ['logo-texto', 'Logo + texto'], ['texto', 'Texto'], ['qr-texto', 'QR + texto'], ['logo', 'Solo logo'], ['serie', 'Numeradas'],
  ];
  const FUENTES = { 'Barlow Condensed': '800', 'DM Sans': '700', 'Arial Black': '900', 'DM Mono': '500' };
  const cfgDef = { plantilla: 'logo-texto', largo: 40, densidad: 15, copias: 1, linea1: '', linea2: '', qr: '', fuente: 'Barlow Condensed',
    umbral: 150, invertir: false, prefijo: 'RF-', inicio: 1, cantidad: 10, cifras: 3 };
  let cfg = { ...cfgDef, ...JSON.parse(localStorage.getItem('etq-cfg') || '{}') };
  let logoBmp = null, qrBmp = null, qrTexto = '';

  async function mostrar(opciones = {}) {
    if (opciones.visita) {
      const v = opciones.visita;
      cfg.linea1 = v.nombre; cfg.linea2 = '';
      if (v.nfc) cfg.qr = v.nfc.url;
      if (v.logo && !/svg|pdf/.test(v.logo.type || '')) logoBmp = await createImageBitmap(v.logo).catch(() => null);
    }
    const visitas = (await local.todas('visitas')).filter(v => v.logo && !/svg|pdf/.test(v.logo.type || '')).sort((a, b) => b.creada - a.creada);
    vista().innerHTML = `
      <div class="cab"><h1>Etiquetas</h1><button class="btn peq" id="eCon">${P21.conectada() ? 'P21 conectada ✓' : 'Conectar P21'}</button></div>
      ${P21.soporta ? '' : `<div class="tarjeta" style="border-color:var(--aviso)"><b>Sin Bluetooth en este navegador.</b>
        <div class="mono" style="margin-top:4px">Para imprimir, usa Chrome en Android. Aquí puedes diseñar y descargar el PNG.</div></div>`}
      <div class="prev-etq"><canvas id="eLienzo"></canvas></div>
      <div class="mono" id="eMedida" style="text-align:center;margin:6px 0 12px"></div>
      <div class="seg" id="ePlant" style="grid-auto-flow:row;grid-template-columns:repeat(3,1fr)">
        ${PLANTILLAS.map(([k, t]) => `<button data-p="${k}">${t}</button>`).join('')}</div>
      <div class="tarjeta">
        <div id="eLogoCampos">
          <label class="campo"><span>Logo</span><select id="eVisita"><option value="">— De una visita —</option>
            ${visitas.map(v => `<option value="${esc(v.id)}">${esc(v.nombre)}</option>`).join('')}</select></label>
          <div class="fila" style="margin-bottom:12px"><label class="btn peq">Subir imagen<input type="file" id="eLogo" accept="image/*" hidden/></label>
            <label class="check" style="margin:0"><input type="checkbox" id="eInv"/> Invertir</label></div>
        </div>
        <div id="eTextoCampos">
          <label class="campo"><span>Línea 1</span><input id="eL1" type="text"/></label>
          <label class="campo"><span>Línea 2 (opcional)</span><input id="eL2" type="text"/></label>
        </div>
        <label class="campo" id="eQrCampo"><span>Texto o URL del QR</span><input id="eQr" type="url" placeholder="https://rolefigz.com/nfc/el-local"/></label>
        <div id="eSerieCampos" class="fila envuelve">
          <label class="campo crece"><span>Prefijo</span><input id="ePre" type="text"/></label>
          <label class="campo" style="width:90px"><span>Desde</span><input id="eIni" type="number" inputmode="numeric" min="0"/></label>
          <label class="campo" style="width:90px"><span>Cuántas</span><input id="eCant" type="number" inputmode="numeric" min="1" max="500"/></label>
          <label class="campo" style="width:80px"><span>Cifras</span><input id="eCif" type="number" inputmode="numeric" min="1" max="6"/></label>
        </div>
        <label class="campo"><span>Letra</span><select id="eFuente">${Object.keys(FUENTES).map(f => `<option>${f}</option>`).join('')}</select></label>
        <label class="campo"><span>Contraste del logo <b id="eUmbV"></b></span><input id="eUmb" type="range" min="40" max="240" style="width:100%"/></label>
      </div>
      <div class="tarjeta fila envuelve">
        <label class="campo crece" style="margin:0"><span>Rollo</span><select id="eLargo">
          ${[30, 40, 50].map(l => `<option value="${l}">14 × ${l} mm</option>`).join('')}</select></label>
        <label class="campo" style="width:90px;margin:0"><span>Copias</span><input id="eCop" type="number" inputmode="numeric" min="1" max="50"/></label>
        <label class="campo" style="width:90px;margin:0"><span>Densidad</span><input id="eDen" type="number" inputmode="numeric" min="1" max="15"/></label>
      </div>
      <div class="botones"><button class="btn prim" id="eImp">🖨️ Imprimir</button><button class="btn" id="ePng">PNG</button></div>
      <div class="estado" id="eEstado"></div>`;

    const campos = { eL1: 'linea1', eL2: 'linea2', eQr: 'qr', ePre: 'prefijo', eIni: 'inicio', eCant: 'cantidad', eCif: 'cifras',
      eFuente: 'fuente', eUmb: 'umbral', eLargo: 'largo', eCop: 'copias', eDen: 'densidad' };
    for (const [idc, k] of Object.entries(campos)) {
      const el = $('#' + idc); el.value = cfg[k];
      el.oninput = () => { cfg[k] = el.type === 'number' || el.type === 'range' || idc === 'eLargo' ? Number(el.value) : el.value; cambio(); };
    }
    $('#eInv').checked = cfg.invertir; $('#eInv').onchange = e => { cfg.invertir = e.target.checked; cambio(); };
    $('#ePlant').onclick = e => { const b = e.target.closest('button'); if (b) { cfg.plantilla = b.dataset.p; cambio(); } };
    $('#eVisita').onchange = async e => {
      const v = visitas.find(x => x.id === e.target.value); if (!v) return;
      logoBmp = await createImageBitmap(v.logo).catch(() => null);
      if (!cfg.linea1) { cfg.linea1 = v.nombre; $('#eL1').value = v.nombre; }
      if (v.nfc && !cfg.qr) { cfg.qr = v.nfc.url; $('#eQr').value = v.nfc.url; }
      cambio();
    };
    $('#eLogo').onchange = async e => { const f = e.target.files[0]; if (f) { logoBmp = await createImageBitmap(f).catch(() => null); cambio(); } };
    $('#eCon').onclick = async () => {
      try { const n = await P21.conectar(); $('#eCon').textContent = `${n} ✓`; aviso('Impresora conectada.'); }
      catch (e) { if (e.name !== 'NotFoundError') aviso(e.message, true); }
    };
    $('#ePng').onclick = () => { const c = dibujar(numero(0)); c.toBlob(b => App.descargar(b, `etiqueta-${App.slug(cfg.linea1) || 'rolefigz'}.png`)); };
    $('#eImp').onclick = imprimir;
    cambio();
  }

  const numero = k => `${cfg.prefijo}${String(Number(cfg.inicio) + k).padStart(Math.max(1, Number(cfg.cifras) || 1), '0')}`;

  let tQr;
  function cambio() {
    localStorage.setItem('etq-cfg', JSON.stringify(cfg));
    const p = cfg.plantilla;
    $('#ePlant').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
    $('#eLogoCampos').hidden = !['logo-texto', 'logo'].includes(p);
    $('#eTextoCampos').hidden = !['logo-texto', 'texto', 'qr-texto'].includes(p);
    $('#eQrCampo').hidden = p !== 'qr-texto';
    $('#eSerieCampos').hidden = p !== 'serie';
    $('#eUmbV').textContent = cfg.umbral;
    const n = p === 'serie' ? Math.max(1, Number(cfg.cantidad) || 1) : Math.max(1, Number(cfg.copias) || 1);
    $('#eMedida').textContent = `14 × ${cfg.largo} mm · ${P21.largoPuntos(cfg.largo)} × 96 puntos · ${p === 'serie' ? `${n} etiquetas (${numero(0)} → ${numero(n - 1)})` : `${n} copia${n > 1 ? 's' : ''}`}`;
    if (p === 'qr-texto' && cfg.qr !== qrTexto) {
      clearTimeout(tQr);
      tQr = setTimeout(async () => {
        qrTexto = cfg.qr; qrBmp = null;
        if (cfg.qr) try { qrBmp = await createImageBitmap(await (await api(`/app/qr.png?t=${encodeURIComponent(cfg.qr)}`, { crudo: true })).blob()); } catch (e) { aviso('QR: ' + e.message, true); }
        pintar();
      }, 350);
    }
    pintar();
  }
  function pintar() {
    const c = dibujar(numero(0)), dst = $('#eLienzo'); if (!dst) return;
    dst.width = c.width; dst.height = c.height; dst.getContext('2d').drawImage(c, 0, 0);
  }

  // texto que cabe en la caja: se baja el tamaño hasta que entra
  function texto(ctx, t, x, y, w, h, alinear = 'left') {
    if (!t) return;
    const peso = FUENTES[cfg.fuente] || '700';
    let px = h;
    do { ctx.font = `${peso} ${px}px "${cfg.fuente}", sans-serif`; px -= 1; } while (px > 8 && ctx.measureText(t).width > w);
    ctx.textBaseline = 'middle'; ctx.textAlign = alinear;
    ctx.fillText(t, alinear === 'center' ? x + w / 2 : x, y + h / 2 + 1);
  }
  function lineas(ctx, x, y, w, h, l1, l2, alinear) {
    if (l2) { texto(ctx, l1, x, y, w, h * .56, alinear); texto(ctx, l2, x, y + h * .56, w, h * .44, alinear); }
    else texto(ctx, l1, x, y, w, h, alinear);
  }
  function imagen(ctx, bmp, x, y, w, h) {
    if (!bmp) { ctx.strokeStyle = '#000'; ctx.setLineDash([4, 4]); ctx.strokeRect(x + 2, y + 2, w - 4, h - 4); ctx.setLineDash([]); return 0; }
    const k = Math.min(w / bmp.width, h / bmp.height), bw = bmp.width * k, bh = bmp.height * k;
    // el logo se pasa a blanco y negro con su propio umbral (el texto ya es negro puro)
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bw)); c.height = Math.max(1, Math.round(bh));
    const cx = c.getContext('2d'); cx.drawImage(bmp, 0, 0, c.width, c.height);
    const img = cx.getImageData(0, 0, c.width, c.height), d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114;
      let negro = d[i + 3] > 100 && lum < cfg.umbral;
      if (cfg.invertir && d[i + 3] > 100) negro = !negro;
      d[i] = d[i + 1] = d[i + 2] = negro ? 0 : 255; d[i + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    ctx.drawImage(c, Math.round(x + (w - bw) / 2), Math.round(y + (h - bh) / 2));
    return bw;
  }

  function dibujar(num) {
    const W = P21.largoPuntos(cfg.largo), H = P21.ALTO, m = 6;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#000';
    const p = cfg.plantilla;
    if (p === 'texto') lineas(ctx, m, m, W - 2 * m, H - 2 * m, cfg.linea1, cfg.linea2, 'center');
    else if (p === 'logo') imagen(ctx, logoBmp, m, m, W - 2 * m, H - 2 * m);
    else if (p === 'logo-texto') {
      const caja = H - 2 * m;
      const bw = imagen(ctx, logoBmp, m, m, Math.min(caja * 1.6, W * .45), caja) || caja;
      lineas(ctx, m + bw + 8, m, W - bw - 8 - 2 * m, caja, cfg.linea1, cfg.linea2, 'left');
    } else if (p === 'qr-texto') {
      const q = H - 4;
      if (qrBmp) { ctx.imageSmoothingEnabled = false; ctx.drawImage(qrBmp, 2, 2, q, q); ctx.imageSmoothingEnabled = true; }
      else { ctx.strokeRect(4, 4, q - 4, q - 4); }
      lineas(ctx, q + 8, m, W - q - 8 - m, H - 2 * m, cfg.linea1, cfg.linea2, 'left');
    } else if (p === 'serie') texto(ctx, num, m, m, W - 2 * m, H - 2 * m, 'center');
    // todo a 1 bit, como lo imprime la P21
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114 < 128 ? 0 : 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  async function imprimir() {
    const b = $('#eImp'), est = $('#eEstado');
    b.disabled = true; est.classList.remove('err');
    try {
      await document.fonts.load(`${FUENTES[cfg.fuente]} 40px "${cfg.fuente}"`).catch(() => {});
      if (cfg.plantilla === 'serie') {
        const n = Math.min(500, Math.max(1, Number(cfg.cantidad) || 1));
        for (let k = 0; k < n; k++) {
          est.textContent = `Imprimiendo ${numero(k)} (${k + 1} / ${n})…`;
          await P21.imprimir(dibujar(numero(k)), { largo: cfg.largo, densidad: cfg.densidad, copias: 1 });
        }
        cfg.inicio = Number(cfg.inicio) + n; $('#eIni').value = cfg.inicio; cambio();   // la próxima serie sigue
      } else {
        est.textContent = 'Imprimiendo…';
        await P21.imprimir(dibujar(), { largo: cfg.largo, densidad: cfg.densidad, copias: cfg.copias });
      }
      est.textContent = 'Hecho ✓';
      $('#eCon').textContent = 'P21 conectada ✓';
    } catch (e) {
      if (e.name === 'NotFoundError') est.textContent = '';
      else { est.textContent = 'Error: ' + e.message; est.classList.add('err'); }
    }
    b.disabled = false;
  }

  return { mostrar, dibujar };
})();
