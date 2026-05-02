async function loadCats() {
  try {
    const r = await fetch(`${API}/categorias`);
    categorias = await r.json();
    if (typeof renderCats === 'function') renderCats();
  } catch {}
}

async function adminTab(tab, el) {
  document.querySelectorAll('.admin-menu-item').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
  const content = document.getElementById('adminContent');

  if (tab === 'ordenes') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const r = await fetch(`${API}/ordenes`, { headers: { Authorization: `Bearer ${token}` } });
      const list = await r.json();
      if (!list.length) { content.innerHTML = '<div class="empty-state"><div class="ei">📋</div><h3>NESSUN ORDINE</h3></div>'; return; }
      content.innerHTML = `
        <div class="admin-form-title">ORDINI (${list.length})</div>
        <table><thead><tr><th>ID</th><th>Cliente</th><th>Totale</th><th>Stato</th><th>Data</th><th></th></tr></thead><tbody>
        ${list.map(o => `
          <tr>
            <td><span class="pill">#${o.id}</span></td>
            <td><strong>${o.nombre_cliente}</strong><br><span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${o.email_cliente}</span></td>
            <td class="price-cell">€${parseFloat(o.total).toFixed(2)}</td>
            <td>
              <select class="estado-select" onchange="updateEstado(${o.id}, this.value)">
                ${['pendiente','confirmado','enviado','entregado','cancelado'].map(e =>
                  `<option value="${e}" ${o.estado === e ? 'selected' : ''}>${e.toUpperCase()}</option>`
                ).join('')}
              </select>
            </td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${new Date(o.createdAt).toLocaleDateString('it-IT')}</td>
            <td><button class="action-btn" onclick="toggleRow('ao-${o.id}')">VER</button></td>
          </tr>
          <tr id="ao-${o.id}" style="display:none">
            <td colspan="6" style="padding:0 12px 12px">
              <div style="background:var(--surface2);border:1px solid var(--border);padding:14px">
                ${o.detalles && o.detalles.length
                  ? o.detalles.map(d => `<div class="orden-detail-line"><span>${d.Producto ? d.Producto.nombre : 'Prod'} × ${d.cantidad}${d.variante ? `<span style="display:block;font-size:8px;color:var(--muted);letter-spacing:1px">${d.variante}</span>` : ''}</span><span>€${parseFloat(d.subtotal).toFixed(2)}</span></div>`).join('')
                  : '—'}
                ${o.direccion ? `<div style="margin-top:6px;font-size:9px;color:var(--muted)">📍 ${o.direccion}</div>` : ''}
              </div>
            </td>
          </tr>`).join('')}
        </tbody></table>`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }

  if (tab === 'productos') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const r = await fetch(`${API}/productos/admin/todos`, { headers: { Authorization: `Bearer ${token}` } });
      const list = await r.json();
      const attivi = list.filter(p => p.activo).length;
      content.innerHTML = `
        <div class="admin-form-title">PRODOTTI (${attivi} attivi · ${list.length - attivi} inattivi)</div>
        <table><thead><tr><th>ID</th><th>Nome</th><th>Prezzo</th><th>Stock</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>
        ${list.map(p => `
          <tr>
            <td><span class="pill">#${p.id}</span></td>
            <td><strong>${p.nombre}</strong></td>
            <td class="price-cell">€${parseFloat(p.precio).toFixed(2)}</td>
            <td>${p.stock}</td>
            <td><span class="pill ${p.activo ? 'green' : 'orange'}">${p.activo ? 'ATTIVO' : 'INATTIVO'}</span></td>
            <td>
              <button class="action-btn" onclick="adminGestionarProducto(${p.id})">GESTISCI</button>
              ${p.activo
                ? `<button class="action-btn" onclick="toggleProducto(${p.id}, false)">DISATTIVA</button>`
                : `<button class="action-btn" style="border-color:var(--green);color:var(--green)" onclick="toggleProducto(${p.id}, true)">ATTIVA</button>`
              }
              <button class="action-btn danger" onclick="eliminarProducto(${p.id})">ELIMINA</button>
            </td>
          </tr>`).join('')}
        </tbody></table>`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }

  if (tab === 'nuevo') {
    await loadCats();
    content.innerHTML = `
      <div class="admin-form-title">NUOVO PRODOTTO</div>
      <div class="form-row">
        <div class="field"><label>Nome *</label><input id="pNombre" type="text" placeholder="Figura Goku..."/></div>
        <div class="field"><label>Prezzo (€) *</label><input id="pPrecio" type="number" step="0.01" placeholder="24.99"/></div>
      </div>
      <div class="field"><label>Descrizione</label><textarea id="pDesc" placeholder="Descrizione dettagliata..."></textarea></div>
      <div class="form-row">
        <div class="field"><label>Stock</label><input id="pStock" type="number" placeholder="10"/></div>
        <div class="field"><label>Categoria</label>
          <select id="pCat">
            <option value="">Senza categoria</option>
            ${categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field">
        <label>Immagine principale</label>
        <div class="img-preview-wrap" id="imgWrap"><img id="imgPreview" src=""/></div>
        <input type="file" id="pImagen" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="previewImg(this)"/>
        <button type="button" class="add-file-btn" onclick="document.getElementById('pImagen').click()">📁 SELEZIONA IMMAGINE</button>
        <div class="img-label" id="imgLabel"></div>
      </div>
      <button class="btn-submit" onclick="crearProductoAdmin()">CREA PRODOTTO</button>
      <div id="productoMsg"></div>`;
  }

  if (tab === 'categorias') {
    await loadCats();
    content.innerHTML = `
      <div class="admin-form-title">CATEGORIE</div>
      <table style="margin-bottom:24px">
        <thead><tr><th>ID</th><th>Nome</th><th>Descrizione</th></tr></thead>
        <tbody>${categorias.map(c => `
          <tr>
            <td><span class="pill">#${c.id}</span></td>
            <td><strong>${c.nombre}</strong></td>
            <td style="color:var(--muted)">${c.descripcion || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="admin-form-title" style="font-size:19px">NUOVA CATEGORIA</div>
      <div class="form-row">
        <div class="field"><label>Nome *</label><input id="cNombre" type="text" placeholder="Figure Anime..."/></div>
        <div class="field"><label>Descrizione</label><input id="cDesc" type="text" placeholder="Descrizione..."/></div>
      </div>
      <button class="btn-submit" onclick="crearCatAdmin()">CREA CATEGORIA</button>
      <div id="categoriaMsg"></div>`;
  }

  if (tab === 'clientes') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const r = await fetch(`${API}/ordenes`, { headers: { Authorization: `Bearer ${token}` } });
      const ordenes = await r.json();
      const map = {};
      ordenes.forEach(o => {
        if (!map[o.email_cliente]) map[o.email_cliente] = { nombre: o.nombre_cliente, email: o.email_cliente, pedidos: 0, total: 0 };
        map[o.email_cliente].pedidos++;
        map[o.email_cliente].total += parseFloat(o.total);
      });
      const clientes = Object.values(map);
      if (!clientes.length) { content.innerHTML = '<div class="empty-state"><div class="ei">👥</div><h3>NESSUN CLIENTE</h3></div>'; return; }
      content.innerHTML = `
        <div class="admin-form-title">CLIENTI (${clientes.length})</div>
        <table><thead><tr><th>Nome</th><th>Email</th><th>Ordini</th><th>Totale</th></tr></thead>
        <tbody>${clientes.map(c => `
          <tr>
            <td><strong>${c.nombre}</strong></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${c.email}</td>
            <td><span class="pill">${c.pedidos}</span></td>
            <td class="price-cell">€${c.total.toFixed(2)}</td>
          </tr>`).join('')}
        </tbody></table>`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }

  if (tab === 'resenas') {
    await adminTabResenas(content);
    return;
  }

  if (tab === 'analytics') {
    await adminTabAnalytics(content);
    return;
  }

  if (tab === 'tickets') {
    await adminTabTickets(content);
    return;
  }

  if (tab === 'blog') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const r = await fetch(`${API}/articoli?all=1`, { headers: { Authorization: `Bearer ${token}` } });
      const rAll = await fetch(`${API}/articoli`);
      const list = await rAll.json();
      const rAdmin = await fetch(`${API}/articoli?published=0`, { headers: { Authorization: `Bearer ${token}` } });

      // Fetch all including unpublished via admin endpoint if available, otherwise use public
      const rA = await fetch(`${API}/articoli`, { headers: { Authorization: `Bearer ${token}` } });
      const publist = await rA.json();

      content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div class="admin-form-title" style="margin:0">BLOG (${publist.length} pubblicati)</div>
          <button class="btn-submit" onclick="adminNuovoArticolo()">+ NUOVO ARTICOLO</button>
        </div>
        <table><thead><tr><th>Titolo</th><th>Slug</th><th>Stato</th><th>Data</th><th>Azioni</th></tr></thead>
        <tbody>${publist.map(a => `
          <tr>
            <td><strong>${a.titolo}</strong></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${a.slug}</td>
            <td><span class="pill green">PUBBLICATO</span></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${new Date(a.createdAt).toLocaleDateString('it-IT')}</td>
            <td>
              <button class="action-btn" onclick="adminEditarArticolo('${a.slug}')">MODIFICA</button>
              <button class="action-btn danger" onclick="toggleArticolo(${a.id}, false)">BOZZA</button>
            </td>
          </tr>`).join('')}
        </tbody></table>
        <div id="blogFormWrap" style="margin-top:32px"></div>`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }
}

function adminNuovoArticolo() {
  const wrap = document.getElementById('blogFormWrap');
  if (!wrap) return;
  let charCount = 0;
  wrap.innerHTML = `
    <div class="admin-form-title" style="font-size:19px;margin-bottom:16px">NUOVO ARTICOLO</div>
    <div class="field"><label>Titolo *</label><input id="aTitolo" type="text" placeholder="Come stampare in 3D..."/></div>
    <div class="field"><label>Estratto</label><textarea id="aEstratto" placeholder="Breve descrizione..."></textarea></div>
    <div class="field"><label>Contenuto * (supporta HTML)</label><textarea id="aContenuto" style="min-height:200px" placeholder="<p>Testo dell'articolo...</p>"></textarea></div>
    <div class="field">
      <label>Meta descrizione (<span id="metaCount">0</span>/160)</label>
      <input id="aMetaDesc" type="text" maxlength="160" placeholder="Descrizione per i motori di ricerca..."
        oninput="document.getElementById('metaCount').textContent=this.value.length"/>
    </div>
    <div class="field"><label>Tags (separati da virgola)</label><input id="aTags" type="text" placeholder="stampa3d,figure,anime"/></div>
    <div class="field">
      <label>Immagine</label>
      <div class="img-preview-wrap" id="aImgWrap"><img id="aImgPreview" src=""/></div>
      <input type="file" id="aImagen" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="previewImgBlog(this)"/>
      <button type="button" class="add-file-btn" onclick="document.getElementById('aImagen').click()">📁 SELEZIONA IMMAGINE</button>
    </div>
    <div class="field" style="display:flex;align-items:center;gap:10px;margin-bottom:0">
      <input type="checkbox" id="aPubblica" style="width:auto"/>
      <label style="margin:0;letter-spacing:1px">Pubblica subito</label>
    </div>
    <button class="btn-submit" style="margin-top:16px" onclick="crearArticoloAdmin()">CREA ARTICOLO</button>
    <div id="articoloMsg"></div>`;
}

async function adminEditarArticolo(slug) {
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/articoli/${slug}`);
    const a = await r.json();
    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <button class="action-btn" onclick="adminTab('blog',null)">← INDIETRO</button>
        <div class="admin-form-title" style="margin:0">MODIFICA: ${a.titolo}</div>
      </div>
      <div class="field"><label>Titolo *</label><input id="eTitolo" type="text" value="${a.titolo}"/></div>
      <div class="field"><label>Estratto</label><textarea id="eEstratto">${a.estratto || ''}</textarea></div>
      <div class="field"><label>Contenuto * (supporta HTML)</label><textarea id="eContenuto" style="min-height:200px">${a.contenuto}</textarea></div>
      <div class="field">
        <label>Meta descrizione (<span id="metaCountE">${(a.meta_desc||'').length}</span>/160)</label>
        <input id="eMetaDesc" type="text" maxlength="160" value="${a.meta_desc || ''}"
          oninput="document.getElementById('metaCountE').textContent=this.value.length"/>
      </div>
      <div class="field"><label>Tags</label><input id="eTags" type="text" value="${a.tags || ''}"/></div>
      <div class="field" style="display:flex;align-items:center;gap:10px;margin-bottom:0">
        <input type="checkbox" id="ePubblica" style="width:auto" ${a.pubblicato ? 'checked' : ''}/>
        <label style="margin:0;letter-spacing:1px">Pubblicato</label>
      </div>
      <button class="btn-submit" style="margin-top:16px" onclick="guardarArticoloAdmin(${a.id})">SALVA MODIFICHE</button>
      <div id="articoloMsg"></div>`;
  } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
}

async function crearArticoloAdmin() {
  const titolo = document.getElementById('aTitolo').value.trim();
  const contenuto = document.getElementById('aContenuto').value.trim();
  if (!titolo || !contenuto) { showMsg('articoloMsg', 'Titolo e contenuto obbligatori', 'err'); return; }
  const body = {
    titolo,
    estratto:  document.getElementById('aEstratto').value,
    contenuto,
    meta_desc: document.getElementById('aMetaDesc').value,
    tags:      document.getElementById('aTags').value,
    pubblicato: document.getElementById('aPubblica').checked,
  };
  try {
    const r = await fetch(`${API}/articoli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('articoloMsg', `✅ "${data.articolo.titolo}" creato`, 'ok');
    setTimeout(() => adminTab('blog', null), 1200);
  } catch(e) { showMsg('articoloMsg', e.message, 'err'); }
}

async function guardarArticoloAdmin(id) {
  const body = {
    titolo:    document.getElementById('eTitolo').value.trim(),
    estratto:  document.getElementById('eEstratto').value,
    contenuto: document.getElementById('eContenuto').value.trim(),
    meta_desc: document.getElementById('eMetaDesc').value,
    tags:      document.getElementById('eTags').value,
    pubblicato: document.getElementById('ePubblica').checked,
  };
  if (!body.titolo || !body.contenuto) { showMsg('articoloMsg', 'Titolo e contenuto obbligatori', 'err'); return; }
  try {
    const r = await fetch(`${API}/articoli/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('articoloMsg', '✅ Articolo aggiornato', 'ok');
  } catch(e) { showMsg('articoloMsg', e.message, 'err'); }
}

async function toggleArticolo(id, pubblicato) {
  try {
    const r = await fetch(`${API}/articoli/${id}/publish`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) throw new Error('Errore');
    adminTab('blog', null);
  } catch(e) { alert('Errore: ' + e.message); }
}

function previewImgBlog(input) {
  const file = input.files[0];
  if (!file) return;
  const rd = new FileReader();
  rd.onload = e => {
    document.getElementById('aImgPreview').src = e.target.result;
    document.getElementById('aImgWrap').style.display = 'block';
  };
  rd.readAsDataURL(file);
}

async function adminGestionarProducto(id) {
  document.querySelectorAll('.admin-menu-item').forEach(x => x.classList.remove('active'));
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/productos/${id}`);
    const p = await r.json();
    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <button class="action-btn" onclick="adminTab('productos', null)">← INDIETRO</button>
        <div class="admin-form-title" style="margin:0">GESTISCI: ${p.nombre}</div>
      </div>
      <div style="margin-bottom:28px;padding:16px;border:1px solid var(--border)">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;color:var(--dark)">STOCK GENERALE</div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="field" style="margin:0;flex:1"><label>Unità disponibili</label><input type="number" id="stockInput" value="${p.stock}" min="0"/></div>
          <button class="btn-submit" style="margin-top:18px" onclick="actualizarStock(${p.id})">SALVA</button>
        </div>
        <div id="stockMsg"></div>
      </div>
      <div style="margin-bottom:28px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;color:var(--dark)">VARIANTI</div>
        <div id="variantesWrap">
          ${p.variantes && p.variantes.length
            ? p.variantes.map(v => `
                <span class="variante-tag">
                  <span style="color:var(--muted);font-size:9px">${v.tipo.toUpperCase()}:</span>
                  ${v.valor}${v.precio_extra > 0 ? `<span style="color:var(--accent)">+€${parseFloat(v.precio_extra).toFixed(2)}</span>` : ''} · stock:${v.stock}
                  <button onclick="eliminarVariante(${v.id})">✕</button>
                </span>`).join('')
            : `<span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">Nessuna variante</span>`}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 80px 100px auto;gap:8px;margin-top:12px;align-items:end">
          <div class="field" style="margin:0"><label>Tipo</label><input id="vTipo" placeholder="colore / taglia"/></div>
          <div class="field" style="margin:0"><label>Valore</label><input id="vValor" placeholder="Rosso / XL"/></div>
          <div class="field" style="margin:0"><label>Stock</label><input id="vStock" type="number" placeholder="5"/></div>
          <div class="field" style="margin:0"><label>+Prezzo€</label><input id="vExtra" type="number" step="0.01" placeholder="0"/></div>
          <button class="btn-submit" style="margin:0;height:43px" onclick="añadirVariante(${p.id})">+</button>
        </div>
        <div id="varianteMsg"></div>
      </div>
      <div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;color:var(--dark)">IMMAGINI</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px" id="imagenesWrap">
          ${p.imagenes && p.imagenes.length
            ? p.imagenes.map(img => `
                <div style="position:relative;width:100px">
                  <img src="${img.url}" style="width:100px;height:100px;object-fit:cover;border:1px solid var(--border)"/>
                  <button onclick="eliminarImagen(${img.id})" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);border:none;color:#fff;width:20px;height:20px;cursor:pointer;font-size:11px">✕</button>
                </div>`).join('')
            : `<span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">Nessuna immagine aggiuntiva</span>`}
        </div>
        <input type="file" id="nuevaImagen" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="subirImagenProducto(${p.id}, this)"/>
        <button class="add-file-btn" style="width:200px" onclick="document.getElementById('nuevaImagen').click()">📁 AGGIUNGI IMMAGINE</button>
        <div id="imagenMsg"></div>
      </div>`;
  } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
}

async function actualizarStock(id) {
  const stock = document.getElementById('stockInput').value;
  try {
    const r = await fetch(`${API}/productos/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stock: parseInt(stock) })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('stockMsg', `✓ Stock aggiornato: ${data.stock} unità`, 'ok');
    if (typeof loadProductos === 'function') loadProductos();
  } catch(e) { showMsg('stockMsg', e.message, 'err'); }
}

async function añadirVariante(productoId) {
  const tipo = document.getElementById('vTipo').value.trim();
  const valor = document.getElementById('vValor').value.trim();
  const stock = document.getElementById('vStock').value || 0;
  const extra = document.getElementById('vExtra').value || 0;
  if (!tipo || !valor) { showMsg('varianteMsg', 'Tipo e valore obbligatori', 'err'); return; }
  try {
    const r = await fetch(`${API}/productos/${productoId}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo, valor, stock: parseInt(stock), precio_extra: parseFloat(extra) })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('varianteMsg', '✓ Variante aggiunta', 'ok');
    ['vTipo', 'vValor', 'vStock', 'vExtra'].forEach(id => document.getElementById(id).value = '');
    adminGestionarProducto(productoId);
  } catch(e) { showMsg('varianteMsg', e.message, 'err'); }
}

async function eliminarVariante(id) {
  if (!confirm('Eliminare variante?')) return;
  await fetch(`${API}/productos/variantes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  location.reload();
}

async function subirImagenProducto(productoId, input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('imagen', file);
  try {
    const r = await fetch(`${API}/productos/${productoId}/imagenes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('imagenMsg', '✓ Immagine aggiunta', 'ok');
    adminGestionarProducto(productoId);
  } catch(e) { showMsg('imagenMsg', e.message, 'err'); }
}

async function eliminarImagen(id) {
  if (!confirm('Eliminare immagine?')) return;
  await fetch(`${API}/productos/imagenes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  location.reload();
}

async function crearProductoAdmin() {
  const nombre = document.getElementById('pNombre').value;
  const precio = document.getElementById('pPrecio').value;
  if (!nombre || !precio) { showMsg('productoMsg', 'Nome e prezzo obbligatori', 'err'); return; }
  try {
    const r = await fetch(`${API}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nombre,
        precio: parseFloat(precio),
        descripcion: document.getElementById('pDesc').value,
        stock: parseInt(document.getElementById('pStock').value || 0),
        categoria_id: document.getElementById('pCat').value || null
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    const fi = document.getElementById('pImagen');
    if (fi.files[0]) {
      const fd = new FormData();
      fd.append('imagen', fi.files[0]);
      await fetch(`${API}/productos/${data.producto.id}/imagenes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
    }
    showMsg('productoMsg', `✅ "${data.producto.nombre}" creato`, 'ok');
    if (typeof loadProductos === 'function') loadProductos();
    ['pNombre', 'pPrecio', 'pDesc', 'pStock'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('imgWrap').style.display = 'none';
  } catch(e) { showMsg('productoMsg', e.message, 'err'); }
}

async function crearCatAdmin() {
  const nombre = document.getElementById('cNombre').value;
  if (!nombre) { showMsg('categoriaMsg', 'Il nome è obbligatorio', 'err'); return; }
  try {
    const r = await fetch(`${API}/categorias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nombre, descripcion: document.getElementById('cDesc').value })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('categoriaMsg', `✓ "${data.cat.nombre}" creata`, 'ok');
    await loadCats();
    adminTab('categorias', null);
  } catch(e) { showMsg('categoriaMsg', e.message, 'err'); }
}

async function toggleProducto(id, activar) {
  const msg = activar ? 'Attivare questo prodotto?' : 'Disattivare questo prodotto?';
  if (!confirm(msg)) return;
  try {
    await fetch(`${API}/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activo: activar })
    });
    adminTab('productos', null);
  } catch(e) { alert('Errore: ' + e.message); }
}

async function eliminarProducto(id) {
  if (!confirm('ATTENZIONE: eliminare definitivamente questo prodotto?')) return;
  try {
    await fetch(`${API}/productos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    adminTab('productos', null);
    if (typeof loadProductos === 'function') loadProductos();
  } catch(e) { alert('Errore: ' + e.message); }
}

async function updateEstado(id, estado) {
  try {
    await fetch(`${API}/ordenes/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado })
    });
  } catch { alert('Errore'); }
}

function previewImg(input) {
  const file = input.files[0];
  if (!file) return;
  setTxt('imgLabel', file.name);
  const rd = new FileReader();
  rd.onload = e => {
    document.getElementById('imgPreview').src = e.target.result;
    document.getElementById('imgWrap').style.display = 'block';
  };
  rd.readAsDataURL(file);
}

function toggleRow(id) {
  const r = document.getElementById(id);
  r.style.display = r.style.display === 'none' ? 'table-row' : 'none';
}

async function adminTabResenas(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/resenas/admin/todas`, { headers: { Authorization: `Bearer ${token}` } });
    const list = await r.json();
    if (!list.length) { content.innerHTML = '<div class="empty-state"><div class="ei">⭐</div><h3>NESSUNA RECENSIONE</h3></div>'; return; }
    const pending  = list.filter(x => !x.verificado).length;
    const approved = list.filter(x =>  x.verificado).length;
    content.innerHTML = `
      <div class="admin-form-title">RECENSIONI (${approved} approvate · ${pending} in attesa)</div>
      <table>
        <thead><tr><th>Prodotto</th><th>Autore</th><th>Voto</th><th>Commento</th><th>Stato</th><th>Data</th><th>Azioni</th></tr></thead>
        <tbody>${list.map(rv => `
          <tr>
            <td><strong>${rv.Producto ? rv.Producto.nombre : '—'}</strong></td>
            <td>
              <div>${rv.nombre_autor || '—'}</div>
              ${rv.Usuario ? `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${rv.Usuario.email || ''}</div>` : ''}
              ${rv.compra_verificada ? `<div style="font-family:'DM Mono',monospace;font-size:8px;color:var(--green);letter-spacing:1px">✓ ACQUISTATO</div>` : ''}
            </td>
            <td style="font-size:16px;letter-spacing:2px">${'★'.repeat(rv.puntuacion)}${'☆'.repeat(5 - rv.puntuacion)}</td>
            <td style="max-width:220px;font-size:11px;color:var(--muted)">${rv.comentario ? rv.comentario.substring(0, 100) + (rv.comentario.length > 100 ? '…' : '') : '—'}</td>
            <td><span class="pill ${rv.verificado ? 'green' : 'orange'}">${rv.verificado ? 'APPROVATA' : 'IN ATTESA'}</span></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${new Date(rv.createdAt).toLocaleDateString('it-IT')}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap">
              ${!rv.verificado
                ? `<button class="action-btn" style="border-color:var(--green);color:var(--green)" onclick="moderarResena(${rv.id}, true)">APPROVA</button>`
                : `<button class="action-btn" onclick="moderarResena(${rv.id}, false)">REVOCA</button>`}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch { content.innerHTML = '<div class="msg err">Errore caricamento</div>'; }
}

// ══ ANALYTICS ══════════════════════════════════════════════════════════════

const PAIS_NAMES = { IT:'🇮🇹 Italia', ES:'🇪🇸 Spagna', US:'🇺🇸 USA', DE:'🇩🇪 Germania', FR:'🇫🇷 Francia', GB:'🇬🇧 UK', AR:'🇦🇷 Argentina', MX:'🇲🇽 Messico', BR:'🇧🇷 Brasile', PT:'🇵🇹 Portogallo', NL:'🇳🇱 Olanda', CH:'🇨🇭 Svizzera', BE:'🇧🇪 Belgio', AU:'🇦🇺 Australia', CA:'🇨🇦 Canada' };
const CHART_C    = { accent:'#c94b2c', light:'#e8a87c', blue:'#5b8db8', green:'#4caf50', muted:'#8b7355', border:'rgba(0,0,0,0.06)' };

let analyticsDias = 30;

function safeChart(id, cfg) {
  const ex = Chart.getChart(id);
  if (ex) ex.destroy();
  const el = document.getElementById(id);
  if (!el) return null;
  return new Chart(el, cfg);
}

async function adminTabAnalytics(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO ANALYTICS</div>';
  const h = { Authorization: `Bearer ${token}` };
  try {
    const [resumen, visitas, ingresos, paises, prodsVisti, prodsVenduti, estados] = await Promise.all([
      fetch(`${API}/analytics/resumen`,  { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/visitas?dias=${analyticsDias}`,  { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/ingresos?dias=${analyticsDias}`, { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/paises`,   { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/productos`,{ headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/vendidos`, { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/estados`,  { headers: h }).then(r => r.json()),
    ]);

    content.innerHTML = renderAnalyticsHTML(resumen, prodsVenduti, analyticsDias);
    initAnalyticsCharts(visitas, ingresos, paises, prodsVisti, estados);
  } catch(e) {
    content.innerHTML = `<div class="msg err">Errore caricamento analytics: ${e.message}</div>`;
  }
}

async function cambiarPeriodoDias(dias) {
  analyticsDias = dias;
  document.querySelectorAll('.an-period-btn').forEach(b => b.classList.toggle('active', +b.dataset.dias === dias));
  const h = { Authorization: `Bearer ${token}` };
  const [visitas, ingresos] = await Promise.all([
    fetch(`${API}/analytics/visitas?dias=${dias}`,  { headers: h }).then(r => r.json()),
    fetch(`${API}/analytics/ingresos?dias=${dias}`, { headers: h }).then(r => r.json()),
  ]);
  updateTimeCharts(visitas, ingresos);
}

function renderAnalyticsHTML(r, prodsVenduti, dias) {
  const kpis = [
    { label: 'VISITE TOTALI',    value: r.totalVisitas?.toLocaleString() || '—',  sub: `+${r.visitasSemana || 0} questa settimana` },
    { label: 'VISITE OGGI',      value: r.visitasHoy?.toLocaleString()   || '—',  sub: 'utenti unici stimati' },
    { label: 'ORDINI TOTALI',    value: r.totalOrdenes?.toLocaleString() || '—',  sub: `+${r.ordenesSemana || 0} questa settimana` },
    { label: 'FATTURATO TOTALE', value: `€${r.ingresoTotal || '0.00'}`,           sub: `€${r.ingresoSemana || '0.00'} questa settimana` },
    { label: 'CONVERSIONE',      value: `${r.conversion || 0}%`,                  sub: 'visite → ordini' },
  ];

  const tablaVenduti = prodsVenduti.length ? `
    <table style="margin-top:0"><thead><tr><th>#</th><th>Prodotto</th><th>Unità</th><th>Ordini</th><th>Fatturato</th></tr></thead>
    <tbody>${prodsVenduti.map((p, i) => `
      <tr>
        <td><span class="pill">${i + 1}</span></td>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.unidades}</td>
        <td>${p.ordenes}</td>
        <td class="price-cell">€${p.ingresos}</td>
      </tr>`).join('')}
    </tbody></table>` : '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted);padding:20px 0">Nessun dato disponibile</div>';

  return `
    <!-- KPI Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:1px;background:var(--border);margin-bottom:28px">
      ${kpis.map(k => `
        <div style="background:var(--surface);padding:20px 18px">
          <div style="font-family:'DM Mono',monospace;font-size:8px;color:var(--muted);letter-spacing:2px;margin-bottom:8px">${k.label}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:900;color:var(--accent);line-height:1">${k.value}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:6px">${k.sub}</div>
        </div>`).join('')}
    </div>

    <!-- Period selector -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:20px">
      <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-right:6px">PERIODO</span>
      ${[7, 30, 90].map(d => `<button class="an-period-btn action-btn${d === dias ? ' active' : ''}" data-dias="${d}" onclick="cambiarPeriodoDias(${d})" style="${d === dias ? 'border-color:var(--accent);color:var(--accent)' : ''}">${d}G</button>`).join('')}
    </div>

    <!-- Grafici temporali -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);margin-bottom:28px">
      <div style="background:var(--surface);padding:20px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:14px">VISITE PER GIORNO</div>
        <canvas id="chartVisitas" height="180"></canvas>
      </div>
      <div style="background:var(--surface);padding:20px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:14px">FATTURATO PER GIORNO (€)</div>
        <canvas id="chartIngresos" height="180"></canvas>
      </div>
    </div>

    <!-- Paesi + stati ordini -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);margin-bottom:28px">
      <div style="background:var(--surface);padding:20px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:14px">TOP PAESI</div>
        <canvas id="chartPaises" height="220"></canvas>
      </div>
      <div style="background:var(--surface);padding:20px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:14px">STATO ORDINI</div>
        <canvas id="chartEstados" height="220"></canvas>
      </div>
    </div>

    <!-- Prodotti più visti -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border);margin-bottom:28px">
      <div style="background:var(--surface);padding:20px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:14px">PRODOTTI PIÙ VISTI</div>
        <canvas id="chartProdsVisti" height="220"></canvas>
      </div>
      <div style="background:var(--surface);padding:20px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:14px">TOP PRODOTTI PER VENDITE</div>
        ${tablaVenduti}
      </div>
    </div>`;
}

function buildLineData(rows, labelKey, valueKey, dias) {
  const map = Object.fromEntries(rows.map(r => [r[labelKey], r[valueKey]]));
  const labels = [], data = [];
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(key.slice(5)); // MM-DD
    data.push(parseFloat(map[key] || 0));
  }
  return { labels, data };
}

function initAnalyticsCharts(visitas, ingresos, paises, prodsVisti, estados) {
  Chart.defaults.font.family = "'DM Mono', monospace";
  Chart.defaults.font.size   = 10;
  Chart.defaults.color       = '#888';

  updateTimeCharts(visitas, ingresos);

  // Países
  if (paises.length) {
    safeChart('chartPaises', {
      type: 'bar',
      data: {
        labels:   paises.map(p => PAIS_NAMES[p.pais] || p.pais || 'Sconosciuto'),
        datasets: [{ data: paises.map(p => +p.total), backgroundColor: CHART_C.accent, borderRadius: 2 }],
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: CHART_C.border } }, y: { grid: { display: false } } } },
    });
  }

  // Prodotti più visti
  if (prodsVisti.length) {
    safeChart('chartProdsVisti', {
      type: 'bar',
      data: {
        labels:   prodsVisti.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 20) + '…' : p.nombre),
        datasets: [{ data: prodsVisti.map(p => +p.visitas), backgroundColor: CHART_C.blue, borderRadius: 2 }],
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: CHART_C.border } }, y: { grid: { display: false } } } },
    });
  }

  // Estado ordini (doughnut)
  const estadoColors = { pendiente: '#e8a87c', confirmado: '#4caf50', enviado: '#5b8db8', entregado: '#2e7d32', cancelado: '#c94b2c' };
  if (estados.length) {
    safeChart('chartEstados', {
      type: 'doughnut',
      data: {
        labels:   estados.map(e => e.estado.toUpperCase()),
        datasets: [{ data: estados.map(e => +e.total), backgroundColor: estados.map(e => estadoColors[e.estado] || '#888'), borderWidth: 0, hoverOffset: 6 }],
      },
      options: { plugins: { legend: { position: 'bottom', labels: { padding: 14, boxWidth: 10 } } }, cutout: '60%' },
    });
  }
}

function updateTimeCharts(visitas, ingresos) {
  const vData = buildLineData(visitas,  'fecha', 'total',   analyticsDias);
  const iData = buildLineData(ingresos, 'fecha', 'total',   analyticsDias);

  const lineOpts = (color) => ({
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
      y: { grid: { color: CHART_C.border }, beginAtZero: true },
    },
    elements: { point: { radius: 2, hoverRadius: 5 } },
  });

  safeChart('chartVisitas', {
    type: 'line',
    data: {
      labels: vData.labels,
      datasets: [{ data: vData.data, borderColor: CHART_C.accent, backgroundColor: 'rgba(201,75,44,0.08)', fill: true, tension: 0.35 }],
    },
    options: lineOpts(CHART_C.accent),
  });

  safeChart('chartIngresos', {
    type: 'line',
    data: {
      labels: iData.labels,
      datasets: [{ data: iData.data, borderColor: CHART_C.blue, backgroundColor: 'rgba(91,141,184,0.08)', fill: true, tension: 0.35 }],
    },
    options: lineOpts(CHART_C.blue),
  });
}

// ══ TICKETS / CHAT ══════════════════════════════════════════════════════════

let adminTicketPolling = null;
let adminTicketActual  = null;

async function adminTabTickets(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  adminTicketActual = null;
  await adminCargarListaTickets(content);
  startAdminTicketPolling(content);
}

async function adminCargarListaTickets(content) {
  const h = { Authorization: `Bearer ${token}` };
  try {
    const [tickets] = await Promise.all([
      fetch(`${API}/tickets`, { headers: h }).then(r => r.json())
    ]);

    const abiertos  = tickets.filter(t => t.estado === 'abierto').length;
    const noLeidos  = tickets.reduce((s, t) => s + (t.no_leidos || 0), 0);
    updateAdminBadge(noLeidos);

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div class="admin-form-title" style="margin:0">MESSAGGI (${abiertos} aperti)</div>
      </div>
      ${!tickets.length ? '<div class="empty-state"><div class="ei"><iconify-icon icon="mdi:chat-outline" width="36"></iconify-icon></div><h3>NESSUN TICKET</h3></div>' : `
      <table>
        <thead><tr><th>Cliente</th><th>Oggetto</th><th>Ultimo messaggio</th><th>Stato</th><th>Data</th><th></th></tr></thead>
        <tbody>${tickets.map(t => `
          <tr style="${t.no_leidos > 0 ? 'background:rgba(193,127,58,.06)' : ''}">
            <td>
              <strong>${t.Usuario?.nombre || '—'}</strong>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${t.Usuario?.email || ''}</div>
            </td>
            <td>
              <strong>${t.asunto}</strong>
              ${t.no_leidos > 0 ? `<span class="chat-unread-count" style="margin-left:6px">${t.no_leidos}</span>` : ''}
            </td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${t.ultimo_mensaje || '—'}</td>
            <td><span class="pill ${t.estado === 'abierto' ? 'green' : ''}">${t.estado.toUpperCase()}</span></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${new Date(t.updatedAt).toLocaleDateString('it-IT')}</td>
            <td><button class="action-btn" onclick="adminAbrirTicket(${t.id},'${t.asunto.replace(/'/g,"\\'")}')">APRI</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`}`;
  } catch { content.innerHTML = '<div class="msg err">Errore caricamento</div>'; }
}

async function adminAbrirTicket(id, asunto) {
  adminTicketActual = id;
  stopAdminTicketPolling();
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  await adminCargarConversacion(id, asunto, content);
  adminTicketActual = id;
  adminTicketPolling = setInterval(() => adminCargarConversacion(id, asunto, content), 4000);
}

async function adminCargarConversacion(id, asunto, content) {
  const h = { Authorization: `Bearer ${token}` };
  try {
    const r = await fetch(`${API}/tickets/${id}/mensajes`, { headers: h });
    const data = await r.json();
    const ticket = data.ticket;
    const mensajes = data.mensajes;
    updateAdminBadge(0); // reset badge (se recalcula en el próximo poll global)

    const el = document.getElementById('adminConvMessages');
    const prevBottom = el ? el.scrollHeight - el.scrollTop : null;

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <button class="action-btn" onclick="stopAdminTicketPolling();adminTabTickets(document.getElementById('adminContent'))">← Indietro</button>
        <div class="admin-form-title" style="margin:0;flex:1">${asunto}</div>
        <span class="pill ${ticket.estado === 'abierto' ? 'green' : ''}">${ticket.estado.toUpperCase()}</span>
        ${ticket.estado === 'abierto'
          ? `<button class="action-btn danger" onclick="adminCambiarEstado(${id},'cerrado','${asunto.replace(/'/g,"\\'")}')">CHIUDI</button>`
          : `<button class="action-btn" style="border-color:var(--green);color:var(--green)" onclick="adminCambiarEstado(${id},'abierto','${asunto.replace(/'/g,"\\'")}')">RIAPRI</button>`}
      </div>
      <div id="adminConvMessages" style="height:340px;overflow-y:auto;border:1px solid var(--border);padding:14px;display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        ${mensajes.map(m => `
          <div class="chat-msg ${m.remitente === 'admin' ? 'mine' : 'theirs'}">
            ${m.remitente === 'cliente' ? `<div class="chat-msg-sender" style="color:var(--muted)">${ticket.Usuario?.nombre || 'CLIENTE'}</div>` : `<div class="chat-msg-sender">TU (ADMIN)</div>`}
            <div class="chat-msg-bubble">${escapeAdminHtml(m.texto)}</div>
            <div class="chat-msg-time">${adminFormatTime(m.createdAt)}</div>
          </div>`).join('')}
      </div>
      ${ticket.estado === 'abierto' ? `
      <div style="display:flex;gap:8px">
        <textarea id="adminReplyInput" placeholder="Scrivi una risposta... (Ctrl+Enter per inviare)" style="flex:1;height:60px;background:var(--bg);border:1px solid var(--border);padding:10px 12px;font-family:'DM Mono',monospace;font-size:11px;resize:none;outline:none;color:var(--text)" onkeydown="if(event.ctrlKey&&event.key==='Enter')adminEnviarRespuesta(${id},'${asunto.replace(/'/g,"\\'")}')"></textarea>
        <button class="btn-submit" style="height:auto;padding:0 20px" onclick="adminEnviarRespuesta(${id},'${asunto.replace(/'/g,"\\'")}')">INVIA</button>
      </div>` : '<div class="msg" style="font-family:DM Mono;font-size:9px;letter-spacing:1px;color:var(--muted);padding:10px;border:1px solid var(--border)">TICKET CHIUSO — riapri per rispondere</div>'}`;

    const msgEl = document.getElementById('adminConvMessages');
    if (msgEl) msgEl.scrollTop = msgEl.scrollHeight;
  } catch {}
}

async function adminEnviarRespuesta(id, asunto) {
  const input = document.getElementById('adminReplyInput');
  const texto = input?.value.trim();
  if (!texto) return;
  try {
    const r = await fetch(`${API}/tickets/${id}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ texto })
    });
    if (!r.ok) throw new Error();
    input.value = '';
    await adminCargarConversacion(id, asunto, document.getElementById('adminContent'));
  } catch { alert('Errore invio'); }
}

async function adminCambiarEstado(id, estado, asunto) {
  try {
    await fetch(`${API}/tickets/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado })
    });
    await adminCargarConversacion(id, asunto, document.getElementById('adminContent'));
  } catch {}
}

function stopAdminTicketPolling() {
  if (adminTicketPolling) { clearInterval(adminTicketPolling); adminTicketPolling = null; }
}

function startAdminTicketPolling(content) {
  stopAdminTicketPolling();
  adminTicketPolling = setInterval(() => {
    if (!adminTicketActual) adminCargarListaTickets(content);
  }, 8000);
}

function updateAdminBadge(count) {
  const badge = document.getElementById('adminTicketsBadge');
  if (!badge) return;
  badge.textContent = count || '';
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

async function checkAdminUnread() {
  if (!token) return;
  try {
    const r = await fetch(`${API}/tickets/admin/unread`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    updateAdminBadge(data.count);
  } catch {}
}

function escapeAdminHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function adminFormatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' }) + ' ' +
         d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
}

async function moderarResena(id, verificado) {
  try {
    const r = await fetch(`${API}/resenas/${id}/verificar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ verificado })
    });
    if (!r.ok) throw new Error('Errore');
    adminTabResenas(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}
