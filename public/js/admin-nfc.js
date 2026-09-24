const API_NFC = `${API}/admin/nfc`;

function euroACentesimi(v) { return Math.round(parseFloat(v || 0) * 100); }
function centesimiAEuro(c) { return (parseInt(c || 0, 10) / 100).toFixed(2); }

const STATO_LABEL_NFC = {
  inactive: 'NON ATTIVATO', trial: 'PROVA', active: 'ATTIVO',
  grace: 'GRAZIA', cancelled: 'CANCELLATO', suspended: 'SOSPESO',
};
const STATO_COLORE_NFC = {
  inactive: 'var(--muted)', trial: 'var(--accent)', active: 'var(--green)',
  grace: 'var(--accent)', cancelled: 'var(--red)', suspended: 'var(--red)',
};

let nfcPianiCache = [];
let nfcPgLinksCorrenti = [];

const TIPI_LINK_NFC_ADMIN = [
  ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'], ['facebook', 'Facebook'],
  ['tiktok', 'TikTok'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'],
  ['website', 'Sito web'], ['menu', 'Menu'], ['booking', 'Prenotazioni'],
  ['maps', 'Come arrivare'], ['tripadvisor', 'TripAdvisor'], ['phone', 'Telefono'],
  ['email', 'Email'], ['custom', 'Altro'],
];

// ══════════════════════════════ AZIENDE ══════════════════════════════

async function adminTabNfcAziende(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const [rAziende, rPiani] = await Promise.all([
      fetch(`${API_NFC}/aziende`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_NFC}/piani`,   { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const aziende = await rAziende.json();
    nfcPianiCache = await rPiani.json();
    if (!Array.isArray(aziende)) throw new Error(aziende?.error || 'Errore caricamento aziende');

    const opzioniPiano = nfcPianiCache.map(p => `<option value="${p.id}">${p.name} — €${centesimiAEuro(p.monthly_price_cents)}/mese</option>`).join('');

    const righe = aziende.map(a => {
      const sub = a.Subscription || {};
      const stato = sub.status || 'inactive';
      return `<tr>
        <td><strong>${a.name}</strong><div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">/nfc/${a.slug}</div></td>
        <td>${a.Utente ? `${a.Utente.nombre}<div style="font-size:9px;color:var(--muted)">${a.Utente.email}</div>` : '—'}</td>
        <td>${sub.Plan ? sub.Plan.name : '—'}</td>
        <td><span class="pill" style="background:${STATO_COLORE_NFC[stato]};color:#fff">${STATO_LABEL_NFC[stato]}</span></td>
        <td>${sub.paid_until ? new Date(sub.paid_until).toLocaleDateString('it-IT') : '—'}</td>
        <td style="font-weight:700">${a.creditiSaldo}</td>
        <td>${a.ordiniTotali}</td>
        <td>${a.CompanyPage?.is_published ? '✅' : '—'}</td>
        <td>
          <button class="action-btn" onclick="adminTabNfcAziendaDettaglio(${a.id})">VEDI</button>
          <button class="action-btn" onclick="nfcCambiaStatoAzienda(${a.id}, '${a.status === 'suspended' ? 'active' : 'suspended'}')">${a.status === 'suspended' ? 'RIATTIVA' : 'SOSPENDI'}</button>
          <button class="action-btn danger" onclick="nfcEliminaAzienda(${a.id})">✕</button>
        </td>
      </tr>`;
    }).join('');

    content.innerHTML = `
      <div class="admin-form-title">AZIENDE NFC</div>

      <div style="background:var(--surface);border:1px solid var(--border);padding:20px;margin-bottom:24px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--muted);margin-bottom:16px">NUOVA AZIENDA</div>
        <div class="form-row">
          <div class="field"><label>Nome azienda *</label><input id="naName" type="text" placeholder="Cooperativa Sociale XY"/></div>
          <div class="field"><label>Slug *</label><input id="naSlug" type="text" placeholder="cooperativa-xy" oninput="this.value=this.value.toLowerCase()"/></div>
          <div class="field"><label>Piano *</label><select id="naPlanId"><option value="">Seleziona...</option>${opzioniPiano}</select></div>
          <div class="field"><label>Settore</label><input id="naSettore" type="text" placeholder="ristorazione, retail..."/></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Nome referente cliente *</label><input id="naOwnerNombre" type="text" placeholder="Mario Rossi"/></div>
          <div class="field"><label>Email cliente *</label><input id="naOwnerEmail" type="email" placeholder="mario@azienda.it"/></div>
        </div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin:6px 0 12px">
          Se l'email esiste gia' tra gli utenti, l'azienda viene collegata a quell'account. Altrimenti ne viene creato uno nuovo (verrai avvisato con una password generata da comunicare al cliente).
        </div>
        <button class="btn-submit" onclick="nfcCreaAzienda()">+ CREA AZIENDA</button>
        <div id="nfcAziendaMsg"></div>
      </div>

      ${!aziende.length
        ? '<div class="empty-state"><div class="ei">🏢</div><h3>NESSUNA AZIENDA</h3></div>'
        : `<table>
            <thead><tr>
              <th>Azienda</th><th>Cliente</th><th>Piano</th><th>Stato</th><th>Pagato fino al</th>
              <th>Crediti</th><th>Ordini</th><th>Pagina</th><th>Azioni</th>
            </tr></thead>
            <tbody>${righe}</tbody>
          </table>`}`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

async function nfcCreaAzienda() {
  const body = {
    name:         document.getElementById('naName')?.value.trim(),
    slug:         document.getElementById('naSlug')?.value.trim(),
    plan_id:      document.getElementById('naPlanId')?.value,
    sector:       document.getElementById('naSettore')?.value.trim() || undefined,
    owner_nombre: document.getElementById('naOwnerNombre')?.value.trim(),
    owner_email:  document.getElementById('naOwnerEmail')?.value.trim(),
  };
  if (!body.name || !body.slug || !body.plan_id || !body.owner_nombre || !body.owner_email) {
    showMsg('nfcAziendaMsg', 'Compila tutti i campi obbligatori (*)', 'err'); return;
  }
  try {
    const r = await fetch(`${API_NFC}/aziende`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || (data.dettagli && data.dettagli.map(d => d.messaggio).join(', ')));
    if (data.passwordGenerata) {
      alert(`Azienda creata!\n\nNuovo account cliente:\nEmail: ${data.proprietario.email}\nPassword: ${data.passwordGenerata}\n\nComunica queste credenziali al cliente, non verranno mostrate di nuovo.`);
    } else {
      showMsg('nfcAziendaMsg', '✅ Azienda creata e collegata al cliente esistente', 'ok');
    }
    adminTabNfcAziende(document.getElementById('adminContent'));
  } catch(e) { showMsg('nfcAziendaMsg', e.message, 'err'); }
}

async function nfcCambiaStatoAzienda(id, status) {
  if (!confirm(status === 'suspended' ? 'Sospendere questa azienda?' : 'Riattivare questa azienda?')) return;
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTabNfcAziende(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

async function nfcEliminaAzienda(id) {
  if (!confirm('Eliminare questa azienda? (eliminazione soft, resta recuperabile dal database)')) return;
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTabNfcAziende(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

// ══════════════════════════ DETTAGLIO AZIENDA ══════════════════════════

async function adminTabNfcAziendaDettaglio(id) {
  const content = document.getElementById('adminContent');
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const [r, rPagina] = await Promise.all([
      fetch(`${API_NFC}/aziende/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_NFC}/aziende/${id}/pagina`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    const { azienda, creditiSaldo, movimenti, pagamenti } = data;
    const sub = azienda.Subscription || {};
    const stato = sub.status || 'inactive';
    const puoAttivareProva = !sub.paid_until;

    const datiPagina = await rPagina.json();
    const pagina = datiPagina.pagina || {};
    nfcPgLinksCorrenti = datiPagina.links || [];
    const nfcPgTipoSfondo = pagina.design?.backgroundType || (pagina.background_url ? 'foto' : 'nessuno');
    const nfcPgOpFoto = pagina.design?.backgroundOpacity ?? 70;
    const nfcPgOpBtn = pagina.design?.buttonOpacity ?? 5;

    if (!nfcPianiCache.length) {
      nfcPianiCache = await (await fetch(`${API_NFC}/piani`, { headers: { Authorization: `Bearer ${token}` } })).json();
    }
    const opzioniPiano = nfcPianiCache.map(p =>
      `<option value="${p.id}" ${sub.plan_id === p.id ? 'selected' : ''}>${p.name} — €${centesimiAEuro(p.monthly_price_cents)}/mese</option>`).join('');

    const righeMovimenti = movimenti.map(m => `
      <tr>
        <td>${new Date(m.createdAt).toLocaleString('it-IT')}</td>
        <td>${m.reason}</td>
        <td style="font-weight:700;color:${m.delta >= 0 ? 'var(--green)' : 'var(--red)'}">${m.delta >= 0 ? '+' : ''}${m.delta}</td>
      </tr>`).join('') || '<tr><td colspan="3" style="color:var(--muted)">Nessun movimento</td></tr>';

    const righePagamenti = pagamenti.map(p => `
      <tr>
        <td>${new Date(p.received_at).toLocaleDateString('it-IT')}</td>
        <td>€${centesimiAEuro(p.amount_cents)}</td>
        <td>${p.months_covered}</td>
        <td>${p.note || '—'}</td>
      </tr>`).join('') || '<tr><td colspan="4" style="color:var(--muted)">Nessun pagamento</td></tr>';

    content.innerHTML = `
      <button class="action-btn" onclick="adminTabNfcAziende(document.getElementById('adminContent'))" style="margin-bottom:16px">← TORNA ALLA LISTA</button>
      <div class="admin-form-title">${azienda.name} <span class="pill" style="background:${STATO_COLORE_NFC[stato]};color:#fff;margin-left:8px">${STATO_LABEL_NFC[stato]}</span></div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">

        <div style="background:var(--surface);border:1px solid var(--border);padding:20px">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--muted);margin-bottom:16px">DATI AZIENDA</div>
          <div class="form-row">
            <div class="field"><label>Nome</label><input id="daName" type="text" value="${azienda.name}"/></div>
            <div class="field"><label>Settore</label><input id="daSettore" type="text" value="${azienda.sector || ''}"/></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Piano</label><select id="daPlanId">${opzioniPiano}</select></div>
            <div class="field"><label>P.IVA</label><input id="daPiva" type="text" value="${azienda.piva || ''}"/></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Codice Fiscale</label><input id="daCf" type="text" value="${azienda.codice_fiscale || ''}"/></div>
            <div class="field"><label>Codice SDI</label><input id="daSdi" type="text" value="${azienda.codice_sdi || ''}"/></div>
            <div class="field"><label>PEC</label><input id="daPec" type="text" value="${azienda.pec || ''}"/></div>
          </div>
          <button class="btn-submit" onclick="nfcSalvaAzienda(${azienda.id})">SALVA MODIFICHE</button>
          <div id="nfcDettaglioMsg"></div>
          <div style="margin-top:14px;font-family:'DM Mono',monospace;font-size:10px;color:var(--muted)">
            Cliente: ${azienda.Utente?.nombre || '—'} (${azienda.Utente?.email || '—'})<br/>
            Pagato fino al: ${sub.paid_until ? new Date(sub.paid_until).toLocaleDateString('it-IT') : '—'}<br/>
            Mesi consecutivi pagati: ${sub.consecutive_paid_months || 0}<br/>
            Prova fino al: ${sub.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString('it-IT') : '—'}
          </div>
        </div>

        <div style="background:var(--surface);border:1px solid var(--border);padding:20px">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--muted);margin-bottom:16px">CREDITI — saldo attuale: <strong style="color:var(--dark)">${creditiSaldo}</strong></div>
          <div class="form-row">
            <div class="field"><label>Delta (+/-)</label><input id="dcDelta" type="number" placeholder="es. 20 o -20"/></div>
            <div class="field"><label>Motivo *</label><input id="dcMotivo" type="text" placeholder="obbligatorio"/></div>
          </div>
          <button class="btn-submit" onclick="nfcAggiustaCrediti(${azienda.id})">AGGIUSTA CREDITI</button>
          <div id="nfcCreditiMsg"></div>

          <div style="border-top:1px solid var(--border);margin:18px 0 14px;padding-top:14px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--muted)">REGISTRA PAGAMENTO IN CONTANTI</div>
          <div class="form-row">
            <div class="field"><label>Importo (€) *</label><input id="dpImporto" type="number" step="0.01" placeholder="49.00"/></div>
            <div class="field"><label>Mesi coperti *</label><input id="dpMesi" type="number" value="1" min="1"/></div>
            <div class="field"><label>Data ricevuto</label><input id="dpData" type="date"/></div>
          </div>
          <div class="field"><label>Nota</label><input id="dpNota" type="text" placeholder="opzionale"/></div>
          <button class="btn-submit" onclick="nfcRegistraPagamento(${azienda.id})">REGISTRA PAGAMENTO</button>
          <div id="nfcPagamentoMsg"></div>

          ${puoAttivareProva ? `
          <div style="border-top:1px solid var(--border);margin:18px 0 14px;padding-top:14px">
            <button class="action-btn" onclick="nfcAttivaProva(${azienda.id})">ATTIVA PROVA 7 GIORNI</button>
          </div>` : ''}
        </div>
      </div>

      <div style="margin-top:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--muted)">PAGINA PUBBLICA — /nfc/${azienda.slug}</div>
          <div>
            <button class="action-btn" onclick="nfcPgAnteprima(${azienda.id})">👁 ANTEPRIMA</button>
            <button class="action-btn" style="border-color:var(--green);color:var(--green)" onclick="nfcPgPubblica(${azienda.id})">PUBBLICA</button>
            <button class="action-btn" style="border-color:var(--red);color:var(--red)" onclick="nfcPgNascondi(${azienda.id})">NASCONDI</button>
            <span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">${pagina.is_published ? 'Pubblicata' : 'Non pubblicata'}</span>
          </div>
        </div>

        <details class="pg-sezione" open>
          <summary>📝 CONTENUTO</summary>
          <div class="pg-sezione-body">
            <div class="field">
              <label>Logo</label>
              ${pagina.logo_url ? `<img src="${pagina.logo_url}" style="width:56px;height:56px;object-fit:cover;border:1px solid var(--border);display:block;margin-bottom:6px"/>` : ''}
              <input type="file" id="pgLogo" accept="image/png,image/jpeg,image/webp" onchange="nfcPgCaricaLogo(${azienda.id})"/>
            </div>
            <div class="field"><label>Descrizione</label><textarea id="pgDescrizione">${pagina.description || ''}</textarea></div>
            <div class="form-row">
              <div class="field"><label>Orario</label><input id="pgOrario" type="text" placeholder="Lun-Ven 9:00-19:00" value="${pagina.hours || ''}"/></div>
            </div>
            <div class="form-row">
              <div class="field"><label>Titolo SEO</label><input id="pgSeoTitolo" type="text" value="${pagina.seo_title || ''}"/></div>
              <div class="field"><label>Descrizione SEO</label><input id="pgSeoDescrizione" type="text" value="${pagina.seo_description || ''}"/></div>
            </div>
          </div>
        </details>

        <details class="pg-sezione">
          <summary>🎨 ASPETTO</summary>
          <div class="pg-sezione-body">
            <div class="form-row">
              <div class="field"><label>Colore principale</label><input id="pgColore" type="color" value="${pagina.design?.primaryColor || '#FF6A2C'}" style="height:42px;padding:4px;width:100px"/></div>
              <div class="field"><label>Dimensione logo</label>
                <select id="pgLogoSize">
                  <option value="piccolo" ${pagina.design?.logoSize === 'piccolo' ? 'selected' : ''}>Piccolo</option>
                  <option value="medio" ${!pagina.design?.logoSize || pagina.design?.logoSize === 'medio' ? 'selected' : ''}>Medio</option>
                  <option value="grande" ${pagina.design?.logoSize === 'grande' ? 'selected' : ''}>Grande</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label>Sfondo pagina</label>
              <select id="pgBackgroundType" onchange="nfcPgAggiornaTipoSfondo()">
                <option value="nessuno" ${nfcPgTipoSfondo === 'nessuno' ? 'selected' : ''}>Nessuno (pagina più leggera)</option>
                <option value="colore" ${nfcPgTipoSfondo === 'colore' ? 'selected' : ''}>Colore pieno</option>
                <option value="foto" ${nfcPgTipoSfondo === 'foto' ? 'selected' : ''}>Foto</option>
              </select>
            </div>

            <div id="pgBgColoreWrap" class="field" style="display:${nfcPgTipoSfondo === 'colore' ? '' : 'none'}">
              <label>Colore di sfondo</label>
              <input id="pgBackgroundColor" type="color" value="${pagina.design?.backgroundColor || '#0A0A0A'}" style="height:42px;padding:4px;width:100px"/>
            </div>

            <div id="pgBgFotoWrap" class="field" style="display:${nfcPgTipoSfondo === 'foto' ? '' : 'none'}">
              <label>Immagine di sfondo</label>
              ${pagina.background_url ? `<img src="${pagina.background_url}" style="width:100%;max-width:180px;height:76px;object-fit:cover;border:1px solid var(--border);display:block;margin-bottom:6px;filter:grayscale(60%) brightness(.55)"/>` : ''}
              <input type="file" id="pgSfondo" accept="image/png,image/jpeg,image/webp" onchange="nfcPgCaricaSfondo(${azienda.id})"/>
              ${pagina.background_url ? `<button class="action-btn danger" style="margin-top:6px" onclick="nfcPgRimuoviSfondo(${azienda.id})">RIMUOVI SFONDO</button>` : ''}
              <label style="margin-top:12px">Opacità della foto</label>
              <div class="range-row">
                <input type="range" id="pgBackgroundOpacity" min="10" max="100" value="${nfcPgOpFoto}" oninput="document.getElementById('pgBgOpVal').textContent=this.value+'%'"/>
                <span class="val" id="pgBgOpVal">${nfcPgOpFoto}%</span>
              </div>
            </div>

            <div class="field" style="margin-top:14px">
              <label>Colore dei pulsanti</label>
              <input id="pgButtonColor" type="color" value="${pagina.design?.buttonColor || '#F4F1EA'}" style="height:42px;padding:4px;width:100px"/>
            </div>
            <div class="field">
              <label>Opacità dei pulsanti</label>
              <div class="range-row">
                <input type="range" id="pgButtonOpacity" min="0" max="100" value="${nfcPgOpBtn}" oninput="document.getElementById('pgBtnOpVal').textContent=this.value+'%'"/>
                <span class="val" id="pgBtnOpVal">${nfcPgOpBtn}%</span>
              </div>
            </div>
          </div>
        </details>

        <details class="pg-sezione">
          <summary>📍 MAPPA</summary>
          <div class="pg-sezione-body">
            <div class="field">
              <label>Google Maps o OpenStreetMap</label>
              <textarea id="pgMappa" rows="2" placeholder="Incolla qui il link o il codice <iframe> di 'Incorpora una mappa'">${pagina.map_embed_url || ''}</textarea>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:6px">Su Google Maps: Condividi → Incorpora una mappa → copia e incolla qui.</div>
            </div>
          </div>
        </details>

        <button class="btn-submit" onclick="nfcPgSalvaContenuto(${azienda.id})">SALVA MODIFICHE</button>
        <div id="nfcPgContenutoMsg" style="margin-bottom:14px"></div>

        <details class="pg-sezione" open>
          <summary>🔗 LINK / RETI SOCIALI</summary>
          <div class="pg-sezione-body">
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-bottom:12px">
              L'icona si aggiunge da sola in base al Tipo — non serve scriverla anche nell'Etichetta.
            </div>
            <div id="nfcPgLinksLista"></div>
            <button class="action-btn" onclick="nfcPgAggiungiLink()">+ AGGIUNGI LINK</button>
            <button class="btn-submit" onclick="nfcPgSalvaLinks(${azienda.id})" style="margin-left:8px">SALVA LINK</button>
            <div id="nfcPgLinksMsg"></div>
          </div>
        </details>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">
        <div>
          <div class="admin-form-title" style="font-size:14px">MOVIMENTI CREDITI</div>
          <table><thead><tr><th>Data</th><th>Motivo</th><th>Delta</th></tr></thead><tbody>${righeMovimenti}</tbody></table>
        </div>
        <div>
          <div class="admin-form-title" style="font-size:14px">PAGAMENTI</div>
          <table><thead><tr><th>Data</th><th>Importo</th><th>Mesi</th><th>Nota</th></tr></thead><tbody>${righePagamenti}</tbody></table>
        </div>
      </div>`;

    nfcPgRenderLinks();
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

function nfcPgRenderLinks() {
  const wrap = document.getElementById('nfcPgLinksLista');
  if (!wrap) return;
  wrap.innerHTML = nfcPgLinksCorrenti.map((l, i) => `
    <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--border);padding:8px;margin-bottom:6px;flex-wrap:wrap">
      <select onchange="nfcPgLinksCorrenti[${i}].type=this.value" style="font-family:'DM Mono',monospace;font-size:10px">
        ${TIPI_LINK_NFC_ADMIN.map(([v, lbl]) => `<option value="${v}" ${l.type === v ? 'selected' : ''}>${lbl}</option>`).join('')}
      </select>
      <input type="text" placeholder="Etichetta" value="${l.label || ''}" oninput="nfcPgLinksCorrenti[${i}].label=this.value" style="flex:1;min-width:100px;font-family:'DM Mono',monospace;font-size:11px;padding:6px;border:1px solid var(--border)"/>
      <input type="text" placeholder="URL o numero" value="${l.url || ''}" oninput="nfcPgLinksCorrenti[${i}].url=this.value" style="flex:1;min-width:100px;font-family:'DM Mono',monospace;font-size:11px;padding:6px;border:1px solid var(--border)"/>
      <label style="font-size:9px;font-family:'DM Mono',monospace;display:flex;align-items:center;gap:4px;white-space:nowrap">
        <input type="checkbox" style="width:auto" ${l.is_visible !== false ? 'checked' : ''} onchange="nfcPgLinksCorrenti[${i}].is_visible=this.checked"/> visibile
      </label>
      <button class="action-btn danger" onclick="nfcPgRimuoviLink(${i})">✕</button>
    </div>`).join('') || '<p style="color:var(--muted);font-size:12px">Nessun link ancora.</p>';
}

function nfcPgAggiungiLink() {
  nfcPgLinksCorrenti.push({ type: 'whatsapp', label: '', url: '', is_visible: true });
  nfcPgRenderLinks();
}

function nfcPgRimuoviLink(i) {
  nfcPgLinksCorrenti.splice(i, 1);
  nfcPgRenderLinks();
}

function nfcPgAggiornaTipoSfondo() {
  const tipo = document.getElementById('pgBackgroundType')?.value;
  const coloreWrap = document.getElementById('pgBgColoreWrap');
  const fotoWrap = document.getElementById('pgBgFotoWrap');
  if (coloreWrap) coloreWrap.style.display = tipo === 'colore' ? '' : 'none';
  if (fotoWrap) fotoWrap.style.display = tipo === 'foto' ? '' : 'none';
}

async function nfcPgSalvaContenuto(id) {
  const body = {
    description:      document.getElementById('pgDescrizione')?.value,
    hours:             document.getElementById('pgOrario')?.value,
    seo_title:         document.getElementById('pgSeoTitolo')?.value,
    seo_description:   document.getElementById('pgSeoDescrizione')?.value,
    map_embed_url:     document.getElementById('pgMappa')?.value.trim() || null,
    design: {
      primaryColor:      document.getElementById('pgColore')?.value,
      logoSize:          document.getElementById('pgLogoSize')?.value,
      backgroundType:    document.getElementById('pgBackgroundType')?.value,
      backgroundColor:   document.getElementById('pgBackgroundColor')?.value,
      backgroundOpacity: parseInt(document.getElementById('pgBackgroundOpacity')?.value, 10),
      buttonColor:       document.getElementById('pgButtonColor')?.value,
      buttonOpacity:     parseInt(document.getElementById('pgButtonOpacity')?.value, 10),
    },
  };
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/pagina`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || (d.dettagli && d.dettagli.map(x => x.messaggio).join(', ')));
    showMsg('nfcPgContenutoMsg', '✅ Modifiche salvate', 'ok');
  } catch(e) { showMsg('nfcPgContenutoMsg', e.message, 'err'); }
}

async function nfcPgSalvaLinks(id) {
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/pagina/link`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ links: nfcPgLinksCorrenti }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    nfcPgLinksCorrenti = d;
    nfcPgRenderLinks();
    showMsg('nfcPgLinksMsg', '✅ Link salvati', 'ok');
  } catch(e) { showMsg('nfcPgLinksMsg', e.message, 'err'); }
}

async function nfcPgCaricaLogo(id) {
  const file = document.getElementById('pgLogo')?.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('logo', file);
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/pagina/logo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    adminTabNfcAziendaDettaglio(id);
  } catch(e) { showMsg('nfcPgContenutoMsg', e.message, 'err'); }
}

async function nfcPgCaricaSfondo(id) {
  const file = document.getElementById('pgSfondo')?.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('background', file);
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/pagina/sfondo`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    adminTabNfcAziendaDettaglio(id);
  } catch(e) { showMsg('nfcPgContenutoMsg', e.message, 'err'); }
}

async function nfcPgRimuoviSfondo(id) {
  if (!confirm('Rimuovere lo sfondo? La pagina tornerà alla versione leggera.')) return;
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/pagina/sfondo`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTabNfcAziendaDettaglio(id);
  } catch(e) { alert('Errore: ' + e.message); }
}

async function nfcPgPubblica(id) {
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/pagina/pubblica`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    adminTabNfcAziendaDettaglio(id);
  } catch(e) { alert('Errore: ' + e.message); }
}

async function nfcPgNascondi(id) {
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/pagina/nascondi`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    adminTabNfcAziendaDettaglio(id);
  } catch(e) { alert('Errore: ' + e.message); }
}

async function nfcPgAnteprima(id) {
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/pagina/anteprima`, { headers: { Authorization: `Bearer ${token}` } });
    const html = await r.text();
    if (!r.ok) throw new Error('Errore anteprima');
    const blob = new Blob([html], { type: 'text/html' });
    window.open(URL.createObjectURL(blob), '_blank');
  } catch(e) { alert('Errore: ' + e.message); }
}

async function nfcSalvaAzienda(id) {
  const body = {
    name:           document.getElementById('daName')?.value.trim(),
    sector:         document.getElementById('daSettore')?.value.trim(),
    plan_id:        document.getElementById('daPlanId')?.value,
    piva:           document.getElementById('daPiva')?.value.trim(),
    codice_fiscale: document.getElementById('daCf')?.value.trim(),
    codice_sdi:     document.getElementById('daSdi')?.value.trim(),
    pec:            document.getElementById('daPec')?.value.trim(),
  };
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('nfcDettaglioMsg', '✅ Salvato', 'ok');
  } catch(e) { showMsg('nfcDettaglioMsg', e.message, 'err'); }
}

async function nfcAggiustaCrediti(id) {
  const delta  = parseInt(document.getElementById('dcDelta')?.value, 10);
  const motivo = document.getElementById('dcMotivo')?.value.trim();
  if (!delta) { showMsg('nfcCreditiMsg', 'Inserisci un delta diverso da zero', 'err'); return; }
  if (!motivo) { showMsg('nfcCreditiMsg', 'Il motivo e\' obbligatorio', 'err'); return; }
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/crediti/aggiusta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ delta, motivo }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    adminTabNfcAziendaDettaglio(id);
  } catch(e) { showMsg('nfcCreditiMsg', e.message, 'err'); }
}

async function nfcRegistraPagamento(id) {
  const amount_cents   = euroACentesimi(document.getElementById('dpImporto')?.value);
  const months_covered = parseInt(document.getElementById('dpMesi')?.value, 10) || 1;
  const received_at    = document.getElementById('dpData')?.value || undefined;
  const note            = document.getElementById('dpNota')?.value.trim() || undefined;
  if (!amount_cents) { showMsg('nfcPagamentoMsg', 'Inserisci un importo valido', 'err'); return; }
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/pagamenti`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount_cents, months_covered, received_at, note }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    adminTabNfcAziendaDettaglio(id);
  } catch(e) { showMsg('nfcPagamentoMsg', e.message, 'err'); }
}

async function nfcAttivaProva(id) {
  if (!confirm('Attivare la prova gratuita di 7 giorni per questa azienda?')) return;
  try {
    const r = await fetch(`${API_NFC}/aziende/${id}/prova`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    adminTabNfcAziendaDettaglio(id);
  } catch(e) { alert('Errore: ' + e.message); }
}

// ══════════════════════════════ PIANI ══════════════════════════════

let nfcPianoInModifica = null;

async function adminTabNfcPiani(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API_NFC}/piani`, { headers: { Authorization: `Bearer ${token}` } });
    const piani = await r.json();
    if (!Array.isArray(piani)) throw new Error(piani?.error || 'Errore caricamento piani');
    nfcPianiCache = piani;

    const righe = piani.map(p => `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>€${centesimiAEuro(p.monthly_price_cents)}/mese</td>
        <td>${p.monthly_credits}</td>
        <td><span class="pill" style="background:${p.active ? 'var(--green)' : 'var(--muted)'};color:#fff">${p.active ? 'ATTIVO' : 'OFF'}</span></td>
        <td>
          <button class="action-btn" onclick="nfcModificaPiano(${p.id})">MODIFICA</button>
          <button class="action-btn" onclick="nfcTogglePiano(${p.id}, ${!p.active})">${p.active ? 'DISATTIVA' : 'ATTIVA'}</button>
        </td>
      </tr>`).join('');

    content.innerHTML = `
      <div class="admin-form-title">PIANI NFC</div>

      <div style="background:var(--surface);border:1px solid var(--border);padding:20px;margin-bottom:24px">
        <div id="ppFormTitolo" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--muted);margin-bottom:16px">NUOVO PIANO</div>
        <div class="form-row">
          <div class="field"><label>Nome *</label><input id="ppName" type="text" placeholder="Base, Pro, Premium..."/></div>
          <div class="field"><label>Prezzo mensile (€) *</label><input id="ppPrezzo" type="number" step="0.01" placeholder="49.00"/></div>
          <div class="field"><label>Crediti mensili *</label><input id="ppCrediti" type="number" placeholder="100"/></div>
          <div class="field"><label>Posizione</label><input id="ppPosizione" type="number" value="0"/></div>
        </div>
        <button class="btn-submit" id="ppSalvaBtn" onclick="nfcSalvaPiano()">+ CREA PIANO</button>
        <button class="action-btn" id="ppAnnullaBtn" onclick="nfcAnnullaModificaPiano()" style="display:none;margin-left:8px">ANNULLA</button>
        <div id="nfcPianoMsg"></div>
      </div>

      ${!piani.length
        ? '<div class="empty-state"><div class="ei">📋</div><h3>NESSUN PIANO</h3></div>'
        : `<table><thead><tr><th>Nome</th><th>Prezzo</th><th>Crediti/mese</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>${righe}</tbody></table>`}`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

function nfcModificaPiano(id) {
  const p = nfcPianiCache.find(x => x.id === id);
  if (!p) return;
  nfcPianoInModifica = id;
  document.getElementById('ppName').value = p.name;
  document.getElementById('ppPrezzo').value = centesimiAEuro(p.monthly_price_cents);
  document.getElementById('ppCrediti').value = p.monthly_credits;
  document.getElementById('ppPosizione').value = p.position || 0;
  document.getElementById('ppFormTitolo').textContent = `MODIFICA PIANO: ${p.name}`;
  document.getElementById('ppSalvaBtn').textContent = 'SALVA MODIFICHE';
  document.getElementById('ppAnnullaBtn').style.display = '';
}

function nfcAnnullaModificaPiano() {
  nfcPianoInModifica = null;
  adminTabNfcPiani(document.getElementById('adminContent'));
}

async function nfcSalvaPiano() {
  const body = {
    name:                document.getElementById('ppName')?.value.trim(),
    monthly_price_cents: euroACentesimi(document.getElementById('ppPrezzo')?.value),
    monthly_credits:     parseInt(document.getElementById('ppCrediti')?.value, 10) || 0,
    position:            parseInt(document.getElementById('ppPosizione')?.value, 10) || 0,
  };
  if (!body.name) { showMsg('nfcPianoMsg', 'Il nome e\' obbligatorio', 'err'); return; }
  try {
    const url    = nfcPianoInModifica ? `${API_NFC}/piani/${nfcPianoInModifica}` : `${API_NFC}/piani`;
    const method = nfcPianoInModifica ? 'PUT' : 'POST';
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || (data.dettagli && data.dettagli.map(d => d.messaggio).join(', ')));
    nfcPianoInModifica = null;
    adminTabNfcPiani(document.getElementById('adminContent'));
  } catch(e) { showMsg('nfcPianoMsg', e.message, 'err'); }
}

async function nfcTogglePiano(id, active) {
  try {
    const r = await fetch(`${API_NFC}/piani/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTabNfcPiani(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

// ══════════════════════════════ TAG ══════════════════════════════

let nfcAziendeCacheTag = [];

async function adminTabNfcTags(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const [rTags, rAziende] = await Promise.all([
      fetch(`${API_NFC}/tags`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_NFC}/aziende`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const tags = await rTags.json();
    nfcAziendeCacheTag = await rAziende.json();
    if (!Array.isArray(tags)) throw new Error(tags?.error || 'Errore caricamento tag');

    const opzioniAzienda = nfcAziendeCacheTag.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

    const righe = tags.map(t => `
      <tr>
        <td><strong style="font-family:'DM Mono',monospace;letter-spacing:1px">${t.code}</strong></td>
        <td>${t.type.toUpperCase()}</td>
        <td>${t.label || '—'}</td>
        <td>
          <select onchange="nfcRiassegnaTag(${t.id}, this.value)" style="font-family:'DM Mono',monospace;font-size:10px">
            <option value="">— non assegnato —</option>
            ${nfcAziendeCacheTag.map(a => `<option value="${a.id}" ${t.Company?.id === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
          </select>
        </td>
        <td><span class="pill" style="background:${t.is_active ? 'var(--green)' : 'var(--muted)'};color:#fff">${t.is_active ? 'ATTIVO' : 'OFF'}</span></td>
        <td><button class="action-btn" onclick="nfcToggleTag(${t.id}, ${!t.is_active})">${t.is_active ? 'DISATTIVA' : 'ATTIVA'}</button></td>
      </tr>`).join('');

    content.innerHTML = `
      <div class="admin-form-title">TAG NFC</div>

      <div style="background:var(--surface);border:1px solid var(--border);padding:20px;margin-bottom:24px">
        <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--muted);margin-bottom:16px">CREA TAG</div>
        <div class="form-row">
          <div class="field"><label>Tipo</label><select id="ttTipo"><option value="qr">QR</option><option value="nfc">NFC</option></select></div>
          <div class="field"><label>Quantita'</label><input id="ttQuantita" type="number" value="1" min="1" max="100"/></div>
          <div class="field"><label>Etichetta</label><input id="ttEtichetta" type="text" placeholder="es. portachiavi lotto 1"/></div>
          <div class="field"><label>Assegna subito a (opzionale)</label><select id="ttAzienda"><option value="">— nessuna —</option>${opzioniAzienda}</select></div>
        </div>
        <button class="btn-submit" onclick="nfcCreaTag()">+ CREA TAG</button>
        <div id="nfcTagMsg"></div>
      </div>

      ${!tags.length
        ? '<div class="empty-state"><div class="ei">🏷️</div><h3>NESSUN TAG</h3></div>'
        : `<table><thead><tr><th>Codice</th><th>Tipo</th><th>Etichetta</th><th>Azienda</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>${righe}</tbody></table>`}`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

async function nfcCreaTag() {
  const body = {
    type:      document.getElementById('ttTipo')?.value,
    quantity:  parseInt(document.getElementById('ttQuantita')?.value, 10) || 1,
    label:     document.getElementById('ttEtichetta')?.value.trim() || undefined,
    company_id: document.getElementById('ttAzienda')?.value || undefined,
  };
  try {
    const r = await fetch(`${API_NFC}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || (data.dettagli && data.dettagli.map(d => d.messaggio).join(', ')));
    showMsg('nfcTagMsg', `✅ ${data.length} tag creati`, 'ok');
    adminTabNfcTags(document.getElementById('adminContent'));
  } catch(e) { showMsg('nfcTagMsg', e.message, 'err'); }
}

async function nfcRiassegnaTag(id, companyId) {
  try {
    const r = await fetch(`${API_NFC}/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ company_id: companyId || null }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
  } catch(e) { alert('Errore: ' + e.message); adminTabNfcTags(document.getElementById('adminContent')); }
}

async function nfcToggleTag(id, is_active) {
  try {
    const r = await fetch(`${API_NFC}/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTabNfcTags(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

// ══════════════════════════ PRODOTTI MERCH ══════════════════════════

const STATI_ORDINE_MERCH = ['in_attesa', 'confermato', 'in_produzione', 'pronto', 'spedito', 'consegnato', 'annullato'];
let nfcProdottoInModifica = null;

async function adminTabNfcProdotti(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API_NFC}/prodotti`, { headers: { Authorization: `Bearer ${token}` } });
    const prodotti = await r.json();
    if (!Array.isArray(prodotti)) throw new Error(prodotti?.error || 'Errore caricamento prodotti');

    const righe = prodotti.map(p => `
      <tr>
        <td>${p.image ? `<img src="${p.image}" style="width:36px;height:36px;object-fit:cover;vertical-align:middle;margin-right:8px"/>` : ''}<strong>${p.name}</strong></td>
        <td>${p.credit_cost}</td>
        <td>€${centesimiAEuro(p.extra_price_cents)}</td>
        <td>${p.production_days ?? '—'} gg</td>
        <td><span class="pill" style="background:${p.active ? 'var(--green)' : 'var(--muted)'};color:#fff">${p.active ? 'ATTIVO' : 'OFF'}</span></td>
        <td>
          <button class="action-btn" onclick="nfcModificaProdotto(${p.id})">MODIFICA</button>
          <button class="action-btn" onclick="nfcToggleProdotto(${p.id}, ${!p.active})">${p.active ? 'DISATTIVA' : 'ATTIVA'}</button>
        </td>
      </tr>`).join('');

    content.innerHTML = `
      <div class="admin-form-title">PRODOTTI MERCHANDISING</div>

      <div style="background:var(--surface);border:1px solid var(--border);padding:20px;margin-bottom:24px">
        <div id="mpFormTitolo" style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--muted);margin-bottom:16px">NUOVO PRODOTTO</div>
        <div class="form-row">
          <div class="field"><label>Nome *</label><input id="mpName" type="text" placeholder="Portachiavi 3D"/></div>
          <div class="field"><label>Crediti richiesti *</label><input id="mpCrediti" type="number" min="0" placeholder="10"/></div>
          <div class="field"><label>Prezzo eccedenza (€)</label><input id="mpPrezzoExtra" type="number" step="0.01" placeholder="5.00"/></div>
          <div class="field"><label>Giorni produzione</label><input id="mpGiorni" type="number" min="0" placeholder="7"/></div>
        </div>
        <div class="field"><label>Descrizione</label><textarea id="mpDescrizione" placeholder="Descrizione breve del prodotto"></textarea></div>
        <div class="field"><label>Immagine</label><input id="mpImmagine" type="file" accept="image/png,image/jpeg,image/webp"/></div>
        <button class="btn-submit" id="mpSalvaBtn" onclick="nfcSalvaProdotto()">+ CREA PRODOTTO</button>
        <button class="action-btn" id="mpAnnullaBtn" onclick="nfcAnnullaModificaProdotto()" style="display:none;margin-left:8px">ANNULLA</button>
        <div id="nfcProdottoMsg"></div>
      </div>

      ${!prodotti.length
        ? '<div class="empty-state"><div class="ei">🎁</div><h3>NESSUN PRODOTTO</h3></div>'
        : `<table><thead><tr><th>Prodotto</th><th>Crediti</th><th>Extra</th><th>Produzione</th><th>Stato</th><th>Azioni</th></tr></thead><tbody>${righe}</tbody></table>`}`;

    window.nfcProdottiCache = prodotti;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

function nfcModificaProdotto(id) {
  const p = (window.nfcProdottiCache || []).find(x => x.id === id);
  if (!p) return;
  nfcProdottoInModifica = id;
  document.getElementById('mpName').value = p.name;
  document.getElementById('mpCrediti').value = p.credit_cost;
  document.getElementById('mpPrezzoExtra').value = centesimiAEuro(p.extra_price_cents);
  document.getElementById('mpGiorni').value = p.production_days || '';
  document.getElementById('mpDescrizione').value = p.description || '';
  document.getElementById('mpFormTitolo').textContent = `MODIFICA: ${p.name}`;
  document.getElementById('mpSalvaBtn').textContent = 'SALVA MODIFICHE';
  document.getElementById('mpAnnullaBtn').style.display = '';
}

function nfcAnnullaModificaProdotto() {
  nfcProdottoInModifica = null;
  adminTabNfcProdotti(document.getElementById('adminContent'));
}

async function nfcSalvaProdotto() {
  const name = document.getElementById('mpName')?.value.trim();
  const credit_cost = document.getElementById('mpCrediti')?.value;
  if (!name || credit_cost === '') { showMsg('nfcProdottoMsg', 'Nome e crediti sono obbligatori', 'err'); return; }

  const fd = new FormData();
  fd.append('name', name);
  fd.append('credit_cost', credit_cost);
  fd.append('extra_price_cents', euroACentesimi(document.getElementById('mpPrezzoExtra')?.value));
  fd.append('production_days', document.getElementById('mpGiorni')?.value || '');
  fd.append('description', document.getElementById('mpDescrizione')?.value || '');
  const file = document.getElementById('mpImmagine')?.files[0];
  if (file) fd.append('image', file);

  try {
    const url    = nfcProdottoInModifica ? `${API_NFC}/prodotti/${nfcProdottoInModifica}` : `${API_NFC}/prodotti`;
    const method = nfcProdottoInModifica ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || (data.dettagli && data.dettagli.map(d => d.messaggio).join(', ')));
    nfcProdottoInModifica = null;
    adminTabNfcProdotti(document.getElementById('adminContent'));
  } catch(e) { showMsg('nfcProdottoMsg', e.message, 'err'); }
}

async function nfcToggleProdotto(id, active) {
  try {
    const fd = new FormData();
    fd.append('active', active);
    const r = await fetch(`${API_NFC}/prodotti/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTabNfcProdotti(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); }
}

// ══════════════════════════════ ORDINI MERCH ══════════════════════════════

async function adminTabNfcOrdiniMerch(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API_NFC}/ordini`, { headers: { Authorization: `Bearer ${token}` } });
    const ordini = await r.json();
    if (!Array.isArray(ordini)) throw new Error(ordini?.error || 'Errore caricamento ordini');

    const righe = ordini.map(o => `
      <tr>
        <td>#${o.id}</td>
        <td>${o.Company?.name || '—'}</td>
        <td>${(o.items || []).map(it => `${it.MerchProduct?.name || '?'} ×${it.quantity}`).join('<br/>')}</td>
        <td>${o.credits_used}</td>
        <td>${o.extra_amount_cents > 0 ? `€${centesimiAEuro(o.extra_amount_cents)}` : '—'}</td>
        <td>${o.delivery_method === 'shipping' ? 'Spedizione' : 'A mano'}</td>
        <td>
          <select onchange="nfcCambiaStatoOrdineMerch(${o.id}, this.value)">
            ${STATI_ORDINE_MERCH.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s.replace('_',' ').toUpperCase()}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('');

    content.innerHTML = `
      <div class="admin-form-title">ORDINI MERCHANDISING</div>
      ${!ordini.length
        ? '<div class="empty-state"><div class="ei">📦</div><h3>NESSUN ORDINE</h3></div>'
        : `<table><thead><tr><th>#</th><th>Azienda</th><th>Articoli</th><th>Crediti</th><th>Eccedenza</th><th>Consegna</th><th>Stato</th></tr></thead><tbody>${righe}</tbody></table>`}`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}

async function nfcCambiaStatoOrdineMerch(id, status) {
  try {
    const r = await fetch(`${API_NFC}/ordini/${id}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    adminTabNfcOrdiniMerch(document.getElementById('adminContent'));
  } catch(e) { alert('Errore: ' + e.message); adminTabNfcOrdiniMerch(document.getElementById('adminContent')); }
}

// ══════════════════════════════ PRODUZIONE ══════════════════════════════

async function adminTabNfcProduzione(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const r = await fetch(`${API_NFC}/produzione`, { headers: { Authorization: `Bearer ${token}` } });
    const righe = await r.json();
    if (!Array.isArray(righe)) throw new Error(righe?.error || 'Errore caricamento produzione');

    content.innerHTML = `
      <div class="admin-form-title">DA PRODURRE</div>
      <p style="color:var(--muted);font-size:11px;margin-bottom:16px">Somma degli articoli negli ordini confermati o in produzione.</p>
      ${!righe.length
        ? '<div class="empty-state"><div class="ei">✅</div><h3>NULLA DA PRODURRE</h3></div>'
        : `<table><thead><tr><th>Prodotto</th><th>Quantita'</th><th>Giorni produzione stimati</th></tr></thead><tbody>
            ${righe.map(x => `<tr><td><strong>${x.name}</strong></td><td class="price-cell">${x.quantity}</td><td>${x.production_days ?? '—'} gg</td></tr>`).join('')}
          </tbody></table>`}`;
  } catch(e) { content.innerHTML = `<div class="msg err">Errore: ${e.message}</div>`; }
}
