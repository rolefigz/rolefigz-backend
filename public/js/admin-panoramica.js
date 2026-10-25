// Pannello → Panoramica: cosa c'è da fare oggi, raccolto dalle stesse API delle sezioni.
// Solo lettura: ogni riquadro porta alla sezione dove si lavora davvero.
function escPan(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const STATO_ORDINE_PAN = {
  pendiente: ['In attesa', ''], confirmado: ['Da spedire', 'orange'], enviado: ['Spedito', 'blue'],
  entregado: ['Consegnato', 'green'], cancelado: ['Annullato', ''],
};

async function adminTabPanoramica(content) {
  content.innerHTML = '<div class="loading">CARICAMENTO</div>';
  const h = { Authorization: `Bearer ${token}` };
  const leggi = url => fetch(url, { headers: h }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const nfc = typeof API_NFC !== 'undefined' ? API_NFC : `${API}/admin/nfc`;

  const [ordini, nonLetti, recensioni, benchys, leads, kit, produzione, aziende, resumen] = await Promise.all([
    leggi(`${API}/ordenes`),
    leggi(`${API}/tickets/admin/unread`),
    leggi(`${API}/resenas/admin/todas`),
    leggi(`${API}/punti/admin/pending`),
    leggi(`${nfc}/leads`),
    leggi(`${API}/kit/admin/richieste`),
    leggi(`${nfc}/produzione`),
    leggi(`${nfc}/aziende`),
    leggi(`${API}/analytics/resumen`),
  ]);
  const lista = x => (Array.isArray(x) ? x : null);
  const conta = (x, fn) => (lista(x) ? lista(x).filter(fn).length : null);

  const daSpedire = conta(ordini, o => o.estado === 'confirmado');
  const kitAperti = conta(kit, k => ['prenotato', 'in_stampa', 'pronto'].includes(k.stato));
  const pezzi = lista(produzione) ? produzione.reduce((s, x) => s + (+x.quantity || 0), 0) : null;
  const aziendeDaSeguire = conta(aziende, a => ['grace', 'trial', 'inactive'].includes(a.Subscription?.status || 'inactive'));

  // [icona, numero, titolo, dettaglio quando c'è qualcosa, sezione]
  const compiti = [
    ['mdi:truck-fast-outline', daSpedire, 'Ordini da spedire', 'Etichetta o tracking da inserire', 'ordenes'],
    ['mdi:chat-processing-outline', nonLetti ? +nonLetti.count || 0 : null, 'Messaggi non letti', 'Clienti in attesa di risposta', 'tickets'],
    ['mdi:star-check-outline', conta(recensioni, r => !r.verificado), 'Recensioni da approvare', 'Non visibili finché non le approvi', 'resenas'],
    ['mdi:gift-open-outline', lista(benchys) ? benchys.length : null, 'Benchys da verificare', 'Richieste di punti fedeltà', 'benchys'],
    ['mdi:account-plus-outline', conta(leads, l => l.status === 'nuova'), 'Nuove richieste aziende', 'Da contattare', 'nfc_leads'],
    ['mdi:cube-send', kitAperti, 'Kit campione aperti', 'Da stampare o da far ritirare', 'kit_campione'],
    ['mdi:printer-3d-nozzle-outline', pezzi, 'Pezzi NFC da produrre', 'Per gli ordini merch confermati', 'nfc_produzione'],
    ['mdi:alert-circle-outline', aziendeDaSeguire, 'Aziende NFC da seguire', 'In prova, in grazia o non attivate', 'nfc_aziende'],
  ];
  const daFare = compiti.filter(c => c[1] > 0).length;

  const scheda = ([ic, n, titolo, sub, tab]) => {
    const vuoto = n === 0, ignoto = n === null;
    return `<button class="pan-task${vuoto || ignoto ? ' is-done' : ''}" onclick="adminTab('${tab}')">
      <span class="pan-task-ic"><iconify-icon icon="${ic}" width="20"></iconify-icon></span>
      <span class="pan-task-n">${ignoto ? '—' : n}</span>
      <span class="pan-task-t">${titolo}</span>
      <span class="pan-task-s">${ignoto ? 'Dati non disponibili' : vuoto ? 'Tutto a posto' : sub}</span>
      <iconify-icon class="pan-task-go" icon="mdi:arrow-right" width="18"></iconify-icon>
    </button>`;
  };

  const r = resumen || {};
  const kpi = [
    ['Visite', r.visitasSemana, 'questa settimana'],
    ['Ordini', r.ordenesSemana, 'questa settimana'],
    ['Fatturato', r.ingresoSemana != null ? `€${r.ingresoSemana}` : null, 'questa settimana'],
    ['Conversione', r.conversion != null ? `${r.conversion}%` : null, 'visite → ordini'],
  ];

  const ultimi = (lista(ordini) || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const righeOrdini = ultimi.map(o => {
    const [label, cls] = STATO_ORDINE_PAN[o.estado] || [o.estado, ''];
    return `<button class="pan-row" onclick="adminTab('ordenes')">
      <span class="pan-row-id">#${escPan(o.id)}</span>
      <span class="pan-row-name">${escPan(o.nombre_cliente)}<small>${new Date(o.createdAt).toLocaleDateString('it-IT')}</small></span>
      <span class="pill ${cls}">${label}</span>
      <span class="pan-row-tot">€${parseFloat(o.total || 0).toFixed(2)}</span>
    </button>`;
  }).join('');

  const azioni = [
    ['mdi:plus-circle-outline', 'Nuovo prodotto', "adminTab('nuevo')"],
    ['mdi:pencil-plus-outline', 'Nuovo articolo', "adminTab('blog').then(() => adminNuovoArticolo())"],
    ['mdi:ticket-percent-outline', 'Nuovo codice promo', "adminTab('promo')"],
    ['mdi:domain-plus', 'Nuova azienda NFC', "adminTab('nfc_aziende')"],
    ['mdi:storefront-outline', 'Apri il sito', "window.open('/','_blank')"],
  ];

  content.innerHTML = `
    <section class="pan-block">
      <div class="pan-block-head">
        <h2>Da fare</h2>
        <span class="pill ${daFare ? 'orange' : 'green'}">${daFare ? `${daFare} ${daFare === 1 ? 'area' : 'aree'} con qualcosa in sospeso` : 'Tutto a posto'}</span>
      </div>
      <div class="pan-tasks">${compiti.sort((a, b) => (b[1] > 0) - (a[1] > 0)).map(scheda).join('')}</div>
    </section>

    <div class="pan-split">
      <section class="pan-block">
        <div class="pan-block-head">
          <h2>Ultimi ordini</h2>
          <button class="action-btn" onclick="adminTab('ordenes')">Tutti gli ordini →</button>
        </div>
        <div class="pan-list">${righeOrdini || '<div class="pan-empty">Nessun ordine</div>'}</div>
      </section>

      <section class="pan-block">
        <div class="pan-block-head">
          <h2>Questa settimana</h2>
          <button class="action-btn" onclick="adminTab('analytics')">Analytics →</button>
        </div>
        <div class="pan-kpis">${kpi.map(([l, v, s]) => `
          <div class="pan-kpi"><span>${l}</span><strong>${v ?? '—'}</strong><small>${s}</small></div>`).join('')}
        </div>
        <div class="pan-block-head pan-block-head-sm"><h2>Azioni rapide</h2></div>
        <div class="pan-actions">${azioni.map(([ic, t, fn]) => `
          <button class="pan-action" onclick="${fn}"><iconify-icon icon="${ic}" width="18"></iconify-icon>${t}</button>`).join('')}
        </div>
      </section>
    </div>`;
}
