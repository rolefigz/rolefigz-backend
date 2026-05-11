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
    wrap.innerHTML = '<div class="msg err" style="margin:10px 0">Solo enviamos a Italia. Para envíos internacionales contáctanos.</div>';
    aggiornaRiepilogoOrdine();
    return;
  }

  const gratuita = totProdotti >= 100;
  spedizioneSelezionata = {
    id:       'it-fisso',
    corriere: 'Standard',
    servizio: gratuita ? 'Envío gratuito' : 'Envío estándar',
    prezzo:   gratuita ? 0 : 10,
  };

  wrap.innerHTML = `
    <div class="spediz-opt selected" style="pointer-events:none">
      <div class="spediz-info">
        <div class="spediz-corriere">
          <iconify-icon icon="mdi:truck-fast-outline" width="14" style="vertical-align:middle;margin-right:5px"></iconify-icon>
          ${spedizioneSelezionata.servizio}
        </div>
        ${gratuita ? '' : '<div class="spediz-servizio">Entrega estimada 3–7 días laborables</div>'}
      </div>
      <div class="spediz-prezzo">${gratuita ? 'GRATIS' : '€10.00'}</div>
    </div>
    ${!gratuita ? `<div style="font-size:11px;color:var(--muted);margin-top:6px;padding-left:2px">Envío gratuito para pedidos ≥ €100</div>` : ''}`;

  aggiornaRiepilogoOrdine();
}

function aggiornaRiepilogoOrdine() {
  const prodTotale = totaleCarrello();
  const spedCosto  = spedizioneSelezionata ? spedizioneSelezionata.prezzo : 0;

  document.getElementById('orderSummary').innerHTML = `
    <div class="osummary-title">// RESUMEN</div>
    ${carrello.map(i => `
      <div class="oline">
        <span>${i.prodotto.nombre}${i.variante ? ` (${i.variante})` : ''} × ${i.quantita}</span>
        <span>€${(i.prezzo * i.quantita).toFixed(2)}</span>
      </div>`).join('')}
    <div class="oline" style="color:${spedizioneSelezionata ? 'inherit' : 'var(--muted)'}">
      <span>${spedizioneSelezionata
        ? spedizioneSelezionata.prezzo === 0 ? 'Envío gratuito' : 'Envío estándar'
        : 'Envío'}</span>
      <span>${spedizioneSelezionata
        ? spedizioneSelezionata.prezzo === 0 ? 'GRATIS' : '€10.00'
        : 'a calcular'}</span>
    </div>
    <div class="ototal">
      <span>TOTAL</span>
      <span>€${(prodTotale + spedCosto).toFixed(2)}</span>
    </div>`;
}

async function confermaOrdine() {
  const nome  = document.getElementById('chkNombre').value.trim();
  const email = document.getElementById('chkEmail').value.trim();
  const via   = document.getElementById('chkVia').value.trim();
  const citta = document.getElementById('chkCitta').value.trim();
  const cap   = document.getElementById('chkCap').value.trim();

  if (!nome || !email) { showMsg('checkoutMsg', 'Nombre y email obligatorios', 'err'); return; }
  if (!via || !citta || !cap) { showMsg('checkoutMsg', 'Completa los datos de envío: calle, ciudad y código postal', 'err'); return; }
  if (!spedizioneSelezionata) { showMsg('checkoutMsg', 'Selecciona un país válido para el envío', 'err'); return; }

  const btn = document.getElementById('confirmarBtn');
  btn.disabled = true;

  const prov      = document.getElementById('chkProv').value.trim();
  const naz       = document.getElementById('chkNazione').value || 'IT';
  const direccion = [via, cap, citta, prov, naz].filter(Boolean).join(', ');

  btn.textContent = 'PAGANDO...';
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
