function aggiungiAlCarrello(id) {
  const p = prodotti.find(x => x.id === id);
  if (!p || p.stock === 0) return;
  const item = carrello.find(x => x.key === `${id}-`);
  if (item) {
    if (item.quantita < p.stock) item.quantita++;
  } else {
    carrello.push({ key: `${id}-`, prodotto: p, variante: '', prezzo: parseFloat(p.precio), quantita: 1 });
  }
  aggiornaUICarrello();
  apriCarrello();
}

function rimuoviDalCarrello(key) {
  carrello = carrello.filter(x => x.key !== key);
  aggiornaUICarrello();
  renderArticoliCarrello();
}

function cambiaQuantita(key, d) {
  const item = carrello.find(x => x.key === key);
  if (!item) return;
  item.quantita += d;
  if (item.quantita <= 0) rimuoviDalCarrello(key);
  else { aggiornaUICarrello(); renderArticoliCarrello(); }
}

function totaleCarrello() {
  return carrello.reduce((s, i) => s + i.prezzo * i.quantita, 0);
}

function contatoreCarrello() {
  return carrello.reduce((s, i) => s + i.quantita, 0);
}

function aggiornaUICarrello() {
  const n = contatoreCarrello();
  const badge = document.getElementById('cartBadge');
  badge.textContent = n;
  badge.className = n > 0 ? 'cart-badge on' : 'cart-badge';
  setTxt('cartTotal', `€${totaleCarrello().toFixed(2)}`);
  setTxt('cartCount', n > 0 ? `${n} ${n === 1 ? 'ARTICOLO' : 'ARTICOLI'}` : t('cart_empty').replace('// ', ''));
  document.getElementById('checkoutBtn').disabled = n === 0;
}

function renderArticoliCarrello() {
  const el = document.getElementById('cartItems');
  if (!carrello.length) {
    el.innerHTML = `<div class="drawer-empty">${t('cart_empty')}</div>`;
    return;
  }
  el.innerHTML = carrello.map(i => `
    <div class="ci">
      <div class="ci-thumb">
        ${i.prodotto.imagen ? `<img src="${i.prodotto.imagen}" alt="">` : i.prodotto.nombre.substring(0, 2).toUpperCase()}
      </div>
      <div>
        <div class="ci-name">${i.prodotto.nombre}</div>
        ${i.variante ? `<div class="ci-variant">${i.variante}</div>` : ''}
        ${i.fotoCliente ? `<div style="margin-top:5px"><img src="${i.fotoCliente}" style="width:36px;height:36px;object-fit:cover;border:1px solid var(--border);border-radius:2px" title="Foto cliente"/><span style="font-family:'DM Mono',monospace;font-size:8px;color:var(--muted);margin-left:5px;letter-spacing:1px;vertical-align:super">FOTO</span></div>` : ''}
        ${i.dataConsegna ? `<div style="font-family:'DM Mono',monospace;font-size:8px;color:var(--muted);margin-top:4px;letter-spacing:1px">📅 ${new Date(i.dataConsegna + 'T00:00:00').toLocaleDateString('it-IT')}${i.supplementoExpress > 0 ? ` <span style="color:var(--accent)">+€${i.supplementoExpress.toFixed(2)} express</span>` : ''}</div>` : ''}
        <div class="ci-price">€${i.prezzo.toFixed(2)} / ud</div>
        <div class="ci-qty">
          <button class="q-btn" onclick="cambiaQuantita('${i.key}', -1)">−</button>
          <span class="q-val">${i.quantita}</span>
          <button class="q-btn" onclick="cambiaQuantita('${i.key}', 1)">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <button class="ci-del" onclick="rimuoviDalCarrello('${i.key}')">✕</button>
        <div class="ci-sub">€${(i.prezzo * i.quantita).toFixed(2)}</div>
      </div>
    </div>`).join('');
}

function apriCarrello() {
  renderArticoliCarrello();
  document.getElementById('cartDrawer').classList.add('on');
  document.getElementById('cartOverlay').classList.add('on');
}

function chiudiCarrello() {
  document.getElementById('cartDrawer').classList.remove('on');
  document.getElementById('cartOverlay').classList.remove('on');
}
