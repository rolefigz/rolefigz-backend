// Navigazione del pannello: intestazione della sezione, voce attiva e menu sul telefono.
// Avvolge adminTab senza cambiarne la logica: ogni sezione si carica come prima.
const SEZIONI_ADMIN = {
  panoramica:         ['Pannello', 'Panoramica', "Cosa c'è da fare oggi, in un colpo d'occhio."],
  ordenes:            ['Negozio', 'Ordini', 'Da spedire, in transito e storico degli ordini.'],
  productos:          ['Negozio', 'Prodotti', 'Catalogo: prezzi, stock, varianti e immagini.'],
  nuevo:              ['Negozio', 'Nuovo prodotto', 'Aggiungi un prodotto al catalogo.'],
  categorias:         ['Negozio', 'Categorie', 'Come sono raggruppati i prodotti nel catalogo.'],
  tariffe_spedizione: ['Negozio', 'Spedizioni', 'Tariffe mostrate al checkout per zona.'],
  promo:              ['Negozio', 'Promo code', 'Codici sconto, utilizzi e fatturato generato.'],
  clientes:           ['Clienti', 'Clienti', 'Chi ha ordinato e quanto ha speso.'],
  tickets:            ['Clienti', 'Messaggi', 'Conversazioni di assistenza con i clienti.'],
  resenas:            ['Clienti', 'Recensioni', 'Approva o revoca le recensioni prima che compaiano.'],
  benchys:            ['Clienti', 'Benchys', 'Richieste di punti fedeltà da verificare.'],
  fidelizzazione:     ['Clienti', 'Fidelizzazione', 'Tessere fedeltà: timbri a mano, premio ogni 4 ordini.'],
  blog:               ['Contenuti e dati', 'Blog', 'Articoli pubblicati e bozze.'],
  analytics:          ['Contenuti e dati', 'Analytics', 'Visite, vendite e prodotti più visti.'],
  nfc_leads:          ['Aziende · B2B', 'Richieste', 'Contatti arrivati dal sito, da seguire.'],
  nfc_prove:          ['Aziende · B2B', 'Profili di prova', 'Pagine NFC di prova private, create da Google Maps.'],
  kit_campione:       ['Aziende · B2B', 'Kit campione', 'Prenotazioni del kit e revisioni del logo.'],
  kit_video:          ['Aziende · B2B', 'Video kit', 'Kit 3D e video con il logo di un locale, per proporlo.'],
  nfc_aziende:        ['RoleFigz NFC', 'Aziende', 'Clienti NFC: piano, crediti, pagamenti e pagina.'],
  nfc_tags:           ['RoleFigz NFC', 'Tag', 'Tag NFC e QR: link, assegnazione e stampa.'],
  nfc_prodotti:       ['RoleFigz NFC', 'Prodotti merch', 'Cosa possono ordinare le aziende con i crediti.'],
  nfc_ordini:         ['RoleFigz NFC', 'Ordini merch', 'Ordini delle aziende e stato di lavorazione.'],
  nfc_produzione:     ['RoleFigz NFC', 'Produzione', 'Pezzi da stampare per gli ordini confermati.'],
  impostazioni:       ['Sistema', 'Impostazioni', 'Pagamenti e bonus fedeltà NFC.'],
};

// azioni rapide accanto al titolo, solo dove servono
const AZIONI_SEZIONE = {
  productos: [['mdi:plus', 'Nuovo prodotto', "adminTab('nuevo')"]],
  nuevo: [['mdi:arrow-left', 'Tutti i prodotti', "adminTab('productos')"]],
  kit_campione: [['mdi:open-in-new', 'Apri /kit', "window.open('/kit','_blank')"]],
};

let sezioneAdmin = 'panoramica';

function admMenu(apri) {
  const side = document.getElementById('admSidebar');
  if (!side) return;
  const open = typeof apri === 'boolean' ? apri : !side.classList.contains('is-open');
  side.classList.toggle('is-open', open);
  side.querySelector('.adm-menu-toggle')?.setAttribute('aria-expanded', String(open));
}

function admIntestazione(tab) {
  const [gruppo, titolo, desc] = SEZIONI_ADMIN[tab] || ['Pannello', tab, ''];
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('admHeadGroup', gruppo);
  set('admHeadTitle', titolo);
  set('admHeadDesc', desc);
  set('admToggleGroup', gruppo);
  set('admToggleTitle', titolo);
  document.title = `${titolo} · Admin RoleFigz`;

  const azioni = document.getElementById('admHeadActions');
  if (azioni) {
    azioni.innerHTML = (AZIONI_SEZIONE[tab] || []).map(([ic, testo, fn]) =>
      `<button class="adm-head-btn" onclick="${fn}"><iconify-icon icon="${ic}" width="16"></iconify-icon> ${testo}</button>`).join('') +
      `<button class="adm-head-btn adm-head-icon" onclick="adminTab(sezioneAdmin)" title="Aggiorna" aria-label="Aggiorna"><iconify-icon icon="mdi:refresh" width="18"></iconify-icon></button>`;
  }
}

(function () {
  const originale = window.adminTab;
  if (typeof originale !== 'function') return;

  window.adminTab = function (tab, el) {
    sezioneAdmin = tab;
    const voce = el || document.querySelector(`.admin-menu-item[data-tab="${tab}"]`);
    admIntestazione(tab);
    admMenu(false);
    if (window.scrollY > 120) window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tab === 'panoramica') {
      if (typeof fermaPollingTicketAdmin === 'function') fermaPollingTicketAdmin();
      document.querySelectorAll('.admin-menu-item').forEach(x => x.classList.remove('active'));
      if (voce) voce.classList.add('active');
      return adminTabPanoramica(document.getElementById('adminContent'));
    }
    return originale(tab, voce);
  };

  // fuori dal menu aperto (telefono) si chiude
  document.addEventListener('click', e => {
    const side = document.getElementById('admSidebar');
    if (side && side.classList.contains('is-open') && !side.contains(e.target)) admMenu(false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') admMenu(false); });
})();
