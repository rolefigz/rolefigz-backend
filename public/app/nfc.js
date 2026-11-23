// NFC: lotes de llaveros que se cuentan (y se graban) acercándolos al teléfono.
// Cada chip tiene un código de fábrica (UID, ev.serialNumber de Web NFC): un UID ya contado en el lote no suma
// otra vez. El recuento vive en el teléfono (funciona sin cobertura) y se sincroniza con el servidor, que también
// impide duplicados con un índice único (lote, UID).
const Nfc = (() => {
  const { $, esc, vista, api, aviso, vibrar, descargar, fecha } = App;
  const soporta = 'NDEFReader' in window;
  const clave = id => `nfc-lote-${id}`;

  // ── estado local de un lote ──
  function leerLocal(id) {
    try { return JSON.parse(localStorage.getItem(clave(id))) || { uids: [], pendientes: [], escritos: [] }; }
    catch { return { uids: [], pendientes: [], escritos: [] }; }
  }
  function guardarLocal(id, s) { localStorage.setItem(clave(id), JSON.stringify(s)); }

  // ── sincronización ──
  let tSync = null, sincronizando = false;
  async function sincronizar(lote, s, alTerminar) {
    if (sincronizando || !s.pendientes.length || !navigator.onLine) return;
    sincronizando = true;
    const lote1 = s.pendientes.slice(0, 200);
    try {
      const r = await api(`/app/lotti/${lote.id}/scansioni/sincronizza`, { metodo: 'POST', json: { items: lote1 } });
      s.pendientes = s.pendientes.filter(p => !lote1.includes(p));   // los leídos mientras tanto se quedan
      lote.totaleServidor = r.totale;
      guardarLocal(lote.id, s);
      alTerminar && alTerminar();
    } catch (e) { if (e.status && e.status !== 0) aviso('Sincronización: ' + e.message, true); }
    sincronizando = false;
  }

  // ── Lista de lotes ──
  async function lista(opciones = {}) {
    pararEscaneo();
    vista().innerHTML = `
      <div class="cab"><h1>NFC</h1><button class="btn prim" id="nNuevo">+ Lote</button></div>
      ${soporta ? '' : `<div class="tarjeta" style="border-color:var(--aviso)"><b>Este navegador no puede leer NFC.</b>
        <div class="mono" style="margin-top:4px">Abre la app en Chrome de Android (en iPhone y iPad no hay Web NFC).</div></div>`}
      <div class="lista" id="nLista"><div class="vacio">Cargando lotes…</div></div>`;
    $('#nNuevo').onclick = () => formLote();
    if (opciones.nuevoLote) return formLote(null, opciones.nuevoLote);
    try {
      const lotes = await api('/app/lotti');
      localStorage.setItem('nfc-lotes', JSON.stringify(lotes));
      pintaLista(lotes);
    } catch (e) {
      const cache = JSON.parse(localStorage.getItem('nfc-lotes') || '[]');
      pintaLista(cache);
      aviso(e.status === 0 ? 'Sin conexión: muestro los lotes guardados.' : e.message, e.status !== 0);
    }
  }
  function pintaLista(lotes) {
    const l = $('#nLista'); if (!l) return;
    if (!lotes.length) { l.innerHTML = `<div class="vacio">Aún no hay lotes. Crea uno por cada pedido de llaveros:<br/>nombre del local, URL que se graba y cuántos son.</div>`; return; }
    l.innerHTML = lotes.map(x => {
      const s = leerLocal(x.id), n = Math.max(x.totale, s.uids.length);
      return `<button class="item" data-id="${x.id}">
        <div class="crece"><div class="t">${esc(x.nome)}</div>
          <div class="mono">${x.chiuso ? 'Cerrado · ' : ''}${fecha(x.updatedAt)}${x.url ? ' · graba URL' : ' · solo contar'}${s.pendientes.length ? ` · ${s.pendientes.length} sin subir` : ''}</div></div>
        <div style="font-family:'Barlow Condensed';font-weight:900;font-size:26px">${n}${x.obiettivo ? `<span style="color:var(--suave);font-size:17px">/${x.obiettivo}</span>` : ''}</div>
      </button>`;
    }).join('');
    l.querySelectorAll('.item').forEach(b => { b.onclick = () => abrir(lotes.find(x => String(x.id) === b.dataset.id)); });
  }

  // ── Crear / editar lote ──
  async function formLote(lote = null, pre = {}) {
    pararEscaneo();
    const v = lote || { nome: pre.nombre || '', url: pre.url || '', obiettivo: '' };
    vista().innerHTML = `
      <button class="volver" id="nVolver">‹ ${lote ? esc(lote.nome) : 'Lotes'}</button>
      <h1 style="margin-bottom:14px">${lote ? 'Editar lote' : 'Nuevo lote'}</h1>
      <label class="campo"><span>Nombre</span><input id="nNombre" type="text" value="${esc(v.nome)}" placeholder="La Rocca del Lupo · llaveros"/></label>
      <label class="campo"><span>Página del cliente (para rellenar la URL)</span>
        <select id="nOrigen"><option value="">— Elegir —</option></select></label>
      <label class="campo"><span>URL que se graba en cada llavero (vacío = solo contar)</span>
        <input id="nUrl" type="url" value="${esc(v.url || '')}" placeholder="https://rolefigz.com/nfc/el-local"/></label>
      <label class="campo"><span>¿Cuántos llaveros son? (opcional)</span><input id="nObj" type="number" inputmode="numeric" min="1" value="${esc(v.obiettivo || '')}"/></label>
      <button class="btn prim ancho" id="nGuardar">${lote ? 'Guardar' : 'Crear lote'}</button>
      ${lote ? `<div class="botones" style="margin-top:12px"><button class="btn" id="nCerrar">${lote.chiuso ? 'Reabrir' : 'Cerrar lote'}</button>
        <button class="btn peligro" id="nBorrar">Borrar lote</button></div>` : ''}
      <div class="estado" id="nEstado"></div>`;
    $('#nVolver').onclick = () => lote ? abrir(lote) : lista();
    // páginas de prueba y empresas del módulo NFC para no escribir la URL a mano
    (async () => {
      const sel = $('#nOrigen');
      try {
        const [prove, aziende] = await Promise.all([api('/kit/admin/prove').catch(() => []), api('/admin/nfc/aziende').catch(() => [])]);
        sel.insertAdjacentHTML('beforeend',
          (aziende.length ? `<optgroup label="Clientes NFC">${aziende.map(a => `<option value="az:${a.id}">${esc(a.name)}</option>`).join('')}</optgroup>` : '') +
          (prove.length ? `<optgroup label="Páginas de prueba">${prove.map(p => `<option value="url:https://rolefigz.com/nfc/${esc(p.slug)}">${esc(p.nome)}${p.attiva ? '' : ' (caducada)'}</option>`).join('')}</optgroup>` : ''));
      } catch {}
      sel.onchange = async () => {
        const val = sel.value; if (!val) return;
        const nombre = sel.options[sel.selectedIndex].text.replace(/ \(caducada\)$/, '');
        if (!$('#nNombre').value.trim()) $('#nNombre').value = nombre;
        if (val.startsWith('url:')) { $('#nUrl').value = val.slice(4); return; }
        try {
          const t = await api(`/admin/nfc/aziende/${val.slice(3)}/tag-link`);
          $('#nUrl').value = /^https?:/.test(t.url) ? t.url : `https://rolefigz.com${t.url.startsWith('/nfc') ? '' : '/nfc'}${t.url}`;
        } catch (e) { aviso(e.message, true); }
      };
    })();
    $('#nGuardar').onclick = async () => {
      const datos = { nome: $('#nNombre').value.trim(), url: $('#nUrl').value.trim(), obiettivo: $('#nObj').value };
      try {
        const r = lote ? await api(`/app/lotti/${lote.id}`, { metodo: 'PUT', json: datos })
                       : await api('/app/lotti', { metodo: 'POST', json: datos });
        abrir(r);
      } catch (e) { $('#nEstado').textContent = 'Error: ' + e.message; $('#nEstado').classList.add('err'); }
    };
    if (lote) {
      $('#nCerrar').onclick = async () => { try { abrir(await api(`/app/lotti/${lote.id}`, { metodo: 'PUT', json: { chiuso: !lote.chiuso } })); } catch (e) { aviso(e.message, true); } };
      $('#nBorrar').onclick = async () => {
        if (!confirm(`¿Borrar el lote «${lote.nome}» y sus ${lote.totale} lecturas? No se puede deshacer.`)) return;
        try { await api(`/app/lotti/${lote.id}`, { metodo: 'DELETE' }); localStorage.removeItem(clave(lote.id)); lista(); }
        catch (e) { aviso(e.message, true); }
      };
    }
  }

  // ── Pantalla del lote: contador grande y escaneo ──
  let lector = null, abortar = null, alVolverRed = null;
  window.addEventListener('online', () => alVolverRed && alVolverRed());
  function pararEscaneo() {
    if (abortar) { try { abortar.abort(); } catch {} }
    abortar = null; lector = null;
    clearInterval(tSync); tSync = null; alVolverRed = null;
  }

  async function abrir(lote) {
    pararEscaneo();
    const s = leerLocal(lote.id);
    let modo = lote.url ? (localStorage.getItem('nfc-modo') || 'grabar') : 'contar';
    vista().innerHTML = `
      <button class="volver" id="nVolver">‹ Lotes</button>
      <div class="cab"><div class="crece"><h1>${esc(lote.nome)}</h1>
        <div class="mono" style="word-break:break-all">${lote.url ? esc(lote.url) : 'Sin URL: solo cuenta'}</div></div>
        <button class="btn peq" id="nEditar">Editar</button></div>
      <div class="seg" id="nModo" ${lote.url ? '' : 'hidden'}>
        <button data-m="grabar">Contar y grabar</button><button data-m="contar">Solo contar</button></div>
      <div class="contador" id="nCont">
        <div><span class="n" id="nN">0</span>${lote.obiettivo ? `<span class="de"> / ${lote.obiettivo}</span>` : ''}</div>
        <div class="msg" id="nMsg">${soporta ? 'Pulsa «Empezar» y acerca un llavero a la parte de atrás del teléfono.' : 'Este navegador no puede leer NFC.'}</div>
        ${lote.obiettivo ? '<div class="barra-prog"><i id="nProg"></i></div>' : ''}
      </div>
      <button class="btn prim ancho" id="nEmpezar" style="margin-top:12px" ${soporta && !lote.chiuso ? '' : 'disabled'}>${lote.chiuso ? 'Lote cerrado' : 'Empezar a escanear'}</button>
      <div class="estado" id="nSync"></div>
      <div class="tarjeta"><div class="fila"><h3 class="crece">Últimos llaveros</h3>
        <button class="btn peq" id="nCsv">CSV</button></div><div id="nUids"></div></div>`;
    $('#nVolver').onclick = () => lista();
    $('#nEditar').onclick = () => formLote(lote);
    const pintaModo = () => $('#nModo').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === modo));
    pintaModo();
    $('#nModo').onclick = e => { const b = e.target.closest('button'); if (!b) return; modo = b.dataset.m; localStorage.setItem('nfc-modo', modo); pintaModo(); };

    const conjunto = new Set(s.uids);
    const pinta = () => {
      const n = conjunto.size;
      $('#nN').textContent = n;
      if (lote.obiettivo) $('#nProg').style.width = Math.min(100, n / lote.obiettivo * 100) + '%';
      $('#nSync').textContent = s.pendientes.length ? `${s.pendientes.length} lecturas por subir${navigator.onLine ? '…' : ' (sin conexión: se suben solas al volver)'}` : 'Todo guardado en rolefigz.com ✓';
      const ultimos = s.uids.slice(-30).reverse();
      $('#nUids').innerHTML = ultimos.length ? ultimos.map((u, k) => `<div class="uid"><span>${conjunto.size - k}</span><span>${esc(u)}</span>
        ${s.escritos.includes(u) ? '<span class="pill ok">grabado</span>' : ''}<button class="x" data-u="${esc(u)}" title="Quitar">×</button></div>`).join('')
        : '<div class="mono" style="padding:8px 0">Ninguno todavía.</div>';
    };
    pinta();
    $('#nUids').onclick = async e => {
      const u = e.target.closest('.x')?.dataset.u; if (!u) return;
      if (!confirm(`¿Quitar ${u} del lote? (por ejemplo, un llavero defectuoso)`)) return;
      try {
        if (!s.pendientes.some(p => p.uid === u)) await api(`/app/lotti/${lote.id}/scansioni/${encodeURIComponent(u)}`, { metodo: 'DELETE' });
        conjunto.delete(u); s.uids = s.uids.filter(x => x !== u); s.escritos = s.escritos.filter(x => x !== u);
        s.pendientes = s.pendientes.filter(p => p.uid !== u);
        guardarLocal(lote.id, s); pinta();
      } catch (er) { aviso(er.message, true); }
    };
    $('#nCsv').onclick = async () => {
      try {
        const r = await api(`/app/lotti/${lote.id}/export.csv`, { crudo: true });
        descargar(await r.blob(), `nfc-${App.slug(lote.nome) || 'lote'}.csv`);
      } catch (e) { aviso(e.message, true); }
    };

    // UID que ya están en el servidor (contados desde otro teléfono o antes de borrar datos)
    api(`/app/lotti/${lote.id}/scansioni`).then(r => {
      let cambios = false;
      for (const x of r.scansioni.slice().reverse()) {
        if (!conjunto.has(x.uid)) { conjunto.add(x.uid); s.uids.push(x.uid); cambios = true; }
        if (x.scritto && !s.escritos.includes(x.uid)) { s.escritos.push(x.uid); cambios = true; }
      }
      if (cambios) { guardarLocal(lote.id, s); pinta(); }
    }).catch(() => {});

    tSync = setInterval(() => sincronizar(lote, s, pinta), 2500);
    alVolverRed = () => sincronizar(lote, s, pinta);

    // feedback grande: verde = suma, amarillo = ya contado, rojo = error
    let tFb;
    const feedback = (tipo, texto) => {
      const c = $('#nCont'); if (!c) return;
      c.className = 'contador ' + tipo; $('#nMsg').textContent = texto;
      clearTimeout(tFb); tFb = setTimeout(() => { c.className = 'contador'; }, 1600);
      vibrar(tipo === 'ok' ? 90 : tipo === 'dup' ? [60, 60, 60] : [200, 80, 200]);
    };

    const recientes = new Map();   // uid → ms: el mismo chip vuelve a leerse justo después de grabarlo
    let cola = Promise.resolve();
    const decodifica = r => { try { return new TextDecoder().decode(r.data); } catch { return ''; } };

    async function alLeer(ev) {
      const uid = String(ev.serialNumber || '').toUpperCase();
      if (!uid) return feedback('err', 'No se ha podido leer el código de la etiqueta. Acércala otra vez.');
      const ahora = Date.now();
      if (ahora - (recientes.get(uid) || 0) < 2500) return;
      recientes.set(uid, ahora);
      if (conjunto.has(uid)) return feedback('dup', `Ya contado (${uid.slice(-5)}): no suma`);

      let escrito = false, url = null;
      const urls = (ev.message?.records || []).filter(r => r.recordType === 'url').map(decodifica);
      if (modo === 'grabar' && lote.url) {
        if (urls.includes(lote.url)) { url = lote.url; }
        else {
          $('#nMsg').textContent = 'Grabando… no lo muevas';
          try {
            // si se aparta antes de tiempo, se cancela: así no se graba en el siguiente llavero por error
            await lector.write({ records: [{ recordType: 'url', data: lote.url }] }, { overwrite: true, signal: AbortSignal.timeout(2500) });
            escrito = true; url = lote.url;
          } catch (e) {
            recientes.delete(uid);
            return feedback('err', e.name === 'NotAllowedError' ? 'Etiqueta bloqueada: no se puede grabar.' : 'No se ha grabado: sujétalo quieto y vuelve a acercarlo.');
          }
        }
      } else url = urls[0] || null;

      conjunto.add(uid); s.uids.push(uid);
      if (escrito || url === lote.url) s.escritos.push(uid);
      s.pendientes.push({ uid, scritto: escrito || (!!lote.url && url === lote.url), url, letto_il: new Date().toISOString() });
      guardarLocal(lote.id, s);
      pinta();
      const n = conjunto.size;
      const fin = lote.obiettivo && n === Number(lote.obiettivo) ? ' · ¡lote completo!' : '';
      feedback('ok', `+1 ${escrito ? 'grabado' : url === lote.url && lote.url ? 'ya tenía la URL' : 'contado'} · ${n}${fin}`);
      sincronizar(lote, s, pinta);
    }

    $('#nEmpezar').onclick = async () => {
      if (lector) { pararEscaneo(); tSync = setInterval(() => sincronizar(lote, s, pinta), 2500); alVolverRed = () => sincronizar(lote, s, pinta);
        $('#nEmpezar').textContent = 'Empezar a escanear'; $('#nMsg').textContent = 'En pausa.'; return; }
      try {
        lector = new NDEFReader(); abortar = new AbortController();
        await lector.scan({ signal: abortar.signal });
        lector.onreading = ev => { cola = cola.then(() => alLeer(ev)).catch(e => feedback('err', e.message)); };
        lector.onreadingerror = () => feedback('err', 'No se ha podido leer. Acércalo otra vez.');
        $('#nEmpezar').innerHTML = '<span class="escaneo"><span class="onda"></span>Escaneando… (pulsa para pausar)</span>';
        $('#nMsg').textContent = 'Acerca un llavero a la parte de atrás del teléfono.';
      } catch (e) {
        lector = null;
        feedback('err', e.name === 'NotAllowedError' ? 'Permiso NFC denegado: actívalo en los ajustes del sitio.' : 'NFC no disponible: ¿está activado en el teléfono?');
      }
    };
  }

  return { lista, pararEscaneo, soporta };
})();
