function openNavPanel() {
  document.getElementById('navPanel').classList.add('on');
  document.getElementById('navOverlay').classList.add('on');
}

function closeNavPanel() {
  document.getElementById('navPanel').classList.remove('on');
  document.getElementById('navOverlay').classList.remove('on');
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (el) { el.className = `msg ${type}`; el.textContent = text; }
}

function setTxt(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setSd(id, cls) {
  const el = document.getElementById(id);
  if (el) el.className = `sd ${cls}`;
}

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  if (name === 'admin') adminTab('ordenes', document.querySelector('.admin-menu-item'));
  if (name === 'perfil') perfilTab('ordenes', document.querySelector('.perfil-menu-item'));
}

async function checkAPI() {
  try {
    const r = await fetch('http://localhost:3000/');
    if (r.ok) { setSd('apiDot', 'ok'); setTxt('apiStatus', t('status_api')); }
  } catch { setSd('apiDot', 'err'); setTxt('apiStatus', 'API OFFLINE'); }
}

function renderCats() {
  const el = document.getElementById('catsGrid');
  if (!el || !categorias.length) return;
  const icons = ['mdi:drama-masks','mdi:office-building-outline','mdi:gamepad-variant-outline','mdi:lightbulb-outline','mdi:printer-3d','mdi:star-four-points-outline','mdi:gift-outline','mdi:lightning-bolt'];
  el.innerHTML = categorias.map((c, i) => `
    <button class="cat-card" onclick="filterByCategory(${c.id})">
      <div class="cat-icon"><iconify-icon icon="${icons[i % icons.length]}" width="28"></iconify-icon></div>
      <div class="cat-name">${c.nombre}</div>
      <div class="cat-count">${c.descripcion || '— prodotti'}</div>
    </button>`).join('') +
    `<button class="cat-card" onclick="filterByCategory(null)">
      <div class="cat-icon">🗂️</div>
      <div class="cat-name" data-i18n="catalogue_title">${t('catalogue_title')}</div>
      <div class="cat-count">tutti i prodotti</div>
    </button>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await checkAPI();
  await loadCats();
  await loadProductos();
  updateCartUI();
  setLang(currentLang);
  checkTokenValidity();
  if (token) {
    try {
      usuario = JSON.parse(atob(token.split('.')[1]));
      setLoggedIn(usuario);
    } catch(e) { doLogout(); }
  }
  setInterval(checkTokenValidity, 5 * 60 * 1000);
  if (document.getElementById('resenasDestacadas')) loadResenasDestacadas();
  manejarRetornoStripe();

  const pagePath = window.location.pathname;
  if (pagePath.startsWith('/producto/')) {
    const slug = pagePath.replace('/producto/', '').split('/')[0];
    if (slug) await verProducto(slug);
  } else {
    trackVisita('home');
  }

  window.addEventListener('popstate', (e) => {
    if (e.state?.tipo === 'producto') {
      verProducto(e.state.slug);
    } else {
      showView('tienda');
      document.title = 'RoleFigz — Stampa 3D & Personalizzazione';
    }
  });
});

function trackVisita(tipo, productoId) {
  if (usuario && usuario.rol === 'admin') return;
  fetch(`${API}/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, producto_id: productoId || null })
  }).catch(() => {});
}

function manejarRetornoStripe() {
  const params  = new URLSearchParams(window.location.search);
  const pago    = params.get('pago');
  if (!pago) return;

  history.replaceState({}, '', '/index.html');

  if (pago === 'ok') {
    const ordenId = params.get('orden_id');
    const sid     = params.get('sid');
    mostrarBannerPago(true, ordenId);
    loadProductos();
    if (ordenId && sid) {
      fetch(`${API}/pagos/confirmar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orden_id: parseInt(ordenId), session_id: sid })
      }).catch(() => {});
    }
  } else if (pago === 'cancelado') {
    mostrarBannerPago(false, null);
  }
}

function mostrarBannerPago(exito, ordenId) {
  const banner = document.createElement('div');
  banner.className = 'stripe-banner ' + (exito ? 'ok' : 'err');
  banner.innerHTML = exito
    ? `✅ Pagamento confermato! Ordine <strong>#${ordenId}</strong> — controlla la tua email.`
    : `❌ Pagamento annullato. Il tuo carrello è stato svuotato.`;
  document.body.prepend(banner);
  setTimeout(() => banner.remove(), 7000);
}
