// Pannello "Circuiti 3D": ordini arrivati dalla pagina pubblica /circuiti
// (negozio a parte, senza account cliente). Sezione separata dal resto cosi'
// in futuro si puo' dare un accesso limitato a una sola persona, senza
// esporle il resto del pannello.

const STATI_ORDINE_CIRCUITI = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"];

async function adminTabCircuitiOrdini(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/circuiti/admin/ordini`, { headers: { Authorization: `Bearer ${token}` } });
    const ordini = await r.json();
    if (!Array.isArray(ordini)) throw new Error(ordini?.error || 'Errore caricamento ordini');

    if (!ordini.length) {
      content.innerHTML = `
        <div class="admin-form-title">CIRCUITI 3D — ORDINI</div>
        <div class="empty-state"><div class="ei">🏁</div><h3>NESSUN ORDINE</h3></div>`;
      return;
    }

    const righe = ordini.map(o => `
      <tr>
        <td>
          <strong>${o.numero}</strong><br>
          <span style="font-size:10px;color:var(--muted)">${new Date(o.createdAt).toLocaleDateString('it-IT')}</span>
        </td>
        <td>
          <strong>${o.nombre}</strong><br>
          <span style="font-size:10px;color:var(--muted)">${o.email}${o.telefono ? ' · ' + o.telefono : ''}</span><br>
          <span style="font-size:10px;color:var(--muted)">${o.direccion}, ${o.codigo_postal || ''} ${o.ciudad || ''} ${o.pais || ''}</span>
          ${o.notas ? `<div style="font-size:10px;color:var(--muted);margin-top:4px">📝 ${o.notas}</div>` : ''}
        </td>
        <td>${(o.articoli || []).map(a => `${a.quantita}× ${a.nome}`).join('<br/>')}</td>
        <td class="price-cell">€${parseFloat(o.totale).toFixed(2)}</td>
        <td>
          <select onchange="circuitiCambiaStato(${o.id}, this.value)">
            ${STATI_ORDINE_CIRCUITI.map(s => `<option value="${s}" ${o.stato === s ? 'selected' : ''}>${s.toUpperCase()}</option>`).join('')}
          </select>
          ${o.tracking_number ? `<div style="font-size:9px;color:var(--muted);margin-top:4px;font-family:'DM Mono',monospace">${o.carrier || ''} ${o.tracking_number}</div>` : ''}
          <button class="action-btn" style="margin-top:6px;padding:2px 8px;font-size:9px" onclick="circuitiInserisciTracking(${o.id})">+ TRACKING</button>
        </td>
      </tr>`).join('');

    content.innerHTML = `
      <div class="admin-form-title">CIRCUITI 3D — ORDINI (${ordini.length})</div>
      <table><thead><tr><th>Ordine</th><th>Cliente</th><th>Articoli</th><th>Totale</th><th>Stato</th></tr></thead><tbody>${righe}</tbody></table>`;
  } catch (e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

async function circuitiCambiaStato(id, stato) {
  try {
    const r = await fetch(`${API}/circuiti/admin/ordini/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stato }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTabCircuitiOrdini(document.getElementById('adminContent'));
  } catch (e) { alert('Errore: ' + e.message); adminTabCircuitiOrdini(document.getElementById('adminContent')); }
}

async function circuitiInserisciTracking(id) {
  const tracking = prompt('Numero di tracking:');
  if (!tracking || !tracking.trim()) return;
  const carrier = prompt('Corriere (es. DHL, GLS, BRT):') || '';
  try {
    const r = await fetch(`${API}/circuiti/admin/ordini/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tracking_number: tracking.trim(), carrier: carrier.trim(), stato: 'enviado' }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTabCircuitiOrdini(document.getElementById('adminContent'));
  } catch (e) { alert('Errore: ' + e.message); }
}
