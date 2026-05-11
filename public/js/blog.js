async function loadArticoli() {
  const grid = document.getElementById('articoliGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading" style="background:var(--surface)">...</div>';
  try {
    const r = await fetch(`${API}/articoli`);
    const lista = await r.json();
    if (!lista.length) {
      grid.innerHTML = `<div class="empty-state" style="background:var(--surface)"><div class="ei">✍️</div><h3>${t('blog_no_articles')}</h3><p>${t('blog_no_articles_desc')}</p></div>`;
      return;
    }
    grid.innerHTML = lista.map(a => renderArticoloCard(a)).join('');
  } catch {
    grid.innerHTML = `<div class="empty-state" style="background:var(--surface)"><div class="ei">⚠</div><h3>${t('blog_error')}</h3><p>${t('blog_error_desc')}</p></div>`;
  }
}

function renderArticoloCard(a) {
  const data = new Date(a.createdAt).toLocaleDateString(localeDate(), { day:'numeric', month:'long', year:'numeric' });
  const tagList = a.tags ? a.tags.split(',').map(t => `<span class="pill">${t.trim()}</span>`).join(' ') : '';
  return `
    <div style="background:var(--surface);cursor:pointer;transition:background .2s" onclick="vediArticolo('${a.slug}')"
      onmouseover="this.style.background='var(--dark)';this.querySelectorAll('.art-title,.art-estratto').forEach(e=>e.style.color='#fff')"
      onmouseout="this.style.background='var(--surface)';this.querySelectorAll('.art-title,.art-estratto').forEach(e=>e.style.color='')">
      ${a.immagine ? `<img src="${a.immagine}" alt="${a.titolo}" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block">` :
        `<div style="width:100%;aspect-ratio:16/9;background:var(--surface2);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:40px;color:var(--border)">✍️</div>`}
      <div style="padding:24px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--accent);letter-spacing:2px;margin-bottom:8px">${data}</div>
        <div class="art-title" style="font-family:'Barlow Condensed',sans-serif;font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;color:var(--dark);transition:color .2s">${a.titolo}</div>
        ${a.estratto ? `<div class="art-estratto" style="font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:14px;transition:color .2s">${a.estratto}</div>` : ''}
        <div style="display:flex;gap:4px;flex-wrap:wrap">${tagList}</div>
      </div>
    </div>`;
}

async function vediArticolo(slug) {
  mostraVista('articolo');
  const wrap = document.getElementById('articoloContent');
  wrap.innerHTML = '<div class="loading">CARGANDO</div>';
  try {
    const r = await fetch(`${API}/articoli/${slug}`);
    if (!r.ok) throw new Error('Artículo no encontrado');
    const a = await r.json();

    // Aggiorna URL del browser
    const langPrefix = _urlLang ? `/${_urlLang}` : '';
    history.pushState({ tipo: 'articolo', slug: a.slug }, a.titolo, `${langPrefix}/blog/${a.slug}`);

    renderDettaglioArticolo(a);
  } catch(e) {
    wrap.innerHTML = `<div class="empty-state"><div class="ei">⚠</div><h3>ERROR</h3><p>${e.message}</p></div>`;
  }
}

function renderDettaglioArticolo(a) {
  const wrap = document.getElementById('articoloContent');
  const data = new Date(a.createdAt).toLocaleDateString(localeDate(), { day:'numeric', month:'long', year:'numeric' });
  const tagList = a.tags ? a.tags.split(',').map(t => `<span class="pill">${t.trim()}</span>`).join(' ') : '';

  document.title = a.titolo + ' — RoleFigz';
  document.querySelector('meta[name="description"]')?.setAttribute('content', a.meta_desc || a.estratto || '');

  // Aggiorna og:title e og:image per la condivisione
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', a.titolo + ' — RoleFigz');
  if (a.immagine) document.querySelector('meta[property="og:image"]')?.setAttribute('content', a.immagine);

  const langPrefix = _urlLang ? `/${_urlLang}` : '';
  wrap.innerHTML = `
    <button class="action-btn" onclick="mostraVista('blog');loadArticoli();history.pushState({},'',window.location.pathname.replace(/\\/blog\\/.*$/,''))" style="margin-bottom:32px">← VOLVER AL BLOG</button>
    <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--accent);letter-spacing:3px;margin-bottom:12px">${data}</div>
    <h1 style="font-family:'Barlow Condensed',sans-serif;font-size:clamp(40px,6vw,72px);font-weight:900;text-transform:uppercase;letter-spacing:-1px;line-height:.9;margin-bottom:24px;color:var(--dark)">${a.titolo}</h1>
    ${a.estratto ? `<p style="font-size:18px;color:var(--muted);line-height:1.7;margin-bottom:32px;padding-bottom:32px;border-bottom:1px solid var(--border)">${a.estratto}</p>` : ''}
    ${tagList ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:32px">${tagList}</div>` : ''}
    ${a.immagine ? `<img src="${a.immagine}" alt="${a.titolo}" style="width:100%;max-height:480px;object-fit:cover;margin-bottom:40px;display:block">` : ''}
    <div class="ql-snow"><div class="ql-editor" style="padding:0;font-size:16px;line-height:1.9;color:var(--text)">${a.contenuto}</div></div>
    <div style="margin-top:48px;padding-top:32px;border-top:1px solid var(--border)">
      <button class="action-btn" onclick="mostraVista('blog');loadArticoli();history.pushState({},'',window.location.pathname.replace(/\\/blog\\/.*$/,''))">← VOLVER AL BLOG</button>
    </div>`;
}
