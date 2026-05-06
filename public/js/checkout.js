let spedizioneSelezionata = null;

function apriCheckout() {
  chiudiCarrello();
  if (utente) {
    document.getElementById('chkNombre').value = utente.nombre || '';
    document.getElementById('chkEmail').value  = utente.email  || '';
  }
  const prefisso = document.getElementById('chkPrefijo');
  if (prefisso && !prefisso.dataset.set) {
    prefisso.value = linguaCorrente === 'es' ? '+34' : '+39';
    prefisso.dataset.set = '1';
  }
  spedizioneSelezionata = null;
  document.getElementById('spedizioneOpzioni').innerHTML = '';
  aggiornaRiepilogoOrdine();
  document.getElementById('checkoutModal').classList.add('on');
}

function chiudiCheckout() {
  document.getElementById('checkoutModal').classList.remove('on');
}

function resetSpedizione() {
  if (!spedizioneSelezionata) return;
  spedizioneSelezionata = null;
  document.getElementById('spedizioneOpzioni').innerHTML = '';
  aggiornaRiepilogoOrdine();
}

function aggiornaRiepilogoOrdine() {
  const prodTotale = totaleCarrello();
  const spedCosto  = spedizioneSelezionata ? spedizioneSelezionata.prezzo : 0;

  document.getElementById('orderSummary').innerHTML = `
    <div class="osummary-title">// RIEPILOGO</div>
    ${carrello.map(i => `
      <div class="oline">
        <span>${i.prodotto.nombre}${i.variante ? ` (${i.variante})` : ''} × ${i.quantita}</span>
        <span>€${(i.prezzo * i.quantita).toFixed(2)}</span>
      </div>`).join('')}
    <div class="oline" style="color:${spedizioneSelezionata ? 'inherit' : 'var(--muted)'}">
      <span>${spedizioneSelezionata
        ? `${spedizioneSelezionata.corriere} — ${spedizioneSelezionata.servizio}`
        : 'Spedizione'}</span>
      <span>${spedizioneSelezionata
        ? `€${spedizioneSelezionata.prezzo.toFixed(2)}`
        : 'da calcolare'}</span>
    </div>
    <div class="ototal">
      <span>TOTALE</span>
      <span>€${(prodTotale + spedCosto).toFixed(2)}</span>
    </div>`;
}

async function calcolaSpedizioneCheckout() {
  const nome  = document.getElementById('chkNombre').value.trim();
  const via   = document.getElementById('chkVia').value.trim();
  const citta = document.getElementById('chkCitta').value.trim();
  const cap   = document.getElementById('chkCap').value.trim();
  const prov  = document.getElementById('chkProv').value.trim();
  // Fix 2: codice ISO 2 lettere maiuscole
  const naz   = (document.getElementById('chkNazione').value || 'IT').toUpperCase().slice(0, 2);

  if (!via || !citta || !cap) {
    showMsg('checkoutMsg', 'Inserisci via, città e CAP prima di calcolare la spedizione', 'err');
    return;
  }

  showMsg('checkoutMsg', '', '');
  spedizioneSelezionata = null;
  aggiornaRiepilogoOrdine();

  const wrap = document.getElementById('spedizioneOpzioni');
  wrap.innerHTML = '<div class="spediz-loading">CALCOLO TARIFFE...</div>';

  try {
    const r = await fetch(`${API}/spedizione/rate-pubblica`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome_destinatario: nome || 'Cliente',
        via, citta, cap,
        provincia: prov,
        nazione:   naz,
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    if (!data.tariffe || !data.tariffe.length) {
      wrap.innerHTML = '<div class="msg err">Nessuna tariffa disponibile per questo indirizzo.</div>';
      return;
    }

    wrap.innerHTML = `
      <div class="spediz-label">SELEZIONA METODO DI SPEDIZIONE *</div>
      ${data.tariffe.map(t => `
        <div class="spediz-opt" data-id="${t.id}" onclick="selezionaSpedizione('${t.id}','${t.corriere.replace(/'/g,"\\'")}','${t.servizio.replace(/'/g,"\\'")}',${t.prezzo})">
          <div class="spediz-info">
            <div class="spediz-corriere">${t.corriere}</div>
            <div class="spediz-servizio">${t.servizio}${t.giorni ? ` · ${t.giorni} giorni` : ''}</div>
          </div>
          <div class="spediz-prezzo">€${parseFloat(t.prezzo).toFixed(2)}</div>
        </div>`).join('')}`;
  } catch(e) {
    wrap.innerHTML = `<div class="msg err">Impossibile calcolare la spedizione: ${e.message}</div>`;
  }
}

function selezionaSpedizione(id, corriere, servizio, prezzo) {
  spedizioneSelezionata = { id, corriere, servizio, prezzo: parseFloat(prezzo) };
  document.querySelectorAll('.spediz-opt').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
  aggiornaRiepilogoOrdine();
  showMsg('checkoutMsg', '', '');
}

async function confermaOrdine() {
  const nome  = document.getElementById('chkNombre').value.trim();
  const email = document.getElementById('chkEmail').value.trim();
  const via   = document.getElementById('chkVia').value.trim();
  const citta = document.getElementById('chkCitta').value.trim();
  const cap   = document.getElementById('chkCap').value.trim();

  if (!nome || !email) { showMsg('checkoutMsg', 'Nome e email obbligatori', 'err'); return; }
  if (!via || !citta || !cap) { showMsg('checkoutMsg', 'Completa i dati di spedizione: via, città e CAP', 'err'); return; }
  if (!spedizioneSelezionata) { showMsg('checkoutMsg', 'Calcola e seleziona un metodo di spedizione', 'err'); return; }

  const btn = document.getElementById('confirmarBtn');
  btn.disabled = true;

  const prov      = document.getElementById('chkProv').value.trim();
  const naz       = document.getElementById('chkNazione').value || 'IT';
  const direccion = [via, cap, citta, prov, naz].filter(Boolean).join(', ');

  // Passo 1: genera etichetta Shippo se abbiamo un rate_id
  let etichetta = null;
  if (spedizioneSelezionata.id) {
    btn.textContent = 'GENERAZIONE ETICHETTA...';
    try {
      const re = await fetch(`${API}/spedizione/acquista-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate_id: spedizioneSelezionata.id }),
      });
      const de = await re.json();
      if (!re.ok) throw new Error(de.error);
      etichetta = de;
    } catch(e) {
      showMsg('checkoutMsg', e.message, 'err');
      btn.disabled    = false;
      btn.textContent = t('checkout_confirm');
      return;
    }
  }

  // Passo 2: crea sessione Stripe
  btn.textContent = 'PAGAMENTO...';
  try {
    const r = await fetch(`${API}/pagos/crear-sesion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        nombre_cliente:        nome,
        email_cliente:         email,
        telefono:              ((document.getElementById('chkPrefijo')?.value || '') + ' ' + (document.getElementById('chkTelNumero')?.value || '')).trim(),
        direccion,
        notas:                 document.getElementById('chkNotas').value,
        costo_spedizione:      spedizioneSelezionata.prezzo,
        carrier:               spedizioneSelezionata.corriere,
        shipping_service:      spedizioneSelezionata.servizio,
        shippo_rate_id:        spedizioneSelezionata.id || null,
        tracking_number:       etichetta?.tracking_number       || null,
        label_url:             etichetta?.label_url             || null,
        shippo_transaction_id: etichetta?.shippo_transaction_id || null,
        items: carrello.map(i => ({
          producto_id:         i.prodotto.id,
          cantidad:            i.quantita,
          precio_unidad:       i.prezzo,
          variante:            i.variante            || null,
          foto_cliente:        i.fotoCliente         || null,
          data_consegna:       i.dataConsegna        || null,
          supplemento_express: i.supplementoExpress  || 0,
        }))
      })
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    carrello = [];
    aggiornaUICarrello();
    window.location.href = data.url;

  } catch(e) {
    showMsg('checkoutMsg', e.message, 'err');
    btn.disabled    = false;
    btn.textContent = t('checkout_confirm');
  }
}
