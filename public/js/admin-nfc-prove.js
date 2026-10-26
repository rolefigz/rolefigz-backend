// Pannello admin → Profili di prova: pagine /nfc/<slug> create dall'admin con i dati di Google Maps.
// Senza prenotazione del kit: per far vedere a un locale la sua pagina prima della visita. Private: solo da qui,
// noindex, con il banner «anteprima» e una scadenza. I dati arrivano da Google: sempre escapati (escKit, admin-kit.js).
const provaNfc = { risultati: [], scelta: null };

async function adminTabNfcProve(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/kit/admin/prove`, { headers: { Authorization: `Bearer ${token}` } });
    const lista = await r.json();
    if (!Array.isArray(lista)) throw new Error(lista?.error || 'Errore caricamento');
    provaNfc.risultati = []; provaNfc.scelta = null;

    const righe = lista.map(p => `
      <tr>
        <td>${p.logo_url ? `<img src="${escKit(p.logo_url)}" alt="" style="width:48px;height:48px;object-fit:contain;border:1px solid var(--border)">` : '—'}</td>
        <td><strong>${escKit(p.nome)}</strong><br><span style="color:var(--muted);font-size:10px">${escKit(p.categoria)}${p.valutazione ? ` · ★ ${escKit(p.valutazione)} (${escKit(p.recensioni)})` : ''}</span>
            <br><span style="color:var(--muted);font-size:10px">${escKit(p.indirizzo)}</span></td>
        <td><a href="/nfc/${escKit(p.slug)}" target="_blank" style="color:var(--accent);font-family:'DM Mono',monospace">/nfc/${escKit(p.slug)} ↗</a></td>
        <td>${p.azienda_id ? '<span class="pill blue">AZIENDA</span>' : p.attiva ? '<span class="pill green">ATTIVA</span>' : '<span class="pill red">SCADUTA</span>'}
            <br><span style="color:var(--muted);font-size:10px">fino al ${dataKit(p.scadenza)}</span></td>
        <td>
          ${p.azienda_id
            ? `<button class="action-btn" onclick="adminTabNfcAziendaDettaglio(${p.azienda_id})">IN AZIENDE ✓ · MODIFICA</button>`
            : `<button class="action-btn" onclick="provaNfcAzienda(${p.id}, '${escKit(p.slug)}')" style="border-color:var(--accent);color:var(--accent)">CREA AZIENDA</button>`}
          <button class="action-btn" onclick="provaNfcElimina(${p.id}, '${escKit(p.slug)}')" style="display:block;margin-top:6px;border-color:#c0392b;color:#c0392b">ELIMINA</button>
        </td>
      </tr>`).join('');

    content.innerHTML = `
      <div class="admin-form-title">PROFILI NFC DI PROVA · privati</div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Cerca un locale su Google Maps e crea la sua pagina <strong>/nfc/&lt;slug&gt;</strong> con indirizzo, telefono,
      orari, mappa e bottone per le recensioni Google. Non è un'azienda: non ha account né abbonamento, non è indicizzata, mostra il banner
      «anteprima» e scade da sola. Se il locale compra, <strong>CREA AZIENDA</strong> la trasforma in un'azienda vera (proprietario tu, da cambiare in Aziende).</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">
        <div class="field" style="flex:1;min-width:200px"><label>Attività *</label><input id="pnNome" type="text" placeholder="Bar Stella" onkeydown="if(event.key==='Enter')provaNfcCerca()"/></div>
        <div class="field" style="flex:1;min-width:160px"><label>Città</label><input id="pnCitta" type="text" placeholder="Piacenza" onkeydown="if(event.key==='Enter')provaNfcCerca()"/></div>
        <button class="btn-submit" id="pnCerca" onclick="provaNfcCerca()" style="width:auto;padding:12px 22px">CERCA SU GOOGLE MAPS</button>
      </div>
      <div id="pnRisultati" style="margin-bottom:12px"></div>
      <div id="pnForm" style="display:none;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px;padding:12px;border:1px solid var(--border)">
        <div class="field" style="min-width:200px"><label>Slug (rolefigz.com/nfc/…) *</label><input id="pnSlug" type="text" maxlength="50" placeholder="bar-stella"
          oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'')"/></div>
        <div class="field" style="width:110px"><label>Giorni</label><input id="pnGiorni" type="number" min="1" max="365" value="60"/></div>
        <div class="field" style="flex:1;min-width:200px"><label>Logo (facoltativo: PNG, JPG, WEBP, SVG)</label><input id="pnLogo" type="file" accept=".png,.jpg,.jpeg,.webp,.svg"/></div>
        <button class="btn-submit" id="pnCrea" onclick="provaNfcCrea()" style="width:auto;padding:12px 22px">CREA PROFILO DI PROVA</button>
      </div>
      <div id="pnStato" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);margin-bottom:16px"></div>
      ${!lista.length
        ? '<div class="empty-state"><div class="ei">🧪</div><h3>NESSUN PROFILO DI PROVA</h3><p>Quelli che crei qui appariranno in questo elenco.</p></div>'
        : `<table><thead><tr><th>Logo</th><th>Attività</th><th>Pagina</th><th>Stato</th><th></th></tr></thead><tbody>${righe}</tbody></table>`}`;
  } catch (e) { content.innerHTML = `<div class="msg err">Errore: ${escKit(e.message)}</div>`; }
}

function provaNfcStato(testo) { const e = document.getElementById('pnStato'); if (e) e.textContent = testo; }

async function provaNfcCerca() {
  const azienda = document.getElementById('pnNome').value.trim(), citta = document.getElementById('pnCitta').value.trim();
  if (azienda.length < 2) return provaNfcStato("Inserisci il nome dell'attività.");
  const btn = document.getElementById('pnCerca'); btn.disabled = true;
  document.getElementById('pnForm').style.display = 'none'; provaNfc.scelta = null;
  provaNfcStato('Cerco su Google Maps…');
  try {
    const r = await fetch(`${API}/kit/admin/attivita`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ azienda, citta }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    provaNfc.risultati = d.risultati;
    document.getElementById('pnRisultati').innerHTML = d.risultati.map((a, i) => `
        <label style="display:flex;gap:8px;align-items:flex-start;padding:8px;border:1px solid var(--border);margin-bottom:6px;cursor:pointer">
          <input type="radio" name="pnScelta" onchange="provaNfcScegli(${i})"/>
          <span><strong>${escKit(a.nome)}</strong> <span style="color:var(--muted);font-size:10px">${escKit(a.categoria)}</span><br>
          <span style="font-size:11px;color:var(--muted)">${escKit(a.indirizzo)}</span></span>
        </label>`).join('');
    provaNfcStato(d.risultati.length ? "Scegli l'attività giusta." : 'Nessuna attività trovata: prova ad aggiungere la città.');
  } catch (e) { provaNfcStato('Errore: ' + e.message); }
  btn.disabled = false;
}

function provaNfcScegli(i) {
  provaNfc.scelta = provaNfc.risultati[i];
  document.getElementById('pnSlug').value = provaNfc.scelta.slug || '';
  document.getElementById('pnForm').style.display = 'flex';
  provaNfcStato('');
}

async function provaNfcCrea() {
  if (!provaNfc.scelta) return provaNfcStato("Scegli prima un'attività.");
  const slug = document.getElementById('pnSlug').value.trim();
  if (!/^[a-z0-9-]{2,50}$/.test(slug)) return provaNfcStato('Slug non valido: 2–50 caratteri tra a-z, 0-9 e trattino.');
  const fd = new FormData();
  fd.append('place_id', provaNfc.scelta.place_id);
  fd.append('slug', slug);
  fd.append('giorni', document.getElementById('pnGiorni').value);
  const logo = document.getElementById('pnLogo').files[0];
  if (logo) fd.append('logo', logo);
  const btn = document.getElementById('pnCrea'); btn.disabled = true; provaNfcStato('Creo il profilo…');
  try {
    const r = await fetch(`${API}/kit/admin/prove`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    window.open(`/nfc/${d.slug}`, '_blank');
    adminTabNfcProve(document.getElementById('adminContent'));
  } catch (e) { provaNfcStato('Errore: ' + e.message); btn.disabled = false; }
}

async function provaNfcElimina(id, slug) {
  if (!confirm(`Eliminare il profilo di prova /nfc/${slug}?\n\nLa pagina smette di funzionare subito.`)) return;
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error((await r.json()).error);
  } catch (e) { alert('Errore: ' + e.message); }
  adminTabNfcProve(document.getElementById('adminContent'));
}

async function provaNfcAzienda(id, slug) {
  if (!confirm(`Creare l'azienda «${slug}» da questo profilo di prova?\n\nProprietario: tu (admin), in modo provvisorio.`)) return;
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}/azienda`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    adminTabNfcAziendaDettaglio(d.azienda_id);
  } catch (e) { alert('Errore: ' + e.message); }
}
