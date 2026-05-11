let spedizioneSelezionata = null;

function apriCheckout() {
  chiudiCarrello();
  if (utente) {
    document.getElementById('chkNombre').value = utente.nombre || '';
    document.getElementById('chkEmail').value  = utente.email  || '';
  }
  const prefisso = document.getElementById('chkPrefijo');
  if (prefisso && !prefisso.dataset.set) {
    prefisso.value = '+39';
    prefisso.dataset.set = '1';
  }
  spedizioneSelezionata = null;
  document.getElementById('checkoutModal').classList.add('on');
  calcolaSpedizioneAuto();
}

function chiudiCheckout() {
  document.getElementById('checkoutModal').classList.remove('on');
}

function calcolaSpedizioneAuto() {
  const naz = (document.getElementById('chkNazione')?.value || 'IT').toUpperCase();
  const totProdotti = totaleCarrello();
  const wrap = document.getElementById('spedizioneOpzioni');

  if (naz !== 'IT') {
    spedizioneSelezionata = null;
    wrap.innerHTML = '<div class="msg err" style="margin:10px 0">Spediamo solo in Italia. Per spedizioni internazionali contattaci.</div>';
    aggiornaRiepilogoOrdine();
    return;
  }

  const gratuita = totProdotti >= 100;
  spedizioneSelezionata = {
    id:       'it-fisso',
    corriere: 'Standard',
    servizio: gratuita ? 'Spedizione gratuita' : 'Spedizione standard',
    prezzo:   gratuita ? 0 : 10,
  };

  wrap.innerHTML = `
    <div class="spediz-opt selected" style="pointer-events:none">
      <div class="spediz-info">
        <div class="spediz-corriere">
          <iconify-icon icon="mdi:truck-fast-outline" width="14" style="vertical-align:middle;margin-right:5px"></iconify-icon>
          ${spedizioneSelezionata.servizio}
        </div>
        ${gratuita ? '' : '<div class="spediz-servizio">Consegna stimata 3–7 giorni lavorativi</div>'}
      </div>
      <div class="spediz-prezzo">${gratuita ? 'GRATIS' : '€10.00'}</div>
    </div>
    ${!gratuita ? `<div style="font-size:11px;color:var(--muted);margin-top:6px;padding-left:2px">Spedizione gratuita per ordini ≥ €100</div>` : ''}`;

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
        ? spedizioneSelezionata.prezzo === 0 ? 'Spedizione gratuita' : 'Spedizione standard'
        : 'Spedizione'}</span>
      <span>${spedizioneSelezionata
        ? spedizioneSelezionata.prezzo === 0 ? 'GRATIS' : '€10.00'
        : 'da calcolare'}</span>
    </div>
    <div class="ototal">
      <span>TOTALE</span>
      <span>€${(prodTotale + spedCosto).toFixed(2)}</span>
    </div>`;
}

async function confermaOrdine() {
  const nome  = document.getElementById('chkNombre').value.trim();
  const email = document.getElementById('chkEmail').value.trim();
  const via   = document.getElementById('chkVia').value.trim();
  const citta = document.getElementById('chkCitta').value.trim();
  const cap   = document.getElementById('chkCap').value.trim();

  if (!nome || !email) { showMsg('checkoutMsg', 'Nome e email obbligatori', 'err'); return; }
  if (!via || !citta || !cap) { showMsg('checkoutMsg', 'Completa i dati di spedizione: via, città e CAP', 'err'); return; }
  if (!spedizioneSelezionata) { showMsg('checkoutMsg', 'Seleziona un paese valido per la spedizione', 'err'); return; }

  const btn = document.getElementById('confirmarBtn');
  btn.disabled = true;

  const prov      = document.getElementById('chkProv').value.trim();
  const naz       = document.getElementById('chkNazione').value || 'IT';
  const direccion = [via, cap, citta, prov, naz].filter(Boolean).join(', ');

  btn.textContent = 'PAGAMENTO IN CORSO...';
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
        shippo_rate_id:        null,
        tracking_number:       null,
        label_url:             null,
        shippo_transaction_id: null,
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
