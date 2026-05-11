function pillStato(e) {
  return { pendiente: 'orange', confirmado: 'blue', enviado: 'blue', entregado: 'green', cancelado: 'red' }[e] || '';
}

function renderOrdineProfilo(o) {
  const STEPS = [
    { key: 'confirmado', label: 'Confirmado',  icon: '✓' },
    { key: 'confirmado', label: 'En proceso',  icon: '⚙' },
    { key: 'enviado',    label: 'Enviado',     icon: '📦' },
    { key: 'entregado',  label: 'Entregado',   icon: '✓' },
  ];
  const stepIndex = { pendiente: 0, confirmado: 1, enviado: 2, entregado: 3, cancelado: -1 };
  const currentStep = o.estado === 'cancelado' ? -1 : (stepIndex[o.estado] ?? 0);

  const stepperHtml = o.estado === 'cancelado'
    ? `<div class="pill" style="color:var(--accent);border-color:var(--accent);margin-bottom:20px">PEDIDO CANCELADO</div>`
    : `<div class="ocv2-stepper">
        ${STEPS.map((s, i) => {
          const done   = i < currentStep;
          const active = i === currentStep;
          return `<div class="ocv2-step ${done ? 'done' : ''} ${active ? 'active' : ''}">
            ${i < STEPS.length - 1 ? '' : ''}
            <div class="ocv2-step-dot">${done ? '✓' : (active ? s.icon : '')}</div>
            <div class="ocv2-step-label">${s.label}</div>
          </div>`;
        }).join('')}
      </div>`;

  const itemsHtml = (o.detalles && o.detalles.length)
    ? o.detalles.map(d => `
        <div class="ocv2-item">
          <img class="ocv2-item-img" src="${d.Prodotto?.imagen || ''}" alt="${d.Prodotto?.nombre || ''}"
            onerror="this.style.display='none'"/>
          <div class="ocv2-item-info">
            <div class="ocv2-item-name">${d.Prodotto?.nombre || 'Producto'}</div>
            ${d.variante ? `<div class="ocv2-item-meta">${d.variante}</div>` : ''}
            ${d.data_consegna ? `<div class="ocv2-item-meta">📅 Produzione: ${new Date(d.data_consegna).toLocaleDateString(localeDate())}${parseFloat(d.supplemento_express||0)>0?` · +€${parseFloat(d.supplemento_express).toFixed(2)} express`:''}</div>` : ''}
            <div class="ocv2-item-qty">Cant.: ${d.cantidad}</div>
          </div>
          <div class="ocv2-item-price">€${parseFloat(d.subtotal).toFixed(2)}</div>
        </div>`).join('')
    : '<div style="font-family:\'DM Mono\',monospace;font-size:10px;color:var(--muted)">—</div>';

  const trackingHtml = o.estado === 'cancelado' ? '' : `
    <div class="ocv2-tracking" style="${o.tracking_number ? '' : 'border-color:var(--border);background:var(--surface2)'}">
      <div class="ocv2-tracking-icon">${o.tracking_number ? '🚚' : '⏳'}</div>
      <div>
        <div class="ocv2-tracking-label" style="${o.tracking_number ? '' : 'color:var(--muted)'}">
          ${o.tracking_number && o.carrier ? o.carrier + ' · ' : ''}Tracking No.
        </div>
        <div class="ocv2-tracking-num" style="${o.tracking_number ? '' : 'color:var(--muted);font-size:10px;font-weight:400;letter-spacing:0'}">
          ${o.tracking_number || 'In attesa di spedizione'}
        </div>
      </div>
    </div>`;

  const prodTotale = parseFloat(o.total) - parseFloat(o.costo_spedizione || 0);
  const sideHtml = `
    <div class="ocv2-summary-title">Dettagli del pagamento</div>
    <div class="ocv2-summary-row"><span>Subtotal</span><span>€${prodTotale.toFixed(2)}</span></div>
    ${parseFloat(o.costo_spedizione||0) > 0 ? `<div class="ocv2-summary-row"><span>Spedizione${o.carrier ? ` (${o.carrier})` : ''}</span><span>€${parseFloat(o.costo_spedizione).toFixed(2)}</span></div>` : ''}
    <div class="ocv2-summary-total">
      <span>Totale</span>
      <span>€${parseFloat(o.total).toFixed(2)}</span>
    </div>
    ${o.direccion ? `
    <div class="ocv2-address">
      <div class="ocv2-address-title">Indirizzo di spedizione</div>
      ${o.direccion.split(',').map(r => `<div class="ocv2-address-line">${r.trim()}</div>`).join('')}
    </div>` : ''}
    ${o.notas ? `
    <div class="ocv2-address" style="margin-top:14px">
      <div class="ocv2-address-title">Note</div>
      <div class="ocv2-address-line" style="color:var(--muted)">${o.notas}</div>
    </div>` : ''}`;

  return `
    <div class="ocv2">
      <div class="ocv2-header">
        <div class="ocv2-header-left">
          <div class="ocv2-id">Ordine #${o.id}</div>
          <div class="ocv2-date">${new Date(o.createdAt).toLocaleDateString(localeDate(), { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
        </div>
        <span class="pill ${pillStato(o.estado)}">${o.estado.toUpperCase()}</span>
      </div>
      <div class="ocv2-body">
        <div class="ocv2-main">
          ${stepperHtml}
          <div class="ocv2-items-title">Articoli ordinati e dettagli di spedizione</div>
          ${itemsHtml}
          ${trackingHtml}
        </div>
        <div class="ocv2-side">${sideHtml}</div>
      </div>
    </div>`;
}

async function tabProfilo(tab, el) {
  document.querySelectorAll('.perfil-menu-item').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
  const content = document.getElementById('perfilContent');

  if (tab === 'ordenes') {
    content.innerHTML = '<div class="loading">CARGANDO</div>';
    try {
      const r = await fetch(`${API}/auth/mis-ordenes`, { headers: { Authorization: `Bearer ${token}` } });
      const lista = await r.json();
      if (!lista.length) {
        content.innerHTML = '<div class="empty-state"><div class="ei">📋</div><h3>SIN PEDIDOS</h3></div>';
        return;
      }
      content.innerHTML = `
        <div class="perfil-section-title">${t('perfil_orders').toUpperCase()} (${lista.length})</div>
        ${lista.map(o => renderOrdineProfilo(o)).join('')}`;
    } catch { content.innerHTML = '<div class="msg err">Error</div>'; }
  }

  if (tab === 'datos') {
    content.innerHTML = '<div class="loading">CARGANDO</div>';
    try {
      const r = await fetch(`${API}/auth/perfil`, { headers: { Authorization: `Bearer ${token}` } });
      const u = await r.json();
      content.innerHTML = `
        <div class="perfil-section-title">${t('perfil_data').toUpperCase()}</div>
        <div class="field"><label>${t('field_name')}</label><input type="text" id="editNombre" value="${u.nombre || ''}"/></div>
        <div class="field"><label>${t('field_email')}</label><input type="email" value="${u.email}" disabled style="opacity:.5"/></div>
        <div class="field"><label>${t('field_phone')}</label><input type="tel" id="editTelefono" value="${u.telefono || ''}"/></div>
        <div class="field"><label>${t('field_address')}</label><textarea id="editDireccion">${u.direccion || ''}</textarea></div>
        <button class="btn-submit" onclick="salvaProfilo()">${t('save')}</button>
        <div id="perfilMsg"></div>`;
    } catch { content.innerHTML = '<div class="msg err">Error</div>'; }
  }
}

async function salvaProfilo() {
  try {
    const r = await fetch(`${API}/auth/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nombre:    document.getElementById('editNombre').value,
        telefono:  document.getElementById('editTelefono').value,
        direccion: document.getElementById('editDireccion').value
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    utente.nombre = data.usuario.nombre;
    setTxt('perfilNombre', data.usuario.nombre);
    const el = document.getElementById('perfilAvatar');
    if (el) el.textContent = data.usuario.nombre.charAt(0).toUpperCase();
    showMsg('perfilMsg', '✓ Perfil actualizado', 'ok');
  } catch(e) {
    showMsg('perfilMsg', e.message, 'err');
  }
}
