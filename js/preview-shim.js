// Anteprima statica di RoleFigz v2: niente server, quindi le chiamate /api
// ricevono dati di esempio e le azioni (login, ordini, invii) restano disattivate.
(function () {
  // localStorage può non essere disponibile (finestra privata, anteprime): ripiego in memoria
  try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); }
  catch (e) {
    const mem = {};
    const store = {
      getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); },
      removeItem: k => { delete mem[k]; }, clear: () => { for (const k in mem) delete mem[k]; }, key: i => Object.keys(mem)[i] || null,
      get length() { return Object.keys(mem).length; }
    };
    try { Object.defineProperty(window, 'localStorage', { value: store, configurable: true }); } catch (_) {}
  }

  const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, '');
  const PREVIEW_TOKEN = b64({ alg: 'none' }) + '.' + b64({ id: 1, rol: 'admin', exp: 4102444800, preview: true }) + '.anteprima';
  const isAdmin = /admin\.html$/.test(location.pathname);
  try {
    if (isAdmin) localStorage.setItem('rfToken', PREVIEW_TOKEN);
    else if (localStorage.getItem('rfToken') === PREVIEW_TOKEN) localStorage.removeItem('rfToken');
    localStorage.setItem('rf_cookie_ok', '1');
  } catch (_) {}

  // ── dati di esempio ─────────────────────────────────────────
  const cats = [{ id: 1, nombre: 'Portachiavi' }, { id: 2, nombre: 'Gadget' }, { id: 3, nombre: 'Figure' }, { id: 4, nombre: 'Segnaposti' }];
  const P = (id, nombre, cat, precio, stock, img, descripcion) => ({
    id, slug: nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    nombre, precio, stock, descripcion, imagen: img, imagenes: [{ url: img, orden: 0 }], variantes: [],
    categoria_id: cat.id, Categoria: cat, activo: true, giorni_produzione: 7, giorni_spedizione: 3
  });
  const prods = [
    P(1, 'Portachiavi personalizzato con logo', cats[0], 6, 24, 'assets/llaveros.jpeg', 'Portachiavi stampato in 3D con il tuo logo o nome in rilievo, a colori pieni. Leggero, resistente e pensato per durare.'),
    P(2, 'Portachiavi NFC 2M', cats[0], 9.5, 2, 'assets/gadget/Portachiave2M.jpg', 'Portachiavi con chip NFC integrato: avvicinalo al telefono e apre il tuo sito, Instagram o WhatsApp.'),
    P(3, 'Figura personalizzata dalla tua foto', cats[2], 39, 5, 'assets/gadget/MiniaturaProdotto.png', 'Statuina 3D modellata dalla tua foto, anche in stile Funko Pop. Ricevi l\'anteprima 3D prima della stampa.'),
    P(4, 'Calamita con logo', cats[1], 4.5, 0, 'assets/iman.jpeg', 'Calamita stampata in 3D con il tuo logo, per frigorifero o lavagna magnetica.'),
    P(5, 'Calamita Emilia', cats[1], 5, 8, 'assets/gadget/calamitaelim.jpg', 'Calamita personalizzata stampata in 3D, perfetta come ricordo o gadget per eventi.'),
    P(6, 'Badge da presentazione NFC', cats[1], 12, 12, 'assets/presentationbadge2.jpeg', 'Badge con chip NFC: un tocco e condividi i tuoi contatti. Con il tuo logo in rilievo.'),
    P(7, 'Segnaletica 3D personalizzata', cats[3], 18, 4, 'assets/gadget/Segnaletica.jpg', 'Segnaletica da tavolo o da banco con QR code, stampata in 3D con i colori del tuo locale.'),
    P(8, 'Trofeo personalizzato', cats[2], 29, 6, 'assets/gadget/Trofeo.png', 'Trofeo stampato in 3D per tornei, eventi aziendali e premiazioni, con targhetta personalizzata.')
  ];
  const revs = [
    { puntuacion: 5, comentario: 'Qualità ottima, spedizione veloce e super disponibili per le modifiche.', nombre_autor: 'Giulia', Prodotto: { nombre: prods[0].nombre } },
    { puntuacion: 5, comentario: 'I portachiavi NFC sono stati un successo alla fiera: tutti li provavano.', nombre_autor: 'Marco', Prodotto: { nombre: prods[1].nombre } },
    { puntuacion: 5, comentario: 'La figura di mio padre è identica. Regalo perfetto per i suoi 60 anni.', nombre_autor: 'Sara', Prodotto: { nombre: prods[2].nombre } }
  ];
  const articoli = [{
    id: 1, slug: 'come-scegliere-il-filamento', titolo: 'Come scegliere il filamento giusto', estratto: 'PLA, PETG o TPU? Una guida pratica per capire quale materiale usare per ogni oggetto.',
    contenuto: '<p>Esempio di articolo: nella versione reale qui compare il testo del blog.</p>', immagine: 'assets/impresoras.jpeg', tags: ['materiali'], pubblicato: true,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  }];
  const ordini = [
    { id: 101, estado: 'confirmado', nombre_cliente: 'Cliente di esempio', total: 32.5, createdAt: new Date().toISOString(), direccion: 'Via Roma 1, 29121 Piacenza', detalles: [{ Prodotto: { nombre: prods[0].nombre }, cantidad: 2, variante: 'Nero' }, { Prodotto: { nombre: prods[3].nombre }, cantidad: 1 }] },
    { id: 99, estado: 'enviado', nombre_cliente: 'Cliente di esempio 2', total: 54.9, createdAt: new Date().toISOString(), direccion: 'Via Emilia 10, 29122 Piacenza', detalles: [{ Prodotto: { nombre: prods[2].nombre }, cantidad: 1 }], tracking_number: 'BRT0000000000', carrier: 'BRT' }
  ];

  function rispondi(data, status) {
    return Promise.resolve(new Response(JSON.stringify(data), { status: status || 200, headers: { 'Content-Type': 'application/json' } }));
  }

  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, opts) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = ((opts && opts.method) || (input && input.method) || 'GET').toUpperCase();
    const m = url.match(/\/api(\/[^?#]*)/);
    if (!m) {
      // servizi esterni (FormSubmit, ecc.): in anteprima non si invia nulla
      if (/^https?:\/\//.test(url) && !url.startsWith(location.origin)) return rispondi({ error: 'Anteprima: invio disattivato' }, 503);
      return realFetch(input, opts);
    }
    const p = m[1].replace(/\/+$/, '');
    if (method !== 'GET') {
      if (p === '/analytics/track') return rispondi({ ok: true });
      return rispondi({ error: 'Questa è un\'anteprima: login, ordini e invii sono disattivati.' }, 403);
    }
    let d;
    if (p === '/productos') d = prods;
    else if (/^\/productos\/(slug\/)?[^/]+$/.test(p)) {
      const k = decodeURIComponent(p.split('/').pop());
      d = prods.find(x => String(x.id) === k || x.slug === k);
      if (!d) return rispondi({ error: 'Prodotto non trovato' }, 404);
    }
    else if (p === '/categorias') d = cats;
    else if (p === '/resenas/destacadas') d = revs;
    else if (/^\/resenas\/puedo\//.test(p)) d = { puede: false };
    else if (/^\/resenas\/\d+$/.test(p)) d = [];
    else if (p === '/articoli') d = articoli;
    else if (/^\/articoli\/.+/.test(p)) d = articoli[0];
    else if (p === '/ordenes') d = ordini;
    else if (p === '/promo/popup') d = {};
    else if (p === '/tickets/unread') d = { count: 0, unread: 0 };
    else if (p === '/auth/perfil') d = isAdmin ? { id: 1, nombre: 'Anteprima', email: 'anteprima@rolefigz.com', rol: 'admin' } : null;
    else d = [];
    if (d === null) return rispondi({ error: 'Non autenticato' }, 401);
    return rispondi(d);
  };

  // nastro "anteprima" in fondo alla pagina
  function badge() {
    if (document.getElementById('rfPreviewBadge')) return;
    const b = document.createElement('div');
    b.id = 'rfPreviewBadge';
    b.textContent = 'Anteprima v2 · prodotti di esempio · login e ordini disattivati';
    b.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:99999;' +
      'background:#111110;color:#f6f5f2;font:500 12px/1.3 "DM Sans",system-ui,sans-serif;padding:8px 14px;border-radius:999px;' +
      'box-shadow:0 8px 24px -8px rgba(0,0,0,.5);pointer-events:none;max-width:calc(100% - 32px);text-align:center;opacity:.92';
    document.body.appendChild(b);
  }
  if (document.body) badge(); else document.addEventListener('DOMContentLoaded', badge);
})();
