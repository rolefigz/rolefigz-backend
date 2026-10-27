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
            : `<button class="action-btn" onclick="provaNfcModifica(${p.id})" style="border-color:var(--accent);color:var(--accent)">MODIFICA</button>
               <button class="action-btn" onclick="provaNfcAzienda(${p.id}, '${escKit(p.slug)}')" style="display:block;margin-top:6px">CREA AZIENDA</button>`}
          <button class="action-btn" onclick="provaNfcDuplica(${p.id}, '${escKit(p.slug)}')" style="display:block;margin-top:6px">DUPLICA</button>
          <button class="action-btn" onclick="provaNfcElimina(${p.id}, '${escKit(p.slug)}')" style="display:block;margin-top:6px;border-color:#c0392b;color:#c0392b">ELIMINA</button>
        </td>
      </tr>`).join('');

    content.innerHTML = `
      <div class="admin-form-title">PROFILI NFC DI PROVA · privati</div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Cerca un locale su Google Maps e crea la sua pagina <strong>/nfc/&lt;slug&gt;</strong> con indirizzo, telefono,
      orari, mappa e bottone per le recensioni Google. Non è un'azienda: non ha account né abbonamento, non è indicizzata, mostra il banner
      «anteprima» e scade da sola. Se il locale compra, <strong>CREA AZIENDA</strong> la trasforma in un'azienda vera (proprietario tu, da cambiare in Aziende).
      Per una persona: <strong>DUPLICA</strong> il profilo dell'azienda e cambia i dati, oppure crealo <strong>senza Google Maps</strong>.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">
        <div class="field" style="flex:1;min-width:200px"><label>Attività *</label><input id="pnNome" type="text" placeholder="Bar Stella" onkeydown="if(event.key==='Enter')provaNfcCerca()"/></div>
        <div class="field" style="flex:1;min-width:160px"><label>Città</label><input id="pnCitta" type="text" placeholder="Piacenza" onkeydown="if(event.key==='Enter')provaNfcCerca()"/></div>
        <button class="btn-submit" id="pnCerca" onclick="provaNfcCerca()" style="width:auto;padding:12px 22px">CERCA SU GOOGLE MAPS</button>
        <button class="action-btn" onclick="provaNfcMostraManuale()" style="padding:12px 16px">+ SENZA GOOGLE MAPS (PERSONA)</button>
      </div>
      <div id="pnManuale" style="display:none;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:12px;padding:12px;border:1px solid var(--border)">
        <div class="field" style="flex:1;min-width:200px"><label>Nome *</label><input id="pmNome" type="text" maxlength="120" placeholder="Mario Rossi"
          oninput="document.getElementById('pmSlug').value=provaNfcSlug(this.value)"/></div>
        <div class="field" style="min-width:200px"><label>Slug (rolefigz.com/nfc/…) *</label><input id="pmSlug" type="text" maxlength="50" placeholder="mario-rossi"
          oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'')"/></div>
        <div class="field" style="width:110px"><label>Giorni</label><input id="pmGiorni" type="number" min="1" max="365" value="60"/></div>
        <div class="field" style="flex:1;min-width:200px"><label>Logo o foto (facoltativo)</label><input id="pmLogo" type="file" accept=".png,.jpg,.jpeg,.webp,.svg"/></div>
        <button class="btn-submit" id="pmCrea" onclick="provaNfcCreaManuale()" style="width:auto;padding:12px 22px">CREA E MODIFICA</button>
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

// Come slugDaNome del server: «Mario Rossì» → «mario-rossi»
function provaNfcSlug(nome) {
  return String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '');
}

function provaNfcMostraManuale() {
  const f = document.getElementById('pnManuale');
  f.style.display = f.style.display === 'none' ? 'flex' : 'none';
  if (f.style.display === 'flex') document.getElementById('pmNome').focus();
}

// Profilo senza Google Maps (una persona): solo nome e slug, il resto (telefono, bottoni, aspetto…) in MODIFICA
async function provaNfcCreaManuale() {
  const nome = document.getElementById('pmNome').value.trim(), slug = document.getElementById('pmSlug').value.trim();
  if (nome.length < 2) return provaNfcStato('Inserisci il nome.');
  if (!/^[a-z0-9-]{2,50}$/.test(slug)) return provaNfcStato('Slug non valido: 2–50 caratteri tra a-z, 0-9 e trattino.');
  const fd = new FormData();
  fd.append('nome', nome); fd.append('slug', slug); fd.append('giorni', document.getElementById('pmGiorni').value);
  const logo = document.getElementById('pmLogo').files[0];
  if (logo) fd.append('logo', logo);
  const btn = document.getElementById('pmCrea'); btn.disabled = true; provaNfcStato('Creo il profilo…');
  try {
    const r = await fetch(`${API}/kit/admin/prove`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    provaNfcModifica(d.id);
  } catch (e) { provaNfcStato('Errore: ' + e.message); btn.disabled = false; }
}

// Copia del profilo con un altro slug (es. dallo studio alla pagina di una persona), poi si apre in MODIFICA
async function provaNfcDuplica(id, slug) {
  const nuovo = prompt(`Duplica /nfc/${slug}

Slug della nuova pagina (es. il nome della persona):`, `${slug}-`);
  if (nuovo === null) return;
  const s = provaNfcSlug(nuovo);
  if (!/^[a-z0-9-]{2,50}$/.test(s)) return alert('Slug non valido: 2–50 caratteri tra a-z, 0-9 e trattino.');
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}/duplica`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ slug: s }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    await provaNfcModifica(d.id);
    const e = document.getElementById('peStato');
    if (e) e.textContent = `Copia creata: /nfc/${d.slug}. Cambia nome, telefono e il resto, poi SALVA.`;
  } catch (e) { alert('Errore: ' + e.message); }
}

// ── Modifica di un profilo di prova, senza crearne l'azienda ──
async function provaNfcModifica(id) {
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const p = await r.json();
    if (!r.ok) throw new Error(p.error || `HTTP ${r.status}`);
    const campo = (id, label, valore, extra = '') => `
      <div class="field" style="flex:1;min-width:220px"><label>${label}</label><input id="${id}" type="text" value="${escKit(valore)}" ${extra}/></div>`;
    const voto = p.valutazione ? `★ ${escKit(p.valutazione)} (${escKit(p.recensioni)} recensioni)` : 'nessuna';
    content.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        <button class="action-btn" onclick="adminTabNfcProve(document.getElementById('adminContent'))">← PROFILI DI PROVA</button>
        <a href="/nfc/${escKit(p.slug)}" target="_blank" id="peLink" style="color:var(--accent);font-family:'DM Mono',monospace">/nfc/${escKit(p.slug)} ↗</a>
        ${p.attiva ? '<span class="pill green">ATTIVA</span>' : p.attiva_db ? '<span class="pill red">SCADUTA · rinnova i giorni</span>' : '<span class="pill red">DISATTIVATA</span>'}
        <span style="color:var(--muted);font-size:11px">fino al ${dataKit(p.scadenza)}</span>
        <button class="action-btn" onclick="provaNfcDuplica(${p.id}, '${escKit(p.slug)}')">DUPLICA</button>
      </div>
      <div class="admin-form-title">MODIFICA · ${escKit(p.nome)}</div>
      <p style="font-size:12px;color:var(--muted);margin-bottom:14px">I bottoni della pagina si creano da questi dati: <strong>Chiama</strong> e <strong>WhatsApp</strong> (se è un cellulare) dal telefono,
      <strong>Sito web</strong>, <strong>Come arrivare</strong> dal link di Maps; la mappa usa nome + indirizzo. Un campo vuoto toglie il bottone.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        ${campo('peNome', 'Nome *', p.nome, 'maxlength="120"')}
        ${campo('peCategoria', 'Categoria', p.categoria, 'maxlength="120"')}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        ${campo('peIndirizzo', 'Indirizzo', p.indirizzo, 'maxlength="250"')}
        ${campo('peTelefono', 'Telefono', p.telefono, 'maxlength="40" placeholder="0523 123456"')}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px">
        ${campo('peSito', 'Sito web', p.sito, 'maxlength="500" placeholder="https://"')}
        ${campo('peMaps', 'Link Google Maps («Come arrivare»)', p.maps_url, 'maxlength="500" placeholder="https://"')}
      </div>
      <div class="field" style="margin-bottom:10px"><label>Orari (una riga per giorno, es. «lunedì: 9:00–19:00»)</label>
        <textarea id="peOrari" rows="7" style="width:100%;font-family:'DM Mono',monospace;font-size:11px">${escKit((p.orari || []).join('\n'))}</textarea></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">
        ${campo('peSlug', 'Slug (rolefigz.com/nfc/…) *', p.slug, `maxlength="50" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'')"`)}
        <div class="field" style="width:200px"><label>Rinnova: giorni da oggi</label><input id="peGiorni" type="number" min="1" max="365" placeholder="non cambiare"/></div>
        <label style="display:flex;gap:6px;align-items:center;font-size:12px;padding-bottom:12px"><input type="checkbox" id="peAttiva" ${p.attiva_db ? 'checked' : ''}/> Pagina attiva</label>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">
        <div>${p.logo_url ? `<img src="${escKit(p.logo_url)}" alt="" style="width:64px;height:64px;object-fit:contain;border:1px solid var(--border)">` : '<span style="color:var(--muted);font-size:11px">Nessun logo</span>'}</div>
        <div class="field" style="flex:1;min-width:220px"><label>${p.logo_url ? 'Cambia logo' : 'Aggiungi logo'} (PNG, JPG, WEBP, SVG)</label><input id="peLogo" type="file" accept=".png,.jpg,.jpeg,.webp,.svg"/></div>
        ${p.logo_url ? '<label style="display:flex;gap:6px;align-items:center;font-size:12px;padding-bottom:12px"><input type="checkbox" id="peTogliLogo"/> Togli il logo</label>' : ''}
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px;font-size:12px">
        <span>Valutazione Google: <strong>${voto}</strong></span>
        ${p.valutazione ? '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="peNascondiVoto"/> Nascondi la valutazione</label>' : ''}
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn-submit" id="peSalva" onclick="provaNfcSalva(${p.id})" style="width:auto;padding:12px 22px">SALVA</button>
        ${p.place_id ? `<button class="action-btn" onclick="provaNfcRicarica(${p.id})">RICARICA DA GOOGLE</button>` : ''}
      </div>
      <div id="peStato" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);margin-top:12px"></div>
      ${provaNfcHtmlPagina(p)}
      ${provaNfcHtmlTarjeta(p)}`;
    provaNfc.links = Array.isArray(p.links) ? p.links.map(l => ({ ...l })) : null;
    provaNfc.linksAuto = p.links_auto || [];
    provaNfcRenderLinks();
  } catch (e) { content.innerHTML = `<div class="msg err">Errore: ${escKit(e.message)}</div>`; }
}

// Aspetto, sfondo, video, allergeni e bottoni: gli stessi controlli della pagina di un'azienda (admin-nfc.js)
function provaNfcHtmlPagina(p) {
  const d = p.design || {};
  const tipo = d.backgroundType || 'colore';
  const colore = (id, label, v) => `<div class="field"><label>${label}</label><input id="${id}" type="color" value="${escKit(v)}" style="height:42px;padding:4px;width:100px"/></div>`;
  const op = (id, v) => `<div class="range-row"><input type="range" id="${id}" min="0" max="100" value="${v}" oninput="this.nextElementSibling.textContent=this.value+'%'"/><span class="val">${v}%</span></div>`;
  return `
    <div class="admin-form-title" style="margin-top:28px">PAGINA · aspetto e bottoni</div>
    <details class="pg-sezione" open>
      <summary>📝 DESCRIZIONE</summary>
      <div class="pg-sezione-body">
        <div class="field"><label>Testo sotto il nome (vuoto = indirizzo)</label><textarea id="ppDescrizione" maxlength="1000">${escKit(p.descrizione)}</textarea></div>
      </div>
    </details>
    <details class="pg-sezione" open>
      <summary>🎨 ASPETTO</summary>
      <div class="pg-sezione-body">
        <div class="form-row">
          ${colore('ppColore', 'Colore principale', d.primaryColor || '#FF6A2C')}
          <div class="field"><label>Dimensione logo</label><select id="ppLogoSize">
            ${['piccolo', 'medio', 'grande'].map(s => `<option value="${s}" ${(d.logoSize || 'grande') === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
          </select></div>
        </div>
        <div class="field"><label>Sfondo pagina</label>
          <select id="ppTipoSfondo" onchange="provaNfcTipoSfondo()">
            <option value="nessuno" ${tipo === 'nessuno' ? 'selected' : ''}>Nessuno (scuro, più leggera)</option>
            <option value="colore" ${tipo === 'colore' ? 'selected' : ''}>Colore pieno</option>
            <option value="foto" ${tipo === 'foto' ? 'selected' : ''}>Foto</option>
          </select></div>
        <div id="ppSfondoColore" style="display:${tipo === 'colore' ? '' : 'none'}">${colore('ppColoreSfondo', 'Colore di sfondo', d.backgroundColor || '#FFFFFF')}</div>
        <div id="ppSfondoFoto" class="field" style="display:${tipo === 'foto' ? '' : 'none'}">
          <label>Foto di sfondo (JPG, PNG, WEBP, max 5 MB)</label>
          ${p.background_url ? `<img src="${escKit(p.background_url)}" alt="" style="width:100%;max-width:180px;height:76px;object-fit:cover;border:1px solid var(--border);display:block;margin-bottom:6px"/>` : ''}
          <input type="file" id="ppFoto" accept="image/png,image/jpeg,image/webp" onchange="provaNfcCaricaSfondo(${p.id})"/>
          ${p.background_url ? `<button class="action-btn danger" style="margin-top:6px" onclick="provaNfcRimuoviSfondo(${p.id})">RIMUOVI FOTO</button>` : ''}
          <label style="margin-top:12px">Filtro scuro sulla foto (0 = colori pieni, 100 = più scura e leggibile)</label>
          ${op('ppOpFoto', d.backgroundOpacity ?? 70)}
        </div>
        <div class="form-row" style="margin-top:14px">
          ${colore('ppColoreBottoni', 'Colore dei bottoni', d.buttonColor || '#F4F1EA')}
          ${colore('ppColoreCaricamento', 'Colore schermata di caricamento', d.loadingColor || '#0A0A0A')}
        </div>
        <div class="field"><label>Opacità dei bottoni</label>${op('ppOpBottoni', d.buttonOpacity ?? 6)}</div>
        <button class="action-btn" onclick="provaNfcAspettoAuto(${p.id})">RIPRISTINA ASPETTO AUTOMATICO</button>
      </div>
    </details>
    <details class="pg-sezione">
      <summary>▶️ VIDEO YOUTUBE</summary>
      <div class="pg-sezione-body">
        <div class="field"><label>Link del video (vuoto = nessun video)</label>
          <input id="ppYoutube" type="url" placeholder="https://www.youtube.com/watch?v=… oppure https://youtu.be/…" value="${escKit(d.youtube)}"/>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:6px">Parte da solo, senza audio. Vale anche uno «Shorts».</div></div>
      </div>
    </details>
    <details class="pg-sezione">
      <summary>⚠️ ALLERGENI</summary>
      <div class="pg-sezione-body">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
          ${ALLERGENI_NOMI.map((nome, i) => `<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" name="ppAllergene" value="${i + 1}" ${(d.allergeni || []).map(Number).includes(i + 1) ? 'checked' : ''}/>${i + 1}. ${nome}</label>`).join('')}
        </div>
      </div>
    </details>
    <details class="pg-sezione" open>
      <summary>🔗 BOTTONI</summary>
      <div class="pg-sezione-body">
        <div id="ppLinksInfo" style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-bottom:12px"></div>
        <div id="ppLinksLista"></div>
        <button class="action-btn" onclick="provaNfcAggiungiLink()">+ AGGIUNGI BOTTONE</button>
        <button class="action-btn" id="ppLinksAuto" onclick="provaNfcLinksAuto()">USA I BOTTONI AUTOMATICI</button>
      </div>
    </details>
    <button class="btn-submit" id="ppSalva" onclick="provaNfcSalvaPagina(${p.id})" style="width:auto;padding:12px 22px">SALVA PAGINA</button>
    <div id="ppStato" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);margin-top:12px"></div>`;
}

// Biglietto da visita NFC da stampare (la «tarjeta» del kit: icona NFC davanti, logo dietro) con l'URL della pagina per il chip
function provaNfcHtmlTarjeta(p) {
  const t = p.tarjeta;
  const pronta = t && t.kit_id ? `
    <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start;margin:12px 0">
      <model-viewer src="${API}/kit/file/${escKit(t.kit_id)}/${escKit(t.glb)}" camera-controls auto-rotate rotation-per-second="18deg"
        shadow-intensity="0.8" exposure="1.05" environment-image="neutral" interaction-prompt="none" camera-orbit="0deg 55deg auto"
        style="width:100%;max-width:420px;height:300px;background:radial-gradient(circle at 50% 40%,#f7f5f0 0%,#ddd8ce 100%)"></model-viewer>
      <div style="font-size:12px;line-height:1.7">
        <strong style="font-family:'DM Mono',monospace">${escKit(t.numero)}</strong> · ${escKit(t.misure)}<br>
        <span style="color:var(--muted)">Creata il ${dataKit(t.creata)}${t.verdetto && t.verdetto !== 'automatico' ? ` · logo: <strong>${escKit(t.verdetto.toUpperCase())}</strong>, controlla bene il 3D` : ''}</span><br>
        URL da scrivere nel chip NFC:<br>
        <code style="font-size:11px;user-select:all">${escKit(t.url_chip)}</code>
        <button class="action-btn" style="margin-left:6px" onclick="navigator.clipboard.writeText('${escKit(t.url_chip)}').then(()=>provaNfcStatoTarjeta('URL copiato.'))">COPIA</button>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
          <button class="action-btn" onclick="kitScarica('${escKit(t.kit_id)}','${escKit(t.file_3mf)}')" style="border-color:var(--accent);color:var(--accent)">3MF DA STAMPARE ⬇</button>
          <button class="action-btn" onclick="kitScarica('${escKit(t.kit_id)}','hoja_montaje.html')">MONTAGGIO</button>
        </div>
        ${(t.avvisi || []).length ? `<details style="margin-top:8px"><summary style="font-size:11px;color:var(--muted)">Avvisi (${t.avvisi.length})</summary>
          <ul style="font-size:11px;color:var(--muted);margin:6px 0 0 16px">${t.avvisi.map(a => `<li>${escKit(a)}</li>`).join('')}</ul></details>` : ''}
      </div>
    </div>` : '<p style="font-size:12px;color:var(--muted)">Nessun biglietto ancora.</p>';
  return `
    <div class="admin-form-title" style="margin-top:28px">BIGLIETTO DA VISITA NFC · pronto da stampare</div>
    <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Il biglietto da visita NFC del kit (85×55 mm, icona NFC davanti e logo dietro) in un 3MF per la stampante,
    con il link di questa pagina da scrivere nel chip. Ci vuole fino a un minuto. Se cambi lo slug, rigeneralo.</p>
    ${pronta}
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
      <div class="field" style="flex:1;min-width:240px"><label>Logo per la stampa (vuoto = logo del profilo; meglio SVG o PDF)</label>
        <input id="ptLogo" type="file" accept=".png,.svg,.pdf,.ai,.jpg,.jpeg,.webp"/></div>
      <button class="btn-submit" id="ptGenera" onclick="provaNfcTarjeta(${p.id})" style="width:auto;padding:12px 22px">${t ? 'RIGENERA' : 'GENERA'} BIGLIETTO</button>
    </div>
    <div id="ptStato" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted);margin-top:12px"></div>`;
}

function provaNfcStatoTarjeta(testo) { const e = document.getElementById('ptStato'); if (e) e.textContent = testo; }

async function provaNfcTarjeta(id, forza = false) {
  const fd = new FormData();
  const logo = document.getElementById('ptLogo')?.files[0];
  if (logo) fd.append('logo', logo);
  if (forza) fd.append('forza', 'true');
  const btn = document.getElementById('ptGenera'); btn.disabled = true;
  provaNfcStatoTarjeta('Analizzo il logo e genero il biglietto in 3D… (fino a un minuto)');
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}/tarjeta`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const d = await r.json();
    if (r.status === 422 && d.manual && !forza) {
      btn.disabled = false;
      const motivi = (d.motivi || []).join('\n· ');
      if (confirm(`Il logo è difficile per il metodo automatico${motivi ? ':\n· ' + motivi : '.'}\n\nGenerare lo stesso il biglietto e controllarlo nel 3D?`)) {
        return provaNfcTarjeta(id, true);
      }
      return provaNfcStatoTarjeta('Biglietto non generato: prova con un logo vettoriale (SVG/PDF) o più pulito.');
    }
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    await provaNfcModifica(id);
    provaNfcStatoTarjeta('Biglietto pronto.');
    document.getElementById('ptStato')?.scrollIntoView({ block: 'center' });
  } catch (e) { provaNfcStatoTarjeta('Errore: ' + e.message); btn.disabled = false; }
}

function provaNfcStatoPagina(testo) { const e = document.getElementById('ppStato'); if (e) e.textContent = testo; }

function provaNfcTipoSfondo() {
  const tipo = document.getElementById('ppTipoSfondo').value;
  document.getElementById('ppSfondoColore').style.display = tipo === 'colore' ? '' : 'none';
  document.getElementById('ppSfondoFoto').style.display = tipo === 'foto' ? '' : 'none';
}

// provaNfc.links === null: bottoni automatici (si vedono, ma toccandoli diventano scelti a mano)
function provaNfcRenderLinks() {
  const wrap = document.getElementById('ppLinksLista');
  if (!wrap) return;
  const auto = provaNfc.links === null;
  const lista = auto ? provaNfc.linksAuto : provaNfc.links;
  document.getElementById('ppLinksInfo').textContent = auto
    ? 'Automatici: nascono dai dati qui sopra (telefono, sito, Maps) + recensione Google. Cambiane uno e diventano tutti modificabili a mano.'
    : "Scelti a mano: i dati qui sopra non li cambiano più. L'icona dipende dal Tipo. Trascina ⠿ per l'ordine.";
  document.getElementById('ppLinksAuto').style.display = auto ? 'none' : '';
  wrap.innerHTML = lista.map((l, i) => `
    <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);background:var(--surface);padding:8px;margin-bottom:6px;flex-wrap:wrap">
      <span class="pp-handle" title="Trascina per riordinare" style="cursor:grab;touch-action:none;user-select:none;color:var(--muted);display:flex;padding:6px 2px"><iconify-icon icon="mdi:drag" width="18"></iconify-icon></span>
      <select onchange="provaNfcLink(${i},'type',this.value)" style="font-family:'DM Mono',monospace;font-size:10px">
        ${TIPI_LINK_NFC_ADMIN.map(([v, lbl]) => `<option value="${v}" ${l.type === v ? 'selected' : ''}>${v === 'tripadvisor' ? 'Recensioni' : lbl}</option>`).join('')}
      </select>
      <input type="text" placeholder="Etichetta" value="${escKit(l.label)}" onchange="provaNfcLink(${i},'label',this.value)" style="flex:1;min-width:100px;font-family:'DM Mono',monospace;font-size:11px;padding:6px;border:1px solid var(--border)"/>
      <input type="text" placeholder="URL o numero" value="${escKit(l.url)}" onchange="provaNfcLink(${i},'url',this.value)" style="flex:1;min-width:100px;font-family:'DM Mono',monospace;font-size:11px;padding:6px;border:1px solid var(--border)"/>
      <label style="font-size:9px;font-family:'DM Mono',monospace;display:flex;align-items:center;gap:4px;white-space:nowrap">
        <input type="checkbox" style="width:auto" ${l.is_visible !== false ? 'checked' : ''} onchange="provaNfcLink(${i},'is_visible',this.checked)"/> visibile</label>
      <button class="action-btn danger" onclick="provaNfcRimuoviLink(${i})">✕</button>
    </div>`).join('') || '<p style="color:var(--muted);font-size:12px">Nessun bottone.</p>';

  if (window.provaNfcSortable) window.provaNfcSortable.destroy();
  window.provaNfcSortable = window.Sortable && lista.length > 1 ? Sortable.create(wrap, {
    handle: '.pp-handle', animation: 180, delay: 120, delayOnTouchOnly: true, touchStartThreshold: 4,
    onEnd: (e) => {
      if (e.oldIndex === e.newIndex) return;
      provaNfcPersonalizza();
      const [spostato] = provaNfc.links.splice(e.oldIndex, 1);
      provaNfc.links.splice(e.newIndex, 0, spostato);
      provaNfcRenderLinks();
    },
  }) : null;
}

// dal primo cambiamento i bottoni automatici diventano una lista scelta a mano
function provaNfcPersonalizza() {
  if (provaNfc.links === null) {
    provaNfc.links = provaNfc.linksAuto.map(({ type, label, url }) => ({ type, label, url, is_visible: true }));
  }
}

function provaNfcLink(i, campo, valore) {
  provaNfcPersonalizza();
  provaNfc.links[i][campo] = valore;
  provaNfcRenderLinks();
}

function provaNfcAggiungiLink() {
  provaNfcPersonalizza();
  provaNfc.links.push({ type: 'instagram', label: '', url: '', is_visible: true });
  provaNfcRenderLinks();
}

function provaNfcRimuoviLink(i) {
  provaNfcPersonalizza();
  provaNfc.links.splice(i, 1);
  provaNfcRenderLinks();
}

function provaNfcLinksAuto() {
  if (!confirm('Tornare ai bottoni automatici? I bottoni scelti a mano si perdono quando salvi la pagina.')) return;
  provaNfc.links = null;
  provaNfcRenderLinks();
}

async function provaNfcSalvaPagina(id) {
  const v = id => document.getElementById(id)?.value;
  const body = {
    descrizione: v('ppDescrizione'),
    design: {
      primaryColor: v('ppColore'), logoSize: v('ppLogoSize'), backgroundType: v('ppTipoSfondo'),
      backgroundColor: v('ppColoreSfondo'), backgroundOpacity: parseInt(v('ppOpFoto'), 10),
      buttonColor: v('ppColoreBottoni'), buttonOpacity: parseInt(v('ppOpBottoni'), 10), loadingColor: v('ppColoreCaricamento'),
      youtube: (v('ppYoutube') || '').trim(),
      allergeni: [...document.querySelectorAll('input[name="ppAllergene"]:checked')].map(c => Number(c.value)),
    },
    links: provaNfc.links,
  };
  const btn = document.getElementById('ppSalva'); btn.disabled = true; provaNfcStatoPagina('Salvo…');
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}/pagina`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    await provaNfcModifica(id);
    provaNfcStatoPagina('Pagina salvata.');
  } catch (e) { provaNfcStatoPagina('Errore: ' + e.message); btn.disabled = false; }
}

async function provaNfcAspettoAuto(id) {
  if (!confirm("Tornare all'aspetto automatico (sfondo bianco o nero secondo il logo)? Video e allergeni si tolgono, la foto resta caricata.")) return;
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}/pagina`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ design: {} }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    await provaNfcModifica(id);
    provaNfcStatoPagina('Aspetto automatico ripristinato.');
  } catch (e) { provaNfcStatoPagina('Errore: ' + e.message); }
}

async function provaNfcCaricaSfondo(id) {
  const file = document.getElementById('ppFoto')?.files[0];
  if (!file) return;
  const fd = new FormData(); fd.append('background', file);
  provaNfcStatoPagina('Carico la foto…');
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}/sfondo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    await provaNfcModifica(id);
    provaNfcStatoPagina('Foto di sfondo caricata.');
  } catch (e) { provaNfcStatoPagina('Errore: ' + e.message); }
}

async function provaNfcRimuoviSfondo(id) {
  if (!confirm('Togliere la foto di sfondo?')) return;
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}/sfondo`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error((await r.json()).error);
    await provaNfcModifica(id);
  } catch (e) { provaNfcStatoPagina('Errore: ' + e.message); }
}

function provaNfcStatoModifica(testo) { const e = document.getElementById('peStato'); if (e) e.textContent = testo; }

async function provaNfcSalva(id) {
  const v = id => document.getElementById(id).value.trim();
  const slug = v('peSlug');
  if (v('peNome').length < 2) return provaNfcStatoModifica('Il nome è obbligatorio.');
  if (!/^[a-z0-9-]{2,50}$/.test(slug)) return provaNfcStatoModifica('Slug non valido: 2–50 caratteri tra a-z, 0-9 e trattino.');
  const fd = new FormData();
  fd.append('nome', v('peNome')); fd.append('categoria', v('peCategoria')); fd.append('indirizzo', v('peIndirizzo'));
  fd.append('telefono', v('peTelefono')); fd.append('sito', v('peSito')); fd.append('maps_url', v('peMaps'));
  fd.append('orari', document.getElementById('peOrari').value); fd.append('slug', slug);
  fd.append('giorni', v('peGiorni')); fd.append('attiva', String(document.getElementById('peAttiva').checked));
  const togli = document.getElementById('peTogliLogo'), voto = document.getElementById('peNascondiVoto');
  if (togli?.checked) fd.append('togli_logo', 'true');
  if (voto?.checked) fd.append('nascondi_voto', 'true');
  const logo = document.getElementById('peLogo').files[0];
  if (logo) fd.append('logo', logo);
  const btn = document.getElementById('peSalva'); btn.disabled = true; provaNfcStatoModifica('Salvo…');
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    await provaNfcModifica(id);
    provaNfcStatoModifica('Salvato.');
  } catch (e) { provaNfcStatoModifica('Errore: ' + e.message); btn.disabled = false; }
}

async function provaNfcRicarica(id) {
  if (!confirm('Rileggere i dati da Google Maps?\n\nNome, categoria, indirizzo, telefono, sito, link di Maps, orari e valutazione tornano quelli di Google: le modifiche fatte a mano su questi campi si perdono.')) return;
  provaNfcStatoModifica('Rileggo da Google Maps…');
  try {
    const r = await fetch(`${API}/kit/admin/prove/${id}/ricarica`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    await provaNfcModifica(id);
    provaNfcStatoModifica('Dati di Google ricaricati.');
  } catch (e) { provaNfcStatoModifica('Errore: ' + e.message); }
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
