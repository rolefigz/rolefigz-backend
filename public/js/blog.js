let tuttiGliArticoli = [];
let tagAttivo = null;

function tempoLettura(html) {
  const parole = html ? html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length : 0;
  return `${Math.max(1, Math.round(parole / 200))} min`;
}

async function loadArticoli() {
  const wrap = document.getElementById('blogWrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="loading" style="padding:80px">CARICAMENTO ARTICOLI</div>';
  try {
    const r = await fetch(`${API}/articoli`);
    const lista = await r.json();
    tuttiGliArticoli = lista;
    renderBlog(lista);
  } catch {
    wrap.innerHTML = '<div class="empty-state"><div class="ei">⚠</div><h3>ERRORE</h3><p>Impossibile caricare gli articoli.</p></div>';
  }
}

function renderBlog(lista) {
  const wrap = document.getElementById('blogWrap');
  if (!wrap) return;

  if (!lista.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="ei">✍️</div><h3>NESSUN ARTICOLO</h3><p>Non ci sono ancora articoli pubblicati.</p></div>';
    return;
  }

  const tuttiTag = [...new Set(
    tuttiGliArticoli.flatMap(a => a.tags ? a.tags.split(',').map(t => t.trim()).filter(Boolean) : [])
  )];

  const tagBar = tuttiTag.length > 1 ? `
    <div class="blog-tags-bar">
      <button class="blog-tag ${!tagAttivo ? 'active' : ''}" onclick="filtraBlogTag(null,this)">TUTTI</button>
      ${tuttiTag.map(t => `<button class="blog-tag ${tagAttivo === t ? 'active' : ''}" onclick="filtraBlogTag('${t}',this)">${t.toUpperCase()}</button>`).join('')}
    </div>` : '';

  const [featured, ...resto] = lista;
  wrap.innerHTML = tagBar + renderFeatured(featured) + (
    resto.length ? `<div class="blog-grid">${resto.map(renderCard).join('')}</div>` : ''
  );
}

function filtraBlogTag(tag, btnEl) {
  tagAttivo = tag;
  document.querySelectorAll('.blog-tag').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  renderBlog(tag ? tuttiGliArticoli.filter(a => a.tags && a.tags.includes(tag)) : tuttiGliArticoli);
}

function renderFeatured(a) {
  const data = new Date(a.createdAt).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' });
  const lettura = tempoLettura(a.contenuto || a.estratto || '');
  return `
    <div class="blog-featured" onclick="vediArticolo('${a.slug}')">
      <div class="blog-featured-img-wrap">
        ${a.immagine
          ? `<img class="blog-featured-img" src="${a.immagine}" alt="${a.titolo}" loading="lazy">`
          : `<div class="blog-featured-ph">✍️</div>`}
      </div>
      <div class="blog-featured-body">
        <div class="bf-label">// IN EVIDENZA</div>
        <div class="bf-date">${data} · ${lettura} di lettura</div>
        <div class="bf-title">${a.titolo}</div>
        ${a.estratto ? `<div class="bf-excerpt">${a.estratto}</div>` : ''}
        <div class="bf-read">LEGGI L'ARTICOLO →</div>
      </div>
    </div>`;
}

function renderCard(a) {
  const data = new Date(a.createdAt).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' });
  const lettura = tempoLettura(a.estratto || a.contenuto || '');
  const tags = a.tags ? a.tags.split(',').map(t => `<span class="pill">${t.trim()}</span>`).join('') : '';
  return `
    <div class="blog-card" onclick="vediArticolo('${a.slug}')">
      <div class="blog-card-img-wrap">
        ${a.immagine
          ? `<img class="blog-card-img" src="${a.immagine}" alt="${a.titolo}" loading="lazy">`
          : `<div class="blog-card-ph">✍️</div>`}
      </div>
      <div class="blog-card-body">
        <div class="bc-meta">
          <span class="bc-date">${data}</span>
          <span class="bc-read">${lettura} di lettura</span>
        </div>
        <div class="bc-title">${a.titolo}</div>
        ${a.estratto ? `<div class="bc-excerpt">${a.estratto}</div>` : ''}
        <div class="bc-tags">${tags}</div>
      </div>
    </div>`;
}

async function vediArticolo(slug) {
  mostraVista('articolo');
  const wrap = document.getElementById('articoloContent');
  wrap.innerHTML = '<div class="loading" style="padding:100px">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/articoli/${slug}`);
    if (!r.ok) throw new Error('Articolo non trovato');
    const a = await r.json();
    history.pushState({ tipo: 'articolo', slug: a.slug }, a.titolo, `/blog/${a.slug}`);
    renderDettaglioArticolo(a);
  } catch(e) {
    wrap.innerHTML = `<div class="empty-state"><div class="ei">⚠</div><h3>ERRORE</h3><p>${e.message}</p></div>`;
  }
}

function renderDettaglioArticolo(a) {
  const wrap = document.getElementById('articoloContent');
  const data = new Date(a.createdAt).toLocaleDateString('it-IT', { day:'numeric', month:'long', year:'numeric' });
  const lettura = tempoLettura(a.contenuto || '');
  const tags = a.tags ? a.tags.split(',').map(t => `<span class="pill">${t.trim()}</span>`).join('') : '';
  const url = `https://www.rolefigz.com/blog/${a.slug}`;

  document.title = `${a.titolo} — RoleFigz`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', a.meta_desc || a.estratto || '');
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${a.titolo} — RoleFigz`);
  if (a.immagine) document.querySelector('meta[property="og:image"]')?.setAttribute('content', a.immagine);

  const correlati = tuttiGliArticoli.filter(x => x.slug !== a.slug).slice(0, 3);
  const correlatiHtml = correlati.length ? `
    <div class="art-related">
      <div class="art-related-label">// ALTRI ARTICOLI</div>
      <div class="art-related-grid">
        ${correlati.map(c => `
          <div class="art-related-card" onclick="vediArticolo('${c.slug}')">
            <div class="arc-date">${new Date(c.createdAt).toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'})}</div>
            <div class="arc-title">${c.titolo}</div>
          </div>`).join('')}
      </div>
    </div>` : '';

  wrap.innerHTML = `
    <div class="art-wrap">
      <button class="art-back-btn" onclick="mostraVista('blog');loadArticoli();history.pushState({},'','/');tagAttivo=null">
        ← TORNA AL BLOG
      </button>
      <div class="art-eyebrow">// Blog · RoleFigz</div>
      <h1 class="art-h1">${a.titolo}</h1>
      <div class="art-meta">
        <span>${data}</span>
        <span style="color:var(--border)">·</span>
        <span>${lettura} di lettura</span>
        ${tags ? `<span style="color:var(--border)">·</span><div style="display:flex;gap:4px;flex-wrap:wrap">${tags}</div>` : ''}
      </div>
      ${a.estratto ? `<p class="art-excerpt">${a.estratto}</p>` : ''}
      ${a.immagine ? `<img class="art-hero-img" src="${a.immagine}" alt="${a.titolo}" loading="lazy">` : ''}
      <div class="art-body">${a.contenuto || ''}</div>
      <div class="art-share">
        <span class="art-share-label">CONDIVIDI</span>
        <button class="art-share-btn wa" onclick="window.open('https://wa.me/?text=${encodeURIComponent(a.titolo + ' ' + url)}','_blank')">
          <iconify-icon icon="mdi:whatsapp" width="13"></iconify-icon> WhatsApp
        </button>
        <button class="art-share-btn" onclick="copiaLinkArticolo('${url}',this)">
          <iconify-icon icon="mdi:link-variant" width="13"></iconify-icon> Copia link
        </button>
      </div>
      ${correlatiHtml}
    </div>`;
}

function copiaLinkArticolo(url, btn) {
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<iconify-icon icon="mdi:check" width="13"></iconify-icon> Copiato!';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  }).catch(() => {});
}
