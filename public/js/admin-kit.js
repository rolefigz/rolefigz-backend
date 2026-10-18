// Pannello admin → Kit campione: prenotazioni e revisioni manuali arrivate da /kit.
// I dati arrivano dal form pubblico: sempre escapati.
const STATI_KIT = ['prenotato', 'in_stampa', 'pronto', 'ritirato', 'annullato'];
const VERDETTO_KIT = { automatico: ['✅', 'pill green'], revisar: ['⚠️', 'pill orange'], manual: ['✋', 'pill red'] };

function escKit(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function dataKit(d) { return d ? new Date(d).toLocaleDateString('it-IT') : '—'; }

async function adminTabKit(content, filtroStato = '', filtroTipo = '') {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const q = new URLSearchParams();
    if (filtroStato) q.set('stato', filtroStato);
    if (filtroTipo) q.set('tipo', filtroTipo);
    const r = await fetch(`${API}/kit/admin/richieste?${q}`, { headers: { Authorization: `Bearer ${token}` } });
    const lista = await r.json();
    if (!Array.isArray(lista)) throw new Error(lista?.error || 'Errore caricamento');

    const righe = lista.map(k => {
      const [ic, pill] = VERDETTO_KIT[k.verdetto] || ['', 'pill'];
      const file = k.tipo === 'kit' && k.kit_id ? `
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">
          <button class="action-btn" onclick="kitScarica('${k.kit_id}','preventivo.pdf')">PREVENTIVO</button>
          <button class="action-btn" onclick="kitScarica('${k.kit_id}','hoja_montaje.html')">MONTAGGIO</button>
          <button class="action-btn" onclick="kitScarica3mf('${k.kit_id}')" style="border-color:var(--accent);color:var(--accent)">3MF ⬇</button>
        </div>` : `
        <div style="margin-top:6px"><button class="action-btn" onclick="kitScaricaLogo('${k.logo_id}','${escKit(k.numero)}')">LOGO PNG</button></div>`;
      const sconto = k.codice_sconto ? `<div style="font-size:10px;margin-top:4px"><span class="pill blue">${escKit(k.codice_sconto)}</span> fino al ${dataKit(k.scadenza_sconto)}</div>` : '';
      return `
      <tr>
        <td><strong style="font-family:'DM Mono',monospace">${escKit(k.numero)}</strong><br><span style="color:var(--muted);font-size:10px">${dataKit(k.createdAt)}</span><br>
            <span class="pill">${k.tipo === 'kit' ? 'KIT CAMPIONE' : 'REVISIONE'}</span></td>
        <td>${k.logo_url ? `<a href="${escKit(k.logo_url)}" target="_blank"><img src="${escKit(k.logo_url)}" alt="" style="width:72px;height:48px;object-fit:contain;background:#fff;border:1px solid var(--border)"></a>` : '—'}
            <div style="margin-top:4px"><span class="${pill}">${ic} ${escKit((k.verdetto || '').toUpperCase())}</span></div></td>
        <td><strong>${escKit(k.azienda)}</strong><br>${escKit(k.nome)}<br>
            <a href="mailto:${escKit(k.email)}">${escKit(k.email)}</a>${k.telefono ? `<br><span style="color:var(--muted);font-size:10px">${escKit(k.telefono)}</span>` : ''}
            ${k.note ? `<div style="max-width:260px;white-space:normal;font-size:11px;color:var(--muted);margin-top:6px">${escKit(k.note)}</div>` : ''}</td>
        <td>${k.tipo === 'kit' ? '€ ' + Number(k.prezzo).toFixed(2).replace('.', ',') : '—'}${sconto}${file}</td>
        <td>
          <select onchange="kitCambiaStato(${k.id}, this.value, '${filtroStato}', '${filtroTipo}')">
            ${STATI_KIT.map(s => `<option value="${s}" ${k.stato === s ? 'selected' : ''}>${s.replace('_', ' ').toUpperCase()}</option>`).join('')}
          </select>
          ${k.stato === 'annullato' ? `<button class="action-btn" onclick="kitElimina('${k.id}', '${escKit(k.numero)}')" style="display:block;margin-top:6px;border-color:#c0392b;color:#c0392b">ELIMINA DEFINITIVAMENTE</button>` : ''}
          <textarea placeholder="Note interne" onchange="kitNota(${k.id}, this.value)" style="display:block;width:180px;margin-top:6px;font-size:10px;min-height:40px">${escKit(k.note_admin)}</textarea>
        </td>
      </tr>`;
    }).join('');

    const filtro = (nome, valori, attuale, fn) => `
      <select onchange="${fn}">
        <option value="">${nome}</option>
        ${valori.map(v => `<option value="${v}" ${attuale === v ? 'selected' : ''}>${v.replace('_', ' ').toUpperCase()}</option>`).join('')}
      </select>`;

    content.innerHTML = `
      <div class="admin-form-title">KIT CAMPIONE · /kit</div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Prenotazioni del kit campione (19,90 €, ritiro a Piacenza) e richieste di revisione manuale del logo.
      Quando segni <strong>RITIRATO</strong> si genera il codice sconto (valido 60 giorni su un primo ordine da almeno 100 €).
      <a href="/kit" target="_blank" style="color:var(--accent)">Apri la pagina ↗</a></p>
      <p style="font-size:11px;color:var(--muted);margin:-6px 0 14px">Le richieste <strong>ANNULLATE</strong> non compaiono nell'elenco: scegli ANNULLATO nel filtro per vederle ed eliminarle.</p>
      <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
        ${filtro('TUTTI GLI STATI', STATI_KIT, filtroStato, `adminTabKit(document.getElementById('adminContent'), this.value, '${filtroTipo}')`)}
        ${filtro('TUTTI I TIPI', ['kit', 'revisione'], filtroTipo, `adminTabKit(document.getElementById('adminContent'), '${filtroStato}', this.value)`)}
        ${filtroStato === 'annullato' && lista.length ? `<button class="action-btn" onclick="kitElimina('annullati', '${lista.length} richieste annullate')" style="border-color:#c0392b;color:#c0392b">ELIMINA DEFINITIVAMENTE TUTTI GLI ANNULLATI (${lista.length})</button>` : ''}
      </div>
      ${!lista.length
        ? '<div class="empty-state"><div class="ei">🧰</div><h3>NESSUNA RICHIESTA</h3><p>Le prenotazioni da rolefigz.com/kit appariranno qui.</p></div>'
        : `<table><thead><tr><th>Numero</th><th>Logo</th><th>Cliente</th><th>Kit / file</th><th>Stato</th></tr></thead><tbody>${righe}</tbody></table>`}`;
  } catch (e) { content.innerHTML = `<div class="msg err">Errore: ${escKit(e.message)}</div>`; }
}

async function kitCambiaStato(id, stato, filtroStato, filtroTipo) {
  try {
    const r = await fetch(`${API}/kit/admin/richieste/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ stato }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
  } catch (e) { alert('Errore: ' + e.message); }
  adminTabKit(document.getElementById('adminContent'), filtroStato, filtroTipo);
}

// Eliminazione definitiva delle richieste annullate (una o tutte): chiede conferma, non si può annullare
async function kitElimina(id, cosa) {
  if (!confirm(`Eliminare definitivamente ${cosa}?\n\nSi cancellano dal database (e la loro pagina NFC di prova). Non si può annullare.`)) return;
  try {
    const r = await fetch(`${API}/kit/admin/richieste/${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
  } catch (e) { alert('Errore: ' + e.message); }
  adminTabKit(document.getElementById('adminContent'), 'annullato', '');
}

async function kitNota(id, note_admin) {
  try {
    const r = await fetch(`${API}/kit/admin/richieste/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note_admin }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
  } catch (e) { alert('Errore: ' + e.message); }
}

// i file admin richiedono il token: si scaricano con fetch e si aprono come blob
async function kitApriBlob(url, nomeFile, apri) {
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
    const blob = await r.blob();
    const href = URL.createObjectURL(blob);
    if (apri) { window.open(href, '_blank'); }
    else { const a = document.createElement('a'); a.href = href; a.download = nomeFile; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(() => URL.revokeObjectURL(href), 60000);
  } catch (e) { alert('Errore download: ' + e.message); }
}

function kitScarica(kitId, file) {
  kitApriBlob(`${API}/kit/admin/file/${kitId}/${file}`, file, file.endsWith('.pdf') || file.endsWith('.html'));
}

async function kitScarica3mf(kitId) {
  try {
    const r = await fetch(`${API}/kit/admin/file/${kitId}/kit.json`, { headers: { Authorization: `Bearer ${token}` } });
    const info = await r.json();
    if (!r.ok) throw new Error(info.error);
    kitApriBlob(`${API}/kit/admin/file/${kitId}/${info.file_3mf}`, info.file_3mf, false);
  } catch (e) { alert('Errore: ' + e.message); }
}

function kitScaricaLogo(logoId, numero) {
  kitApriBlob(`${API}/kit/admin/logo/${logoId}`, `logo-${numero}.png`, false);
}
