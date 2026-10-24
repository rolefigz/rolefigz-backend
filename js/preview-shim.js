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
  const isAdmin = !!window.__RF_IS_ADMIN || /admin\.html$/.test(location.pathname);
  try {
    if (isAdmin) localStorage.setItem('rfToken', PREVIEW_TOKEN);
    else if (localStorage.getItem('rfToken') === PREVIEW_TOKEN) localStorage.removeItem('rfToken');
    localStorage.setItem('rf_cookie_ok', '1');
  } catch (_) {}

  // nell'anteprima i percorsi sono relativi: li rendiamo assoluti finché l'indirizzo è quello di partenza
  const abs = u => { try { return new URL(u, location.href).href; } catch (_) { return u; } };
  // la SPA cambia il percorso (/blog/..., /producto/...): qui romperebbe i link relativi, quindi resta lo stato e basta
  ['pushState', 'replaceState'].forEach(fn => {
    const orig = history[fn].bind(history);
    history[fn] = function (state, title) { try { return orig(state, title); } catch (_) {} };
  });

  // ── dati di esempio ─────────────────────────────────────────
  const cats = [{ id: 1, nombre: 'Portachiavi' }, { id: 2, nombre: 'Motorsport' }, { id: 3, nombre: 'Casa e regali' }];
  const P = (id, nombre, cat, precio, stock, img, descripcion) => ({
    id, slug: nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    nombre, precio, stock, descripcion, imagen: abs(img), imagenes: [{ url: abs(img), orden: 0 }], variantes: [],
    categoria_id: cat.id, Categoria: cat, activo: true, giorni_produzione: 7, giorni_spedizione: 3
  });
  const prods = [
    P(1, 'Portachiavi con il tuo nome', cats[0], 6, 24, 'assets/opt/llaveros-sm.webp', 'Portachiavi stampato in 3D con il tuo nome o una scritta in rilievo, a colori pieni. Leggero, resistente e pensato per durare.'),
    P(2, 'Portachiavi F1 rosso', cats[1], 9.5, 2, 'f1/gadget/portachiavi-f1-rosso.webp', 'Portachiavi in stile motorsport con logo in rilievo e anello in metallo.'),
    P(3, 'Portachiavi F1 carbon', cats[1], 9.5, 7, 'f1/gadget/portachiavi-f1-nero.webp', 'Portachiavi effetto carbonio con logo rosso in rilievo, per chi vive di motorsport.'),
    P(4, 'Sottobicchieri circuiti F1', cats[1], 19, 5, 'f1/gadget/sottobicchieri-f1.webp', 'Set di sottobicchieri con i tracciati dei circuiti, effetto carbonio e bordo rosso.'),
    P(5, 'Sagoma circuito di Spa', cats[1], 24, 0, 'f1/gadget/sagoma-spa.webp', 'Il tracciato di Spa-Francorchamps da appendere o appoggiare, con targhetta del circuito.'),
    P(6, 'Calamita personalizzata', cats[2], 4.5, 12, 'assets/opt/iman-sm.webp', 'Calamita stampata in 3D con nome o scritta a scelta, per frigorifero o lavagna magnetica.'),
    P(7, 'Benchy rossa luminosa', cats[2], 12, 6, 'assets/opt/benchy-sm.webp', 'La barchetta simbolo della stampa 3D, in PLA rosso traslucido: un regalo per maker e appassionati.'),
    P(8, 'Mensola alettone GT3 RS', cats[1], 39, 3, 'f1/gadget/mensola-alettone-gt3rs.webp', 'Mensola a forma di alettone posteriore, per modellini, caschi e trofei.')
  ];
  const revs = [
    { puntuacion: 5, comentario: 'Qualità ottima, spedizione veloce e super disponibili per le modifiche.', nombre_autor: 'Giulia', Prodotto: { nombre: prods[0].nombre } },
    { puntuacion: 5, comentario: 'I sottobicchieri con i circuiti sono stati il regalo perfetto per mio fratello.', nombre_autor: 'Marco', Prodotto: { nombre: prods[3].nombre } },
    { puntuacion: 5, comentario: 'La figura di mio padre è identica. Regalo perfetto per i suoi 60 anni.', nombre_autor: 'Sara', Prodotto: { nombre: 'Figura personalizzata' } }
  ];
  const articoli = [
    { id: 1, slug: 'come-scegliere-il-filamento', titolo: 'Come scegliere il filamento giusto', estratto: 'PLA, PETG o TPU? Una guida pratica per capire quale materiale usare per ogni oggetto.', contenuto: "<p>Esempio di articolo: nella versione reale qui compare il testo scritto dal pannello admin.</p><h2>Perché il materiale conta</h2><p>Il PLA è perfetto per oggetti decorativi e dettagli fini; il PETG resiste meglio al calore e agli urti; il TPU è flessibile.</p><blockquote>Scegliamo il materiale in base all'uso, non al prezzo.</blockquote><h3>In breve</h3><ul><li>PLA: figure, portachiavi, decorazioni</li><li>PETG: segnaposti, supporti, esterni</li><li>TPU: cover e parti morbide</li></ul>", immagine: abs('assets/opt/llaveros.webp'), tags: 'materiali,guide', pubblicato: true, createdAt: new Date(Date.now() - 2 * 864e5).toISOString(), updatedAt: new Date().toISOString() },
    { id: 2, slug: 'segnaposti-qr-ristorante', titolo: 'Segnaposti con QR: il menù a un tocco', estratto: 'Come funzionano i segnaposti con QR e NFC e perché i clienti li usano davvero.', contenuto: "<p>Esempio di articolo: nella versione reale qui compare il testo scritto dal pannello admin.</p><h2>Perché il materiale conta</h2><p>Il PLA è perfetto per oggetti decorativi e dettagli fini; il PETG resiste meglio al calore e agli urti; il TPU è flessibile.</p><blockquote>Scegliamo il materiale in base all'uso, non al prezzo.</blockquote><h3>In breve</h3><ul><li>PLA: figure, portachiavi, decorazioni</li><li>PETG: segnaposti, supporti, esterni</li><li>TPU: cover e parti morbide</li></ul>", immagine: abs('assets/opt/stand.webp'), tags: 'ristoranti,nfc', pubblicato: true, createdAt: new Date(Date.now() - 9 * 864e5).toISOString(), updatedAt: new Date().toISOString() },
    { id: 3, slug: 'circuiti-f1-in-scala', titolo: 'Circuiti di F1 in scala, dalla pista alla mensola', estratto: 'Dietro le quinte della collezione realizzata con NRG Sim Racing.', contenuto: "<p>Esempio di articolo: nella versione reale qui compare il testo scritto dal pannello admin.</p><h2>Perché il materiale conta</h2><p>Il PLA è perfetto per oggetti decorativi e dettagli fini; il PETG resiste meglio al calore e agli urti; il TPU è flessibile.</p><blockquote>Scegliamo il materiale in base all'uso, non al prezzo.</blockquote><h3>In breve</h3><ul><li>PLA: figure, portachiavi, decorazioni</li><li>PETG: segnaposti, supporti, esterni</li><li>TPU: cover e parti morbide</li></ul>", immagine: abs('f1/gadget/sottobicchieri-f1.webp'), tags: 'motorsport', pubblicato: true, createdAt: new Date(Date.now() - 16 * 864e5).toISOString(), updatedAt: new Date().toISOString() },
    { id: 4, slug: 'benchy-la-barchetta', titolo: 'Benchy: la barchetta che mette alla prova le stampanti', estratto: 'Perché ogni maker stampa questa piccola barca e cosa ci dice sulla qualità.', contenuto: "<p>Esempio di articolo: nella versione reale qui compare il testo scritto dal pannello admin.</p><h2>Perché il materiale conta</h2><p>Il PLA è perfetto per oggetti decorativi e dettagli fini; il PETG resiste meglio al calore e agli urti; il TPU è flessibile.</p><blockquote>Scegliamo il materiale in base all'uso, non al prezzo.</blockquote><h3>In breve</h3><ul><li>PLA: figure, portachiavi, decorazioni</li><li>PETG: segnaposti, supporti, esterni</li><li>TPU: cover e parti morbide</li></ul>", immagine: abs('assets/opt/benchy.webp'), tags: 'maker', pubblicato: true, createdAt: new Date(Date.now() - 30 * 864e5).toISOString(), updatedAt: new Date().toISOString() }
  ];
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
    else if (/^\/articoli\/.+/.test(p)) d = articoli.find(x => x.slug === decodeURIComponent(p.split('/').pop())) || articoli[0];
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
