function addToCart(id) {
  const p = productos.find(x => x.id === id);
  if (!p || p.stock === 0) return;
  const item = carrito.find(x => x.key === `${id}-`);
  if (item) {
    if (item.cantidad < p.stock) item.cantidad++;
  } else {
    carrito.push({ key: `${id}-`, producto: p, variante: '', precio: parseFloat(p.precio), cantidad: 1 });
  }
  updateCartUI();
  openCart();
}

function removeFromCart(key) {
  carrito = carrito.filter(x => x.key !== key);
  updateCartUI();
  renderCartItems();
}

function changeQty(key, d) {
  const item = carrito.find(x => x.key === key);
  if (!item) return;
  item.cantidad += d;
  if (item.cantidad <= 0) removeFromCart(key);
  else { updateCartUI(); renderCartItems(); }
}

function cartTotal() {
  return carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
}

function cartCount() {
  return carrito.reduce((s, i) => s + i.cantidad, 0);
}

function updateCartUI() {
  const n = cartCount();
  const badge = document.getElementById('cartBadge');
  badge.textContent = n;
  badge.className = n > 0 ? 'cart-badge on' : 'cart-badge';
  setTxt('cartTotal', `€${cartTotal().toFixed(2)}`);
  setTxt('cartCount', n > 0 ? `${n} ${n === 1 ? 'ARTICOLO' : 'ARTICOLI'}` : t('cart_empty').replace('// ', ''));
  document.getElementById('checkoutBtn').disabled = n === 0;
}

function renderCartItems() {
  const el = document.getElementById('cartItems');
  if (!carrito.length) {
    el.innerHTML = `<div class="drawer-empty">${t('cart_empty')}</div>`;
    return;
  }
  el.innerHTML = carrito.map(i => `
    <div class="ci">
      <div class="ci-thumb">
        ${i.producto.imagen ? `<img src="${i.producto.imagen}" alt="">` : i.producto.nombre.substring(0, 2).toUpperCase()}
      </div>
      <div>
        <div class="ci-name">${i.producto.nombre}</div>
        ${i.variante ? `<div class="ci-variant">${i.variante}</div>` : ''}
        <div class="ci-price">€${i.precio.toFixed(2)} / ud</div>
        <div class="ci-qty">
          <button class="q-btn" onclick="changeQty('${i.key}', -1)">−</button>
          <span class="q-val">${i.cantidad}</span>
          <button class="q-btn" onclick="changeQty('${i.key}', 1)">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <button class="ci-del" onclick="removeFromCart('${i.key}')">✕</button>
        <div class="ci-sub">€${(i.precio * i.cantidad).toFixed(2)}</div>
      </div>
    </div>`).join('');
}

function openCart() {
  renderCartItems();
  document.getElementById('cartDrawer').classList.add('on');
  document.getElementById('cartOverlay').classList.add('on');
}

function closeCart() {
  document.getElementById('cartDrawer').classList.remove('on');
  document.getElementById('cartOverlay').classList.remove('on');
}
