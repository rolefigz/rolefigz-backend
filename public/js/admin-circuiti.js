// Pannello "Circuiti 3D".
// - Ordini: li vedono e gestiscono sia l'admin sia l'account limitato "circuiti"
//   (inserire a mano, modificare, eliminare, stato e tracking).
// - Analytics e Registro modifiche: solo admin. Gli eliminati restano visibili
//   all'admin (e si possono ripristinare), e ogni modifica finisce nel registro.

const STATI_CIRCUITI = { pendiente: 'In attesa', confirmado: 'Confermato', enviado: 'Spedito', entregado: 'Consegnato', cancelado: 'Annullato' };
let circCatalogo = null;
let circOrdini = [];
let circFiltro = { testo: '', stato: '', eliminati: false };
let circForm = null; // { id|null, articoli: [] } mentre il form è aperto

const circEsc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const circEuro = n => '€' + (Number(n) || 0).toFixed(2);
const circIsAdmin = () => typeof utente !== 'undefined' && utente?.rol === 'admin';
const circData = d => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const circDataOra = d => new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

async function circApi(path, opts = {}) {
  const r = await fetch(`${API}/circuiti/admin${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Errore');
  return data;
}

async function circCaricaCatalogo() {
  if (!circCatalogo) {
    circCatalogo = await circApi('/catalogo');
    circCatalogo.circuiti.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }
  return circCatalogo;
}
const circCanaleLabel = id => circCatalogo?.canali.find(c => c.id === id)?.label || id || 'Sito web';

// ══ ORDINI ════════════════════════════════════════════════════════════════════

async function adminTabCircuitiOrdini(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    await circCaricaCatalogo();
    circOrdini = await circApi(`/ordini${circFiltro.eliminati && circIsAdmin() ? '?eliminati=1' : ''}`);
    circRenderOrdini(content);
  } catch (e) { content.innerHTML = `<div class="msg err">Errore: ${circEsc(e.message)}</div>`; }
}

function circRicarica() { return adminTabCircuitiOrdini(document.getElementById('adminContent')); }

function circRenderOrdini(content) {
  const attivi = circOrdini.filter(o => !o.eliminato);
  const mese = new Date().toISOString().slice(0, 7);
  const delMese = attivi.filter(o => o.stato !== 'cancelado' && String(o.createdAt).slice(0, 7) === mese);
  const kpi = [
    ['Da evadere', attivi.filter(o => o.stato === 'pendiente' || o.stato === 'confirmado').length, 'in attesa o confermati'],
    ['Da spedire', attivi.filter(o => o.stato === 'confirmado').length, 'confermati, non ancora spediti'],
    ['Ordini del mese', delMese.length, new Date().toLocaleDateString('it-IT', { month: 'long' })],
    ['Incasso del mese', circEuro(delMese.reduce((s, o) => s + Number(o.totale), 0)), 'esclusi gli annullati'],
  ];

  const t = circFiltro.testo.trim().toLowerCase();
  const lista = circOrdini.filter(o =>
    (!circFiltro.stato || o.stato === circFiltro.stato) &&
    (!t || [o.numero, o.nombre, o.email, o.ciudad].some(v => String(v || '').toLowerCase().includes(t))));

  content.innerHTML = `
    <div class="pan-kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-bottom:22px">
      ${kpi.map(([l, v, s]) => `<div class="pan-kpi"><span>${l}</span><strong>${v}</strong><small>${s}</small></div>`).join('')}
    </div>

    <div id="circFormWrap"></div>

    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
      <button class="btn-submit" style="margin:0" onclick="circApriForm()">+ NUOVO ORDINE</button>
      <input type="text" placeholder="Cerca numero, cliente, città…" value="${circEsc(circFiltro.testo)}"
        oninput="circFiltro.testo=this.value;circRenderTabella()" style="flex:1;min-width:200px;max-width:340px"/>
      <select onchange="circFiltro.stato=this.value;circRenderTabella()">
        <option value="">Tutti gli stati</option>
        ${Object.entries(STATI_CIRCUITI).map(([k, v]) => `<option value="${k}" ${circFiltro.stato === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      ${circIsAdmin() ? `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
        <input type="checkbox" ${circFiltro.eliminati ? 'checked' : ''} onchange="circFiltro.eliminati=this.checked;circRicarica()"/> Mostra eliminati</label>` : ''}
    </div>
    <div id="circTabella"></div>`;
  circRenderTabella(lista);
  if (circForm) circRenderForm();
}

function circRenderTabella(listaPronta) {
  const box = document.getElementById('circTabella');
  if (!box) return;
  const t = circFiltro.testo.trim().toLowerCase();
  const lista = listaPronta || circOrdini.filter(o =>
    (!circFiltro.stato || o.stato === circFiltro.stato) &&
    (!t || [o.numero, o.nombre, o.email, o.ciudad].some(v => String(v || '').toLowerCase().includes(t))));

  if (!lista.length) { box.innerHTML = '<div class="empty-state"><div class="ei">🏁</div><h3>NESSUN ORDINE</h3></div>'; return; }

  box.innerHTML = `<table><thead><tr><th>Ordine</th><th>Cliente</th><th>Articoli</th><th>Totale</th><th>Stato</th><th></th></tr></thead><tbody>
    ${lista.map(o => {
      const origine = o.origine === 'manuale'
        ? `<span class="pill">A MANO · ${circEsc(circCanaleLabel(o.canale)).toUpperCase()}</span>`
        : '<span class="pill">SITO WEB</span>';
      const indirizzo = [o.direccion, [o.codigo_postal, o.ciudad].filter(Boolean).join(' '), o.pais].filter(Boolean).join(', ');
      return `<tr style="${o.eliminato ? 'opacity:.55' : ''}">
        <td>
          <strong>${circEsc(o.numero)}</strong><br>
          <span style="font-size:11px;color:var(--muted)">${circData(o.createdAt)}</span><br>
          <span style="display:inline-block;margin-top:4px">${origine}</span>
          ${o.creato_da ? `<div style="font-size:10px;color:var(--muted);margin-top:3px">da ${circEsc(o.creato_da)}</div>` : ''}
        </td>
        <td>
          <strong>${circEsc(o.nombre)}</strong><br>
          <span style="font-size:11px;color:var(--muted)">${circEsc(o.email)}${o.telefono ? ' · ' + circEsc(o.telefono) : ''}</span>
          ${indirizzo ? `<br><span style="font-size:11px;color:var(--muted)">${circEsc(indirizzo)}</span>` : ''}
          ${o.notas ? `<div style="font-size:11px;color:var(--muted);margin-top:4px">📝 ${circEsc(o.notas)}</div>` : ''}
        </td>
        <td style="font-size:13px">${(o.articoli || []).map(a => `${a.quantita}× ${circEsc(a.nome)}${a.taglia ? ` <span style="color:var(--muted)">(${circEsc(a.taglia)})</span>` : ''}`).join('<br>')}</td>
        <td class="price-cell">${circEuro(o.totale)}</td>
        <td>
          ${o.eliminato
            ? `<span class="pill" style="color:var(--red)">ELIMINATO</span><div style="font-size:10px;color:var(--muted);margin-top:4px">da ${circEsc(o.eliminato_da || '—')}<br>${o.eliminato_at ? circDataOra(o.eliminato_at) : ''}</div>`
            : `<select onchange="circCambiaStato(${o.id}, this.value)">
                ${Object.entries(STATI_CIRCUITI).map(([k, v]) => `<option value="${k}" ${o.stato === k ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
              ${o.tracking_number ? `<div style="font-size:10px;color:var(--muted);margin-top:4px;font-family:'DM Mono',monospace">${circEsc(o.carrier || '')} ${circEsc(o.tracking_number)}</div>` : ''}`}
        </td>
        <td style="white-space:nowrap">
          ${o.eliminato
            ? (circIsAdmin() ? `<button class="action-btn" onclick="circRipristina(${o.id})">RIPRISTINA</button>` : '')
            : `<button class="action-btn" onclick="circApriForm(${o.id})" title="Modifica">✎ MODIFICA</button>
               <button class="action-btn" onclick="circTracking(${o.id})">+ TRACKING</button>
               <button class="action-btn danger" onclick="circElimina(${o.id})">ELIMINA</button>`}
          ${circIsAdmin() ? `<button class="action-btn" onclick="circStoricoOrdine(${o.id})" title="Storico modifiche">STORICO</button>` : ''}
        </td>
      </tr>`;
    }).join('')}
  </tbody></table>`;
}

async function circCambiaStato(id, stato) {
  try { await circApi(`/ordini/${id}`, { method: 'PATCH', body: JSON.stringify({ stato }) }); }
  catch (e) { alert('Errore: ' + e.message); }
  circRicarica();
}

async function circTracking(id) {
  const tracking = prompt('Numero di tracking:');
  if (!tracking || !tracking.trim()) return;
  const carrier = prompt('Corriere (es. DHL, GLS, BRT):') || '';
  try { await circApi(`/ordini/${id}`, { method: 'PATCH', body: JSON.stringify({ tracking_number: tracking.trim(), carrier: carrier.trim(), stato: 'enviado' }) }); }
  catch (e) { alert('Errore: ' + e.message); }
  circRicarica();
}

async function circElimina(id) {
  const o = circOrdini.find(x => x.id === id);
  if (!confirm(`Eliminare l'ordine ${o?.numero} di ${o?.nombre}?`)) return;
  const motivo = prompt('Motivo (facoltativo):') || '';
  try { await circApi(`/ordini/${id}`, { method: 'DELETE', body: JSON.stringify({ motivo }) }); }
  catch (e) { alert('Errore: ' + e.message); }
  circRicarica();
}

async function circRipristina(id) {
  try { await circApi(`/ordini/${id}/ripristina`, { method: 'POST' }); }
  catch (e) { alert('Errore: ' + e.message); }
  circRicarica();
}

// ── Form nuovo ordine / modifica ─────────────────────────────────────────────

function circRigaVuota() {
  const t = circCatalogo.taglie.find(x => x.id === 'M') || circCatalogo.taglie[0];
  return { tipo: 'circuito', slug: circCatalogo.circuiti[0].slug, taglia: t.id, nome: '', categoria: '', prezzo: t.prezzo, quantita: 1 };
}

function circApriForm(id) {
  const o = id ? circOrdini.find(x => x.id === id) : null;
  circForm = {
    id: o?.id || null,
    dati: o ? { ...o } : { stato: 'confirmado', canale: 'whatsapp', pais: 'Italia' },
    articoli: o ? (o.articoli || []).map(a => ({ ...a, tipo: a.tipo || (a.taglia ? 'circuito' : 'prodotto') })) : [circRigaVuota()],
    totaleManuale: null,
  };
  // Se il totale salvato era diverso dalla somma (sconto, spedizione…) resta fisso; altrimenti si ricalcola.
  if (o && Math.abs(circSommaRighe() - Number(o.totale)) > 0.009) circForm.totaleManuale = Number(o.totale);
  circRenderForm();
  document.getElementById('circFormWrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function circChiudiForm() {
  circForm = null;
  const w = document.getElementById('circFormWrap');
  if (w) w.innerHTML = '';
}

function circSommaRighe() {
  return Math.round(circForm.articoli.reduce((s, a) => s + (Number(a.prezzo) || 0) * (parseInt(a.quantita, 10) || 0), 0) * 100) / 100;
}

function circRenderForm() {
  const w = document.getElementById('circFormWrap');
  if (!w || !circForm) return;
  const d = circForm.dati;
  const campo = (id, label, val, tipo = 'text', ph = '') =>
    `<div class="field"><label>${label}</label><input id="cf_${id}" type="${tipo}" value="${circEsc(val || '')}" placeholder="${ph}"/></div>`;
  const canali = circCatalogo.canali.filter(c => circForm.id || c.id !== 'web');

  w.innerHTML = `
    <div style="border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:22px;background:var(--surface)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div class="admin-form-title" style="margin:0;font-size:20px">${circForm.id ? `MODIFICA ${circEsc(d.numero)}` : 'NUOVO ORDINE A MANO'}</div>
        <button class="action-btn" onclick="circChiudiForm()">✕ CHIUDI</button>
      </div>
      <div class="form-row">${campo('nombre', 'Cliente *', d.nombre, 'text', 'Nome e cognome')}${campo('email', 'Email', d.email, 'email')}</div>
      <div class="form-row">${campo('telefono', 'Telefono', d.telefono)}${campo('direccion', 'Indirizzo', d.direccion)}</div>
      <div class="form-row">${campo('codigo_postal', 'CAP', d.codigo_postal)}${campo('ciudad', 'Città', d.ciudad)}</div>
      <div class="form-row">
        ${campo('pais', 'Paese', d.pais)}
        <div class="field"><label>Canale</label><select id="cf_canale">
          ${canali.map(c => `<option value="${c.id}" ${d.canale === c.id ? 'selected' : ''}>${c.label}</option>`).join('')}
        </select></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Stato</label><select id="cf_stato">
          ${Object.entries(STATI_CIRCUITI).map(([k, v]) => `<option value="${k}" ${d.stato === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select></div>
        ${campo('notas', 'Note', d.notas)}
      </div>

      <div style="font-weight:600;font-size:14px;margin:6px 0 10px">Articoli</div>
      <div id="cf_righe"></div>
      <button class="action-btn" onclick="circAggiungiRiga()">+ AGGIUNGI ARTICOLO</button>

      <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-top:18px">
        <div class="field" style="margin:0;max-width:220px"><label>Totale (€)</label>
          <input id="cf_totale" type="number" step="0.01" min="0" placeholder="somma automatica"
            value="${circForm.totaleManuale ?? ''}" oninput="circForm.totaleManuale=this.value===''?null:Number(this.value)"/></div>
        <div style="font-size:13px;color:var(--muted);padding-bottom:10px">Somma articoli: <strong id="cf_somma">${circEuro(circSommaRighe())}</strong> · lascia vuoto per usarla</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn-submit" style="margin:0" onclick="circSalvaForm()">${circForm.id ? 'SALVA MODIFICHE' : 'CREA ORDINE'}</button>
      </div>
      <div id="cf_msg"></div>
    </div>`;
  circRenderRighe();
}

function circRenderRighe() {
  const box = document.getElementById('cf_righe');
  if (!box) return;
  const c = circCatalogo;
  box.innerHTML = circForm.articoli.map((a, i) => {
    const scelta = a.tipo === 'circuito'
      ? `<select onchange="circSetRiga(${i},'slug',this.value)" style="min-width:170px">
           ${c.circuiti.map(x => `<option value="${x.slug}" ${a.slug === x.slug ? 'selected' : ''}>${circEsc(x.nome)}</option>`).join('')}
         </select>
         <select onchange="circSetRiga(${i},'taglia',this.value)">
           ${c.taglie.map(t => `<option value="${t.id}" ${a.taglia === t.id ? 'selected' : ''}>${t.id} · ${t.label}</option>`).join('')}
         </select>`
      : `<select onchange="circSetRiga(${i},'slug',this.value)" style="min-width:200px">
           ${c.prodotti.map(p => `<option value="${p.slug}" ${a.slug === p.slug ? 'selected' : ''}>${circEsc(p.nome)}</option>`).join('')}
           <option value="" ${!a.slug ? 'selected' : ''}>Altro (scrivi il nome)…</option>
         </select>
         ${!a.slug ? `<input type="text" placeholder="Nome articolo" value="${circEsc(a.nome)}" oninput="circForm.articoli[${i}].nome=this.value" style="min-width:160px"/>` : ''}`;
    return `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--border)">
      <select onchange="circSetRiga(${i},'tipo',this.value)">
        <option value="circuito" ${a.tipo === 'circuito' ? 'selected' : ''}>Circuito</option>
        <option value="prodotto" ${a.tipo !== 'circuito' ? 'selected' : ''}>Prodotto</option>
      </select>
      ${scelta}
      <label style="font-size:12px;color:var(--muted)">€ <input type="number" step="0.01" min="0" value="${a.prezzo}" style="width:90px"
        oninput="circForm.articoli[${i}].prezzo=Number(this.value);circAggiornaSomma()"/></label>
      <label style="font-size:12px;color:var(--muted)">× <input type="number" min="1" value="${a.quantita}" style="width:64px"
        oninput="circForm.articoli[${i}].quantita=parseInt(this.value,10)||1;circAggiornaSomma()"/></label>
      ${circForm.articoli.length > 1 ? `<button class="action-btn danger" onclick="circRimuoviRiga(${i})">✕</button>` : ''}
    </div>`;
  }).join('');
  circAggiornaSomma();
}

function circAggiornaSomma() {
  const el = document.getElementById('cf_somma');
  if (el) el.textContent = circEuro(circSommaRighe());
}

function circSetRiga(i, campo, valore) {
  const a = circForm.articoli[i];
  const c = circCatalogo;
  if (campo === 'tipo') {
    circForm.articoli[i] = valore === 'circuito'
      ? circRigaVuota()
      : { tipo: 'prodotto', slug: c.prodotti[0].slug, nome: c.prodotti[0].nome, categoria: c.prodotti[0].categoria, taglia: null, prezzo: c.prodotti[0].prezzo ?? 0, quantita: a.quantita };
  } else if (a.tipo === 'circuito') {
    a[campo] = valore;
    if (campo === 'taglia') a.prezzo = c.taglie.find(t => t.id === valore)?.prezzo ?? a.prezzo;
  } else if (campo === 'slug') {
    const p = c.prodotti.find(x => x.slug === valore);
    a.slug = valore || null;
    a.nome = p ? p.nome : '';
    a.categoria = p ? p.categoria : 'Altro';
    if (p && p.prezzo != null) a.prezzo = p.prezzo;
  }
  circRenderRighe();
}

function circAggiungiRiga() { circForm.articoli.push(circRigaVuota()); circRenderRighe(); }
function circRimuoviRiga(i) { circForm.articoli.splice(i, 1); circRenderRighe(); }

async function circSalvaForm() {
  const val = id => document.getElementById('cf_' + id)?.value ?? '';
  const msg = document.getElementById('cf_msg');
  const body = {
    nombre: val('nombre'), email: val('email'), telefono: val('telefono'), direccion: val('direccion'),
    codigo_postal: val('codigo_postal'), ciudad: val('ciudad'), pais: val('pais'), notas: val('notas'),
    canale: val('canale'), stato: val('stato'),
    articoli: circForm.articoli.map(a => ({ tipo: a.tipo, slug: a.slug, taglia: a.taglia, nome: a.nome, categoria: a.categoria, prezzo: Number(a.prezzo) || 0, quantita: parseInt(a.quantita, 10) || 1 })),
    totale: circForm.totaleManuale ?? '',
  };
  if (!body.nombre.trim()) { msg.innerHTML = '<div class="msg err">Inserisci il nome del cliente</div>'; return; }
  if (body.articoli.some(a => a.tipo !== 'circuito' && !String(a.nome || '').trim())) { msg.innerHTML = '<div class="msg err">Manca il nome di un articolo</div>'; return; }
  try {
    if (circForm.id) await circApi(`/ordini/${circForm.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    else await circApi('/ordini', { method: 'POST', body: JSON.stringify(body) });
    circForm = null;
    circRicarica();
  } catch (e) { msg.innerHTML = `<div class="msg err">Errore: ${circEsc(e.message)}</div>`; }
}

// ══ REGISTRO MODIFICHE (solo admin) ══════════════════════════════════════════

const AZIONI_CIRCUITI = {
  creato_web: ['Ordine dal sito', 'mdi:web'],
  creato_manuale: ['Creato a mano', 'mdi:plus-circle-outline'],
  modificato: ['Modificato', 'mdi:pencil-outline'],
  eliminato: ['Eliminato', 'mdi:delete-outline'],
  ripristinato: ['Ripristinato', 'mdi:restore'],
};
const CAMPI_CIRCUITI = {
  nombre: 'Cliente', email: 'Email', telefono: 'Telefono', direccion: 'Indirizzo', codigo_postal: 'CAP', ciudad: 'Città',
  pais: 'Paese', notas: 'Note', tracking_number: 'Tracking', carrier: 'Corriere', stato: 'Stato', canale: 'Canale',
  articoli: 'Articoli', totale: 'Totale', cliente: 'Cliente', motivo: 'Motivo',
};

function circDettagli(m) {
  const d = m.dettagli || {};
  const fmt = (campo, v) => campo === 'stato' ? (STATI_CIRCUITI[v] || v) : campo === 'canale' ? circCanaleLabel(v) : v;
  return Object.entries(d).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => {
    const etichetta = CAMPI_CIRCUITI[k] || k;
    if (Array.isArray(v)) {
      return `<div><span style="color:var(--muted)">${circEsc(etichetta)}:</span> <s style="color:var(--muted)">${circEsc(fmt(k, v[0]) || '—')}</s> → <strong>${circEsc(fmt(k, v[1]) || '—')}</strong></div>`;
    }
    return `<div><span style="color:var(--muted)">${circEsc(etichetta)}:</span> ${circEsc(fmt(k, v))}</div>`;
  }).join('');
}

function circTabellaMovimenti(movimenti) {
  if (!movimenti.length) return '<div class="empty-state"><div class="ei">📜</div><h3>NESSUNA MODIFICA</h3></div>';
  return `<table><thead><tr><th>Quando</th><th>Chi</th><th>Azione</th><th>Ordine</th><th>Dettagli</th></tr></thead><tbody>
    ${movimenti.map(m => {
      const [nome, ic] = AZIONI_CIRCUITI[m.azione] || [m.azione, 'mdi:circle-small'];
      const ruolo = m.utente_rol === 'admin' ? 'ADMIN' : m.utente_rol === 'circuiti' ? 'CIRCUITI' : 'SITO';
      return `<tr>
        <td style="white-space:nowrap;font-size:12px">${circDataOra(m.createdAt)}</td>
        <td><strong>${circEsc(m.utente_nome || '—')}</strong><br><span class="pill" style="margin-top:3px">${ruolo}</span></td>
        <td style="white-space:nowrap"><iconify-icon icon="${ic}" width="15" style="vertical-align:-2px"></iconify-icon> ${nome}</td>
        <td style="font-family:'DM Mono',monospace;font-size:11px">${circEsc(m.numero || '—')}</td>
        <td style="font-size:12px;line-height:1.5">${circDettagli(m)}</td>
      </tr>`;
    }).join('')}
  </tbody></table>`;
}

async function adminTabCircuitiMovimenti(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    await circCaricaCatalogo();
    const movimenti = await circApi('/movimenti');
    const daLimitato = movimenti.filter(m => m.utente_rol === 'circuiti').length;
    content.innerHTML = `
      <p style="color:var(--muted);font-size:13px;margin:-6px 0 16px">${movimenti.length} movimenti registrati, ${daLimitato} fatti dall'account limitato.
      Gli ordini eliminati restano visibili in <a href="#" style="color:var(--accent2)" onclick="circFiltro.eliminati=true;adminTab('circuiti_ordini');return false">Ordini → Mostra eliminati</a>.</p>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <select onchange="circFiltraMovimenti(this.value)">
          <option value="">Tutti</option>
          <option value="circuiti">Solo account limitato</option>
          <option value="admin">Solo admin</option>
          <option value="web">Solo ordini dal sito</option>
        </select>
      </div>
      <div id="circMovBox">${circTabellaMovimenti(movimenti)}</div>`;
    window._circMovimenti = movimenti;
  } catch (e) { content.innerHTML = `<div class="msg err">Errore: ${circEsc(e.message)}</div>`; }
}

function circFiltraMovimenti(rol) {
  const box = document.getElementById('circMovBox');
  if (box) box.innerHTML = circTabellaMovimenti((window._circMovimenti || []).filter(m => !rol || m.utente_rol === rol));
}

async function circStoricoOrdine(id) {
  const o = circOrdini.find(x => x.id === id);
  const w = document.getElementById('circFormWrap');
  if (!w) return;
  w.innerHTML = '<div class="loading">CARICAMENTO</div>';
  try {
    const movimenti = await circApi(`/movimenti?ordine=${id}`);
    w.innerHTML = `<div style="border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:22px;background:var(--surface)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div class="admin-form-title" style="margin:0;font-size:20px">STORICO ${circEsc(o?.numero || '')}</div>
        <button class="action-btn" onclick="circChiudiForm()">✕ CHIUDI</button>
      </div>${circTabellaMovimenti(movimenti)}</div>`;
    w.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { w.innerHTML = `<div class="msg err">Errore: ${circEsc(e.message)}</div>`; }
}

// ══ ANALYTICS (solo admin) ═══════════════════════════════════════════════════

// Classifica come barre orizzontali in HTML: si leggono meglio di una torta
// e restano accessibili (etichetta e valore sempre scritti).
function circBarre(righe, { valore = 'pezzi', formato = v => v, vuoto = 'Nessun dato' } = {}) {
  if (!righe.length || !righe.some(r => r[valore] > 0)) return `<div style="color:var(--muted);font-size:13px;padding:10px 0">${vuoto}</div>`;
  const max = Math.max(...righe.map(r => r[valore]));
  return righe.map(r => `
    <div style="display:grid;grid-template-columns:minmax(90px,38%) 1fr auto;gap:10px;align-items:center;padding:5px 0"
      title="${circEsc(r.nome)}: ${circEsc(formato(r[valore]))}">
      <span style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${circEsc(r.nome)}</span>
      <span style="height:10px;background:var(--surface2);border-radius:4px;overflow:hidden">
        <span style="display:block;height:100%;width:${Math.max(2, r[valore] / max * 100)}%;background:var(--accent);border-radius:0 4px 4px 0"></span>
      </span>
      <span style="font-size:13px;font-weight:600;font-variant-numeric:tabular-nums">${circEsc(formato(r[valore]))}</span>
    </div>`).join('');
}

function circBlocco(titolo, html, nota = '') {
  return `<div style="border:1px solid var(--border);border-radius:16px;padding:18px 20px;background:var(--surface)">
    <div style="font-weight:700;font-size:15px;margin-bottom:${nota ? 2 : 12}px">${titolo}</div>
    ${nota ? `<div style="font-size:12px;color:var(--muted);margin-bottom:12px">${nota}</div>` : ''}
    ${html}</div>`;
}

async function adminTabCircuitiAnalytics(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO ANALYTICS</div>';
  try {
    const a = await circApi('/analytics');
    const k = a.kpi;
    const delta = (ora, prima) => {
      if (!prima) return ora ? 'primo mese con ordini' : 'nessun ordine';
      const p = Math.round((ora - prima) / prima * 100);
      return `${p >= 0 ? '▲' : '▼'} ${Math.abs(p)}% sul mese scorso`;
    };
    const kpi = [
      ['Fatturato totale', circEuro(k.fatturato), `${k.ordini} ordini validi`],
      ['Questo mese', circEuro(k.meseFatturato), `${k.meseOrdini} ordini · ${delta(k.meseFatturato, k.mesePrimaFatturato)}`],
      ['Scontrino medio', circEuro(k.scontrinoMedio), 'per ordine'],
      ['Pezzi venduti', k.pezzi, 'circuiti e prodotti'],
      ['Da evadere', k.daEvadere, `${k.inAttesa} in attesa di conferma`],
      ['Clienti', k.clienti, `${k.clientiAbituali} hanno ordinato più volte`],
      ['Sito / a mano', `${k.web} / ${k.manuali}`, 'ordini validi per origine'],
      ['Annullati / eliminati', `${k.annullati} / ${k.eliminati}`, 'esclusi dai totali'],
    ];
    const euroFmt = v => circEuro(v);

    content.innerHTML = `
      <div class="pan-kpis" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:22px">
        ${kpi.map(([l, v, s]) => `<div class="pan-kpi"><span>${l}</span><strong>${v}</strong><small>${s}</small></div>`).join('')}
      </div>

      ${circBlocco('Fatturato per mese', '<div style="height:240px"><canvas id="chartCircMesi"></canvas></div>', 'Ultimi 12 mesi, ordini annullati esclusi')}

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-top:16px">
        ${circBlocco('Circuiti più venduti', circBarre(a.topCircuiti, { vuoto: 'Ancora nessun circuito venduto' }), 'Pezzi venduti')}
        ${circBlocco('Taglie', circBarre(a.taglie, { vuoto: 'Ancora nessun circuito venduto' }), 'Pezzi venduti per taglia')}
        ${circBlocco('Tipo di articolo', circBarre(a.perCategoria, { valore: 'fatturato', formato: euroFmt }), 'Fatturato per categoria')}
        ${circBlocco('Canali di vendita', circBarre(a.perCanale, { valore: 'ordini' }), 'Ordini per canale')}
        ${circBlocco('Prodotti (non circuiti)', circBarre(a.topProdotti, { vuoto: 'Nessun prodotto venduto' }), 'Calendari, gadget e altro: pezzi')}
        ${circBlocco('Stato degli ordini', circBarre(a.perStato.map(s => ({ ...s, nome: STATI_CIRCUITI[s.nome] || s.nome })), { valore: 'ordini' }), 'Ordini attivi per stato')}
        ${circBlocco('Paesi', circBarre(a.paesi, { valore: 'ordini' }), 'Ordini per paese')}
        ${circBlocco('Città', circBarre(a.citta, { valore: 'ordini' }), 'Ordini per città')}
      </div>

      <div style="margin-top:16px">
        ${circBlocco('Migliori clienti', a.topClienti.length ? `<table style="margin:0"><thead><tr><th>Cliente</th><th>Ordini</th><th>Speso</th></tr></thead><tbody>
          ${a.topClienti.map(c => `<tr><td><strong>${circEsc(c.nome)}</strong>${c.email ? `<br><span style="font-size:11px;color:var(--muted)">${circEsc(c.email)}</span>` : ''}</td>
            <td>${c.ordini}</td><td class="price-cell">${circEuro(c.speso)}</td></tr>`).join('')}
        </tbody></table>` : '<div style="color:var(--muted);font-size:13px">Nessun cliente ancora</div>')}
      </div>`;

    if (typeof Chart !== 'undefined') {
      const nomeMese = m => new Date(m + '-01T00:00:00').toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
      const ex = Chart.getChart('chartCircMesi');
      if (ex) ex.destroy();
      new Chart(document.getElementById('chartCircMesi'), {
        type: 'bar',
        data: {
          labels: a.mesi.map(m => nomeMese(m.mese)),
          datasets: [{ label: 'Fatturato', data: a.mesi.map(m => m.fatturato), backgroundColor: '#F26A1B', borderRadius: 4, maxBarThickness: 36 }],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `${circEuro(ctx.parsed.y)} · ${a.mesi[ctx.dataIndex].ordini} ordini` } },
          },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' }, ticks: { callback: v => '€' + v } },
          },
        },
      });
    }
  } catch (e) { content.innerHTML = `<div class="msg err">Errore: ${circEsc(e.message)}</div>`; }
}
