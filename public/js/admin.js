async function caricaCategorie() {
  try {
    const r = await fetch(`${API}/categorias`);
    categorie = await r.json();
    if (typeof renderCategorie === 'function') renderCategorie();
  } catch {}
}

async function adminTab(tab, el) {
  fermaPollingTicketAdmin();
  document.querySelectorAll('.admin-menu-item').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
  const content = document.getElementById('adminContent');

  if (tab === 'ordenes') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const r = await fetch(`${API}/ordenes`, { headers: { Authorization: `Bearer ${token}` } });
      const lista = await r.json();
      if (!lista.length) { content.innerHTML = '<div class="empty-state"><div class="ei">📋</div><h3>NESSUN ORDINE</h3></div>'; return; }

      const daSpedire  = lista.filter(o => o.estado === 'confirmado');
      const inTransito = lista.filter(o => o.estado === 'enviado');
      const altri      = lista.filter(o => !['confirmado','enviado'].includes(o.estado));

      function scheda(o) {
        const prodotti = o.detalles?.map(d =>
          `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:11px">
            <span>${d.Prodotto?.nombre || 'Prodotto'}${d.variante ? ` <span style="color:var(--muted);font-size:9px">(${d.variante})</span>` : ''}</span>
            <span style="font-family:'DM Mono',monospace;font-size:10px">× ${d.cantidad}</span>
          </div>`).join('') || '—';

        const trackingBlock = o.tracking_number
          ? `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(34,197,94,.06);border:1px solid var(--green);margin-top:10px">
              <iconify-icon icon="mdi:truck-check-outline" width="18" style="color:var(--green)"></iconify-icon>
              <div>
                <div style="font-family:'DM Mono',monospace;font-size:8px;letter-spacing:2px;color:var(--muted)">${o.carrier || 'TRACKING'}</div>
                <div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:700;letter-spacing:2px">${o.tracking_number}</div>
              </div>
              ${o.label_url ? `<a href="${o.label_url}" target="_blank" class="action-btn" style="margin-left:auto;text-decoration:none;border-color:var(--green);color:var(--green)">📄 PDF</a>` : ''}
            </div>`
          : `<div style="padding:8px 12px;background:var(--surface2);border:1px dashed var(--border);margin-top:10px;font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">
              <iconify-icon icon="mdi:clock-outline" width="12" style="vertical-align:middle;margin-right:4px"></iconify-icon>
              Etichetta non generata —
              <button class="action-btn" style="padding:2px 8px;font-size:9px" onclick="adminApriSpedizione(${o.id})">SHIPPO</button>
              <button class="action-btn" style="padding:2px 8px;font-size:9px;border-color:var(--accent);color:var(--accent)" onclick="adminInserisciTracking(${o.id})">+ TRACKING MANUALE</button>
            </div>`;

        const statoColor = { confirmado:'var(--accent)', enviado:'var(--green)', entregado:'var(--green)', cancelado:'var(--red)', pendiente:'var(--muted)' };

        return `<div style="border:1px solid var(--border);margin-bottom:12px;background:var(--surface)">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--surface2);border-bottom:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:900;color:var(--accent)">#${o.id}</span>
              <span style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700">${o.nombre_cliente}</span>
              <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${new Date(o.createdAt).toLocaleDateString('it-IT')}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:900">€${parseFloat(o.total).toFixed(2)}</span>
              <select class="estado-select" onchange="aggiornaStato(${o.id}, this.value)" style="border-color:${statoColor[o.estado]}">
                ${['pendiente','confirmado','enviado','entregado','cancelado'].map(e =>
                  `<option value="${e}" ${o.estado===e?'selected':''}>${e.toUpperCase()}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="padding:12px 16px">
            ${o.direccion ? `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);margin-bottom:8px">📍 ${o.direccion}</div>` : ''}
            ${prodotti}
            ${o.notas ? `<div style="margin-top:6px;font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">📝 ${o.notas}</div>` : ''}
            ${trackingBlock}
          </div>
        </div>`;
      }

      content.innerHTML = `
        ${daSpedire.length ? `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div class="admin-form-title" style="margin:0">DA SPEDIRE</div>
            <span class="pill orange">${daSpedire.length}</span>
          </div>
          ${daSpedire.map(scheda).join('')}` : ''}

        ${inTransito.length ? `
          <div style="display:flex;align-items:center;gap:10px;margin:20px 0 14px">
            <div class="admin-form-title" style="margin:0">IN TRANSITO</div>
            <span class="pill green">${inTransito.length}</span>
          </div>
          ${inTransito.map(scheda).join('')}` : ''}

        ${altri.length ? `
          <details style="margin-top:20px">
            <summary style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--muted);cursor:pointer;padding:8px 0">
              ALTRI ORDINI (${altri.length})
            </summary>
            <table style="margin-top:10px"><thead><tr><th>ID</th><th>Cliente</th><th>Totale</th><th>Stato</th><th>Data</th></tr></thead>
            <tbody>${altri.map(o => `
              <tr>
                <td><span class="pill">#${o.id}</span></td>
                <td>${o.nombre_cliente}</td>
                <td class="price-cell">€${parseFloat(o.total).toFixed(2)}</td>
                <td><span class="pill ${o.estado==='entregado'?'green':o.estado==='cancelado'?'orange':''}">${o.estado.toUpperCase()}</span></td>
                <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${new Date(o.createdAt).toLocaleDateString('it-IT')}</td>
              </tr>`).join('')}
            </tbody></table>
          </details>` : ''}`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }

  if (tab === 'productos') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const r = await fetch(`${API}/productos/admin/todos`, { headers: { Authorization: `Bearer ${token}` } });
      const lista = await r.json();
      const attivi = lista.filter(p => p.activo).length;
      content.innerHTML = `
        <div class="admin-form-title">PRODOTTI (${attivi} attivi · ${lista.length - attivi} inattivi)</div>
        <table><thead><tr><th>ID</th><th>Nome</th><th>Prezzo</th><th>Stock</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>
        ${lista.map(p => `
          <tr>
            <td><span class="pill">#${p.id}</span></td>
            <td><strong>${p.nombre}</strong></td>
            <td class="price-cell">€${parseFloat(p.precio).toFixed(2)}</td>
            <td>${p.stock}</td>
            <td><span class="pill ${p.activo ? 'green' : 'orange'}">${p.activo ? 'ATTIVO' : 'INATTIVO'}</span></td>
            <td>
              <button class="action-btn" onclick="adminGestisciProdotto(${p.id})">GESTISCI</button>
              ${p.activo
                ? `<button class="action-btn" onclick="alternaAttivoProdotto(${p.id}, false)">DISATTIVA</button>`
                : `<button class="action-btn" style="border-color:var(--green);color:var(--green)" onclick="alternaAttivoProdotto(${p.id}, true)">ATTIVA</button>`
              }
              <button class="action-btn danger" onclick="eliminaProdotto(${p.id})">ELIMINA</button>
            </td>
          </tr>`).join('')}
        </tbody></table>`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }

  if (tab === 'nuevo') {
    await caricaCategorie();
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
            ${categorie.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field">
        <label>Immagine principale</label>
        <div class="img-preview-wrap" id="imgWrap"><img id="imgPreview" src=""/></div>
        <input type="file" id="pImagen" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="anteprimaImmagine(this)"/>
        <button type="button" class="add-file-btn" onclick="document.getElementById('pImagen').click()">📁 SELEZIONA IMMAGINE</button>
        <div class="img-label" id="imgLabel"></div>
      </div>
      <div style="padding:12px;border:1px solid var(--border);margin-bottom:16px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:10px">OPZIONI AVANZATE</div>
        <div class="field" style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <input type="checkbox" id="pRichiedeFoto" style="width:auto;margin:0"/>
          <label for="pRichiedeFoto" style="margin:0;letter-spacing:1px;cursor:pointer;font-family:'DM Mono',monospace;font-size:11px">
            <iconify-icon icon="mdi:camera-outline" width="13" style="vertical-align:middle;margin-right:4px"></iconify-icon>
            Richiede foto dal cliente
          </label>
        </div>
        <div class="field" style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <input type="checkbox" id="pSelettoreData" style="width:auto;margin:0"
            onchange="document.getElementById('pDataFields').style.display=this.checked?'':'none'"/>
          <label for="pSelettoreData" style="margin:0;letter-spacing:1px;cursor:pointer;font-family:'DM Mono',monospace;font-size:11px">
            <iconify-icon icon="mdi:calendar-clock" width="13" style="vertical-align:middle;margin-right:4px"></iconify-icon>
            Selettore data di consegna
          </label>
        </div>
        <div id="pDataFields" style="display:none;padding:10px;background:var(--surface2)">
          <div class="form-row" style="gap:8px">
            <div class="field" style="margin:0"><label style="font-size:9px">Giorni produzione</label><input id="pGiorniProd" type="number" min="1" value="7"/></div>
            <div class="field" style="margin:0"><label style="font-size:9px">Giorni spedizione</label><input id="pGiorniSpediz" type="number" min="1" value="3"/></div>
            <div class="field" style="margin:0"><label style="font-size:9px">Extra/giorno express (€)</label><input id="pPrezzoGiorno" type="number" step="0.01" min="0" value="0"/></div>
          </div>
        </div>
      </div>
      <button class="btn-submit" onclick="creaProdottoAdmin()">CREA PRODOTTO</button>
      <div id="productoMsg"></div>`;
  }

  if (tab === 'categorias') {
    await caricaCategorie();
    content.innerHTML = `
      <div class="admin-form-title">CATEGORIE</div>
      <table style="margin-bottom:24px">
        <thead><tr><th>ID</th><th>Nome</th><th>Descrizione</th></tr></thead>
        <tbody>${categorie.map(c => `
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
      <button class="btn-submit" onclick="creaCategoriaAdmin()">CREA CATEGORIA</button>
      <div id="categoriaMsg"></div>`;
  }

  if (tab === 'clientes') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const r = await fetch(`${API}/ordenes`, { headers: { Authorization: `Bearer ${token}` } });
      const ordini = await r.json();
      const map = {};
      ordini.forEach(o => {
        if (!map[o.email_cliente]) map[o.email_cliente] = { nombre: o.nombre_cliente, email: o.email_cliente, ordini: 0, totale: 0 };
        map[o.email_cliente].ordini++;
        map[o.email_cliente].totale += parseFloat(o.total);
      });
      const clienti = Object.values(map);
      if (!clienti.length) { content.innerHTML = '<div class="empty-state"><div class="ei">👥</div><h3>NESSUN CLIENTE</h3></div>'; return; }
      content.innerHTML = `
        <div class="admin-form-title">CLIENTI (${clienti.length})</div>
        <table><thead><tr><th>Nome</th><th>Email</th><th>Ordini</th><th>Totale</th></tr></thead>
        <tbody>${clienti.map(c => `
          <tr>
            <td><strong>${c.nombre}</strong></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${c.email}</td>
            <td><span class="pill">${c.ordini}</span></td>
            <td class="price-cell">€${c.totale.toFixed(2)}</td>
          </tr>`).join('')}
        </tbody></table>`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }

  if (tab === 'resenas') {
    await adminTabRecensioni(content);
    return;
  }

  if (tab === 'analytics') {
    await adminTabAnalitiche(content);
    return;
  }

  if (tab === 'tickets') {
    await adminTabTicket(content);
    return;
  }

  if (tab === 'benchys') {
    await adminTabBenchys(content);
    return;
  }

  if (tab === 'tariffe_spedizione') {
    await adminTabTariffeSpedizione(content);
    return;
  }

  if (tab === 'blog') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const rA = await fetch(`${API}/articoli/admin/all`, { headers: { Authorization: `Bearer ${token}` } });
      const lista = await rA.json();
      const pub   = lista.filter(a => a.pubblicato).length;

      content.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <div class="admin-form-title" style="margin:0">BLOG (${pub} pubblicati · ${lista.length - pub} bozze)</div>
          <button class="btn-submit" onclick="adminNuovoArticolo()">+ NUOVO ARTICOLO</button>
        </div>
        <table><thead><tr><th>Titolo</th><th>Slug</th><th>Stato</th><th>Data</th><th>Azioni</th></tr></thead>
        <tbody>${lista.map(a => `
          <tr>
            <td><strong>${a.titolo}</strong></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">/blog/${a.slug}</td>
            <td><span class="pill ${a.pubblicato ? 'green' : ''}">${a.pubblicato ? 'PUBBLICATO' : 'BOZZA'}</span></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${new Date(a.createdAt).toLocaleDateString('it-IT')}</td>
            <td>
              <button class="action-btn" onclick="adminModificaArticolo(${a.id})">MODIFICA</button>
              <button class="action-btn ${a.pubblicato ? 'danger' : ''}" onclick="alternaArticolo(${a.id})">${a.pubblicato ? 'BOZZA' : 'PUBBLICA'}</button>
            </td>
          </tr>`).join('')}
        </tbody></table>
        <div id="blogFormWrap" style="margin-top:32px"></div>`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }
}

// ── Quill editor blog ────────────────────────────────────────────────────────
let _quillBlog = null;

function initQuillBlog(containerId, html = '') {
  setTimeout(() => {
    _quillBlog = new Quill(`#${containerId}`, {
      theme: 'snow',
      modules: {
        toolbar: {
          container: [
            ['bold','italic','underline','strike'],
            ['blockquote','code-block'],
            [{ header: [1,2,3,false] }],
            [{ list:'ordered' },{ list:'bullet' }],
            [{ color:[] },{ background:[] }],
            ['link','image','video'],
            ['clean']
          ],
          handlers: { image: quillBlogUploadImmagine }
        }
      }
    });
    if (html) _quillBlog.root.innerHTML = html;
  }, 0);
}

async function quillBlogUploadImmagine() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*'; input.click();
  input.onchange = async () => {
    const file = input.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('image', file);
    try {
      const r = await fetch(`${API}/articoli/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await r.json();
      if (data.url) {
        const range = _quillBlog.getSelection() || { index: _quillBlog.getLength() };
        _quillBlog.insertEmbed(range.index, 'image', data.url);
      }
    } catch { alert('Errore upload immagine'); }
  };
}

function adminNuovoArticolo() {
  const wrap = document.getElementById('blogFormWrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="admin-form-title" style="font-size:19px;margin-bottom:16px">NUOVO ARTICOLO</div>
    <div class="field"><label>Titolo *</label><input id="aTitolo" type="text" placeholder="Come stampare in 3D..."/></div>
    <div class="field"><label>Estratto</label><textarea id="aEstratto" placeholder="Breve descrizione..."></textarea></div>
    <div class="field">
      <label>Contenuto * <span style="font-size:9px;color:var(--muted);letter-spacing:1px">— usa la toolbar per immagini e video</span></label>
      <div id="aContenutoEditor" style="min-height:280px;background:var(--bg);border:1px solid var(--border)"></div>
    </div>
    <div class="field">
      <label>Meta descrizione (<span id="metaCount">0</span>/160)</label>
      <input id="aMetaDesc" type="text" maxlength="160" placeholder="Descrizione per i motori di ricerca..."
        oninput="document.getElementById('metaCount').textContent=this.value.length"/>
    </div>
    <div class="field"><label>Tags (separati da virgola)</label><input id="aTags" type="text" placeholder="stampa3d,figure,anime"/></div>
    <div class="field">
      <label>Immagine di copertina</label>
      <div class="img-preview-wrap" id="aImgWrap"><img id="aImgPreview" src=""/></div>
      <input type="file" id="aImagen" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="anteprimaImmagineBlog(this)"/>
      <button type="button" class="add-file-btn" onclick="document.getElementById('aImagen').click()">📁 SELEZIONA COPERTINA</button>
    </div>
    <div class="field" style="display:flex;align-items:center;gap:10px;margin-bottom:0">
      <input type="checkbox" id="aPubblica" style="width:auto"/>
      <label style="margin:0;letter-spacing:1px">Pubblica subito</label>
    </div>
    <button class="btn-submit" style="margin-top:16px" onclick="creaArticoloAdmin()">CREA ARTICOLO</button>
    <div id="articoloMsg"></div>`;
  initQuillBlog('aContenutoEditor');
}

async function adminModificaArticolo(id) {
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/articoli/admin/all`, { headers: { Authorization: `Bearer ${token}` } });
    const lista = await r.json();
    const a = lista.find(x => x.id === id);
    if (!a) throw new Error('Non trovato');

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <button class="action-btn" onclick="adminTab('blog',null)">← INDIETRO</button>
        <div class="admin-form-title" style="margin:0;flex:1">MODIFICA: ${a.titolo}</div>
        <a href="/blog/${a.slug}" target="_blank" class="action-btn" style="text-decoration:none">🔗 ANTEPRIMA</a>
      </div>
      <div class="field"><label>Titolo *</label><input id="eTitolo" type="text" value="${a.titolo.replace(/"/g,'&quot;')}"/></div>
      <div class="field"><label>Estratto</label><textarea id="eEstratto">${a.estratto || ''}</textarea></div>
      <div class="field">
        <label>Contenuto * <span style="font-size:9px;color:var(--muted);letter-spacing:1px">— usa la toolbar per immagini e video</span></label>
        <div id="eContenutoEditor" style="min-height:280px;background:var(--bg);border:1px solid var(--border)"></div>
      </div>
      <div class="field">
        <label>Meta descrizione (<span id="metaCountE">${(a.meta_desc||'').length}</span>/160)</label>
        <input id="eMetaDesc" type="text" maxlength="160" value="${(a.meta_desc||'').replace(/"/g,'&quot;')}"
          oninput="document.getElementById('metaCountE').textContent=this.value.length"/>
      </div>
      <div class="field"><label>Tags</label><input id="eTags" type="text" value="${(a.tags||'').replace(/"/g,'&quot;')}"/></div>
      <div class="field" style="display:flex;align-items:center;gap:10px;margin-bottom:0">
        <input type="checkbox" id="ePubblica" style="width:auto" ${a.pubblicato ? 'checked' : ''}/>
        <label style="margin:0;letter-spacing:1px">Pubblicato</label>
      </div>
      <button class="btn-submit" style="margin-top:16px" onclick="salvaArticoloAdmin(${a.id})">SALVA MODIFICHE</button>
      <div id="articoloMsg"></div>`;

    initQuillBlog('eContenutoEditor', a.contenuto || '');
  } catch { content.innerHTML = '<div class="msg err">Errore caricamento articolo</div>'; }
}

async function creaArticoloAdmin() {
  const titolo    = document.getElementById('aTitolo').value.trim();
  const contenuto = _quillBlog ? _quillBlog.root.innerHTML.trim() : '';
  if (!titolo || !contenuto || contenuto === '<p><br></p>') {
    showMsg('articoloMsg', 'Titolo e contenuto obbligatori', 'err'); return;
  }
  const body = {
    titolo,
    estratto:   document.getElementById('aEstratto').value,
    contenuto,
    meta_desc:  document.getElementById('aMetaDesc').value,
    tags:       document.getElementById('aTags').value,
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

async function salvaArticoloAdmin(id) {
  const body = {
    titolo:     document.getElementById('eTitolo').value.trim(),
    estratto:   document.getElementById('eEstratto').value,
    contenuto:  _quillBlog ? _quillBlog.root.innerHTML.trim() : '',
    meta_desc:  document.getElementById('eMetaDesc').value,
    tags:       document.getElementById('eTags').value,
    pubblicato: document.getElementById('ePubblica').checked,
  };
  if (!body.titolo || !body.contenuto || body.contenuto === '<p><br></p>') {
    showMsg('articoloMsg', 'Titolo e contenuto obbligatori', 'err'); return;
  }
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

async function alternaArticolo(id, pubblicato) {
  try {
    const r = await fetch(`${API}/articoli/${id}/publish`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) throw new Error('Errore');
    adminTab('blog', null);
  } catch(e) { alert('Errore: ' + e.message); }
}

function anteprimaImmagineBlog(input) {
  const file = input.files[0];
  if (!file) return;
  const rd = new FileReader();
  rd.onload = e => {
    document.getElementById('aImgPreview').src = e.target.result;
    document.getElementById('aImgWrap').style.display = 'block';
  };
  rd.readAsDataURL(file);
}

async function adminGestisciProdotto(id) {
  document.querySelectorAll('.admin-menu-item').forEach(x => x.classList.remove('active'));
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  await caricaCategorie();
  try {
    const r = await fetch(`${API}/productos/admin/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const p = await r.json();
    if (!r.ok) throw new Error(p.error || 'Errore caricamento');
    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <button class="action-btn" onclick="adminTab('productos', null)">← INDIETRO</button>
        <div class="admin-form-title" style="margin:0">MODIFICA: ${p.nombre}</div>
        <button class="btn-submit" style="margin:0;margin-left:auto" onclick="salvaTuttoProdotto(${p.id})">SALVA MODIFICHE</button>
      </div>
      <div id="prodottoMsg" style="margin-bottom:12px"></div>

      <div style="margin-bottom:20px;padding:16px;border:1px solid var(--border)">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;color:var(--dark)">INFORMAZIONI</div>
        <div class="form-row">
          <div class="field" style="flex:2"><label>Nome *</label><input id="editNombre" value="${p.nombre.replace(/"/g,'&quot;')}"/></div>
          <div class="field"><label>Prezzo (€) *</label><input id="editPrecio" type="number" step="0.01" value="${parseFloat(p.precio).toFixed(2)}"/></div>
        </div>
        <div class="field"><label>Descrizione</label><textarea id="editDescripcion">${p.descripcion || ''}</textarea></div>
        <div class="form-row">
          <div class="field"><label>Stock</label><input id="editStock" type="number" min="0" value="${p.stock}"/></div>
          <div class="field"><label>Categoria</label>
            <select id="editCategoria">
              <option value="">Senza categoria</option>
              ${categorie.map(c => `<option value="${c.id}" ${p.categoria_id == c.id ? 'selected' : ''}>${c.nombre}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="display:flex;align-items:center;gap:8px;padding-top:22px">
            <input type="checkbox" id="editActivo" style="width:auto;margin:0" ${p.activo ? 'checked' : ''}/>
            <label for="editActivo" style="margin:0;cursor:pointer;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px">Prodotto attivo</label>
          </div>
        </div>
      </div>

      <div style="margin-bottom:20px;padding:16px;border:1px solid var(--border)">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;color:var(--dark)">OPZIONI</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <input type="checkbox" id="editRichiedeFoto" style="width:auto;margin:0" ${p.richiede_foto ? 'checked' : ''}/>
          <label for="editRichiedeFoto" style="margin:0;letter-spacing:1px;cursor:pointer;font-family:'DM Mono',monospace;font-size:11px">
            <iconify-icon icon="mdi:camera-outline" width="13" style="vertical-align:middle;margin-right:4px"></iconify-icon>
            Richiede foto dal cliente
          </label>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
          <input type="checkbox" id="editSelettoreData" style="width:auto;margin:0" ${p.selettore_data ? 'checked' : ''}
            onchange="document.getElementById('editDataFields').style.display=this.checked?'':'none'"/>
          <label for="editSelettoreData" style="margin:0;letter-spacing:1px;cursor:pointer;font-family:'DM Mono',monospace;font-size:11px">
            <iconify-icon icon="mdi:calendar-clock" width="13" style="vertical-align:middle;margin-right:4px"></iconify-icon>
            Selettore data di consegna
          </label>
        </div>
        <div id="editDataFields" style="display:${p.selettore_data ? '' : 'none'};padding:12px;background:var(--surface2)">
          <div class="form-row" style="gap:8px">
            <div class="field" style="margin:0"><label style="font-size:9px">Giorni produzione</label><input id="editGiorniProd" type="number" min="1" value="${p.giorni_produzione || 7}"/></div>
            <div class="field" style="margin:0"><label style="font-size:9px">Giorni spedizione</label><input id="editGiorniSpediz" type="number" min="1" value="${p.giorni_spedizione || 3}"/></div>
            <div class="field" style="margin:0"><label style="font-size:9px">Extra/giorno express (€)</label><input id="editPrezzoGiorno" type="number" step="0.01" min="0" value="${parseFloat(p.prezzo_per_giorno_express || 0).toFixed(2)}"/></div>
          </div>
        </div>
      </div>

      <button class="btn-submit" style="margin-bottom:28px;width:100%" onclick="salvaTuttoProdotto(${p.id})">SALVA MODIFICHE</button>

      <div style="margin-bottom:28px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:19px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;color:var(--dark)">VARIANTI</div>
        <div id="variantesWrap">
          ${p.variantes && p.variantes.length
            ? p.variantes.map(v => `
                <span class="variante-tag">
                  <span style="color:var(--muted);font-size:9px">${v.tipo.toUpperCase()}:</span>
                  ${v.valor}${v.precio_extra > 0 ? `<span style="color:var(--accent)">+€${parseFloat(v.precio_extra).toFixed(2)}</span>` : ''} · stock:${v.stock}
                  <button onclick="eliminaVariante(${v.id})">✕</button>
                </span>`).join('')
            : `<span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">Nessuna variante</span>`}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 80px 100px auto;gap:8px;margin-top:12px;align-items:end">
          <div class="field" style="margin:0"><label>Tipo</label><input id="vTipo" placeholder="colore / taglia"/></div>
          <div class="field" style="margin:0"><label>Valore</label><input id="vValor" placeholder="Rosso / XL"/></div>
          <div class="field" style="margin:0"><label>Stock</label><input id="vStock" type="number" placeholder="5"/></div>
          <div class="field" style="margin:0"><label>+Prezzo€</label><input id="vExtra" type="number" step="0.01" placeholder="0"/></div>
          <button class="btn-submit" style="margin:0;height:43px" onclick="aggiungiVariante(${p.id})">+</button>
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
                  <button onclick="eliminaImmagine(${img.id})" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);border:none;color:#fff;width:20px;height:20px;cursor:pointer;font-size:11px">✕</button>
                </div>`).join('')
            : `<span style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">Nessuna immagine aggiuntiva</span>`}
        </div>
        <input type="file" id="nuevaImagen" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="caricaImmagineProdotto(${p.id}, this)"/>
        <button class="add-file-btn" style="width:200px" onclick="document.getElementById('nuevaImagen').click()">📁 AGGIUNGI IMMAGINE</button>
        <div id="imagenMsg"></div>
      </div>`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

async function salvaTuttoProdotto(id) {
  const nome = document.getElementById('editNombre')?.value.trim();
  const prezzo = parseFloat(document.getElementById('editPrecio')?.value || 0);
  if (!nome) { showMsg('prodottoMsg', 'Il nome è obbligatorio', 'err'); return; }
  if (!prezzo || prezzo <= 0) { showMsg('prodottoMsg', 'Il prezzo deve essere > 0', 'err'); return; }

  showMsg('prodottoMsg', '...', '');
  try {
    const corpo = {
      nombre:                    nome,
      precio:                    prezzo,
      descripcion:               document.getElementById('editDescripcion')?.value.trim() || null,
      stock:                     parseInt(document.getElementById('editStock')?.value || 0),
      categoria_id:              document.getElementById('editCategoria')?.value || null,
      activo:                    document.getElementById('editActivo')?.checked ?? true,
      richiede_foto:             document.getElementById('editRichiedeFoto')?.checked  ?? false,
      selettore_data:            document.getElementById('editSelettoreData')?.checked ?? false,
      giorni_produzione:         parseInt(document.getElementById('editGiorniProd')?.value  || 7),
      giorni_spedizione:         parseInt(document.getElementById('editGiorniSpediz')?.value || 3),
      prezzo_per_giorno_express: parseFloat(document.getElementById('editPrezzoGiorno')?.value || 0),
    };
    const r = await fetch(`${API}/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(corpo)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    showMsg('prodottoMsg', '✓ Salvato', 'ok');
    if (typeof caricaProdotti === 'function') caricaProdotti();
    setTimeout(() => { const m = document.getElementById('prodottoMsg'); if (m) m.textContent = ''; }, 3000);
  } catch(e) { showMsg('prodottoMsg', '✗ ' + e.message, 'err'); }
}

async function aggiungiVariante(prodottoId) {
  const tipo  = document.getElementById('vTipo').value.trim();
  const valore = document.getElementById('vValor').value.trim();
  const stock = document.getElementById('vStock').value || 0;
  const extra = document.getElementById('vExtra').value || 0;
  if (!tipo || !valore) { showMsg('varianteMsg', 'Tipo e valore obbligatori', 'err'); return; }
  try {
    const r = await fetch(`${API}/productos/${prodottoId}/variantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo, valor: valore, stock: parseInt(stock), precio_extra: parseFloat(extra) })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('varianteMsg', '✓ Variante aggiunta', 'ok');
    ['vTipo', 'vValor', 'vStock', 'vExtra'].forEach(id => document.getElementById(id).value = '');
    adminGestisciProdotto(prodottoId);
  } catch(e) { showMsg('varianteMsg', e.message, 'err'); }
}

async function eliminaVariante(id) {
  if (!confirm('Eliminare variante?')) return;
  await fetch(`${API}/productos/variantes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  location.reload();
}

async function caricaImmagineProdotto(prodottoId, input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('imagen', file);
  try {
    const r = await fetch(`${API}/productos/${prodottoId}/imagenes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('imagenMsg', '✓ Immagine aggiunta', 'ok');
    adminGestisciProdotto(prodottoId);
  } catch(e) { showMsg('imagenMsg', e.message, 'err'); }
}

async function eliminaImmagine(id) {
  if (!confirm('Eliminare immagine?')) return;
  await fetch(`${API}/productos/imagenes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  location.reload();
}

async function creaProdottoAdmin() {
  const nome  = document.getElementById('pNombre').value;
  const prezzo = document.getElementById('pPrecio').value;
  if (!nome || !prezzo) { showMsg('productoMsg', 'Nome e prezzo obbligatori', 'err'); return; }
  try {
    const r = await fetch(`${API}/productos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nombre:                    nome,
        precio:                    parseFloat(prezzo),
        descripcion:               document.getElementById('pDesc').value,
        stock:                     parseInt(document.getElementById('pStock').value || 0),
        categoria_id:              document.getElementById('pCat').value || null,
        richiede_foto:             document.getElementById('pRichiedeFoto').checked,
        selettore_data:            document.getElementById('pSelettoreData').checked,
        giorni_produzione:         parseInt(document.getElementById('pGiorniProd')?.value  || 7),
        giorni_spedizione:         parseInt(document.getElementById('pGiorniSpediz')?.value || 3),
        prezzo_per_giorno_express: parseFloat(document.getElementById('pPrezzoGiorno')?.value || 0),
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
    if (typeof caricaProdotti === 'function') caricaProdotti();
    adminGestisciProdotto(data.producto.id);
  } catch(e) { showMsg('productoMsg', e.message, 'err'); }
}

async function creaCategoriaAdmin() {
  const nome = document.getElementById('cNombre').value;
  if (!nome) { showMsg('categoriaMsg', 'Il nome è obbligatorio', 'err'); return; }
  try {
    const r = await fetch(`${API}/categorias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nombre: nome, descripcion: document.getElementById('cDesc').value })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('categoriaMsg', `✓ "${data.cat.nombre}" creata`, 'ok');
    await caricaCategorie();
    adminTab('categorias', null);
  } catch(e) { showMsg('categoriaMsg', e.message, 'err'); }
}

async function alternaAttivoProdotto(id, attivare) {
  const msg = attivare ? 'Attivare questo prodotto?' : 'Disattivare questo prodotto?';
  if (!confirm(msg)) return;
  try {
    await fetch(`${API}/productos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activo: attivare })
    });
    adminTab('productos', null);
  } catch(e) { alert('Errore: ' + e.message); }
}

async function eliminaProdotto(id) {
  if (!confirm('ATTENZIONE: eliminare definitivamente questo prodotto?')) return;
  try {
    await fetch(`${API}/productos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    adminTab('productos', null);
    if (typeof caricaProdotti === 'function') caricaProdotti();
  } catch(e) { alert('Errore: ' + e.message); }
}

async function aggiornaStato(id, stato) {
  try {
    await fetch(`${API}/ordenes/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: stato })
    });
  } catch { alert('Errore'); }
}

function anteprimaImmagine(input) {
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

function alternaRiga(id) {
  const r = document.getElementById(id);
  r.style.display = r.style.display === 'none' ? 'table-row' : 'none';
}

async function adminTabRecensioni(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/resenas/admin/todas`, { headers: { Authorization: `Bearer ${token}` } });
    const lista = await r.json();
    if (!lista.length) { content.innerHTML = '<div class="empty-state"><div class="ei">⭐</div><h3>NESSUNA RECENSIONE</h3></div>'; return; }
    const inAttesa  = lista.filter(x => !x.verificado).length;
    const approvate = lista.filter(x =>  x.verificado).length;
    content.innerHTML = `
      <div class="admin-form-title">RECENSIONI (${approvate} approvate · ${inAttesa} in attesa)</div>
      <table>
        <thead><tr><th>Prodotto</th><th>Autore</th><th>Voto</th><th>Commento</th><th>Stato</th><th>Data</th><th>Azioni</th></tr></thead>
        <tbody>${lista.map(rv => `
          <tr>
            <td><strong>${rv.Prodotto ? rv.Prodotto.nombre : '—'}</strong></td>
            <td>
              <div>${rv.nombre_autor || '—'}</div>
              ${rv.Utente ? `<div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${rv.Utente.email || ''}</div>` : ''}
              ${rv.compra_verificada ? `<div style="font-family:'DM Mono',monospace;font-size:8px;color:var(--green);letter-spacing:1px">✓ ACQUISTATO</div>` : ''}
            </td>
            <td style="font-size:16px;letter-spacing:2px">${'★'.repeat(rv.puntuacion)}${'☆'.repeat(5 - rv.puntuacion)}</td>
            <td style="max-width:220px;font-size:11px;color:var(--muted)">${rv.comentario ? rv.comentario.substring(0, 100) + (rv.comentario.length > 100 ? '…' : '') : '—'}</td>
            <td><span class="pill ${rv.verificado ? 'green' : 'orange'}">${rv.verificado ? 'APPROVATA' : 'IN ATTESA'}</span></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${new Date(rv.createdAt).toLocaleDateString('it-IT')}</td>
            <td style="display:flex;gap:4px;flex-wrap:wrap">
              ${!rv.verificado
                ? `<button class="action-btn" style="border-color:var(--green);color:var(--green)" onclick="moderaRecensione(${rv.id}, true)">APPROVA</button>`
                : `<button class="action-btn" onclick="moderaRecensione(${rv.id}, false)">REVOCA</button>`}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch { content.innerHTML = '<div class="msg err">Errore caricamento</div>'; }
}

// ══ ANALITICHE ══════════════════════════════════════════════════════════════

const NOMI_PAESI = { IT:'🇮🇹 Italia', ES:'🇪🇸 Spagna', US:'🇺🇸 USA', DE:'🇩🇪 Germania', FR:'🇫🇷 Francia', GB:'🇬🇧 UK', AR:'🇦🇷 Argentina', MX:'🇲🇽 Messico', BR:'🇧🇷 Brasile', PT:'🇵🇹 Portogallo', NL:'🇳🇱 Olanda', CH:'🇨🇭 Svizzera', BE:'🇧🇪 Belgio', AU:'🇦🇺 Australia', CA:'🇨🇦 Canada' };
const COLORI_GRAFICO = { accent:'#c94b2c', light:'#e8a87c', blue:'#5b8db8', green:'#4caf50', muted:'#8b7355', border:'rgba(0,0,0,0.06)' };

let analiticheGiorni = 30;

function safeChart(id, cfg) {
  const ex = Chart.getChart(id);
  if (ex) ex.destroy();
  const el = document.getElementById(id);
  if (!el) return null;
  return new Chart(el, cfg);
}

async function adminTabAnalitiche(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO ANALYTICS</div>';
  const h = { Authorization: `Bearer ${token}` };
  try {
    const [resumen, visite, incassi, paesi, prodottiVisti, prodottiVenduti, stati] = await Promise.all([
      fetch(`${API}/analytics/resumen`,  { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/visitas?dias=${analiticheGiorni}`,  { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/ingresos?dias=${analiticheGiorni}`, { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/paises`,   { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/productos`,{ headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/vendidos`, { headers: h }).then(r => r.json()),
      fetch(`${API}/analytics/estados`,  { headers: h }).then(r => r.json()),
    ]);

    content.innerHTML = renderHTMLAnalitiche(resumen, prodottiVenduti, analiticheGiorni);
    inizializzaGrafici(visite, incassi, paesi, prodottiVisti, stati);
  } catch(e) {
    content.innerHTML = `<div class="msg err">Errore caricamento analytics: ${e.message}</div>`;
  }
}

async function cambiaPeriodoGiorni(giorni) {
  analiticheGiorni = giorni;
  document.querySelectorAll('.an-period-btn').forEach(b => b.classList.toggle('active', +b.dataset.dias === giorni));
  const h = { Authorization: `Bearer ${token}` };
  const [visite, incassi] = await Promise.all([
    fetch(`${API}/analytics/visitas?dias=${giorni}`,  { headers: h }).then(r => r.json()),
    fetch(`${API}/analytics/ingresos?dias=${giorni}`, { headers: h }).then(r => r.json()),
  ]);
  aggiornaGraficiTemporali(visite, incassi);
}

function renderHTMLAnalitiche(r, prodottiVenduti, giorni) {
  const kpi = [
    { label: 'VISITE TOTALI',    value: r.totalVisitas?.toLocaleString() || '—',  sub: `+${r.visitasSemana || 0} questa settimana` },
    { label: 'VISITE OGGI',      value: r.visitasHoy?.toLocaleString()   || '—',  sub: 'utenti unici stimati' },
    { label: 'ORDINI TOTALI',    value: r.totalOrdenes?.toLocaleString() || '—',  sub: `+${r.ordenesSemana || 0} questa settimana` },
    { label: 'FATTURATO TOTALE', value: `€${r.ingresoTotal || '0.00'}`,           sub: `€${r.ingresoSemana || '0.00'} questa settimana` },
    { label: 'CONVERSIONE',      value: `${r.conversion || 0}%`,                  sub: 'visite → ordini' },
  ];

  const tabellaVenduti = prodottiVenduti.length ? `
    <table style="margin-top:0"><thead><tr><th>#</th><th>Prodotto</th><th>Unità</th><th>Ordini</th><th>Fatturato</th></tr></thead>
    <tbody>${prodottiVenduti.map((p, i) => `
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
      ${kpi.map(k => `
        <div style="background:var(--surface);padding:20px 18px">
          <div style="font-family:'DM Mono',monospace;font-size:8px;color:var(--muted);letter-spacing:2px;margin-bottom:8px">${k.label}</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:900;color:var(--accent);line-height:1">${k.value}</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:6px">${k.sub}</div>
        </div>`).join('')}
    </div>

    <!-- Selettore periodo -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:20px">
      <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-right:6px">PERIODO</span>
      ${[7, 30, 90].map(d => `<button class="an-period-btn action-btn${d === giorni ? ' active' : ''}" data-dias="${d}" onclick="cambiaPeriodoGiorni(${d})" style="${d === giorni ? 'border-color:var(--accent);color:var(--accent)' : ''}">${d}G</button>`).join('')}
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
        ${tabellaVenduti}
      </div>
    </div>`;
}

function costruisciDatiLinea(righe, chiaveLabel, chiaveValore, giorni) {
  const map = Object.fromEntries(righe.map(r => [r[chiaveLabel], r[chiaveValore]]));
  const labels = [], data = [];
  for (let i = giorni - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(key.slice(5));
    data.push(parseFloat(map[key] || 0));
  }
  return { labels, data };
}

function inizializzaGrafici(visite, incassi, paesi, prodottiVisti, stati) {
  Chart.defaults.font.family = "'DM Mono', monospace";
  Chart.defaults.font.size   = 10;
  Chart.defaults.color       = '#888';

  aggiornaGraficiTemporali(visite, incassi);

  // Paesi
  if (paesi.length) {
    safeChart('chartPaises', {
      type: 'bar',
      data: {
        labels:   paesi.map(p => NOMI_PAESI[p.pais] || p.pais || 'Sconosciuto'),
        datasets: [{ data: paesi.map(p => +p.total), backgroundColor: COLORI_GRAFICO.accent, borderRadius: 2 }],
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: COLORI_GRAFICO.border } }, y: { grid: { display: false } } } },
    });
  }

  // Prodotti più visti
  if (prodottiVisti.length) {
    safeChart('chartProdsVisti', {
      type: 'bar',
      data: {
        labels:   prodottiVisti.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 20) + '…' : p.nombre),
        datasets: [{ data: prodottiVisti.map(p => +p.visitas), backgroundColor: COLORI_GRAFICO.blue, borderRadius: 2 }],
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: COLORI_GRAFICO.border } }, y: { grid: { display: false } } } },
    });
  }

  // Stato ordini (doughnut)
  const coloriStato = { pendiente: '#e8a87c', confirmado: '#4caf50', enviado: '#5b8db8', entregado: '#2e7d32', cancelado: '#c94b2c' };
  if (stati.length) {
    safeChart('chartEstados', {
      type: 'doughnut',
      data: {
        labels:   stati.map(e => e.estado.toUpperCase()),
        datasets: [{ data: stati.map(e => +e.total), backgroundColor: stati.map(e => coloriStato[e.estado] || '#888'), borderWidth: 0, hoverOffset: 6 }],
      },
      options: { plugins: { legend: { position: 'bottom', labels: { padding: 14, boxWidth: 10 } } }, cutout: '60%' },
    });
  }
}

function aggiornaGraficiTemporali(visite, incassi) {
  const dVisite  = costruisciDatiLinea(visite,  'fecha', 'total', analiticheGiorni);
  const dIncassi = costruisciDatiLinea(incassi, 'fecha', 'total', analiticheGiorni);

  const opzioniLinea = (colore) => ({
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
      y: { grid: { color: COLORI_GRAFICO.border }, beginAtZero: true },
    },
    elements: { point: { radius: 2, hoverRadius: 5 } },
  });

  safeChart('chartVisitas', {
    type: 'line',
    data: {
      labels: dVisite.labels,
      datasets: [{ data: dVisite.data, borderColor: COLORI_GRAFICO.accent, backgroundColor: 'rgba(201,75,44,0.08)', fill: true, tension: 0.35 }],
    },
    options: opzioniLinea(COLORI_GRAFICO.accent),
  });

  safeChart('chartIngresos', {
    type: 'line',
    data: {
      labels: dIncassi.labels,
      datasets: [{ data: dIncassi.data, borderColor: COLORI_GRAFICO.blue, backgroundColor: 'rgba(91,141,184,0.08)', fill: true, tension: 0.35 }],
    },
    options: opzioniLinea(COLORI_GRAFICO.blue),
  });
}

// ══ TICKET / CHAT ══════════════════════════════════════════════════════════

let adminPollingTicket  = null;
let adminTicketCorrente = null;

async function adminTabTicket(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  adminTicketCorrente = null;
  await adminCaricaListaTicket(content);
  avviaPollingTicketAdmin(content);
}

async function adminCaricaListaTicket(content) {
  const h = { Authorization: `Bearer ${token}` };
  try {
    const [tickets] = await Promise.all([
      fetch(`${API}/tickets`, { headers: h }).then(r => r.json())
    ]);

    const aperti   = tickets.filter(t => t.estado === 'abierto').length;
    const nonLetti = tickets.reduce((s, t) => s + (t.no_leidos || 0), 0);
    aggiornaBadgeAdmin(nonLetti);

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div class="admin-form-title" style="margin:0">MESSAGGI (${aperti} aperti)</div>
      </div>
      ${!tickets.length ? '<div class="empty-state"><div class="ei"><iconify-icon icon="mdi:chat-outline" width="36"></iconify-icon></div><h3>NESSUN TICKET</h3></div>' : `
      <table>
        <thead><tr><th>Cliente</th><th>Oggetto</th><th>Ultimo messaggio</th><th>Stato</th><th>Data</th><th></th></tr></thead>
        <tbody>${tickets.map(t => `
          <tr style="${t.no_leidos > 0 ? 'background:rgba(193,127,58,.06)' : ''}">
            <td>
              <strong>${t.Utente?.nombre || '—'}</strong>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${t.Utente?.email || ''}</div>
            </td>
            <td>
              <strong>${t.asunto}</strong>
              ${t.no_leidos > 0 ? `<span class="chat-unread-count" style="margin-left:6px">${t.no_leidos}</span>` : ''}
            </td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${t.ultimo_mensaje || '—'}</td>
            <td><span class="pill ${t.estado === 'abierto' ? 'green' : ''}">${t.estado.toUpperCase()}</span></td>
            <td style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${new Date(t.updatedAt).toLocaleDateString('it-IT')}</td>
            <td><button class="action-btn" onclick="adminApriTicket(${t.id},'${t.asunto.replace(/'/g,"\\'")}')">APRI</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`}`;
  } catch { content.innerHTML = '<div class="msg err">Errore caricamento</div>'; }
}

async function adminApriTicket(id, asunto) {
  adminTicketCorrente = id;
  fermaPollingTicketAdmin();
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  await adminCaricaConversazione(id, asunto, content);
  adminTicketCorrente = id;
  adminPollingTicket = setInterval(() => adminCaricaConversazione(id, asunto, content), 4000);
}

async function adminCaricaConversazione(id, asunto, content) {
  const h = { Authorization: `Bearer ${token}` };
  try {
    const r = await fetch(`${API}/tickets/${id}/mensajes`, { headers: h });
    const data = await r.json();
    const ticket   = data.ticket;
    const messaggi = data.mensajes;
    aggiornaBadgeAdmin(0);

    const msgHtml = messaggi.map(m => `
      <div class="chat-msg ${m.remitente === 'admin' ? 'mine' : 'theirs'}">
        ${m.remitente === 'cliente' ? `<div class="chat-msg-sender" style="color:var(--muted)">${ticket.Utente?.nombre || 'CLIENTE'}</div>` : `<div class="chat-msg-sender">TU (ADMIN)</div>`}
        <div class="chat-msg-bubble">${escapeAdminHtml(m.texto)}</div>
        <div class="chat-msg-time">${adminFormatTime(m.createdAt)}</div>
      </div>`).join('');

    // Se la conversazione è già aperta aggiorna solo i messaggi, senza toccare l'input
    const msgEl = document.getElementById('adminConvMessages');
    if (msgEl) {
      msgEl.innerHTML = msgHtml;
      msgEl.scrollTop = msgEl.scrollHeight;
      return;
    }

    // Prima apertura — render completo
    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <button class="action-btn" onclick="fermaPollingTicketAdmin();adminTabTicket(document.getElementById('adminContent'))">← Indietro</button>
        <div class="admin-form-title" style="margin:0;flex:1">${asunto}</div>
        <span class="pill ${ticket.estado === 'abierto' ? 'green' : ''}">${ticket.estado.toUpperCase()}</span>
        ${ticket.estado === 'abierto'
          ? `<button class="action-btn danger" onclick="adminCambiaStato(${id},'cerrado','${asunto.replace(/'/g,"\\'")}')">CHIUDI</button>`
          : `<button class="action-btn" style="border-color:var(--green);color:var(--green)" onclick="adminCambiaStato(${id},'abierto','${asunto.replace(/'/g,"\\'")}')">RIAPRI</button>`}
      </div>
      <div id="adminConvMessages" style="height:340px;overflow-y:auto;border:1px solid var(--border);padding:14px;display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        ${msgHtml}
      </div>
      ${ticket.estado === 'abierto' ? `
      <div style="display:flex;gap:8px">
        <textarea id="adminReplyInput" placeholder="Scrivi una risposta... (Ctrl+Enter per inviare)" style="flex:1;height:60px;background:var(--bg);border:1px solid var(--border);padding:10px 12px;font-family:'DM Mono',monospace;font-size:11px;resize:none;outline:none;color:var(--text)" onkeydown="if(event.ctrlKey&&event.key==='Enter')adminInviaRisposta(${id},'${asunto.replace(/'/g,"\\'")}')"></textarea>
        <button class="btn-submit" style="height:auto;padding:0 20px" onclick="adminInviaRisposta(${id},'${asunto.replace(/'/g,"\\'")}')">INVIA</button>
      </div>` : '<div class="msg" style="font-family:DM Mono;font-size:9px;letter-spacing:1px;color:var(--muted);padding:10px;border:1px solid var(--border)">TICKET CHIUSO — riapri per rispondere</div>'}`;

    document.getElementById('adminConvMessages').scrollTop = 999999;
  } catch {}
}

async function adminInviaRisposta(id, asunto) {
  const input = document.getElementById('adminReplyInput');
  const testo = input?.value.trim();
  if (!testo) return;
  try {
    const r = await fetch(`${API}/tickets/${id}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ texto: testo })
    });
    if (!r.ok) throw new Error();
    input.value = '';
    await adminCaricaConversazione(id, asunto, document.getElementById('adminContent'));
  } catch { alert('Errore invio'); }
}

async function adminCambiaStato(id, stato, asunto) {
  try {
    await fetch(`${API}/tickets/${id}/estado`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ estado: stato })
    });
    await adminCaricaConversazione(id, asunto, document.getElementById('adminContent'));
  } catch {}
}

function fermaPollingTicketAdmin() {
  if (adminPollingTicket) { clearInterval(adminPollingTicket); adminPollingTicket = null; }
}

function avviaPollingTicketAdmin(content) {
  fermaPollingTicketAdmin();
  adminPollingTicket = setInterval(() => {
    if (!adminTicketCorrente) adminCaricaListaTicket(content);
  }, 8000);
}

function aggiornaBadgeAdmin(count) {
  const badge = document.getElementById('adminTicketsBadge');
  if (!badge) return;
  badge.textContent = count || '';
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

async function verificaNonLettiAdmin() {
  if (!token) return;
  try {
    const r = await fetch(`${API}/tickets/admin/unread`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    aggiornaBadgeAdmin(data.count);
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

// ══ TARIFFE SPEDIZIONE (configurazione) ════════════════════════════════════

async function adminTabTariffeSpedizione(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/spedizione/opzioni/admin`, { headers: { Authorization: `Bearer ${token}` } });
    const lista = await r.json();

    const etichettaZona = z => ({ IT: '🇮🇹 Italia', EU: '🌍 Europa', MONDO: '🌐 Mondo', ALL: '✈️ Ovunque' }[z] || z);

    content.innerHTML = `
      <div class="admin-form-title">TARIFFE DI SPEDIZIONE</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);margin-bottom:20px;line-height:1.6">
        Queste tariffe vengono mostrate al cliente durante il checkout in base al paese selezionato.<br>
        <strong>IT</strong> = solo Italia · <strong>EU</strong> = paesi europei · <strong>MONDO</strong> = resto del mondo · <strong>Ovunque</strong> = mostrata sempre
      </div>

      <table>
        <thead><tr><th>Nome</th><th>Zona</th><th>Prezzo</th><th>Giorni est.</th><th>Stato</th><th></th></tr></thead>
        <tbody id="tariffeBody">
          ${lista.length ? lista.map(o => `
            <tr id="trow-${o.id}">
              <td><strong>${o.nome}</strong></td>
              <td><span class="pill">${etichettaZona(o.zona)}</span></td>
              <td class="price-cell">€${parseFloat(o.prezzo).toFixed(2)}</td>
              <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">${o.giorni || '—'}</td>
              <td><span class="pill ${o.attivo ? 'green' : 'orange'}">${o.attivo ? 'ATTIVO' : 'INATTIVO'}</span></td>
              <td style="display:flex;gap:4px">
                <button class="action-btn" onclick="adminEditaTariffa(${o.id},'${o.nome.replace(/'/g,"\\'")}','${o.zona}',${o.prezzo},'${(o.giorni||'').replace(/'/g,"\\'")}',${o.attivo})">MODIFICA</button>
                <button class="action-btn danger" onclick="adminEliminaTariffa(${o.id})">ELIMINA</button>
              </td>
            </tr>`).join('')
          : `<tr><td colspan="6" style="text-align:center;color:var(--muted);font-family:'DM Mono',monospace;font-size:10px;padding:20px">Nessuna tariffa configurata</td></tr>`}
        </tbody>
      </table>

      <div style="margin-top:28px;padding:18px;border:1px solid var(--border)">
        <div class="admin-form-title" style="font-size:17px" id="tariffeFormTitolo">+ NUOVA TARIFFA</div>
        <input type="hidden" id="tariffeEditId" value=""/>
        <div class="form-row">
          <div class="field" style="flex:2"><label>Nome *</label><input id="tariffeNome" placeholder="Spedizione Standard Italia"/></div>
          <div class="field"><label>Zona *</label>
            <select id="tariffeZona">
              <option value="IT">🇮🇹 Italia</option>
              <option value="EU">🌍 Europa</option>
              <option value="MONDO">🌐 Mondo</option>
              <option value="ALL">✈️ Ovunque</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field"><label>Prezzo (€) *</label><input id="tariffePrezzo" type="number" step="0.01" min="0" placeholder="6.00"/></div>
          <div class="field"><label>Giorni stimati</label><input id="tariffeGiorni" placeholder="3-5"/></div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn-submit" onclick="adminSalvaTariffa()">SALVA</button>
          <button class="action-btn" onclick="adminResetFormTariffa()">ANNULLA</button>
          <span id="tariffeMsg" style="font-family:'DM Mono',monospace;font-size:10px"></span>
        </div>
      </div>`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

function adminEditaTariffa(id, nome, zona, prezzo, giorni, attivo) {
  document.getElementById('tariffeEditId').value  = id;
  document.getElementById('tariffeNome').value    = nome;
  document.getElementById('tariffeZona').value    = zona;
  document.getElementById('tariffePrezzo').value  = parseFloat(prezzo).toFixed(2);
  document.getElementById('tariffeGiorni').value  = giorni;
  document.getElementById('tariffeFormTitolo').textContent = `MODIFICA TARIFFA #${id}`;
  document.getElementById('tariffeNome').focus();
}

function adminResetFormTariffa() {
  document.getElementById('tariffeEditId').value  = '';
  document.getElementById('tariffeNome').value    = '';
  document.getElementById('tariffeZona').value    = 'IT';
  document.getElementById('tariffePrezzo').value  = '';
  document.getElementById('tariffeGiorni').value  = '';
  document.getElementById('tariffeFormTitolo').textContent = '+ NUOVA TARIFFA';
  document.getElementById('tariffeMsg').textContent = '';
}

async function adminSalvaTariffa() {
  const editId = document.getElementById('tariffeEditId').value;
  const nome   = document.getElementById('tariffeNome').value.trim();
  const zona   = document.getElementById('tariffeZona').value;
  const prezzo = parseFloat(document.getElementById('tariffePrezzo').value);
  const giorni = document.getElementById('tariffeGiorni').value.trim() || null;
  const msgEl  = document.getElementById('tariffeMsg');

  if (!nome || isNaN(prezzo)) { msgEl.textContent = '✗ Nome e prezzo obbligatori'; msgEl.style.color = 'var(--accent)'; return; }

  try {
    const url    = editId ? `${API}/spedizione/opzioni/${editId}` : `${API}/spedizione/opzioni`;
    const method = editId ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ nome, zona, prezzo, giorni })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    msgEl.textContent = '✓ Salvato';
    msgEl.style.color = 'var(--green)';
    setTimeout(() => adminTabTariffeSpedizione(document.getElementById('adminContent')), 800);
  } catch(e) { msgEl.textContent = '✗ ' + e.message; msgEl.style.color = 'var(--accent)'; }
}

async function adminEliminaTariffa(id) {
  if (!confirm('Eliminare questa tariffa?')) return;
  try {
    await fetch(`${API}/spedizione/opzioni/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    adminTabTariffeSpedizione(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

// ══ TRACKING MANUALE ═══════════════════════════════════════════════════════

async function adminInserisciTracking(ordineId) {
  const tracking = prompt('Inserisci il numero di tracking:');
  if (!tracking || !tracking.trim()) return;
  const corriere = prompt('Corriere (es. DHL, GLS, BRT):') || '';
  try {
    const r = await fetch(`${API}/ordenes/${ordineId}/tracking`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tracking_number: tracking.trim(), carrier: corriere.trim(), estado: 'enviado' })
    });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTab('ordenes', null);
  } catch(e) { alert('Errore: ' + e.message); }
}

// ══ SPEDIZIONE SHIPPO ══════════════════════════════════════════════════════

async function adminApriSpedizione(ordineId) {
  document.querySelectorAll('.admin-menu-item').forEach(x => x.classList.remove('active'));
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  const h = { Authorization: `Bearer ${token}` };

  try {
    const r = await fetch(`${API}/ordenes/${ordineId}`, { headers: h });
    const o = await r.json();

    // Prova a estrarre indirizzo strutturato dal campo libero
    const indirizzo = o.direccion || '';
    const capMatch  = indirizzo.match(/\b(\d{5})\b/);
    const cap       = capMatch ? capMatch[1] : '';
    const provMatch = indirizzo.match(/\b([A-Z]{2})\b/);
    const prov      = provMatch ? provMatch[1] : '';

    const speditoHtml = o.tracking_number ? `
      <div class="msg ok" style="padding:16px;margin-bottom:20px">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px">📦 ORDINE GIÀ SPEDITO</div>
        <div><strong>Corriere:</strong> ${o.carrier || '—'}</div>
        <div><strong>Tracking:</strong> <code style="font-family:'DM Mono',monospace;font-size:12px">${o.tracking_number}</code></div>
        <div style="margin-top:10px">
          <a href="${o.label_url}" target="_blank" class="btn-submit" style="text-decoration:none;display:inline-block;padding:8px 18px">📄 SCARICA ETICHETTA PDF</a>
        </div>
      </div>` : '';

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <button class="action-btn" onclick="adminTab('ordenes',null)">← INDIETRO</button>
        <div class="admin-form-title" style="margin:0">SPEDIZIONE — ORDINE #${o.id}</div>
        <span class="pill ${o.estado === 'enviado' ? 'green' : ''}" style="margin-left:auto">${o.estado.toUpperCase()}</span>
      </div>

      ${speditoHtml}

      <div style="padding:14px;border:1px solid var(--border);margin-bottom:20px;font-family:'DM Mono',monospace;font-size:10px">
        <div style="letter-spacing:2px;color:var(--muted);margin-bottom:6px">CLIENTE</div>
        <div style="font-size:13px;font-weight:700">${o.nombre_cliente}</div>
        <div style="color:var(--muted)">${o.email_cliente}${o.telefono ? ' · ' + o.telefono : ''}</div>
        ${o.direccion ? `<div style="margin-top:6px;color:var(--muted)">📍 ${o.direccion}</div>` : ''}
        ${o.notas ? `<div style="margin-top:4px;color:var(--muted)">📝 ${o.notas}</div>` : ''}
      </div>

      <div class="admin-form-title" style="font-size:17px">INDIRIZZO DESTINATARIO</div>
      <div class="form-row">
        <div class="field" style="flex:2"><label>Nome destinatario *</label><input id="spNome" value="${o.nombre_cliente}"/></div>
      </div>
      <div class="form-row">
        <div class="field" style="flex:3"><label>Via / Indirizzo *</label><input id="spVia" placeholder="Via Roma 1" value="${indirizzo.replace(/\d{5}|[A-Z]{2}$/g,'').trim().split(',')[0]?.trim() || ''}"/></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Città *</label><input id="spCitta" placeholder="Milano"/></div>
        <div class="field" style="max-width:120px"><label>CAP *</label><input id="spCap" placeholder="20100" value="${cap}"/></div>
        <div class="field" style="max-width:80px"><label>Prov.</label><input id="spProv" maxlength="2" placeholder="MI" value="${prov}"/></div>
        <div class="field" style="max-width:80px"><label>Paese</label><input id="spNazione" value="IT"/></div>
      </div>

      <div class="admin-form-title" style="font-size:17px;margin-top:20px">DIMENSIONI PACCO</div>
      <div class="form-row">
        <div class="field"><label>Peso (grammi) *</label><input id="spPeso" type="number" min="1" placeholder="500"/></div>
        <div class="field"><label>Lunghezza (cm)</label><input id="spLung" type="number" value="20"/></div>
        <div class="field"><label>Larghezza (cm)</label><input id="spLarg" type="number" value="15"/></div>
        <div class="field"><label>Altezza (cm)</label><input id="spAlte" type="number" value="10"/></div>
      </div>

      <button class="btn-submit" onclick="shippoCalcolaTariffe(${o.id})">
        <iconify-icon icon="mdi:truck-fast-outline" width="15" style="vertical-align:middle;margin-right:6px"></iconify-icon>
        CALCOLA TARIFFE
      </button>
      <div id="shippoTariffeWrap" style="margin-top:20px"></div>`;

  } catch(e) {
    content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`;
  }
}

async function shippoCalcolaTariffe(ordineId) {
  const nome   = document.getElementById('spNome')?.value.trim();
  const via    = document.getElementById('spVia')?.value.trim();
  const citta  = document.getElementById('spCitta')?.value.trim();
  const cap    = document.getElementById('spCap')?.value.trim();
  const prov   = document.getElementById('spProv')?.value.trim();
  const naz    = document.getElementById('spNazione')?.value.trim() || 'IT';
  const peso   = document.getElementById('spPeso')?.value;
  const lung   = document.getElementById('spLung')?.value || 20;
  const larg   = document.getElementById('spLarg')?.value || 15;
  const alte   = document.getElementById('spAlte')?.value || 10;

  if (!nome || !via || !citta || !cap || !peso) {
    showMsg('shippoErr', 'Compila tutti i campi obbligatori (nome, via, città, CAP, peso)', 'err');
    return;
  }

  const wrap = document.getElementById('shippoTariffeWrap');
  wrap.innerHTML = `<div class="loading">CALCOLO TARIFFE IN CORSO...</div>`;

  try {
    const r = await fetch(`${API}/spedizione/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nome_destinatario: nome,
        via, citta, cap, provincia: prov, nazione: naz,
        peso_grammi:   parseInt(peso),
        lunghezza_cm:  parseFloat(lung),
        larghezza_cm:  parseFloat(larg),
        altezza_cm:    parseFloat(alte),
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    if (!data.tariffe.length) {
      wrap.innerHTML = '<div class="msg err">Nessuna tariffa disponibile. Verifica indirizzo e CAP.</div>';
      return;
    }

    wrap.innerHTML = `
      <div class="admin-form-title" style="font-size:17px">TARIFFE DISPONIBILI</div>
      <table>
        <thead>
          <tr>
            <th>Corriere</th><th>Servizio</th><th>Prezzo</th><th>Consegna</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${data.tariffe.map(t => `
            <tr>
              <td><strong>${t.corriere}</strong></td>
              <td style="font-size:11px;color:var(--muted)">${t.servizio}</td>
              <td class="price-cell">€${t.prezzo}</td>
              <td style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">
                ${t.giorni ? `${t.giorni} gg` : '—'}
              </td>
              <td>
                <button class="action-btn" style="border-color:var(--green);color:var(--green)"
                  onclick="shippoAcquistaEtichetta('${t.id}',${ordineId},'${t.corriere}','€${t.prezzo}')">
                  ACQUISTA
                </button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div id="shippoErr"></div>`;

  } catch(e) {
    wrap.innerHTML = `<div class="msg err">Errore Shippo: ${e.message}</div>`;
  }
}

async function shippoAcquistaEtichetta(rateId, ordineId, corriere, prezzo) {
  if (!confirm(`Acquistare etichetta ${corriere} — ${prezzo}?\nIl costo verrà addebitato sull'account Shippo.`)) return;

  const wrap = document.getElementById('shippoTariffeWrap');
  wrap.innerHTML = '<div class="loading">ACQUISTO ETICHETTA IN CORSO...</div>';

  try {
    const r = await fetch(`${API}/spedizione/acquista`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rate_id: rateId, ordine_id: ordineId })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    wrap.innerHTML = `
      <div class="msg ok" style="padding:24px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:900;letter-spacing:1px;margin-bottom:14px">
          ✅ ETICHETTA GENERATA
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-family:'DM Mono',monospace;font-size:10px">
          <div><span style="color:var(--muted);letter-spacing:2px">CORRIERE</span><br><strong style="font-size:13px">${data.carrier} — ${data.servizio}</strong></div>
          <div><span style="color:var(--muted);letter-spacing:2px">COSTO</span><br><strong style="font-size:13px;color:var(--accent)">€${parseFloat(data.costo).toFixed(2)}</strong></div>
          <div style="grid-column:1/-1">
            <span style="color:var(--muted);letter-spacing:2px">TRACKING NUMBER</span><br>
            <code style="font-size:15px;font-weight:700;letter-spacing:2px">${data.tracking_number}</code>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a href="${data.label_url}" target="_blank" class="btn-submit" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px">
            <iconify-icon icon="mdi:file-pdf-box" width="16"></iconify-icon> SCARICA ETICHETTA PDF
          </a>
          ${data.tracking_url ? `<a href="${data.tracking_url}" target="_blank" class="action-btn" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px">
            <iconify-icon icon="mdi:map-marker-path" width="13"></iconify-icon> TRACCIA SPEDIZIONE
          </a>` : ''}
          <button class="action-btn" onclick="adminTab('ordenes',null)">← TORNA AGLI ORDINI</button>
        </div>
        <div style="margin-top:12px;font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:1px">
          L'ordine è stato aggiornato automaticamente a INVIATO
        </div>
      </div>`;

  } catch(e) {
    wrap.innerHTML = `<div class="msg err">Errore acquisto etichetta: ${e.message}</div>`;
  }
}

async function moderaRecensione(id, verificato) {
  try {
    const r = await fetch(`${API}/resenas/${id}/verificar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ verificado: verificato })
    });
    if (!r.ok) throw new Error('Errore');
    adminTabRecensioni(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

// ══ BENCHYS ═══════════════════════════════════════════════════════════════════

async function adminTabBenchys(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/punti/admin/pending`, { headers: { Authorization: `Bearer ${token}` } });
    const pending = await r.json();

    // Aggiorna badge
    const badge = document.getElementById('adminBenchysBadge');
    if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? '' : 'none'; }

    if (!pending.length) {
      content.innerHTML = `
        <div class="admin-form-title">🚢 BENCHYS — RICHIESTE</div>
        <div class="empty-state"><div class="ei">🚢</div><h3>NESSUNA RICHIESTA IN ATTESA</h3></div>`;
      return;
    }

    const TIPO_LABEL = { instagram_follow: '📸 Follow Instagram @rolefigz' };

    content.innerHTML = `
      <div class="admin-form-title">🚢 BENCHYS — RICHIESTE IN ATTESA (${pending.length})</div>
      <table>
        <thead><tr><th>Utente</th><th>Azione</th><th>Punti</th><th>Data</th><th>Azioni</th></tr></thead>
        <tbody>
          ${pending.map(t => `
            <tr>
              <td>
                <strong>${t.Utente?.nombre || '—'}</strong><br>
                <span style="font-size:10px;color:var(--muted)">${t.Utente?.email || ''}</span>
              </td>
              <td>${TIPO_LABEL[t.tipo] || t.tipo}</td>
              <td><strong style="color:var(--green)">+${t.punti} 🚢</strong></td>
              <td style="font-size:10px;color:var(--muted)">${new Date(t.createdAt).toLocaleDateString('it-IT')}</td>
              <td>
                <button class="action-btn" onclick="gestisciRichiestaBenchy(${t.id},'approvato')" style="margin-right:6px">✓ APPROVA</button>
                <button class="action-btn danger" onclick="gestisciRichiestaBenchy(${t.id},'rifiutato')">✕ RIFIUTA</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

async function gestisciRichiestaBenchy(id, stato) {
  try {
    const r = await fetch(`${API}/punti/admin/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stato })
    });
    if (!r.ok) throw new Error('Errore');
    adminTabBenchys(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

async function verificaNonLettiAdminBenchys() {
  if (!token) return;
  try {
    const r = await fetch(`${API}/punti/admin/pending`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return;
    const pending = await r.json();
    const badge = document.getElementById('adminBenchysBadge');
    if (badge) { badge.textContent = pending.length; badge.style.display = pending.length ? '' : 'none'; }
  } catch(e) {}
}
