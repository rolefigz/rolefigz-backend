const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : '/api';
let token = localStorage.getItem('rfToken') || null;
let utente = null;
let prodotti = [];
let categorie = [];
let carrello = [];
let prodottoCorrente = null;
let varianteSelezionata = {};
let quantitaSelezionata = 1;
let fotoClienteUrl           = null;
let dataConsegnaSelezionata  = null;
let supplementoExpressCorrente = 0;
let calMeseCorrente          = { anno: 0, mese: 0 };
