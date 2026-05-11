const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : '/api';
let token = localStorage.getItem('rfToken') || null;
let utente = null;
let prodotti = [];
let categorie = [];
let carrello = [];
const _urlLang = ['it','es','en'].find(l => window.location.pathname === `/${l}` || window.location.pathname.startsWith(`/${l}/`));
let linguaCorrente = _urlLang || localStorage.getItem('rfLang') || 'es';
function localeDate() { return {'it':'it-IT','es':'es-ES','en':'en-US'}[linguaCorrente]||'es-ES'; }
let prodottoCorrente = null;
let varianteSelezionata = {};
let quantitaSelezionata = 1;
let fotoClienteUrl           = null;
let dataConsegnaSelezionata  = null;  // 'YYYY-MM-DD'
let supplementoExpressCorrente = 0;
let calMeseCorrente          = { anno: 0, mese: 0 };
