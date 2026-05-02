function getImgUrl(p) {
  if (p.imagenes && p.imagenes.length) return p.imagenes[0].url;
  return p.imagen || null;
}

function filterByCategory(catId) {
  document.getElementById('catalogo').scrollIntoView({ behavior: 'smooth' });
  if (!catId) { renderProductos(); return; }
  const filtered = productos.filter(p =>
    p.categoria_id === catId || (p.Categoria && p.Categoria.id === catId)
  );
  renderProductos(filtered);
}

function filterProductos(q) {
  if (!q) { renderProductos(); return; }
  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(q.toLowerCase()) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(q.toLowerCase()))
  );
  renderProductos(filtered);
}

async function loadProductos() {
  const el = document.getElementById('productosList');
  el.innerHTML = '<div class="loading">CARICAMENTO CATALOGO</div>';
  try {
    const r = await fetch(`${API}/productos`);
    productos = await r.json();
    setTxt('productCount', `${productos.length} PRODOTTI`);
    setTxt('heroCounter', productos.length);
    renderProductos();
  } catch {
    el.innerHTML = '<div class="empty-state"><div class="ei">⚠</div><h3>NESSUNA CONNESSIONE</h3><p>Verifica che il server sia attivo</p></div>';
  }
}

function renderProductos(list) {
  list = list || productos;
  const el = document.getElementById('productosList');
  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><div class="ei"><iconify-icon icon="mdi:package-variant-closed-remove" width="40"></iconify-icon></div><h3>NESSUN PRODOTTO</h3><p>Aggiungi prodotti dal pannello admin.</p></div>';
    return;
  }
  el.innerHTML = `<div class="grid">${list.map(p => {
    const img = getImgUrl(p);
    return `
      <div class="card" onclick="verProducto(${p.id})">
        ${p.stock < 3 && p.stock > 0 ? `<div class="card-badge">${currentLang === 'it' ? 'ULTIMI' : 'ÚLTIMAS'}</div>` : ''}
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
          <button class="add-btn" onclick="event.stopPropagation();addToCart(${p.id})" ${p.stock === 0 ? 'disabled' : ''}>
            ${p.stock === 0 ? t('sold_out') : t('add_to_cart')}
          </button>
        </div>
      </div>`;
  }).join('')}</div>`;
}

async function verProducto(idOrSlug) {
  showView('producto');
  const layout = document.getElementById('productoLayout');
  layout.innerHTML = '<div class="loading" style="padding:120px">CARICAMENTO</div>';
  try {
    const isId = /^\d+$/.test(String(idOrSlug));
    const url  = isId ? `${API}/productos/${idOrSlug}` : `${API}/productos/slug/${idOrSlug}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('non trovato');
    const p = await r.json();
    productoActual = p;
    varianteSeleccionada = {};
    cantidadSeleccionada = 1;

    const nuevoSlug = p.slug || String(p.id);
    window.history.pushState({ tipo: 'producto', slug: nuevoSlug }, p.nombre, `/producto/${nuevoSlug}`);
    document.title = `${p.nombre} — RoleFigz`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', p.descripcion || p.nombre);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc  = document.querySelector('meta[property="og:description"]');
    if (ogTitle) ogTitle.setAttribute('content', `${p.nombre} — RoleFigz`);
    if (ogDesc)  ogDesc.setAttribute('content', p.descripcion || p.nombre);

    renderProductoDetalle(p);
    loadResenas(p.id);
    trackVisita('producto', p.id);
  } catch {
    layout.innerHTML = '<div class="empty-state"><div class="ei">⚠</div><h3>PRODOTTO NON TROVATO</h3><p>Il link potrebbe essere scaduto o il prodotto non è più disponibile.</p></div>';
  }
}

function tornaAlNegozio() {
  window.history.pushState({}, 'RoleFigz', '/');
  document.title = 'RoleFigz — Stampa 3D & Personalizzazione';
  showView('tienda');
}

function copiarLink(slug, btn) {
  const url = `${window.location.origin}/producto/${slug}`;
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ COPIATO';
    btn.style.borderColor = 'var(--green)';
    btn.style.color = 'var(--green)';
    setTimeout(() => {
      btn.textContent = orig;
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 2000);
  }).catch(() => {});
}

function renderProductoDetalle(p) {
  const layout = document.getElementById('productoLayout');
  const imagenes = p.imagenes && p.imagenes.length ? p.imagenes : (p.imagen ? [{ url: p.imagen }] : []);
  const tiposVariantes = {};
  if (p.variantes) p.variantes.forEach(v => {
    if (!tiposVariantes[v.tipo]) tiposVariantes[v.tipo] = [];
    tiposVariantes[v.tipo].push(v);
  });
  const tieneVariantes = Object.keys(tiposVariantes).length > 0;

  layout.innerHTML = `
    <div class="producto-galeria">
      <div class="galeria-main" id="galeriaMain">
        ${imagenes.length
          ? `<img id="mainImg" src="${imagenes[0].url}" alt="${p.nombre}">`
          : '<div class="galeria-main-ph">3D</div>'}
      </div>
      ${imagenes.length > 1 ? `<div class="galeria-thumbs">
        ${imagenes.map((img, i) => `
          <div class="galeria-thumb ${i === 0 ? 'active' : ''}" onclick="switchImg('${img.url}', ${i})" id="thumb-${i}">
            <img src="${img.url}" alt="">
          </div>`).join('')}
      </div>` : ''}
    </div>
    <div class="producto-info">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
        <div class="producto-breadcrumb" onclick="tornaAlNegozio()" style="margin:0;flex:1">
          ${t('nav_shop')} / <span>${p.Categoria ? p.Categoria.nombre.toUpperCase() : 'PRODOTTI'}</span> / ${p.nombre.toUpperCase()}
        </div>
        ${p.slug ? `<button onclick="copiarLink('${p.slug}',this)" class="share-btn">🔗 COPIA LINK</button>` : ''}
      </div>
      <div class="producto-cat">${p.Categoria ? p.Categoria.nombre : ''}</div>
      <div class="producto-nombre">${p.nombre}</div>
      <div class="producto-precio" id="precioDisplay">
        €${parseFloat(p.precio).toFixed(2)}
        <span class="producto-precio-extra" id="precioExtra"></span>
      </div>
      ${Object.entries(tiposVariantes).map(([tipo, vars]) => `
        <div class="variantes-section">
          <div class="variantes-label">${tipo.toUpperCase()}: <strong id="sel-${tipo}">—</strong></div>
          <div class="variantes-grid">
            ${vars.map(v => `
              <button class="variante-btn ${v.stock === 0 ? 'out' : ''}"
                onclick="${v.stock > 0 ? `selectVariante('${tipo}','${v.valor}',${v.precio_extra},this)` : ''}"
                ${v.stock === 0 ? 'disabled' : ''}
                title="${v.stock === 0 ? t('sold_out') : 'Stock: ' + v.stock}">
                ${v.valor}${v.precio_extra > 0 ? ` +€${parseFloat(v.precio_extra).toFixed(2)}` : ''}
              </button>`).join('')}
          </div>
        </div>`).join('')}
      <div class="producto-desc">${p.descripcion || ''}</div>
      <div class="producto-stock">
        <div class="stock-dot ${p.stock > 5 ? 'ok' : p.stock > 0 ? 'low' : 'out'}"></div>
        <span>${p.stock > 5 ? 'DISPONIBILE' : p.stock > 0 ? `ULTIME ${p.stock} UNITÀ` : t('sold_out')}</span>
      </div>
      <div class="qty-row">
        <div class="qty-ctrl">
          <button onclick="changeCantidad(-1)">−</button>
          <span id="cantidadDisplay">1</span>
          <button onclick="changeCantidad(1)">+</button>
        </div>
        <button class="add-cart-btn" onclick="addToCartDetalle()" id="addCartBtn" ${p.stock === 0 ? 'disabled' : ''}>
          ${p.stock === 0 ? t('sold_out') : t('add_to_cart')}
        </button>
      </div>
      <div class="producto-meta">
        <div class="meta-row"><span class="meta-key">CATEGORIA</span><span>${p.Categoria ? p.Categoria.nombre : '—'}</span></div>
        <div class="meta-row"><span class="meta-key">MATERIALE</span><span>PLA Premium</span></div>
        <div class="meta-row"><span class="meta-key">RIFERIMENTO</span><span style="font-family:'DM Mono',monospace;font-size:10px">RF-${String(p.id).padStart(4, '0')}</span></div>
        ${tieneVariantes ? `<div class="meta-row"><span class="meta-key">VARIANTI</span><span>${p.variantes.length} opzioni</span></div>` : ''}
      </div>
    </div>`;

  // Reseñas fuera del grid para evitar superposición con elementos sticky
  const view = document.getElementById('view-producto');
  const oldResenas = view.querySelector('.producto-resenas');
  if (oldResenas) oldResenas.remove();
  const resenasEl = document.createElement('div');
  resenasEl.className = 'producto-resenas';
  resenasEl.innerHTML = `
    <div class="section-eyebrow" style="margin-bottom:8px">// Opinioni dei clienti</div>
    <div style="font-family:'Barlow Condensed',sans-serif;font-size:clamp(28px,3vw,40px);font-weight:900;text-transform:uppercase;letter-spacing:-1px;margin-bottom:28px;color:var(--dark)">RECENSIONI</div>
    <div id="resenas-list"><div class="loading" style="padding:20px 0">CARICAMENTO</div></div>
    <div id="resenas-form-wrap" style="margin-top:32px;padding-top:28px;border-top:1px solid var(--border)"></div>`;
  view.appendChild(resenasEl);
}

function switchImg(url, idx) {
  document.getElementById('mainImg').src = url;
  document.querySelectorAll('.galeria-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function selectVariante(tipo, valor, precioExtra, btn) {
  btn.closest('.variantes-grid').querySelectorAll('.variante-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  varianteSeleccionada[tipo] = valor;
  setTxt(`sel-${tipo}`, valor);
  const base = parseFloat(productoActual.precio);
  let extra = 0;
  productoActual.variantes.forEach(v => {
    if (varianteSeleccionada[v.tipo] === v.valor) extra += parseFloat(v.precio_extra || 0);
  });
  setTxt('precioExtra', extra > 0 ? `+€${extra.toFixed(2)}` : '');
  document.getElementById('precioDisplay').childNodes[0].textContent = `€${(base + extra).toFixed(2)}`;
}

function changeCantidad(d) {
  cantidadSeleccionada = Math.max(1, Math.min(cantidadSeleccionada + d, productoActual.stock));
  setTxt('cantidadDisplay', cantidadSeleccionada);
}

function addToCartDetalle() {
  if (!productoActual) return;
  const varianteStr = Object.entries(varianteSeleccionada).map(([k, v]) => `${k}: ${v}`).join(', ');
  const base = parseFloat(productoActual.precio);
  let extra = 0;
  productoActual.variantes && productoActual.variantes.forEach(v => {
    if (varianteSeleccionada[v.tipo] === v.valor) extra += parseFloat(v.precio_extra || 0);
  });
  const precioFinal = base + extra;
  const key = `${productoActual.id}-${varianteStr}`;
  const item = carrito.find(x => x.key === key);
  if (item) item.cantidad += cantidadSeleccionada;
  else carrito.push({ key, producto: productoActual, variante: varianteStr, precio: precioFinal, cantidad: cantidadSeleccionada });
  updateCartUI();
  openCart();
}
