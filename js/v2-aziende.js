// Pagina aziende: dopo la scelta "Che attività hai?" il titolo, le soluzioni consigliate,
// il settore evidenziato e il messaggio WhatsApp parlano a quel tipo di attività.
(function () {
  const WA = 'https://wa.me/393928225406?text=';
  const SETTORI = {
    ristoranti: {
      chip: 'Per ristoranti e bar · Piacenza',
      titolo: 'Il menù a un tocco, <em>dal tavolo</em>.',
      sub: 'Segnaposti con QR e NFC per il menù digitale, stand per le recensioni e portachiavi per i clienti fedeli. Con il logo del tuo locale, stampati in 3D a Piacenza.',
      soluzioni: 'Per il tuo <em>locale</em>',
      ordine: ['segnaposti', 'menu', 'nfc', 'merch', 'eventi', 'volume'],
      wa: 'Ciao RoleFigz! Ho un ristorante/bar e vorrei un preventivo per segnaposti e menù digitale.'
    },
    uffici: {
      chip: 'Per aziende e uffici · Piacenza',
      titolo: 'Merchandising che i clienti <em>usano davvero</em>.',
      sub: 'Portachiavi e badge NFC, biglietti da visita NFC e gadget di benvenuto con il tuo logo, dal kit campione alla produzione in volume.',
      soluzioni: 'Per la tua <em>azienda</em>',
      ordine: ['merch', 'volume', 'nfc', 'eventi', 'segnaposti', 'menu'],
      wa: 'Ciao RoleFigz! Vorrei un preventivo per merchandising aziendale con il nostro logo.'
    },
    eventi: {
      chip: 'Per eventi e fiere · Piacenza',
      titolo: 'Gadget che restano <em>dopo l\'evento</em>.',
      sub: 'Gadget da stand, trofei, premi interni e badge per fiere, career day e tornei. Prezzi a scalare e consegna puntuale per la data dell\'evento.',
      soluzioni: 'Per il tuo <em>evento</em>',
      ordine: ['eventi', 'merch', 'volume', 'nfc', 'segnaposti', 'menu'],
      wa: 'Ciao RoleFigz! Organizzo un evento e vorrei un preventivo per dei gadget.'
    },
    negozi: {
      chip: 'Per negozi · Piacenza',
      titolo: 'Dal banco al telefono, <em>in un tocco</em>.',
      sub: 'Stand NFC da banco che aprono Instagram, WhatsApp e le recensioni Google, più la pagina della tua attività con RoleFigz NFC.',
      soluzioni: 'Per il tuo <em>negozio</em>',
      ordine: ['nfc', 'merch', 'segnaposti', 'menu', 'eventi', 'volume'],
      wa: 'Ciao RoleFigz! Ho un negozio e vorrei informazioni sugli stand NFC.'
    }
  };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  let attuale = null;

  function applica(seg, anima) {
    const c = SETTORI[seg];
    if (!c || seg === attuale) return;
    attuale = seg;
    try { sessionStorage.setItem('rf_settore', seg); } catch (_) {}

    $$('[data-seg]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.seg === seg)));
    const titolo = $('[data-seg-title]');
    const testi = [$('[data-seg-chip]'), titolo, $('[data-seg-sub]')].filter(Boolean);
    const scrivi = () => {
      $('[data-seg-chip]').textContent = c.chip;
      titolo.innerHTML = c.titolo;
      delete titolo.dataset.split; // l'intro può ridividerlo in parole
      $('[data-seg-sub]').textContent = c.sub;
    };
    if (anima && window.gsap) {
      gsap.to(testi, { opacity: 0, y: -8, duration: 0.2, onComplete: () => { scrivi(); gsap.fromTo(testi, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 }); } });
    } else scrivi();

    const solTitle = $('[data-seg-sol-title]');
    if (solTitle) solTitle.innerHTML = c.soluzioni;

    // soluzioni consigliate in testa, con un'etichetta
    c.ordine.forEach((id, i) => {
      const card = $(`[data-sol="${id}"]`);
      if (!card) return;
      card.style.order = i;
      card.classList.toggle('is-featured', i < 3);
    });
    if (anima && window.gsap) gsap.fromTo('.v2-biz-card.is-featured', { y: 20, opacity: 0.4 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.06 });

    $$('[data-sector]').forEach(el => el.classList.toggle('is-active', el.dataset.sector === seg));
    const wa = $('[data-seg-wa]');
    if (wa) wa.href = WA + encodeURIComponent(c.wa);
  }

  // scelta all'ingresso, oppure dal selettore nell'hero
  window.addEventListener('v2:gate-choice', e => applica(e.detail, false));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-seg]');
    if (b) applica(b.dataset.seg, true);
  });

  // al caricamento: #ristoranti nell'indirizzo o la scelta già fatta in questa visita
  let iniziale = (location.hash || '').slice(1);
  if (!SETTORI[iniziale]) { try { iniziale = sessionStorage.getItem('rf_settore'); } catch (_) { iniziale = null; } }
  if (SETTORI[iniziale]) applica(iniziale, false);
})();
