function openCheckout() {
  closeCart();
  if (usuario) {
    document.getElementById('chkNombre').value = usuario.nombre || '';
    document.getElementById('chkEmail').value  = usuario.email  || '';
  }
  // Prefijo por defecto según idioma actual
  const prefijo = document.getElementById('chkPrefijo');
  if (prefijo && !prefijo.dataset.set) {
    if (currentLang === 'es') prefijo.value = '+34';
    else prefijo.value = '+39';
    prefijo.dataset.set = '1';
  }
  document.getElementById('orderSummary').innerHTML = `
    <div class="osummary-title">// RIEPILOGO</div>
    ${carrito.map(i => `
      <div class="oline">
        <span>${i.producto.nombre}${i.variante ? ` (${i.variante})` : ''} × ${i.cantidad}</span>
        <span>€${(i.precio * i.cantidad).toFixed(2)}</span>
      </div>`).join('')}
    <div class="ototal"><span>TOTALE</span><span>€${cartTotal().toFixed(2)}</span></div>`;
  document.getElementById('checkoutModal').classList.add('on');
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('on');
}

async function confirmarPedido() {
  const nome  = document.getElementById('chkNombre').value.trim();
  const email = document.getElementById('chkEmail').value.trim();
  if (!nome || !email) {
    showMsg('checkoutMsg', 'Nome e email obbligatori', 'err');
    return;
  }

  const btn = document.getElementById('confirmarBtn');
  btn.disabled    = true;
  btn.textContent = '...';

  try {
    const r = await fetch(`${API}/pagos/crear-sesion`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        nombre_cliente: nome,
        email_cliente:  email,
        telefono:       ((document.getElementById('chkPrefijo')?.value || '') + ' ' + (document.getElementById('chkTelNumero')?.value || '')).trim(),
        direccion:      document.getElementById('chkDireccion').value,
        notas:          document.getElementById('chkNotas').value,
        items: carrito.map(i => ({
          producto_id:   i.producto.id,
          cantidad:      i.cantidad,
          precio_unidad: i.precio,
          variante:      i.variante || null
        }))
      })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    // Redirigir a la página de pago de Stripe
    carrito = [];
    updateCartUI();
    window.location.href = data.url;

  } catch(e) {
    showMsg('checkoutMsg', e.message, 'err');
    btn.disabled    = false;
    btn.textContent = t('checkout_confirm');
  }
}
