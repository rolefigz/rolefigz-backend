const API_NFC_CLIENT = `${API}/nfc`;

const TIPI_LINK_NFC = [
  ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Facebook'],
  ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'],
  ['website', 'Sito web'], ['menu', 'Menu'], ['booking', 'Prenotazioni'],
  ['maps', 'Come arrivare'], ['tripadvisor', 'TripAdvisor'], ['phone', 'Telefono'],
  ['email', 'Email'], ['custom', 'Altro'],
];

const STATO_LABEL_CLIENTE = {
  inactive: 'Non attivato', trial: 'Prova gratuita', active: 'Attivo',
  grace: 'Periodo di grazia', cancelled: 'Cancellato', suspended: 'Sospeso',
};

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${localStorage.getItem('rfToken')}`, ...extra };
}

function showMsg(id, testo, tipo) {
  const el = document.getElementById(id);
  if (el) { el.className = `msg ${tipo}`; el.textContent = testo; }
}

function nfcTab(tab, el) {
  document.querySelectorAll('.menu-item').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
  const content = document.getElementById('nfcContent');
  if (tab === 'home') tabNfcHome(content);
  if (tab === 'azienda') tabNfcAzienda(content);
  if (tab === 'pagina') tabNfcPagina(content);
  if (tab === 'merch') tabNfcMerch(content);
  if (tab === 'ordini') tabNfcOrdini(content);
  if (tab === 'statistiche') tabNfcStatistiche(content);
}

document.addEventListener('DOMContentLoaded', () => nfcTab('home', document.querySelector('.menu-item')));

// ══════════════════════════════ HOME ══════════════════════════════

async function tabNfcHome(content) {
  content.innerHTML = '<div class="loading">Caricamento…</div>';
  try {
    const r = await fetch(`${API_NFC_CLIENT}/home`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);

    const sub = d.subscription || {};
    content.innerHTML = `
      <h2>Ciao, ${d.azienda.name}</h2>
      <p style="font-size:.85rem;margin-bottom:20px">
        Stato: <strong>${STATO_LABEL_CLIENTE[sub.status] || sub.status}</strong>
        ${sub.paid_until ? ` — pagato fino al ${new Date(sub.paid_until).toLocaleDateString('it-IT')}` : ''}
        — pagina ${d.paginaPubblicata ? '<span style="color:var(--green)">pubblicata</span>' : '<span style="color:var(--red)">non pubblicata</span>'}
      </p>
      ${d.paginaPubblicata ? `<p style="margin-bottom:20px"><a href="${d.url}" target="_blank">${d.url}</a></p>` : ''}

      <div class="stats-row">
        <div class="stat"><div class="num">${d.creditiSaldo}</div><div class="lbl">CREDITI DISPONIBILI</div></div>
        <div class="stat"><div class="num">${d.ordiniInCorso}</div><div class="lbl">ORDINI IN CORSO</div></div>
        <div class="stat"><div class="num">${d.statisticheMese.visite}</div><div class="lbl">VISITE QUESTO MESE</div></div>
        <div class="stat"><div class="num">${d.statisticheMese.scansioni}</div><div class="lbl">SCANSIONI QUESTO MESE</div></div>
        <div class="stat"><div class="num">${d.statisticheMese.click}</div><div class="lbl">CLICK QUESTO MESE</div></div>
      </div>
      <p style="font-size:11px;color:var(--muted)">Merchandising, ordini e statistiche dettagliate arriveranno presto in questo pannello.</p>`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

// ═══════════════════════════ LA MIA AZIENDA ═══════════════════════════

async function tabNfcAzienda(content) {
  content.innerHTML = '<div class="loading">Caricamento…</div>';
  try {
    const r = await fetch(`${API_NFC_CLIENT}/azienda`, { headers: authHeaders() });
    const a = await r.json();
    if (!r.ok) throw new Error(a.error);

    content.innerHTML = `
      <div class="card">
        <h3>Dati azienda</h3>
        <div class="field"><label>Nome azienda</label><input id="gaName" type="text" value="${a.name || ''}"/></div>
        <div class="field"><label>Settore</label><input id="gaSettore" type="text" value="${a.sector || ''}"/></div>
        <div class="field"><label>Indirizzo pagina (non modificabile)</label><input type="text" value="rolefigz.com/nfc/${a.slug}" disabled/></div>
      </div>
      <div class="card">
        <h3>Dati fiscali</h3>
        <div class="form-row">
          <div class="field"><label>P.IVA</label><input id="gaPiva" type="text" value="${a.piva || ''}"/></div>
          <div class="field"><label>Codice fiscale</label><input id="gaCf" type="text" value="${a.codice_fiscale || ''}"/></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Codice SDI</label><input id="gaSdi" type="text" value="${a.codice_sdi || ''}"/></div>
          <div class="field"><label>PEC</label><input id="gaPec" type="text" value="${a.pec || ''}"/></div>
        </div>
      </div>
      <button class="btn-submit" onclick="nfcSalvaAziendaCliente()">Salva modifiche</button>
      <div id="gaMsg"></div>
      <p class="note">Il piano, i crediti e i pagamenti sono gestiti da RoleFigz — per modificarli contattaci direttamente.</p>`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

async function nfcSalvaAziendaCliente() {
  const body = {
    name:           document.getElementById('gaName')?.value.trim(),
    sector:         document.getElementById('gaSettore')?.value.trim(),
    piva:           document.getElementById('gaPiva')?.value.trim(),
    codice_fiscale: document.getElementById('gaCf')?.value.trim(),
    codice_sdi:     document.getElementById('gaSdi')?.value.trim(),
    pec:            document.getElementById('gaPec')?.value.trim(),
  };
  try {
    const r = await fetch(`${API_NFC_CLIENT}/azienda`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.dettagli?.[0]?.messaggio || data.error);
    showMsg('gaMsg', '✅ Salvato', 'ok');
  } catch(e) { showMsg('gaMsg', e.message, 'err'); }
}

// ═══════════════════════════ LA MIA PAGINA ═══════════════════════════

let nfcLinksCorrenti = [];

async function tabNfcPagina(content) {
  content.innerHTML = '<div class="loading">Caricamento…</div>';
  try {
    const r = await fetch(`${API_NFC_CLIENT}/pagina`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    const p = d.pagina || {};
    nfcLinksCorrenti = d.links || [];

    const tipoSfondo = p.design?.backgroundType || (p.background_url ? 'foto' : 'nessuno');
    const opFoto = p.design?.backgroundOpacity ?? 70;
    const opBtn = p.design?.buttonOpacity ?? 5;

    content.innerHTML = `
      <div class="card" style="margin-bottom:20px;display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button class="action-btn" onclick="nfcAnteprimaPagina()"><iconify-icon icon="mdi:eye-outline" width="14"></iconify-icon> Anteprima</button>
        <button class="action-btn" style="background:rgba(26,127,75,.1);color:var(--green)" onclick="nfcPubblicaPagina()">Pubblica</button>
        <button class="action-btn" style="background:rgba(192,57,43,.1);color:var(--red)" onclick="nfcNascondiPagina()">Nascondi</button>
        <span style="font-size:.78rem;color:var(--muted)">${p.is_published ? 'Attualmente pubblicata' : 'Non ancora pubblicata'}</span>
      </div>

      <details class="pg-sezione" open>
        <summary><span><iconify-icon icon="mdi:file-document-outline" width="15"></iconify-icon> Contenuto</span></summary>
        <div class="pg-sezione-body">
          <div class="field">
            <label>Logo</label>
            ${p.logo_url ? `<img src="${p.logo_url}" style="width:64px;height:64px;object-fit:cover;border:1px solid var(--border);display:block;margin-bottom:8px"/>` : ''}
            <input type="file" id="cpLogo" accept="image/png,image/jpeg,image/webp" onchange="nfcCaricaLogo()"/>
          </div>
          <div class="field"><label>Descrizione</label><textarea id="cpDescrizione" maxlength="2000">${p.description || ''}</textarea></div>
          <div class="field"><label>Orario</label><input id="cpOrario" type="text" maxlength="160" placeholder="Lun-Ven 9:00-19:00" value="${p.hours || ''}"/></div>
          <div class="form-row">
            <div class="field"><label>Titolo SEO</label><input id="cpSeoTitolo" type="text" maxlength="160" value="${p.seo_title || ''}"/></div>
            <div class="field"><label>Descrizione SEO</label><input id="cpSeoDescrizione" type="text" maxlength="300" value="${p.seo_description || ''}"/></div>
          </div>
        </div>
      </details>

      <details class="pg-sezione">
        <summary><span><iconify-icon icon="mdi:palette-outline" width="15"></iconify-icon> Aspetto</span></summary>
        <div class="pg-sezione-body">
          <div class="form-row">
            <div class="field"><label>Colore principale</label><input id="cpColore" type="color" value="${p.design?.primaryColor || '#FF6A2C'}" style="height:42px;padding:4px;width:100px"/></div>
            <div class="field"><label>Dimensione logo</label>
              <select id="cpLogoSize">
                <option value="piccolo" ${p.design?.logoSize === 'piccolo' ? 'selected' : ''}>Piccolo</option>
                <option value="medio" ${!p.design?.logoSize || p.design?.logoSize === 'medio' ? 'selected' : ''}>Medio</option>
                <option value="grande" ${p.design?.logoSize === 'grande' ? 'selected' : ''}>Grande</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label>Sfondo pagina</label>
            <select id="cpBackgroundType" onchange="nfcAggiornaTipoSfondo()">
              <option value="nessuno" ${tipoSfondo === 'nessuno' ? 'selected' : ''}>Nessuno (pagina più leggera)</option>
              <option value="colore" ${tipoSfondo === 'colore' ? 'selected' : ''}>Colore pieno</option>
              <option value="foto" ${tipoSfondo === 'foto' ? 'selected' : ''}>Foto</option>
            </select>
          </div>

          <div id="cpBgColoreWrap" class="field" style="display:${tipoSfondo === 'colore' ? '' : 'none'}">
            <label>Colore di sfondo</label>
            <input id="cpBackgroundColor" type="color" value="${p.design?.backgroundColor || '#0A0A0A'}" style="height:42px;padding:4px;width:100px"/>
          </div>

          <div id="cpBgFotoWrap" class="field" style="display:${tipoSfondo === 'foto' ? '' : 'none'}">
            <label>Immagine di sfondo</label>
            ${p.background_url ? `<img src="${p.background_url}" style="width:100%;max-width:260px;height:110px;object-fit:cover;border:1px solid var(--border);display:block;margin-bottom:8px;filter:grayscale(60%) brightness(.55)"/>` : ''}
            <input type="file" id="cpSfondo" accept="image/png,image/jpeg,image/webp" onchange="nfcCaricaSfondo()"/>
            ${p.background_url ? `<button class="action-btn danger" style="margin-top:8px" onclick="nfcRimuoviSfondo()">Rimuovi sfondo</button>` : ''}
            <label style="margin-top:12px">Opacità della foto</label>
            <div class="range-row">
              <input type="range" id="cpBackgroundOpacity" min="10" max="100" value="${opFoto}" oninput="document.getElementById('cpBgOpVal').textContent=this.value+'%'"/>
              <span class="val" id="cpBgOpVal">${opFoto}%</span>
            </div>
          </div>

          <div class="field" style="margin-top:14px">
            <label>Colore dei pulsanti</label>
            <input id="cpButtonColor" type="color" value="${p.design?.buttonColor || '#F4F1EA'}" style="height:42px;padding:4px;width:100px"/>
          </div>
          <div class="field">
            <label>Opacità dei pulsanti</label>
            <div class="range-row">
              <input type="range" id="cpButtonOpacity" min="0" max="100" value="${opBtn}" oninput="document.getElementById('cpBtnOpVal').textContent=this.value+'%'"/>
              <span class="val" id="cpBtnOpVal">${opBtn}%</span>
            </div>
          </div>

          <div class="field" style="margin-top:14px">
            <label>Colore schermata di caricamento</label>
            <input id="cpLoadingColor" type="color" value="${p.design?.loadingColor || '#0A0A0A'}" style="height:42px;padding:4px;width:100px"/>
            <div class="note">Il colore mostrato per un istante mentre la pagina si carica, prima che appaia il logo.</div>
          </div>
        </div>
      </details>

      <details class="pg-sezione">
        <summary><span><iconify-icon icon="mdi:map-marker-outline" width="15"></iconify-icon> Mappa</span></summary>
        <div class="pg-sezione-body">
          <div class="field">
            <label>Google Maps o OpenStreetMap</label>
            <textarea id="cpMappa" rows="2" placeholder="Incolla qui il link o il codice <iframe> di 'Incorpora una mappa'">${p.map_embed_url || ''}</textarea>
            <div class="note">Su Google Maps: Condividi → Incorpora una mappa → copia e incolla qui.</div>
          </div>
        </div>
      </details>

      <button class="btn-submit" onclick="nfcSalvaContenuto()">Salva modifiche</button>
      <div id="nfcContenutoMsg" style="margin-bottom:20px"></div>

      <details class="pg-sezione" open>
        <summary><span><iconify-icon icon="mdi:link-variant" width="15"></iconify-icon> Link</span></summary>
        <div class="pg-sezione-body">
          <div class="note" style="margin-bottom:12px">
            Se cambi WhatsApp o Instagram non serve riprogrammare gli NFC, basta salvare qui.<br/>
            L'icona si aggiunge da sola in base al Tipo — non serve scriverla anche nell'Etichetta.
          </div>
          <div id="nfcLinksLista"></div>
          <button class="action-btn" onclick="nfcAggiungiLink()">+ Aggiungi link</button>
          <button class="btn-submit" onclick="nfcSalvaLinks()" style="margin-left:8px">Salva link</button>
          <div id="nfcLinksMsg"></div>
        </div>
      </details>`;

    nfcRenderLinks();
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

function nfcRenderLinks() {
  const wrap = document.getElementById('nfcLinksLista');
  if (!wrap) return;
  wrap.innerHTML = nfcLinksCorrenti.map((l, i) => `
    <div class="link-row">
      <select onchange="nfcLinksCorrenti[${i}].type=this.value">
        ${TIPI_LINK_NFC.map(([v, lbl]) => `<option value="${v}" ${l.type === v ? 'selected' : ''}>${lbl}</option>`).join('')}
      </select>
      <input type="text" placeholder="Etichetta" value="${l.label || ''}" oninput="nfcLinksCorrenti[${i}].label=this.value"/>
      <input type="text" placeholder="URL o numero" value="${l.url || ''}" oninput="nfcLinksCorrenti[${i}].url=this.value"/>
      <label style="font-size:.72rem;color:var(--muted);display:flex;align-items:center;gap:4px;white-space:nowrap">
        <input type="checkbox" style="width:auto" ${l.is_visible !== false ? 'checked' : ''} onchange="nfcLinksCorrenti[${i}].is_visible=this.checked"/> visibile
      </label>
      <button class="action-btn danger" onclick="nfcRimuoviLink(${i})"><iconify-icon icon="mdi:close" width="14"></iconify-icon></button>
    </div>`).join('') || '<p style="color:var(--muted);font-size:12px">Nessun link ancora.</p>';
}

function nfcAggiungiLink() {
  nfcLinksCorrenti.push({ type: 'whatsapp', label: '', url: '', is_visible: true });
  nfcRenderLinks();
}

function nfcRimuoviLink(i) {
  nfcLinksCorrenti.splice(i, 1);
  nfcRenderLinks();
}

function nfcAggiornaTipoSfondo() {
  const tipo = document.getElementById('cpBackgroundType')?.value;
  const coloreWrap = document.getElementById('cpBgColoreWrap');
  const fotoWrap = document.getElementById('cpBgFotoWrap');
  if (coloreWrap) coloreWrap.style.display = tipo === 'colore' ? '' : 'none';
  if (fotoWrap) fotoWrap.style.display = tipo === 'foto' ? '' : 'none';
}

async function nfcSalvaContenuto() {
  const body = {
    description:     document.getElementById('cpDescrizione')?.value,
    hours:            document.getElementById('cpOrario')?.value,
    seo_title:        document.getElementById('cpSeoTitolo')?.value,
    seo_description:  document.getElementById('cpSeoDescrizione')?.value,
    map_embed_url:    document.getElementById('cpMappa')?.value.trim() || null,
    design: {
      primaryColor:      document.getElementById('cpColore')?.value,
      logoSize:          document.getElementById('cpLogoSize')?.value,
      backgroundType:    document.getElementById('cpBackgroundType')?.value,
      backgroundColor:   document.getElementById('cpBackgroundColor')?.value,
      backgroundOpacity: parseInt(document.getElementById('cpBackgroundOpacity')?.value, 10),
      buttonColor:       document.getElementById('cpButtonColor')?.value,
      buttonOpacity:     parseInt(document.getElementById('cpButtonOpacity')?.value, 10),
      loadingColor:      document.getElementById('cpLoadingColor')?.value,
    },
  };
  try {
    const r = await fetch(`${API_NFC_CLIENT}/pagina`, {
      method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || (d.dettagli && d.dettagli.map(x => x.messaggio).join(', ')));
    showMsg('nfcContenutoMsg', '✅ Modifiche salvate', 'ok');
  } catch(e) { showMsg('nfcContenutoMsg', e.message, 'err'); }
}

async function nfcSalvaLinks() {
  try {
    const r = await fetch(`${API_NFC_CLIENT}/pagina/link`, {
      method: 'PUT', headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ links: nfcLinksCorrenti }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    nfcLinksCorrenti = d;
    nfcRenderLinks();
    showMsg('nfcLinksMsg', '✅ Link salvati', 'ok');
  } catch(e) { showMsg('nfcLinksMsg', e.message, 'err'); }
}

async function nfcCaricaLogo() {
  const file = document.getElementById('cpLogo')?.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('logo', file);
  try {
    const r = await fetch(`${API_NFC_CLIENT}/pagina/logo`, { method: 'POST', headers: authHeaders(), body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    showMsg('nfcContenutoMsg', '✅ Logo caricato', 'ok');
  } catch(e) { showMsg('nfcContenutoMsg', e.message, 'err'); }
}

async function nfcCaricaSfondo() {
  const file = document.getElementById('cpSfondo')?.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('background', file);
  try {
    const r = await fetch(`${API_NFC_CLIENT}/pagina/sfondo`, { method: 'POST', headers: authHeaders(), body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    showMsg('nfcContenutoMsg', '✅ Sfondo caricato', 'ok');
    tabNfcPagina(document.getElementById('nfcContent'));
  } catch(e) { showMsg('nfcContenutoMsg', e.message, 'err'); }
}

async function nfcRimuoviSfondo() {
  if (!confirm('Rimuovere lo sfondo? La pagina tornerà alla versione leggera.')) return;
  try {
    const r = await fetch(`${API_NFC_CLIENT}/pagina/sfondo`, { method: 'DELETE', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    tabNfcPagina(document.getElementById('nfcContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

async function nfcAnteprimaPagina() {
  try {
    const r = await fetch(`${API_NFC_CLIENT}/pagina/anteprima`, { headers: authHeaders() });
    const html = await r.text();
    if (!r.ok) throw new Error('Errore anteprima');
    const blob = new Blob([html], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  } catch(e) { alert('Errore: ' + e.message); }
}

async function nfcPubblicaPagina() {
  try {
    const r = await fetch(`${API_NFC_CLIENT}/pagina/pubblica`, { method: 'POST', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    tabNfcPagina(document.getElementById('nfcContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

async function nfcNascondiPagina() {
  try {
    const r = await fetch(`${API_NFC_CLIENT}/pagina/nascondi`, { method: 'POST', headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    tabNfcPagina(document.getElementById('nfcContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}


// ══════════════════════════════ MERCHANDISING ══════════════════════════════

let nfcCatalogoCache = [];
let nfcCreditiSaldoCache = 0;
let nfcCarrello = {};

function euroDaCents(c) { return (parseInt(c || 0, 10) / 100).toFixed(2); }

async function tabNfcMerch(content) {
  content.innerHTML = '<div class="loading">Caricamento…</div>';
  try {
    const r = await fetch(`${API_NFC_CLIENT}/prodotti`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    nfcCatalogoCache = d.prodotti;
    nfcCreditiSaldoCache = d.creditiSaldo;
    nfcCarrello = {};

    content.innerHTML = `
      <p style="margin-bottom:16px">Crediti disponibili: <strong>${nfcCreditiSaldoCache}</strong></p>
      <div class="prod-grid">
        ${nfcCatalogoCache.map(p => `
          <div class="card prod-card">
            ${p.image ? `<img src="${p.image}"/>` : ''}
            <div style="font-weight:700">${p.name}</div>
            <div style="font-size:11px;color:var(--muted);margin:4px 0">${p.description || ''}</div>
            <div style="font-size:12px;margin-bottom:8px">${p.credit_cost} crediti ${p.extra_price_cents ? `· extra €${euroDaCents(p.extra_price_cents)}/pz` : ''} ${p.production_days ? `· ${p.production_days} gg` : ''}</div>
            <button class="action-btn" onclick="nfcCarrelloAggiungi(${p.id})">+ Aggiungi</button>
          </div>`).join('')}
      </div>

      <div class="card">
        <h3>Carrello</h3>
        <div id="nfcCarrelloLista"></div>
        <div id="nfcCarrelloTotali" style="margin:14px 0;font-size:13px"></div>

        <div class="form-row">
          <div class="field"><label>Consegna</label>
            <select id="ordConsegna" onchange="document.getElementById('ordIndirizzoWrap').style.display=this.value==='shipping'?'':'none'">
              <option value="hand">Ritiro a mano</option>
              <option value="shipping">Spedizione</option>
            </select>
          </div>
        </div>
        <div id="ordIndirizzoWrap" style="display:none">
          <div class="field"><label>Indirizzo di spedizione</label><input id="ordIndirizzo" type="text" placeholder="Via, citta', CAP"/></div>
        </div>
        <div class="field"><label>Note</label><input id="ordNote" type="text" placeholder="opzionale"/></div>

        <button class="btn-submit" onclick="nfcInviaOrdine()">Invia ordine</button>
        <div id="nfcOrdineMsg"></div>
      </div>`;

    nfcRenderCarrello();
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

function nfcCarrelloAggiungi(productId) {
  nfcCarrello[productId] = (nfcCarrello[productId] || 0) + 1;
  nfcRenderCarrello();
}

function nfcCarrelloAggiorna(productId, quantity) {
  const q = parseInt(quantity, 10);
  if (!q || q < 1) delete nfcCarrello[productId];
  else nfcCarrello[productId] = q;
  nfcRenderCarrello();
}

// Stessa logica di allocazione greedy del backend, solo per l'anteprima —
// il totale reale viene sempre ricalcolato server-side prima di scalare i crediti.
function nfcCalcolaAllocazione() {
  let residuo = nfcCreditiSaldoCache;
  let creditiTotali = 0, extraTotaleCents = 0;
  const righe = Object.entries(nfcCarrello).map(([id, qty]) => {
    const p = nfcCatalogoCache.find(x => x.id === parseInt(id, 10));
    if (!p) return null;
    const unitaCoperte = Math.max(0, Math.min(qty, Math.floor(residuo / (p.credit_cost || 1)) || 0));
    const creditiUsati = unitaCoperte * p.credit_cost;
    residuo -= creditiUsati;
    creditiTotali += creditiUsati;
    const unitaExtra = qty - unitaCoperte;
    const extraCents = unitaExtra * (p.extra_price_cents || 0);
    extraTotaleCents += extraCents;
    return { prodotto: p, qty, extraCents };
  }).filter(Boolean);
  return { righe, creditiTotali, extraTotaleCents };
}

function nfcRenderCarrello() {
  const lista = document.getElementById('nfcCarrelloLista');
  const totali = document.getElementById('nfcCarrelloTotali');
  if (!lista) return;

  if (!Object.keys(nfcCarrello).length) {
    lista.innerHTML = '<p style="color:var(--muted);font-size:12px">Carrello vuoto.</p>';
    totali.innerHTML = '';
    return;
  }

  const { righe, creditiTotali, extraTotaleCents } = nfcCalcolaAllocazione();
  lista.innerHTML = righe.map(r => `
    <div class="cart-row">
      <span>${r.prodotto.name}</span>
      <input type="number" min="1" value="${r.qty}" onchange="nfcCarrelloAggiorna(${r.prodotto.id}, this.value)"/>
      <span style="color:var(--red);font-size:.78rem">${r.extraCents > 0 ? `+€${euroDaCents(r.extraCents)}` : ''}</span>
      <button class="action-btn danger" onclick="nfcCarrelloAggiorna(${r.prodotto.id}, 0)"><iconify-icon icon="mdi:close" width="14"></iconify-icon></button>
    </div>`).join('');

  totali.innerHTML = `Crediti usati: <strong>${creditiTotali}</strong> / ${nfcCreditiSaldoCache} disponibili
    ${extraTotaleCents > 0 ? `<br/><span style="color:var(--red)">Hai superato i crediti disponibili — eccedenza da pagare in contanti: <strong>€${euroDaCents(extraTotaleCents)}</strong></span>` : ''}`;
}

async function nfcInviaOrdineConferma(confermaEccedenza) {
  const delivery_method = document.getElementById('ordConsegna')?.value;
  const indirizzo = document.getElementById('ordIndirizzo')?.value.trim();

  const body = {
    items: Object.entries(nfcCarrello).map(([product_id, quantity]) => ({ product_id: parseInt(product_id, 10), quantity })),
    delivery_method,
    shipping_address: delivery_method === 'shipping' ? { indirizzo } : undefined,
    notes: document.getElementById('ordNote')?.value.trim() || undefined,
    conferma_eccedenza: !!confermaEccedenza,
  };

  const r = await fetch(`${API_NFC_CLIENT}/ordini`, {
    method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(body),
  });
  return { r, d: await r.json() };
}

async function nfcInviaOrdine() {
  if (!Object.keys(nfcCarrello).length) { showMsg('nfcOrdineMsg', 'Il carrello e\' vuoto', 'err'); return; }
  const delivery_method = document.getElementById('ordConsegna')?.value;
  const indirizzo = document.getElementById('ordIndirizzo')?.value.trim();
  if (delivery_method === 'shipping' && !indirizzo) {
    showMsg('nfcOrdineMsg', 'Inserisci l\'indirizzo di spedizione', 'err'); return;
  }

  try {
    let { r, d } = await nfcInviaOrdineConferma(false);

    if (r.status === 409 && d.dettagli?.richiedeConferma) {
      const proseguire = confirm(
        `Hai superato i crediti disponibili.\n\nCrediti usati: ${d.dettagli.creditiUsati} / ${d.dettagli.saldoCrediti}\n` +
        `Eccedenza da pagare in contanti alla consegna: €${euroDaCents(d.dettagli.extraAmountCents)}\n\n` +
        `Vuoi continuare con l'ordine?`
      );
      if (!proseguire) return;
      ({ r, d } = await nfcInviaOrdineConferma(true));
    }

    if (!r.ok) throw new Error(d.error || (Array.isArray(d.dettagli) && d.dettagli.map(x => x.messaggio).join(', ')));
    alert(`Ordine inviato! Crediti usati: ${d.creditiUsati}`);
    nfcTab('ordini', null);
  } catch(e) { showMsg('nfcOrdineMsg', e.message, 'err'); }
}

// ══════════════════════════════ ORDINI ══════════════════════════════

const STATO_ORDINE_LABEL = {
  in_attesa: 'In attesa', confermato: 'Confermato', in_produzione: 'In produzione',
  pronto: 'Pronto', spedito: 'Spedito', consegnato: 'Consegnato', annullato: 'Annullato',
};

async function tabNfcOrdini(content) {
  content.innerHTML = '<div class="loading">Caricamento…</div>';
  try {
    const r = await fetch(`${API_NFC_CLIENT}/ordini`, { headers: authHeaders() });
    const ordini = await r.json();
    if (!r.ok) throw new Error(ordini.error);

    if (!ordini.length) {
      content.innerHTML = '<div class="card"><p style="color:var(--muted)">Non hai ancora nessun ordine.</p></div>';
      return;
    }

    content.innerHTML = ordini.map(o => `
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>Ordine #${o.id}</strong>
          <span class="pill">${STATO_ORDINE_LABEL[o.status] || o.status}</span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px">${new Date(o.createdAt).toLocaleDateString('it-IT')}</div>
        ${(o.items || []).map(it => `<div style="font-size:12px">${it.MerchProduct?.name || '?'} × ${it.quantity}</div>`).join('')}
        <div style="margin-top:8px;font-size:12px">Crediti usati: ${o.credits_used}${o.extra_amount_cents > 0 ? ` · Eccedenza: €${euroDaCents(o.extra_amount_cents)}` : ''}</div>
      </div>`).join('');
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

// ══════════════════════════════ STATISTICHE ══════════════════════════════

let nfcChartStatistiche = null;

async function tabNfcStatistiche(content, range = '7') {
  content.innerHTML = '<div class="loading">Caricamento…</div>';
  try {
    const r = await fetch(`${API_NFC_CLIENT}/statistiche?range=${range}`, { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);

    const RANGE_LABEL = { today: 'Oggi', '7': '7 giorni', '30': '30 giorni', '90': '90 giorni' };

    content.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:20px">
        ${Object.keys(RANGE_LABEL).map(k => `<button class="action-btn ${k === range ? 'active' : ''}" onclick="tabNfcStatistiche(document.getElementById('nfcContent'), '${k}')">${RANGE_LABEL[k]}</button>`).join('')}
      </div>

      <div class="stats-row">
        <div class="stat"><div class="num">${d.totali.page_view}</div><div class="lbl">VISITE PAGINA</div></div>
        <div class="stat"><div class="num">${d.totali.tag_scan}</div><div class="lbl">SCANSIONI TAG</div></div>
        <div class="stat"><div class="num">${d.totali.link_click}</div><div class="lbl">CLICK SUI LINK</div></div>
      </div>

      <div class="card" style="margin-bottom:20px">
        <canvas id="nfcStatsCanvas" height="90"></canvas>
      </div>

      <div class="card">
        <h3>Scansioni per tag</h3>
        ${!d.perTag.length
          ? '<p style="color:var(--muted);font-size:12px">Nessuna scansione in questo periodo.</p>'
          : `<table><thead><tr><th>Tag</th><th>Scansioni</th></tr></thead><tbody>
              ${d.perTag.map(t => `<tr><td>${t.label || t.code}</td><td>${t.scansioni}</td></tr>`).join('')}
            </tbody></table>`}
      </div>`;

    if (nfcChartStatistiche) nfcChartStatistiche.destroy();
    const ctx = document.getElementById('nfcStatsCanvas');
    if (ctx && window.Chart) {
      nfcChartStatistiche = new Chart(ctx, {
        type: 'line',
        data: {
          labels: d.serieGiornaliera.map(g => new Date(g.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })),
          datasets: [
            { label: 'Visite', data: d.serieGiornaliera.map(g => g.page_view), borderColor: '#0071E3', tension: 0.3 },
            { label: 'Scansioni', data: d.serieGiornaliera.map(g => g.tag_scan), borderColor: '#1a7f4b', tension: 0.3 },
            { label: 'Click', data: d.serieGiornaliera.map(g => g.link_click), borderColor: '#c0392b', tension: 0.3 },
          ],
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
      });
    }
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}
