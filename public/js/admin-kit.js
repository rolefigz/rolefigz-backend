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

// ── Video kit: kit con il logo di un locale da visitare + video da mandare su WhatsApp ──
// Stessi passi di /kit (analisi del logo e generazione) ma dalle rotte admin, senza limiti orari; il video lo
// registra kit-video.js direttamente dal visore 3D.
const videoKit = { pezzi: null, azienda: '', url: null };

function adminTabKitVideo(content) {
  const supportato = !!KitVideo.formato();
  content.innerHTML = `
    <div class="admin-form-title">VIDEO KIT · per i locali</div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Carica il logo di un locale (da Instagram o Google Maps): si genera il suo kit in 3D e un video
    di circa 20 secondi da mandargli su WhatsApp prima della visita. Il kit non compare tra le prenotazioni.</p>
    ${supportato ? '' : '<div class="msg err" style="margin-bottom:14px">Questo browser non può registrare video: usa Chrome.</div>'}
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px">
      <div class="field" style="flex:1;min-width:200px"><label>Nome del locale *</label><input id="kvAzienda" type="text" placeholder="Pizzeria Da Mario"/></div>
      <div class="field" style="flex:1;min-width:200px"><label>Logo * (PNG, SVG, PDF, JPG)</label><input id="kvLogo" type="file" accept=".png,.svg,.pdf,.ai,.jpg,.jpeg,.webp"/></div>
      <button class="btn-submit" id="kvGenera" onclick="kitVideoGenera()" style="width:auto;padding:12px 22px">GENERA KIT</button>
    </div>
    <div id="kvStato" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);margin-bottom:12px"></div>
    <div id="kvRisultato" style="display:none">
      <div id="kvAvviso"></div>
      <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
        <model-viewer id="kvViewer" loading="eager" camera-controls auto-rotate rotation-per-second="18deg" shadow-intensity="0.8" shadow-softness="0.9"
          exposure="1.05" environment-image="neutral" interaction-prompt="none" camera-orbit="0deg 55deg auto"
          style="width:100%;max-width:520px;height:420px;background:radial-gradient(circle at 50% 40%,#f7f5f0 0%,#ddd8ce 100%)"></model-viewer>
        <video id="kvAnteprima" controls playsinline style="display:none;width:100%;max-width:336px;background:#141412"></video>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="action-btn" id="kvCrea" onclick="kitVideoCrea()" style="border-color:var(--accent);color:var(--accent)" ${supportato ? '' : 'disabled'}>🎬 CREA VIDEO</button>
        <button class="action-btn" id="kvCondividi" style="display:none">CONDIVIDI</button>
        <a class="action-btn" id="kvScarica" style="display:none;text-decoration:none">SCARICA VIDEO ⬇</a>
        <a class="action-btn" id="kvPdf" target="_blank" rel="noopener" style="text-decoration:none">PREVENTIVO PDF</a>
      </div>
    </div>`;
}

function kitVideoStato(testo) { const e = document.getElementById('kvStato'); if (e) e.textContent = testo; }

async function kitVideoGenera() {
  const azienda = document.getElementById('kvAzienda').value.trim();
  const file = document.getElementById('kvLogo').files[0];
  if (!azienda || !file) return kitVideoStato('Servono il nome del locale e il logo.');
  const btn = document.getElementById('kvGenera'); btn.disabled = true;
  document.getElementById('kvRisultato').style.display = 'none';
  try {
    kitVideoStato('Analizzo il logo…');
    const fd = new FormData(); fd.append('logo', file);
    let r = await fetch(`${API}/kit/admin/analizza`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const logo = await r.json();
    if (!r.ok) throw new Error(logo.error || `HTTP ${r.status}`);
    kitVideoStato('Genero il kit in 3D… (fino a un minuto)');
    r = await fetch(`${API}/kit/admin/genera`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ logo_id: logo.logo_id, azienda }),
    });
    const k = await r.json();
    if (!r.ok) throw new Error(k.error || `HTTP ${r.status}`);

    // i pezzi uno per uno e, per chiudere, tutto il kit
    videoKit.pezzi = k.pezzi.map(p => ({ nome: p.nome, misure: p.misure, glb: p.glb }))
      .concat({ nome: 'Tutto il kit', misure: 'Tutti i pezzi del kit campione', glb: k.piatto_glb });
    videoKit.azienda = k.cliente || azienda;
    const [ic, pill] = VERDETTO_KIT[logo.verdetto] || ['', 'pill'];
    const motivi = (logo.motivi || []).map(escKit).join(' · ');
    // ⚠️/✋ o controllo qualità da rivedere: guardarlo bene prima di mandarlo al locale
    const daGuardare = logo.verdetto !== 'automatico' || k.controllo === 'da_rivedere';
    document.getElementById('kvAvviso').innerHTML = `<div style="margin-bottom:10px">
      <span class="${pill}">${ic} ${escKit((logo.verdetto || '').toUpperCase())}</span> <strong>${escKit(k.numero)}</strong>
      ${daGuardare ? `<div class="msg err" style="margin-top:8px">Controlla bene il kit prima di mandarlo: il logo potrebbe non essere venuto bene.${motivi ? ' ' + motivi : ''}</div>` : ''}</div>`;
    document.getElementById('kvPdf').href = k.preventivo_pdf;
    document.getElementById('kvViewer').src = videoKit.pezzi[videoKit.pezzi.length - 1].glb;
    ['kvAnteprima', 'kvCondividi', 'kvScarica'].forEach(id => { document.getElementById(id).style.display = 'none'; });
    document.getElementById('kvRisultato').style.display = '';
    kitVideoStato('Kit pronto. Controllalo e crea il video.');
  } catch (e) { kitVideoStato('Errore: ' + e.message); }
  btn.disabled = false;
}

async function kitVideoCrea() {
  if (!videoKit.pezzi) return;
  const btn = document.getElementById('kvCrea'), mv = document.getElementById('kvViewer');
  btn.disabled = true; document.getElementById('kvGenera').disabled = true; mv.style.pointerEvents = 'none';
  try {
    const file = await KitVideo.crea({ mv, pezzi: videoKit.pezzi, azienda: videoKit.azienda, onStato: kitVideoStato });
    if (videoKit.url) URL.revokeObjectURL(videoKit.url);
    videoKit.url = URL.createObjectURL(file);
    const anteprima = document.getElementById('kvAnteprima'); anteprima.src = videoKit.url; anteprima.style.display = '';
    const scarica = document.getElementById('kvScarica'); scarica.href = videoKit.url; scarica.download = file.name; scarica.style.display = '';
    // dal telefono: «Condividi» apre direttamente WhatsApp e le altre app
    const condividi = document.getElementById('kvCondividi');
    condividi.style.display = navigator.canShare && navigator.canShare({ files: [file] }) ? '' : 'none';
    condividi.onclick = () => navigator.share({ files: [file] }).catch(() => {});
    kitVideoStato(file.name.endsWith('.webm') ? 'Video pronto in WebM: per WhatsApp crealo da Chrome, che lo salva in MP4.' : 'Video pronto.');
  } catch (e) { kitVideoStato('Errore: ' + e.message); }
  btn.disabled = false; document.getElementById('kvGenera').disabled = false; mv.style.pointerEvents = '';
}
