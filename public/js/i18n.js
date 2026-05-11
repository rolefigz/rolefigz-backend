const linguaCorrente = 'it';

function localeDate() { return 'it-IT'; }

function impostaLingua() {}

function t(key) {
  const s = {
    nav_shop: 'NEGOZIO', nav_cart: 'CARRELLO', nav_account: 'IL MIO ACCOUNT',
    nav_login: 'ACCEDI', nav_logout: 'ESCI', nav_blog: 'BLOG',
    hero_eyebrow: 'Stampa 3D professionale',
    hero_products: 'PRODOTTI DISPONIBILI',
    cta_catalogue: 'VEDI CATALOGO', cta_account: 'CREA ACCOUNT',
    how_eyebrow: '// Il nostro processo', how_title: 'COME\nFUNZIONA',
    step1_title: 'Scegli', step1_desc: 'Sfoglia il catalogo o contattaci per un progetto su misura.',
    step2_title: 'Personalizziamo', step2_desc: 'Ottimizziamo il modello 3D e scegliamo materiali e finiture.',
    step3_title: 'Consegniamo', step3_desc: 'Stampiamo, controlliamo la qualità e spediamo direttamente a casa tua.',
    cats_eyebrow: '// Cosa facciamo', cats_title: 'CATEGORIE',
    catalogue_title: 'CATALOGO', search_placeholder: 'Cerca prodotto...',
    why_eyebrow: '// La nostra qualità', why_title: 'PERCHÉ\nROLEFIGZ',
    why1_title: 'Precisione', why1_desc: 'Stampa FDM e SLA con tolleranze al decimo di millimetro.',
    why2_title: 'Velocità', why2_desc: 'Tempi di produzione rapidi senza compromettere la qualità.',
    why3_title: 'Personalizzazione', why3_desc: 'Dal logo aziendale alla figura: realizziamo qualsiasi oggetto.',
    why4_title: 'Artigianalità', why4_desc: 'Ogni prodotto è fatto a mano da un team appassionato.',
    footer_nav: 'Navigazione', footer_catalogue: 'Catalogo', footer_account: 'Crea account',
    footer_login: 'Accedi', footer_contact: 'Contatti', blog_title: 'ARTICOLI',
    cart_title: 'CARRELLO', cart_total: 'TOTALE', cart_checkout: 'ORDINA',
    cart_empty: '// CARRELLO VUOTO',
    auth_title: 'ACCESSO', auth_login: 'ACCEDI', auth_register: 'REGISTRATI',
    auth_register_btn: 'CREA ACCOUNT',
    checkout_title: 'IL TUO ORDINE', checkout_sub: '// DATI DI SPEDIZIONE',
    checkout_confirm: 'CONFERMA ORDINE',
    field_email: 'Email', field_password: 'Password', field_name: 'Nome completo',
    field_phone: 'Telefono', field_address: 'Indirizzo di spedizione', field_notes: 'Note',
    add_to_cart: '+ AGGIUNGI AL CARRELLO', sold_out: 'ESAURITO',
    cancel: 'ANNULLA', save: 'SALVA MODIFICHE',
    perfil_orders: 'I miei ordini', perfil_data: 'I miei dati',
    status_api: 'API CONNESSA', status_no_session: 'NESSUNA SESSIONE',
    status_admin: 'ADMIN', status_client: 'CLIENTE',
    blog_no_articles: 'NESSUN ARTICOLO', blog_no_articles_desc: 'Non ci sono ancora articoli pubblicati.',
    blog_error: 'ERRORE', blog_error_desc: 'Impossibile caricare gli articoli.',
  };
  return s[key] || key;
}
