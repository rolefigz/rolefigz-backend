// Visitas a los locales: foto del logo → recorte → análisis → kit 3D → fotos y vídeo para enseñar y mandar.
// Usa las rutas admin de /api/kit (sin límites horarios) y KitVideo (/js/kit-video.js) para fotos y vídeo.
const Visitas = (() => {
  const { $, esc, vista, api, local, aviso, compartir, slug, fecha, id } = App;
  const VEREDICTO = { automatico: ['✅', 'ok', 'Sirve tal cual'], revisar: ['⚠️', 'av', 'Revisar'], manual: ['✋', 'no', 'A mano'] };
  const urlsObj = new Set();
  const objUrl = b => { const u = URL.createObjectURL(b); urlsObj.add(u); return u; };
  function liberar() { urlsObj.forEach(u => URL.revokeObjectURL(u)); urlsObj.clear(); }

  // ── Lista ──
  async function lista() {
    liberar();
    const visitas = (await local.todas('visitas')).sort((a, b) => b.creada - a.creada);
    vista().innerHTML = `
      <div class="cab"><h1>Visitas</h1><button class="btn prim" id="vNueva">+ Nueva</button></div>
      ${visitas.length ? `<div class="lista">${visitas.map(v => `
        <button class="item" data-id="${esc(v.id)}">
          ${v.logo ? `<img src="${objUrl(v.logo)}" alt=""/>` : '<img alt=""/>'}
          <div class="crece"><div class="t">${esc(v.nombre)}</div>
            <div class="mono">${fecha(v.creada)} · ${v.tipo === 'segnaposti' ? 'Segnaposti' : 'Kit merch'}${v.kit ? ' · 3D listo' : ''}</div></div>
          ${v.analisis ? `<span class="pill ${(VEREDICTO[v.analisis.verdetto] || [])[1] || ''}">${(VEREDICTO[v.analisis.verdetto] || ['?'])[0]}</span>` : ''}
        </button>`).join('')}</div>`
        : `<div class="vacio">Todavía no hay visitas.<br/>Pulsa <b>+ Nueva</b> cuando entres en un local y haz una foto a su logo.</div>`}`;
    $('#vNueva').onclick = nueva;
    vista().querySelectorAll('.item').forEach(b => { b.onclick = () => abrir(b.dataset.id); });
  }

  // ── Nueva visita: nombre, tipo y foto ──
  function nueva() {
    liberar();
    const v = { id: id(), nombre: '', tipo: 'merch', creada: Date.now(), opciones: { qr_url: '', testo: '', striscia: false } };
    vista().innerHTML = `
      <button class="volver" id="vVolver">‹ Visitas</button>
      <h1 style="margin-bottom:14px">Nueva visita</h1>
      <label class="campo"><span>Nombre del local</span><input id="vNombre" type="text" placeholder="Pizzeria Da Mario" autocomplete="off"/></label>
      <div class="seg" id="vTipo"><button data-t="merch" class="on">Kit merch</button><button data-t="segnaposti">Segnaposti</button></div>
      <div id="vOpSeg" hidden>
        <label class="campo"><span>Link del menú (vacío = 4bytemenu.it/demo)</span><input id="vMenu" type="url" placeholder="https://4bytemenu.it/el-local"/></label>
        <label class="campo"><span>Texto bajo el QR (máx. 14)</span><input id="vTexto" type="text" maxlength="14" placeholder="Scopri il menù"/></label>
        <label class="check"><input type="checkbox" id="vFranja"/> Franja blanca para escribir</label>
      </div>
      <div class="botones">
        <label class="btn prim">📷 Foto del logo<input id="vCam" type="file" accept="image/*" capture="environment" hidden/></label>
        <label class="btn">🖼️ De la galería<input id="vGal" type="file" accept="image/*,.svg,.pdf" hidden/></label>
      </div>
      <p class="mono" style="margin-top:12px">Consejo: foto de frente, con buena luz y el logo llenando la imagen. Después lo recortas.</p>`;
    $('#vVolver').onclick = lista;
    $('#vTipo').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      v.tipo = b.dataset.t;
      $('#vTipo').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      $('#vOpSeg').hidden = v.tipo !== 'segnaposti';
    };
    const alElegir = async e => {
      const f = e.target.files[0]; if (!f) return;
      v.nombre = $('#vNombre').value.trim();
      if (!v.nombre) { aviso('Escribe primero el nombre del local.', true); e.target.value = ''; return; }
      v.opciones = { qr_url: $('#vMenu').value.trim(), testo: $('#vTexto').value.trim(), striscia: $('#vFranja').checked };
      // SVG y PDF van directos al análisis (no se recortan)
      if (/svg|pdf/.test(f.type) || /\.(svg|pdf)$/i.test(f.name)) { v.logo = f; v.logoNombre = f.name; await local.guardar('visitas', v); return analizar(v); }
      recortar(v, f);
    };
    $('#vCam').onchange = alElegir; $('#vGal').onchange = alElegir;
  }

  // ── Recorte: un marco que se mueve con el dedo y se agranda con el círculo de la esquina ──
  async function recortar(v, archivo) {
    liberar();
    const bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' }).catch(() => null);
    if (!bmp) { aviso('No se ha podido abrir la imagen.', true); return nueva(); }
    // se trabaja con una copia de máximo 3000 px (las fotos del móvil son enormes; el logo recortado sigue nítido)
    const k = Math.min(1, 3000 / Math.max(bmp.width, bmp.height));
    const base = document.createElement('canvas'); base.width = Math.round(bmp.width * k); base.height = Math.round(bmp.height * k);
    base.getContext('2d').drawImage(bmp, 0, 0, base.width, base.height);
    const urlBase = objUrl(await new Promise(r => base.toBlob(r, 'image/jpeg', 0.9)));
    vista().innerHTML = `
      <button class="volver" id="vVolver">‹ Otra foto</button>
      <h2 style="margin-bottom:6px">Recorta el logo</h2>
      <p class="mono" style="margin:0 0 10px">Deja solo el logo dentro del marco, con un poco de margen.</p>
      <div class="recorte" id="vRec"><img src="${urlBase}" alt=""/><div class="marco" id="vMarco"><i></i></div></div>
      <div class="fila" style="margin:12px 0"><label class="check" style="margin:0"><input type="checkbox" id="vFondo" checked/> Quitar el fondo claro</label></div>
      <button class="btn prim ancho" id="vUsar">Analizar el logo</button>`;
    $('#vVolver').onclick = nueva;
    const rec = $('#vRec'), marco = $('#vMarco');
    let m = { x: .1, y: .1, w: .8, h: .8 };   // en fracciones de la imagen
    const pinta = () => Object.assign(marco.style, { left: m.x * 100 + '%', top: m.y * 100 + '%', width: m.w * 100 + '%', height: m.h * 100 + '%' });
    pinta();
    let arrastre = null;
    rec.onpointerdown = e => {
      const r = rec.getBoundingClientRect();
      arrastre = { modo: e.target.tagName === 'I' ? 'tam' : 'mover', x: e.clientX, y: e.clientY, m: { ...m }, r };
      rec.setPointerCapture(e.pointerId);
    };
    rec.onpointermove = e => {
      if (!arrastre) return;
      const dx = (e.clientX - arrastre.x) / arrastre.r.width, dy = (e.clientY - arrastre.y) / arrastre.r.height, o = arrastre.m;
      if (arrastre.modo === 'tam') m = { ...o, w: Math.min(1 - o.x, Math.max(.08, o.w + dx)), h: Math.min(1 - o.y, Math.max(.08, o.h + dy)) };
      else m = { ...o, x: Math.min(1 - o.w, Math.max(0, o.x + dx)), y: Math.min(1 - o.h, Math.max(0, o.y + dy)) };
      pinta();
    };
    rec.onpointerup = rec.onpointercancel = () => { arrastre = null; };
    $('#vUsar').onclick = async () => {
      const sx = Math.round(m.x * base.width), sy = Math.round(m.y * base.height);
      const sw = Math.round(m.w * base.width), sh = Math.round(m.h * base.height);
      const c = document.createElement('canvas'); c.width = sw; c.height = sh;
      const ctx = c.getContext('2d'); ctx.drawImage(base, sx, sy, sw, sh, 0, 0, sw, sh);
      if ($('#vFondo').checked) quitarFondo(ctx, sw, sh);
      v.logo = await new Promise(r => c.toBlob(r, 'image/png'));
      v.logoNombre = `${slug(v.nombre) || 'logo'}.png`;
      await local.guardar('visitas', v);
      analizar(v);
    };
  }

  // Fondo de la foto (papel, pared clara) → transparente: se toma el color de las esquinas y se borra lo parecido
  // que toca el borde (relleno desde fuera, así no se borran los blancos dentro del logo).
  function quitarFondo(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h), d = img.data;
    const muestras = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => { const i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]]; });
    const ref = [0, 1, 2].map(c => muestras.reduce((s, p) => s + p[c], 0) / 4);
    if ((ref[0] + ref[1] + ref[2]) / 3 < 150) return;   // fondo oscuro: mejor no tocarlo
    const parecido = i => Math.abs(d[i] - ref[0]) + Math.abs(d[i + 1] - ref[1]) + Math.abs(d[i + 2] - ref[2]) < 90;
    const visto = new Uint8Array(w * h), pila = [];
    for (let x = 0; x < w; x++) pila.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) pila.push(y * w, y * w + w - 1);
    while (pila.length) {
      const p = pila.pop();
      if (visto[p]) continue; visto[p] = 1;
      const i = p * 4; if (!parecido(i)) continue;
      d[i + 3] = 0;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) pila.push(p - 1); if (x < w - 1) pila.push(p + 1);
      if (y > 0) pila.push(p - w); if (y < h - 1) pila.push(p + w);
    }
    ctx.putImageData(img, 0, 0);
  }

  // ── Análisis y generación ──
  async function analizar(v) {
    liberar();
    vista().innerHTML = `
      <button class="volver" id="vVolver">‹ Visitas</button>
      <div class="cab"><h1>${esc(v.nombre)}</h1></div>
      <div class="tarjeta fila"><img src="${objUrl(v.logo)}" alt="" style="width:72px;height:72px;object-fit:contain;background:#f7f5f0;border-radius:12px"/>
        <div class="crece"><div class="estado" id="vEstado">Analizo el logo…</div></div></div>`;
    $('#vVolver').onclick = lista;
    const estado = (t, err) => { const e = $('#vEstado'); if (e) { e.textContent = t; e.classList.toggle('err', !!err); } };
    try {
      const fd = new FormData(); fd.append('logo', v.logo, v.logoNombre || 'logo.png');
      v.analisis = await api('/kit/admin/analizza', { metodo: 'POST', form: fd });
      await local.guardar('visitas', v);
      estado(v.tipo === 'segnaposti' ? 'Genero los segnaposti en 3D… (hasta un minuto)' : 'Genero el kit en 3D… (hasta un minuto)');
      const seg = v.tipo === 'segnaposti';
      const k = await api(`/kit/admin/${seg ? 'segnaposti' : 'genera'}`, { metodo: 'POST', json: seg
        ? { logo_id: v.analisis.logo_id, azienda: v.nombre, ...v.opciones }
        : { logo_id: v.analisis.logo_id, azienda: v.nombre } });
      v.kit = { numero: k.numero, cliente: k.cliente, controllo: k.controllo, preventivo_pdf: k.preventivo_pdf || null,
        piatto_glb: k.piatto_glb, pezzi: k.pezzi.map(p => ({ nome: p.nome, misure: p.misure, glb: p.glb })) };
      await local.guardar('visitas', v);
      abrir(v.id);
    } catch (e) {
      estado('Error: ' + e.message, true);
      vista().insertAdjacentHTML('beforeend', `<button class="btn prim ancho" id="vReint">Reintentar</button>`);
      $('#vReint').onclick = () => analizar(v);
    }
  }

  // ── Ficha de la visita: 3D, fotos, vídeo, página NFC ──
  async function abrir(idVisita) {
    liberar();
    const v = await local.una('visitas', idVisita);
    if (!v) return lista();
    if (!v.kit) return v.logo ? analizar(v) : lista();
    const seg = v.tipo === 'segnaposti';
    const piezas = v.kit.pezzi.concat({ nome: seg ? 'Tutti i segnaposti' : 'Tutto il kit', misure: seg ? 'Tutte le taglie del kit campione' : 'Tutti i pezzi del kit campione', glb: v.kit.piatto_glb });
    const [ic, cls, txt] = VEREDICTO[v.analisis?.verdetto] || ['', '', ''];
    const revisar = v.analisis?.verdetto !== 'automatico' || v.kit.controllo === 'da_rivedere';
    let i = piezas.length - 1;
    vista().innerHTML = `
      <button class="volver" id="vVolver">‹ Visitas</button>
      <div class="cab"><div class="crece"><h1>${esc(v.nombre)}</h1><div class="mono">${esc(v.kit.numero || '')} · ${fecha(v.creada)}</div></div>
        ${ic ? `<span class="pill ${cls}">${ic} ${txt}</span>` : ''}</div>
      ${revisar ? `<div class="tarjeta" style="border-color:var(--aviso)"><b>Míralo bien antes de enseñarlo.</b>
        <div class="mono" style="margin-top:4px">${esc((v.analisis?.motivi || []).join(' · ') || 'El control de calidad pide revisarlo.')}</div></div>` : ''}
      <div class="visor">
        <model-viewer id="vMv" src="${esc(piezas[i].glb)}" camera-controls auto-rotate rotation-per-second="18deg" shadow-intensity="0.8"
          shadow-softness="0.9" exposure="1.05" environment-image="neutral" interaction-prompt="none" camera-orbit="0deg 55deg auto"></model-viewer>
        <div class="nav"><button id="vAnt">‹</button><div class="pieza" id="vPieza"></div><button id="vSig">›</button></div>
      </div>
      <div class="botones" style="margin-top:12px">
        <button class="btn prim" id="vFotos">📸 Fotos</button>
        <button class="btn prim" id="vVideo">🎬 Vídeo</button>
        ${v.kit.preventivo_pdf ? `<a class="btn" href="${esc(v.kit.preventivo_pdf)}" target="_blank" rel="noopener">📄 Preventivo</a>` : ''}
        <button class="btn" id="vNfc">📶 Página NFC</button>
        <button class="btn" id="vEtq">🏷️ Etiqueta</button>
        <button class="btn" id="vRegen">↻ Rehacer</button>
      </div>
      <div class="estado" id="vEstado"></div>
      <div id="vSalida"></div>
      <div class="tarjeta" id="vNfcInfo" ${v.nfc ? '' : 'hidden'}></div>
      <button class="btn peq peligro" id="vBorrar" style="margin-top:18px">Borrar visita</button>`;
    const mv = $('#vMv');
    const pintaPieza = () => { mv.src = piezas[i].glb; $('#vPieza').innerHTML = `${esc(piezas[i].nome)}<small>${esc(piezas[i].misure || '')}</small>`; };
    pintaPieza();
    $('#vAnt').onclick = () => { i = (i - 1 + piezas.length) % piezas.length; pintaPieza(); };
    $('#vSig').onclick = () => { i = (i + 1) % piezas.length; pintaPieza(); };
    $('#vVolver').onclick = lista;
    const estado = (t, err) => { const e = $('#vEstado'); if (e) { e.textContent = t; e.classList.toggle('err', !!err); } };
    const textos = seg ? { titolo: 'I SEGNAPOSTI DI', url: 'rolefigz.com/kit/segnaposti' } : { titolo: 'IL KIT DI', url: 'rolefigz.com/kit/merch' };
    const ocupado = on => ['vFotos', 'vVideo', 'vRegen'].forEach(x => { const b = $('#' + x); if (b) b.disabled = on; });

    $('#vFotos').onclick = async () => {
      ocupado(true);
      try {
        const fotos = await KitVideo.fotoOffline({ pezzi: piezas, azienda: v.kit.cliente || v.nombre, onStato: estado, ...textos });
        const archivos = fotos.map(f => f.file);
        $('#vSalida').innerHTML = `<div class="galeria">${archivos.map(f => `<img src="${objUrl(f)}" alt=""/>`).join('')}</div>
          <button class="btn prim ancho" id="vCompF" style="margin-top:10px">Compartir ${archivos.length} fotos</button>`;
        $('#vCompF').onclick = () => compartir(archivos, v.nombre);
        estado(`${archivos.length} fotos listas.`);
      } catch (e) { estado('Error: ' + e.message, true); }
      ocupado(false);
    };

    $('#vVideo').onclick = async () => {
      ocupado(true); mv.style.pointerEvents = 'none';
      try {
        // offline (WebCodecs) si el navegador puede: más rápido y no depende de la pantalla; si no, se graba el visor
        const archivo = await KitVideo.codecOffline()
          ? await KitVideo.creaOffline({ pezzi: piezas, azienda: v.kit.cliente || v.nombre, onStato: estado, ...textos })
          : await KitVideo.crea({ mv, pezzi: piezas, azienda: v.kit.cliente || v.nombre, onStato: estado, ...textos });
        $('#vSalida').innerHTML = `<video class="prev" controls playsinline src="${objUrl(archivo)}"></video>
          <button class="btn prim ancho" id="vCompV" style="margin-top:10px">Compartir vídeo</button>`;
        $('#vCompV').onclick = () => compartir([archivo], v.nombre);
        estado(archivo.name.endsWith('.webm') ? 'Vídeo en WebM: para WhatsApp mejor hacerlo desde Chrome.' : 'Vídeo listo.');
      } catch (e) { estado('Error: ' + e.message, true); }
      ocupado(false); mv.style.pointerEvents = '';
    };

    $('#vRegen').onclick = () => { delete v.kit; local.guardar('visitas', v).then(() => analizar(v)); };
    $('#vEtq').onclick = () => Main.ir('etiquetas', { visita: v });
    $('#vBorrar').onclick = async () => { if (confirm(`¿Borrar la visita «${v.nombre}» del teléfono?`)) { await local.borrar('visitas', v.id); lista(); } };

    const pintaNfc = () => {
      const c = $('#vNfcInfo'); if (!v.nfc) { c.hidden = true; return; }
      c.hidden = false;
      c.innerHTML = `<h3>Página NFC de prueba</h3><div class="mono" style="margin:4px 0 10px;word-break:break-all">${esc(v.nfc.url)}</div>
        <div class="botones"><a class="btn" href="${esc(v.nfc.url)}" target="_blank" rel="noopener">Abrir</a>
        <button class="btn prim" id="vLote">Lote de llaveros</button></div>`;
      $('#vLote').onclick = () => Main.ir('nfc', { nuevoLote: { nombre: v.nombre, url: v.nfc.url } });
    };
    pintaNfc();
    $('#vNfc').onclick = async () => {
      if (v.nfc) return pintaNfc();
      const s = prompt('Dirección de la página (rolefigz.com/nfc/…):', slug(v.nombre));
      if (!s) return;
      estado('Creo la página NFC de prueba…');
      try {
        const fd = new FormData();
        fd.append('nome', v.nombre); fd.append('slug', slug(s));
        if (v.logo && !/svg|pdf/.test(v.logo.type || '')) fd.append('logo', v.logo, v.logoNombre || 'logo.png');
        const p = await api('/kit/admin/prove', { metodo: 'POST', form: fd });
        v.nfc = { id: p.id, slug: p.slug, url: `https://rolefigz.com/nfc/${p.slug}`, caduca: p.scadenza };
        await local.guardar('visitas', v);
        estado('Página creada (caduca en 60 días). Para completarla: panel → Perfiles de prueba.');
        pintaNfc();
      } catch (e) { estado('Error: ' + e.message, true); }
    };
  }

  return { lista, abrir };
})();
