// Pannello "Fidelizzazione": tessere fedeltà con timbri dati a mano
// dall'admin. 1 timbro ogni 100€ di ordine (300€ = 3, controllati da
// chi dà il timbro); ogni 4 timbri sblocca un premio di 100€ senza minimo d'ordine,
// da riscattare a mano sul 5° ordine. Non c'è ancora un collegamento
// a Apple/Google Wallet: codice_tarjeta è già pronto per quando arriva.

let fedeltaConfig = { timbri_per_premio: 4, valore_premio: 100 };

function fedeltaDots(cliente) {
  const n = fedeltaConfig.timbri_per_premio;
  const pieni = cliente.timbri_attuali;
  let dots = '';
  for (let i = 0; i < n; i++) {
    dots += `<span style="width:11px;height:11px;border-radius:50%;display:inline-block;margin-right:4px;background:${i < pieni ? 'var(--accent)' : 'var(--border)'}"></span>`;
  }
  return dots;
}

async function adminTabFidelizzazione(content, query) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const url = `${API}/fedelta/admin${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Errore');
    fedeltaConfig = data.config;
    const clienti = data.clienti;

    const righe = clienti.length
      ? clienti.map(c => `
          <tr>
            <td>
              <strong>${c.nombre || '—'}</strong><br>
              <span style="font-size:10px;color:var(--muted)">${c.email}</span>
            </td>
            <td>${fedeltaDots(c)} <span style="font-size:10px;color:var(--muted);margin-left:4px">${c.timbri_attuali}/${fedeltaConfig.timbri_per_premio}</span></td>
            <td style="text-align:center"><span class="pill">${c.timbri_totali}</span></td>
            <td>${c.premi_disponibili > 0 ? `<span class="pill" style="background:var(--green);color:#fff">${c.premi_disponibili} disponibile${c.premi_disponibili > 1 ? 'i' : ''}</span>` : '<span style="color:var(--muted);font-size:11px">—</span>'}</td>
            <td style="white-space:nowrap">
              <button class="action-btn" onclick="fedeltaAggiungiTimbro('${c.email}','${(c.nombre || '').replace(/'/g, "\\'")}')">+ TIMBRO</button>
              ${c.timbri_attuali > 0 ? `<button class="action-btn" onclick="fedeltaAnnullaTimbro(${c.id})">ANNULLA</button>` : ''}
              ${c.premi_disponibili > 0 ? `<button class="action-btn" style="border-color:var(--green);color:var(--green)" onclick="fedeltaRiscattaPremio(${c.id})">RISCATTA PREMIO</button>` : ''}
              <button class="action-btn" onclick="fedeltaCopiaLink('${c.codice_tarjeta}')" title="Copia il link della tessera (da caricare sulla tessera NFC)">🔗 LINK</button>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px">${query ? 'Nessun cliente trovato' : 'Nessuna tessera ancora — aggiungine una qui sotto'}</td></tr>`;

    content.innerHTML = `
      <div class="admin-form-title">FIDELIZZAZIONE (${clienti.length})</div>
      <p style="color:var(--muted);font-size:13px;margin:-12px 0 20px">1 timbro ogni 100€ di ordine, arrotondato per difetto (300€ = 3 timbri: premi + TIMBRO 3 volte). Ogni ${fedeltaConfig.timbri_per_premio} timbri danno un premio di €${fedeltaConfig.valore_premio} senza minimo, da riscattare sull'ordine successivo. I timbri si danno a mano, dopo aver controllato l'importo dell'ordine.</p>

      <div class="field"><label>Cerca cliente</label><input id="fedeltaCerca" type="text" placeholder="Nome o email..." oninput="fedeltaCercaDebounce(this.value)"/></div>

      <table style="margin-top:10px">
        <thead><tr><th>Cliente</th><th>Ciclo attuale</th><th>Timbri totali</th><th>Premi</th><th>Azioni</th></tr></thead>
        <tbody>${righe}</tbody>
      </table>

      <div class="admin-form-title" style="font-size:19px;margin-top:28px">NUOVO TIMBRO</div>
      <div class="form-row">
        <div class="field"><label>Email cliente *</label><input id="fNuovoEmail" type="email" placeholder="cliente@email.it"/></div>
        <div class="field"><label>Nome</label><input id="fNuovoNome" type="text" placeholder="Mario Rossi"/></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Telefono</label><input id="fNuovoTelefono" type="text" placeholder="333..."/></div>
        <div class="field"><label>Nota (es. numero ordine)</label><input id="fNuovoNota" type="text" placeholder="Ordine #123 — €140"/></div>
      </div>
      <button class="btn-submit" onclick="fedeltaNuovoTimbroForm()">+ AGGIUNGI TIMBRO</button>
      <div id="fedeltaMsg"></div>`;
  } catch (e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

let fedeltaCercaTimeout = null;
function fedeltaCercaDebounce(valore) {
  clearTimeout(fedeltaCercaTimeout);
  fedeltaCercaTimeout = setTimeout(() => adminTabFidelizzazione(document.getElementById('adminContent'), valore), 300);
}

async function fedeltaNuovoTimbroForm() {
  const email = document.getElementById('fNuovoEmail').value.trim();
  const nombre = document.getElementById('fNuovoNome').value.trim();
  const telefono = document.getElementById('fNuovoTelefono').value.trim();
  const nota = document.getElementById('fNuovoNota').value.trim();
  const msg = document.getElementById('fedeltaMsg');
  if (!email) { msg.innerHTML = '<div class="msg err">Inserisci l\'email del cliente</div>'; return; }
  await fedeltaChiamaAggiungiTimbro({ email, nombre, telefono, nota }, msg);
}

async function fedeltaAggiungiTimbro(email, nombre) {
  const nota = prompt(`Nota per il timbro di ${nombre || email} (es. numero ordine e importo):`) || '';
  await fedeltaChiamaAggiungiTimbro({ email, nombre, nota });
}

async function fedeltaChiamaAggiungiTimbro(body, msgEl) {
  try {
    const r = await fetch(`${API}/fedelta/admin/timbro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Errore');
    if (data.premioSbloccato) alert(`🎉 ${body.nombre || body.email} ha sbloccato un premio di €${fedeltaConfig.valore_premio}!`);
    adminTabFidelizzazione(document.getElementById('adminContent'));
  } catch (e) {
    if (msgEl) msgEl.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`;
    else alert('Errore: ' + e.message);
  }
}

async function fedeltaAnnullaTimbro(id) {
  if (!confirm('Togliere l\'ultimo timbro di questo ciclo?')) return;
  try {
    const r = await fetch(`${API}/fedelta/admin/timbro/annulla`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Errore');
    adminTabFidelizzazione(document.getElementById('adminContent'));
  } catch (e) { alert('Errore: ' + e.message); }
}

function fedeltaCopiaLink(codice) {
  const url = `${location.origin}/fedelta/${codice}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert('Link copiato:\n' + url)).catch(() => prompt('Link della tessera (copia a mano):', url));
  } else {
    prompt('Link della tessera (copia a mano):', url);
  }
}

async function fedeltaRiscattaPremio(id) {
  if (!confirm(`Segnare il premio di €${fedeltaConfig.valore_premio} come riscattato su questo ordine?`)) return;
  const nota = prompt('Nota (es. numero ordine su cui si applica lo sconto):') || '';
  try {
    const r = await fetch(`${API}/fedelta/admin/premio/riscatta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, nota })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Errore');
    adminTabFidelizzazione(document.getElementById('adminContent'));
  } catch (e) { alert('Errore: ' + e.message); }
}
