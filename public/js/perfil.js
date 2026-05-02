function estadoPill(e) {
  return { pendiente: 'orange', confirmado: 'blue', enviado: 'blue', entregado: 'green', cancelado: 'red' }[e] || '';
}

async function perfilTab(tab, el) {
  document.querySelectorAll('.perfil-menu-item').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
  const content = document.getElementById('perfilContent');

  if (tab === 'ordenes') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const r = await fetch(`${API}/auth/mis-ordenes`, { headers: { Authorization: `Bearer ${token}` } });
      const list = await r.json();
      if (!list.length) {
        content.innerHTML = '<div class="empty-state"><div class="ei">📋</div><h3>NESSUN ORDINE</h3></div>';
        return;
      }
      content.innerHTML = `
        <div class="perfil-section-title">${t('perfil_orders').toUpperCase()} (${list.length})</div>
        ${list.map(o => `
          <div class="orden-card">
            <div class="orden-card-header" onclick="this.nextElementSibling.classList.toggle('open')">
              <div>
                <div class="orden-card-id">#${o.id}</div>
                <div class="orden-card-info">
                  ${new Date(o.createdAt).toLocaleDateString('it-IT')} ·
                  <span class="pill ${estadoPill(o.estado)}">${o.estado.toUpperCase()}</span>
                </div>
              </div>
              <div class="orden-card-total">€${parseFloat(o.total).toFixed(2)}</div>
            </div>
            <div class="orden-card-body">
              ${o.detalles && o.detalles.length
                ? o.detalles.map(d => `
                    <div class="orden-detail-line">
                      <span>
                        ${d.Producto ? d.Producto.nombre : 'Prodotto'} × ${d.cantidad}
                        ${d.variante ? `<span style="font-family:'DM Mono',monospace;font-size:8px;color:var(--muted);display:block;margin-top:2px;letter-spacing:1px">${d.variante}</span>` : ''}
                      </span>
                      <span>€${parseFloat(d.subtotal).toFixed(2)}</span>
                    </div>`).join('')
                : '—'}
              ${o.direccion ? `<div style="margin-top:8px;font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">📍 ${o.direccion}</div>` : ''}
            </div>
          </div>`).join('')}`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }

  if (tab === 'datos') {
    content.innerHTML = '<div class="loading">CARICAMENTO</div>';
    try {
      const r = await fetch(`${API}/auth/perfil`, { headers: { Authorization: `Bearer ${token}` } });
      const u = await r.json();
      content.innerHTML = `
        <div class="perfil-section-title">${t('perfil_data').toUpperCase()}</div>
        <div class="field"><label>${t('field_name')}</label><input type="text" id="editNombre" value="${u.nombre || ''}"/></div>
        <div class="field"><label>${t('field_email')}</label><input type="email" value="${u.email}" disabled style="opacity:.5"/></div>
        <div class="field"><label>${t('field_phone')}</label><input type="tel" id="editTelefono" value="${u.telefono || ''}"/></div>
        <div class="field"><label>${t('field_address')}</label><textarea id="editDireccion">${u.direccion || ''}</textarea></div>
        <button class="btn-submit" onclick="guardarPerfil()">${t('save')}</button>
        <div id="perfilMsg"></div>`;
    } catch { content.innerHTML = '<div class="msg err">Errore</div>'; }
  }
}

async function guardarPerfil() {
  try {
    const r = await fetch(`${API}/auth/perfil`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        nombre: document.getElementById('editNombre').value,
        telefono: document.getElementById('editTelefono').value,
        direccion: document.getElementById('editDireccion').value
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    usuario.nombre = data.usuario.nombre;
    setTxt('perfilNombre', data.usuario.nombre);
    const el = document.getElementById('perfilAvatar');
    if (el) el.textContent = data.usuario.nombre.charAt(0).toUpperCase();
    showMsg('perfilMsg', '✓ Profilo aggiornato', 'ok');
  } catch(e) {
    showMsg('perfilMsg', e.message, 'err');
  }
}
