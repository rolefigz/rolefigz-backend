function apriMenuNav() {
  document.getElementById('navPanel').classList.add('on');
  document.getElementById('navOverlay').classList.add('on');
}

function chiudiMenuNav() {
  document.getElementById('navPanel').classList.remove('on');
  document.getElementById('navOverlay').classList.remove('on');
}

function showMsg(id, testo, tipo) {
  const el = document.getElementById(id);
  if (el) { el.className = `msg ${tipo}`; el.textContent = testo; }
}

function setTxt(id, testo) {
  const el = document.getElementById(id);
  if (el) el.textContent = testo;
}

function setSd(id, cls) {
  const el = document.getElementById(id);
  if (el) el.className = `sd ${cls}`;
}

function mostraVista(nome) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${nome}`).classList.add('active');
  if (nome === 'admin') adminTab('ordenes', document.querySelector('.admin-menu-item'));
  if (nome === 'perfil') tabProfilo('ordenes', document.querySelector('.perfil-menu-item'));
}

async function verificaAPI() {
  setSd('apiDot', 'ok'); setTxt('apiStatus', 'API CONNESSA');
}

function renderCategorie() {
  const el = document.getElementById('catsGrid');
  if (!el || !categorie.length) return;
  const icone = ['mdi:drama-masks','mdi:office-building-outline','mdi:gamepad-variant-outline','mdi:lightbulb-outline','mdi:printer-3d','mdi:star-four-points-outline','mdi:gift-outline','mdi:lightning-bolt'];
  el.innerHTML = categorie.map((c, i) => `
    <button class="cat-card" onclick="filtraPerCategoria(${c.id})">
      <div class="cat-icon"><iconify-icon icon="${icone[i % icone.length]}" width="28"></iconify-icon></div>
      <div class="cat-name">${c.nombre}</div>
      <div class="cat-count">${c.descripcion || '— productos'}</div>
    </button>`).join('') +
    `<button class="cat-card" onclick="filtraPerCategoria(null)">
      <div class="cat-icon">🗂️</div>
      <div class="cat-name">CATALOGO</div>
      <div class="cat-count">tutti i prodotti</div>
    </button>`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await verificaAPI();
  await caricaCategorie();
  await caricaProdotti();
  aggiornaUICarrello();
  impostaLingua(linguaCorrente);
  verificaToken();
  if (token) {
    try {
      utente = JSON.parse(atob(token.split('.')[1]));
      impostaSessione(utente);
    } catch(e) { disconnetti(); }
  }
  setInterval(verificaToken, 5 * 60 * 1000);
  if (document.getElementById('resenasDestacadas')) caricaRecensioniInEvidenza();
  gestisciRitornoStripe();

  const percorso = window.location.pathname;
  const blogMatch = percorso.match(/\/blog\/([^/]+)/);
  if (blogMatch) {
    await vediArticolo(blogMatch[1]);
  } else if (percorso.match(/\/producto\/([^/]+)/)) {
    const slug = percorso.match(/\/producto\/([^/]+)/)[1];
    if (slug) await vediProdotto(slug);
  } else {
    tracciVisita('home');
  }

  window.addEventListener('popstate', (e) => {
    if (e.state?.tipo === 'articolo') {
      vediArticolo(e.state.slug);
    } else if (e.state?.tipo === 'producto') {
      vediProdotto(e.state.slug);
    } else if (e.state?.tipo === 'checkout') {
      mostraVista('checkout');
    } else {
      mostraVista('tienda');
      document.title = 'RoleFigz — Stampa 3D & Personalizzazione';
    }
  });
});

function tracciVisita(tipo, prodottoId) {
  if (utente && utente.rol === 'admin') return;
  fetch(`${API}/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, producto_id: prodottoId || null })
  }).catch(() => {});
}

function gestisciRitornoStripe() {
  const params  = new URLSearchParams(window.location.search);
  const pago    = params.get('pago');
  if (!pago) return;

  history.replaceState({}, '', '/index.html');

  if (pago === 'ok') {
    const ordineId = params.get('orden_id');
    const sid      = params.get('sid');
    mostraBannerPagamento(true, ordineId);
    caricaProdotti();
    if (ordineId && sid) {
      fetch(`${API}/pagos/confirmar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orden_id: parseInt(ordineId), session_id: sid })
      })
      .then(r => r.json())
      .then(data => {
        if (data.tracking_number) mostraBannerTracking(ordineId, data.tracking_number);
      })
      .catch(() => {});
    }
  } else if (pago === 'cancelado') {
    mostraBannerPagamento(false, null);
  }
}

function mostraBannerPagamento(successo, ordineId) {
  const banner = document.createElement('div');
  banner.className = 'stripe-banner ' + (successo ? 'ok' : 'err');
  banner.innerHTML = successo
    ? `✅ Pagamento confermato! Ordine <strong>#${ordineId}</strong> — controlla la tua email.`
    : `❌ Pagamento annullato.`;
  document.body.prepend(banner);
  setTimeout(() => banner.remove(), 7000);
}

function mostraBannerTracking(ordineId, trackingNumber) {
  const banner = document.createElement('div');
  banner.className = 'stripe-banner ok';
  banner.style.cssText = 'top:70px;font-size:13px';
  banner.innerHTML = `📦 Ordine <strong>#${ordineId}</strong> spedito. Tracking: <strong style="letter-spacing:1px;font-family:monospace">${trackingNumber}</strong>`;
  document.body.prepend(banner);
  setTimeout(() => banner.remove(), 12000);
}
