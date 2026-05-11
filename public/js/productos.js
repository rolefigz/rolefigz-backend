function getImgUrl(p) {
  if (p.imagenes && p.imagenes.length) return p.imagenes[0].url;
  return p.imagen || null;
}

function filtraPerCategoria(catId) {
  document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
  if (!catId) { renderProdotti(); return; }
  const filtrati = prodotti.filter(p =>
    p.categoria_id === catId || (p.Categoria && p.Categoria.id === catId)
  );
  renderProdotti(filtrati);
}

function filtraProdotti(q) {
  if (!q) { renderProdotti(); return; }
  const filtrati = prodotti.filter(p =>
    p.nombre.toLowerCase().includes(q.toLowerCase()) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(q.toLowerCase()))
  );
  renderProdotti(filtrati);
}

async function caricaProdotti() {
  const el = document.getElementById('productosList');
  el.innerHTML = '<div class="loading">CARGANDO CATÁLOGO</div>';
  try {
    const r = await fetch(`${API}/productos`);
    prodotti = await r.json();
    setTxt('productCount', `${prodotti.length} PRODUCTOS`);
    setTxt('heroCounter', prodotti.length);
    renderProdotti();
  } catch {
    el.innerHTML = '<div class="empty-state"><div class="ei">⚠</div><h3>SIN CONEXIÓN</h3><p>Verifica que el servidor esté activo</p></div>';
  }
}

function renderProdotti(lista) {
  lista = lista || prodotti;
  const el = document.getElementById('productosList');
  if (!lista.length) {
    el.innerHTML = '<div class="empty-state"><div class="ei"><iconify-icon icon="mdi:package-variant-closed-remove" width="40"></iconify-icon></div><h3>SIN PRODUCTOS</h3><p>Añade productos desde el panel admin.</p></div>';
    return;
  }
  el.innerHTML = `<div class="grid">${lista.map(p => {
    const img = getImgUrl(p);
    return `
      <div class="card" onclick="vediProdotto(${p.id})">
        ${p.stock < 3 && p.stock > 0 ? `<div class="card-badge">ÚLTIMAS</div>` : ''}
        ${p.stock === 0 ? `<div class="card-badge" style="background:var(--muted)">${t('sold_out')}</div>` : ''}
        ${img ? `<img class="card-img" src="${img}" alt="${p.nombre}" onerror="this.outerHTML='<div class=card-ph>3D</div>'">` : '<div class="card-ph">3D</div>'}
        <div class="card-body">
          <div class="card-cat">${p.Categoria ? p.Categoria.nombre : ''}</div>
          <div class="card-name">${p.nombre}</div>
          <div class="card-desc">${p.descripcion || ''}</div>
          <div class="card-footer">
            <div class="card-price">€${parseFloat(p.precio).toFixed(2)}</div>
            <div class="card-stock">${p.stock > 0 ? `STOCK: ${p.stock}` : t('sold_out')}</div>
          </div>
          <button class="add-btn" onclick="event.stopPropagation();aggiungiAlCarrello(${p.id})" ${p.stock === 0 ? 'disabled' : ''}>
            ${p.stock === 0 ? t('sold_out') : t('add_to_cart')}
          </button>
        </div>
      </div>`;
  }).join('')}</div>`;
}

async function vediProdotto(idOrSlug) {
  mostraVista('producto');
  const layout = document.getElementById('productoLayout');
  layout.innerHTML = '<div class="loading" style="padding:120px">CARGANDO</div>';
  try {
    const isId = /^\d+$/.test(String(idOrSlug));
    const url  = isId ? `${API}/productos/${idOrSlug}` : `${API}/productos/slug/${idOrSlug}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('non trovato');
    const p = await r.json();
    prodottoCorrente = p;
    varianteSelezionata = {};
    quantitaSelezionata = 1;
    fotoClienteUrl = null;
    dataConsegnaSelezionata = null;
    supplementoExpressCorrente = 0;
    const ora = new Date();
    calMeseCorrente = { anno: ora.getFullYear(), mese: ora.getMonth() };

    const nuovoSlug = p.slug || String(p.id);
    window.history.pushState({ tipo: 'producto', slug: nuovoSlug }, p.nombre, `/producto/${nuovoSlug}`);
    document.title = `${p.nombre} — RoleFigz`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', p.descripcion || p.nombre);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc  = document.querySelector('meta[property="og:description"]');
    if (ogTitle) ogTitle.setAttribute('content', `${p.nombre} — RoleFigz`);
    if (ogDesc)  ogDesc.setAttribute('content', p.descripcion || p.nombre);

    renderDettaglioProdotto(p);
    caricaRecensioni(p.id);
    tracciVisita('producto', p.id);
  } catch {
    layout.innerHTML = '<div class="empty-state"><div class="ei">⚠</div><h3>PRODUCTO NO ENCONTRADO</h3><p>El enlace puede haber caducado o el producto ya no está disponible.</p></div>';
  }
}

function tornaAlNegozio() {
  window.history.pushState({}, 'RoleFigz', '/');
  document.title = 'RoleFigz — Impresión 3D & Personalización';
  mostraVista('tienda');
}

function copiaLink(slug, btn) {
  const url = `${window.location.origin}/producto/${slug}`;
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ COPIADO';
    btn.style.borderColor = 'var(--green)';
    btn.style.color = 'var(--green)';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 2000);
  }).catch(() => {});
}

function renderDettaglioProdotto(p) {
  const layout = document.getElementById('productoLayout');
  const immagini = p.imagenes && p.imagenes.length ? p.imagenes : (p.imagen ? [{ url: p.imagen }] : []);
  const tipiVarianti = {};
  if (p.variantes) p.variantes.forEach(v => {
    if (!tipiVarianti[v.tipo]) tipiVarianti[v.tipo] = [];
    tipiVarianti[v.tipo].push(v);
  });
  const haVarianti = Object.keys(tipiVarianti).length > 0;

  layout.innerHTML = `
    <div class="producto-galeria">
      <div class="galeria-main" id="galeriaMain">
        ${immagini.length
          ? `<img id="mainImg" src="${immagini[0].url}" alt="${p.nombre}">`
          : '<div class="galeria-main-ph">3D</div>'}
      </div>
      ${immagini.length > 1 ? `<div class="galeria-thumbs">
        ${immagini.map((img, i) => `
          <div class="galeria-thumb ${i === 0 ? 'active' : ''}" onclick="cambiaImmagine('${img.url}', ${i})" id="thumb-${i}">
            <img src="${img.url}" alt="">
          </div>`).join('')}
      </div>` : ''}
    </div>
    <div class="producto-info">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <div class="producto-breadcrumb" onclick="tornaAlNegozio()" style="margin:0;flex:1">
          ${t('nav_shop')} / <span>${p.Categoria ? p.Categoria.nombre.toUpperCase() : 'PRODUCTOS'}</span> / ${p.nombre.toUpperCase()}
        </div>
        ${p.slug ? `<button onclick="copiaLink('${p.slug}',this)" class="share-btn">🔗 COPIAR ENLACE</button>` : ''}
      </div>
      <div class="producto-cat">${p.Categoria ? p.Categoria.nombre : ''}</div>
      <div class="producto-nombre">${p.nombre}</div>
      <div class="producto-precio" id="precioDisplay">
        €${parseFloat(p.precio).toFixed(2)}
        <span class="producto-precio-extra" id="precioExtra"></span>
      </div>
      ${Object.entries(tipiVarianti).map(([tipo, vars]) => `
        <div class="variantes-section">
          <div class="variantes-label">${tipo.toUpperCase()}: <strong id="sel-${tipo}">—</strong></div>
          <div class="variantes-grid">
            ${vars.map(v => `
              <button class="variante-btn ${v.stock === 0 ? 'out' : ''}"
                onclick="${v.stock > 0 ? `selezionaVariante('${tipo}','${v.valor}',${v.precio_extra},this)` : ''}"
                ${v.stock === 0 ? 'disabled' : ''}
                title="${v.stock === 0 ? t('sold_out') : 'Stock: ' + v.stock}">
                ${v.valor}${v.precio_extra > 0 ? ` +€${parseFloat(v.precio_extra).toFixed(2)}` : ''}
              </button>`).join('')}
          </div>
        </div>`).join('')}
      <div class="producto-desc">${p.descripcion || ''}</div>
      <div class="producto-stock">
        <div class="stock-dot ${p.stock > 5 ? 'ok' : p.stock > 0 ? 'low' : 'out'}"></div>
        <span>${p.stock > 5 ? 'DISPONIBLE' : p.stock > 0 ? `ÚLTIMAS ${p.stock} UNIDADES` : t('sold_out')}</span>
      </div>
      ${p.selettore_data ? `
      <div class="data-consegna-wrap" id="dataConsegnaWrap">
        <button class="cal-urgenza-btn" id="calUrgenzaBtn" onclick="apriCalendario()">
          <iconify-icon icon="mdi:lightning-bolt" width="15" style="vertical-align:middle;margin-right:6px;color:var(--accent)"></iconify-icon>
          ¿Lo necesitas urgente? Elige cuándo quieres que empiece la producción
          <iconify-icon icon="mdi:chevron-down" width="16" style="vertical-align:middle;margin-left:8px" id="calChevron"></iconify-icon>
        </button>
        <div id="calBody" style="display:none">
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:1px;margin-bottom:14px;padding:8px 10px;background:var(--surface2);border-left:2px solid var(--accent)">
            Selecciona la fecha en la que quieres que empecemos a producir tu artículo. El envío se realizará en los días siguientes a la finalización.
          </div>
          <div class="cal-nav">
            <button class="cal-nav-btn" onclick="cambiaMesseCalendario(-1)">←</button>
            <span class="cal-mese-anno" id="calMeseAnno"></span>
            <button class="cal-nav-btn" onclick="cambiaMesseCalendario(1)">→</button>
          </div>
          <div class="cal-settimana">
            <span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span>
          </div>
          <div class="cal-griglia" id="calGiorni"></div>
          <div class="cal-legenda">
            <div class="cal-legenda-item"><div class="cal-legenda-dot" style="background:var(--surface2);border:1px solid var(--border)"></div>NO DISP.</div>
            ${p.prezzo_per_giorno_express > 0 ? `<div class="cal-legenda-item"><div class="cal-legenda-dot" style="background:rgba(193,127,58,.2);border:1px solid var(--accent)"></div>EXPRESS (+€${parseFloat(p.prezzo_per_giorno_express).toFixed(2)}/gg)</div>` : ''}
            <div class="cal-legenda-item"><div class="cal-legenda-dot" style="background:rgba(76,175,80,.2);border:1px solid var(--green)"></div>STANDARD (${(p.giorni_produzione || 7) + (p.giorni_spedizione || 3)} gg)</div>
          </div>
          <div class="cal-info-box" id="dataSelezionataInfo" style="display:none">
            <span id="dataSelezionataLabel"></span>
            <span id="supplementoLabel"></span>
          </div>
          <button onclick="chiudiCalendario()" style="margin-top:10px;background:none;border:none;font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:1px;cursor:pointer;padding:0">
            ✕ Cancelar selección de fecha
          </button>
        </div>
      </div>` : ''}
      ${p.richiede_foto ? `
      <div class="foto-upload-wrap" id="fotoUploadWrap">
        <div class="foto-upload-label"><iconify-icon icon="mdi:camera-outline" width="14" style="vertical-align:middle;margin-right:6px"></iconify-icon>SUBE TU FOTO <span style="color:var(--accent)">*</span></div>
        <div class="foto-upload-area" id="fotoUploadArea" onclick="document.getElementById('fotoClienteInput').click()">
          <div id="fotoUploadPlaceholder">
            <iconify-icon icon="mdi:upload" width="28" style="color:var(--muted)"></iconify-icon>
            <div style="font-size:10px;letter-spacing:1px;margin-top:6px">HAZ CLIC PARA SUBIR</div>
            <div style="font-size:9px;color:var(--muted);margin-top:3px">JPG, PNG, WEBP — máx 5MB</div>
          </div>
          <div id="fotoUploadPreview" style="display:none;position:relative">
            <img id="fotoUploadImg" src="" style="max-height:120px;max-width:100%;object-fit:contain"/>
            <div style="font-size:9px;color:var(--muted);margin-top:6px;letter-spacing:1px">Haz clic para cambiar</div>
          </div>
        </div>
        <input type="file" id="fotoClienteInput" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="caricaFotoCliente(this)"/>
        <div id="fotoUploadMsg" style="font-size:10px;margin-top:5px;letter-spacing:1px"></div>
      </div>` : ''}
      <div class="qty-row">
        <div class="qty-ctrl">
          <button onclick="cambiaQuantitaDettaglio(-1)">−</button>
          <span id="cantidadDisplay">1</span>
          <button onclick="cambiaQuantitaDettaglio(1)">+</button>
        </div>
        <button class="add-cart-btn" onclick="aggiungiAlCarrelloDettaglio()" id="addCartBtn" ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock === 0 ? t('sold_out') : t('add_to_cart')}
        </button>
      </div>
      <div class="producto-meta">
        <div class="meta-row"><span class="meta-key">CATEGORIA</span><span>${p.Categoria ? p.Categoria.nombre : '—'}</span></div>
        <div class="meta-row"><span class="meta-key">MATERIAL</span><span>PLA Premium</span></div>
        <div class="meta-row"><span class="meta-key">REFERENCIA</span><span style="font-family:'DM Mono',monospace;font-size:10px">RF-${String(p.id).padStart(4, '0')}</span></div>
        ${haVarianti ? `<div class="meta-row"><span class="meta-key">VARIANTES</span><span>${p.variantes.length} opciones</span></div>` : ''}
      </div>
    </div>`;

  // Il calendario parte chiuso — si apre solo al click del pulsante

  // Recensioni fuori dal grid per evitare sovrapposizione con elementi sticky
  const vista = document.getElementById('view-producto');
  const oldRecensioni = vista.querySelector('.producto-resenas');
  if (oldRecensioni) oldRecensioni.remove();
  const recensioniEl = document.createElement('div');
  recensioniEl.className = 'producto-resenas';
  recensioniEl.innerHTML = `
    <div class="section-eyebrow" style="margin-bottom:8px">// Opiniones de clientes</div>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:clamp(28px,3vw,40px);font-weight:900;text-transform:uppercase;letter-spacing:-1px;margin-bottom:28px;color:var(--dark)">RESEÑAS</div>
    <div id="resenas-list"><div class="loading" style="padding:20px 0">CARGANDO</div></div>
    <div id="resenas-form-wrap" style="margin-top:32px;padding-top:28px;border-top:1px solid var(--border)"></div>`;
  vista.appendChild(recensioniEl);
}

function cambiaImmagine(url, idx) {
  document.getElementById('mainImg').src = url;
  document.querySelectorAll('.galeria-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function selezionaVariante(tipo, valore, prezzoExtra, btn) {
  const eraSelezionato = btn.classList.contains('selected');
  btn.closest('.variantes-grid').querySelectorAll('.variante-btn').forEach(b => b.classList.remove('selected'));

  if (eraSelezionato) {
    delete varianteSelezionata[tipo];
    setTxt(`sel-${tipo}`, '—');
  } else {
    btn.classList.add('selected');
    varianteSelezionata[tipo] = valore;
    setTxt(`sel-${tipo}`, valore);
  }

  const base = parseFloat(prodottoCorrente.precio);
  let extra = 0;
  prodottoCorrente.variantes.forEach(v => {
    if (varianteSelezionata[v.tipo] === v.valor) extra += parseFloat(v.precio_extra || 0);
  });
  setTxt('precioExtra', extra > 0 ? `+€${extra.toFixed(2)}` : '');
  document.getElementById('precioDisplay').childNodes[0].textContent = `€${(base + extra).toFixed(2)}`;
}

function cambiaQuantitaDettaglio(d) {
  quantitaSelezionata = Math.max(1, Math.min(quantitaSelezionata + d, prodottoCorrente.stock));
  setTxt('cantidadDisplay', quantitaSelezionata);
}

async function caricaFotoCliente(input) {
  const file = input.files[0];
  if (!file) return;
  const msgEl = document.getElementById('fotoUploadMsg');
  msgEl.textContent = 'Subiendo...';
  msgEl.style.color = 'var(--muted)';
  const fd = new FormData();
  fd.append('foto', file);
  try {
    const r = await fetch(`${API}/productos/foto-cliente`, { method: 'POST', body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    fotoClienteUrl = data.url;
    document.getElementById('fotoUploadImg').src = data.url;
    document.getElementById('fotoUploadPreview').style.display = 'block';
    document.getElementById('fotoUploadPlaceholder').style.display = 'none';
    msgEl.textContent = '✓ Foto subida';
    msgEl.style.color = 'var(--green)';
  } catch(e) {
    fotoClienteUrl = null;
    msgEl.textContent = e.message;
    msgEl.style.color = 'var(--accent)';
  }
}

// ── Calendario data di consegna ───────────────────────────────────────────────

const MESI_IT = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function apriCalendario() {
  const body = document.getElementById('calBody');
  if (!body) return;
  const aperto = body.style.display !== 'none';
  if (aperto) { chiudiCalendario(); return; }
  body.style.display = '';
  document.getElementById('calChevron')?.setAttribute('icon', 'mdi:chevron-up');
  // Naviga al primo mese con date disponibili
  const p = prodottoCorrente;
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const dataMinima = new Date(oggi);
  dataMinima.setDate(dataMinima.getDate() + 1 + (p.giorni_spedizione || 3));
  const ultimoMeseCorrente = new Date(calMeseCorrente.anno, calMeseCorrente.mese + 1, 0);
  if (ultimoMeseCorrente < dataMinima) {
    calMeseCorrente = { anno: dataMinima.getFullYear(), mese: dataMinima.getMonth() };
  }
  renderCalendario();
}

function chiudiCalendario() {
  const body = document.getElementById('calBody');
  if (body) body.style.display = 'none';
  document.getElementById('calChevron')?.setAttribute('icon', 'mdi:chevron-down');
  dataConsegnaSelezionata    = null;
  supplementoExpressCorrente = 0;
  // Riporta il prezzo al base
  if (prodottoCorrente) {
    const base = parseFloat(prodottoCorrente.precio);
    let extra = 0;
    prodottoCorrente.variantes?.forEach(v => {
      if (varianteSelezionata[v.tipo] === v.valor) extra += parseFloat(v.precio_extra || 0);
    });
    document.getElementById('precioDisplay').childNodes[0].textContent = `€${(base + extra).toFixed(2)}`;
    setTxt('precioExtra', extra > 0 ? `+€${extra.toFixed(2)}` : '');
  }
}

function isoLocale(d) {
  // Evita lo sfasamento di toISOString() con i fusi orari
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderCalendario() {
  if (!prodottoCorrente || !prodottoCorrente.selettore_data) return;
  const { anno, mese } = calMeseCorrente;
  const p = prodottoCorrente;

  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const giorniProd   = p.giorni_produzione || 7;
  const giorniSpediz = p.giorni_spedizione || 3;
  const prezzoGiorno = parseFloat(p.prezzo_per_giorno_express || 0);

  // Prima data selezionabile = oggi + 1 giorno (minimo produzione) + spedizione
  const dataMinima = new Date(oggi);
  dataMinima.setDate(dataMinima.getDate() + 1 + giorniSpediz);

  // Data standard = oggi + produzione completa + spedizione
  const dataStandard = new Date(oggi);
  dataStandard.setDate(dataStandard.getDate() + giorniProd + giorniSpediz);

  // Header mese/anno
  setTxt('calMeseAnno', `${MESI_IT[mese]} ${anno}`);

  // Costruisci griglia giorni
  const primoGiorno  = new Date(anno, mese, 1);
  const ultimoGiorno = new Date(anno, mese + 1, 0);
  const offsetInizio = (primoGiorno.getDay() + 6) % 7; // 0=Lun

  let html = '';
  for (let i = 0; i < offsetInizio; i++) html += `<div class="cal-day"></div>`;

  for (let g = 1; g <= ultimoGiorno.getDate(); g++) {
    const data = new Date(anno, mese, g);
    const iso  = isoLocale(data);
    const sel  = iso === dataConsegnaSelezionata;

    if (data < dataMinima) {
      html += `<div class="cal-day cal-day--dis"><span class="cal-day-n">${g}</span></div>`;
    } else if (data < dataStandard) {
      const giorniAnticipo = Math.round((dataStandard - data) / 864e5);
      const supp = giorniAnticipo * prezzoGiorno;
      html += `<div class="cal-day cal-day--exp${sel ? ' cal-day--sel' : ''}" onclick="selezionaDataConsegna('${iso}',${supp})">
        <span class="cal-day-n">${g}</span>
        ${prezzoGiorno > 0 ? `<span class="cal-day-badge">+€${supp.toFixed(0)}</span>` : ''}
      </div>`;
    } else {
      const isStd = data.getTime() === dataStandard.getTime();
      html += `<div class="cal-day cal-day--ok${sel ? ' cal-day--sel' : ''}${isStd ? ' cal-day--std' : ''}" onclick="selezionaDataConsegna('${iso}',0)">
        <span class="cal-day-n">${g}</span>
        ${isStd ? '<span class="cal-day-badge" style="color:var(--green)">STD</span>' : ''}
      </div>`;
    }
  }

  document.getElementById('calGiorni').innerHTML = html;

  // Info box data selezionata
  const infoEl = document.getElementById('dataSelezionataInfo');
  if (infoEl) {
    if (dataConsegnaSelezionata) {
      const dSel = new Date(dataConsegnaSelezionata + 'T00:00:00');
      setTxt('dataSelezionataLabel', `📅 ${dSel.toLocaleDateString(localeDate(), { weekday:'long', day:'numeric', month:'long', year:'numeric' })}`);
      const suppEl = document.getElementById('supplementoLabel');
      if (supplementoExpressCorrente > 0) {
        suppEl.textContent = ` · +€${supplementoExpressCorrente.toFixed(2)} express`;
        suppEl.style.color = 'var(--accent)';
      } else {
        suppEl.textContent = ' · entrega estándar';
        suppEl.style.color = 'var(--muted)';
      }
      infoEl.style.display = '';
    } else {
      infoEl.style.display = 'none';
    }
  }
}

function cambiaMesseCalendario(delta) {
  let { anno, mese } = calMeseCorrente;
  mese += delta;
  if (mese > 11) { mese = 0; anno++; }
  if (mese < 0)  { mese = 11; anno--; }
  // Non andare prima del mese corrente dell'anno corrente
  const ora = new Date();
  if (anno < ora.getFullYear() || (anno === ora.getFullYear() && mese < ora.getMonth())) return;
  calMeseCorrente = { anno, mese };
  renderCalendario(); // Nessun auto-avanzamento — l'utente naviga liberamente
}

function selezionaDataConsegna(iso, supplemento) {
  dataConsegnaSelezionata    = iso;
  supplementoExpressCorrente = supplemento;

  // Ricalcola il prezzo mostrato
  const base = parseFloat(prodottoCorrente.precio);
  let extraVariante = 0;
  prodottoCorrente.variantes && prodottoCorrente.variantes.forEach(v => {
    if (varianteSelezionata[v.tipo] === v.valor) extraVariante += parseFloat(v.precio_extra || 0);
  });
  const prezzoTotale = base + extraVariante + supplemento;
  document.getElementById('precioDisplay').childNodes[0].textContent = `€${prezzoTotale.toFixed(2)}`;
  const extraTesto = [];
  if (extraVariante > 0) extraTesto.push(`+€${extraVariante.toFixed(2)} variante`);
  if (supplemento > 0)   extraTesto.push(`+€${supplemento.toFixed(2)} express`);
  setTxt('precioExtra', extraTesto.join(' '));

  renderCalendario();
}

// ─────────────────────────────────────────────────────────────────────────────

function aggiungiAlCarrelloDettaglio() {
  if (!prodottoCorrente) return;

  // Verifica foto obbligatoria
  if (prodottoCorrente.richiede_foto && !fotoClienteUrl) {
    const msgEl = document.getElementById('fotoUploadMsg');
    if (msgEl) { msgEl.textContent = '⚠ Sube tu foto antes de añadir al carrito'; msgEl.style.color = 'var(--accent)'; }
    document.getElementById('fotoUploadArea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Verifica data obbligatoria
  if (prodottoCorrente.selettore_data && !dataConsegnaSelezionata) {
    document.getElementById('dataConsegnaWrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('calMeseAnno')?.closest('.data-consegna-wrap')?.classList.add('cal-avviso');
    setTimeout(() => document.getElementById('calMeseAnno')?.closest('.data-consegna-wrap')?.classList.remove('cal-avviso'), 1200);
    return;
  }

  const varianteStr = Object.entries(varianteSelezionata).map(([k, v]) => `${k}: ${v}`).join(', ');
  const base = parseFloat(prodottoCorrente.precio);
  let extra = 0;
  prodottoCorrente.variantes && prodottoCorrente.variantes.forEach(v => {
    if (varianteSelezionata[v.tipo] === v.valor) extra += parseFloat(v.precio_extra || 0);
  });
  const prezzoFinale = base + extra + supplementoExpressCorrente;

  // Key unica per prodotti con foto o data (non si sommano tra loro)
  const needsUniqueKey = prodottoCorrente.richiede_foto || prodottoCorrente.selettore_data;
  const key = needsUniqueKey
    ? `${prodottoCorrente.id}-${varianteStr}-${Date.now()}`
    : `${prodottoCorrente.id}-${varianteStr}`;

  const fotoSalvata   = fotoClienteUrl;
  const dataSalvata   = dataConsegnaSelezionata;
  const suppSalvato   = supplementoExpressCorrente;

  // Reset stato
  fotoClienteUrl           = null;
  dataConsegnaSelezionata  = null;
  supplementoExpressCorrente = 0;

  const item = !needsUniqueKey && carrello.find(x => x.key === key);
  if (item) item.quantita += quantitaSelezionata;
  else carrello.push({
    key,
    prodotto:        prodottoCorrente,
    variante:        varianteStr,
    prezzo:          prezzoFinale,
    quantita:        quantitaSelezionata,
    fotoCliente:     fotoSalvata,
    dataConsegna:    dataSalvata,
    supplementoExpress: suppSalvato
  });

  // Reset UI foto
  if (prodottoCorrente.richiede_foto) {
    const prev = document.getElementById('fotoUploadPreview');
    const ph   = document.getElementById('fotoUploadPlaceholder');
    if (prev) prev.style.display = 'none';
    if (ph)   ph.style.display   = '';
    const msg = document.getElementById('fotoUploadMsg');
    if (msg)  msg.textContent    = '';
  }

  // Reset prezzo display
  setTxt('precioExtra', '');
  document.getElementById('precioDisplay').childNodes[0].textContent = `€${(base + extra).toFixed(2)}`;

  aggiornaUICarrello();
  apriCarrello();
}
