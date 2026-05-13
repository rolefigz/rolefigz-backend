let spedizioneSelezionata = null;
let benchysRiscattati = { tipo: null, sconto: 0 };

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
  benchysRiscattati = { tipo: null, sconto: 0 };
  renderItemsCheckout();
  renderBenchysCheckout();
  mostraVista('checkout');
  history.pushState({ tipo: 'checkout' }, 'Checkout — RoleFigz', '/checkout');
  calcolaSpedizioneAuto();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function chiudiCheckout() {
  history.back();
}

function renderItemsCheckout() {
  const el = document.getElementById('chkItemsPage');
  if (!el) return;
  el.innerHTML = carrello.map(i => {
    const img = i.prodotto.imagenes?.[0]?.url || i.prodotto.imagen || null;
    return `
      <div class="chk-item">
        ${img ? `<img class="chk-item-img" src="${img}" alt="${i.prodotto.nombre}">` : '<div class="chk-item-ph">3D</div>'}
        <div>
          <div class="chk-item-name">${i.prodotto.nombre}</div>
          ${i.variante ? `<div class="chk-item-meta">${i.variante}</div>` : ''}
          ${i.dataConsegna ? `<div class="chk-item-meta">📅 ${new Date(i.dataConsegna+'T00:00:00').toLocaleDateString('it-IT')}</div>` : ''}
          <div class="chk-item-qty">Qtà: ${i.quantita}</div>
        </div>
        <div class="chk-item-price">€${(i.prezzo * i.quantita).toFixed(2)}</div>
      </div>`;
  }).join('');
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

  spedizioneSelezionata = {
    id:       'it-fisso',
    corriere: 'Standard',
    servizio: 'Spedizione standard',
    prezzo:   10,
  };

  wrap.innerHTML = `
    <div class="spediz-opt selected" style="pointer-events:none">
      <div class="spediz-info">
        <div class="spediz-corriere">
          <iconify-icon icon="mdi:truck-fast-outline" width="14" style="vertical-align:middle;margin-right:5px"></iconify-icon>
          Spedizione standard
        </div>
        <div class="spediz-servizio">Consegna stimata 3–7 giorni lavorativi</div>
      </div>
      <div class="spediz-prezzo">€10.00</div>
    </div>`;

  aggiornaRiepilogoOrdine();
}

function aggiornaRiepilogoOrdine() {
  const prodTotale = totaleCarrello();
  let spedCosto    = spedizioneSelezionata ? spedizioneSelezionata.prezzo : 0;
  let scontoExtra  = 0;

  if (benchysRiscattati.tipo === 'spedizione_gratuita') spedCosto = 0;
  if (benchysRiscattati.tipo === 'sconto') scontoExtra = benchysRiscattati.sconto;

  // Sconto codice promo
  const promo = typeof promoApplicato !== 'undefined' ? promoApplicato : null;
  if (promo?.spedizioneGratis) spedCosto = 0;
  if (promo?.scontoEuro)       scontoExtra += promo.scontoEuro;

  const totale = Math.max(0, prodTotale + spedCosto - scontoExtra);

  document.getElementById('orderSummary').innerHTML = `
    <div class="chk-summary-row">
      <span>Subtotale</span>
      <span>€${prodTotale.toFixed(2)}</span>
    </div>
    <div class="chk-summary-row">
      <span>${spedizioneSelezionata ? 'Spedizione standard' : 'Spedizione'}</span>
      <span style="${benchysRiscattati.tipo==='spedizione_gratuita' ? 'text-decoration:line-through;color:var(--muted)' : ''}">
        ${spedizioneSelezionata ? '€10.00' : '—'}
      </span>
      ${benchysRiscattati.tipo==='spedizione_gratuita' ? '<span style="color:var(--green);font-weight:700">GRATIS <img src="/assets/benchy.png" style="width:13px;height:13px;object-fit:contain;vertical-align:middle"/></span>' : ''}
    </div>
    ${benchysRiscattati.sconto > 0 ? `<div class="chk-summary-row" style="color:var(--green)"><span>Sconto Benchys <img src="/assets/benchy.png" style="width:13px;height:13px;object-fit:contain;vertical-align:middle"/></span><span>-€${benchysRiscattati.sconto.toFixed(2)}</span></div>` : ''}
    ${promo?.scontoEuro > 0 ? `<div class="chk-summary-row" style="color:var(--green)"><span>Codice "${promo.codice || ''}"</span><span>-€${promo.scontoEuro.toFixed(2)}</span></div>` : ''}
    ${promo?.spedizioneGratis ? `<div class="chk-summary-row" style="color:var(--green)"><span>Codice "${promo.codice || ''}"</span><span>🚚 GRATIS</span></div>` : ''}
    <div class="chk-total">
      <span class="chk-total-label">TOTALE</span>
      <span class="chk-total-val">€${totale.toFixed(2)}</span>
    </div>`;
}

function renderBenchysCheckout() {
  const wrap = document.getElementById('benchysCheckoutWrap');
  if (!wrap || !token || !utente) return;
  const saldo = typeof benchySaldo !== 'undefined' ? benchySaldo : 0;
  const minSpediz = typeof benchyConfig !== 'undefined' ? benchyConfig.spedizione_minimo : 150;

  wrap.innerHTML = `
    <div style="border:1px solid var(--accent);padding:14px;margin-bottom:12px;background:rgba(193,127,58,.05)">
      <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--accent);margin-bottom:10px;display:flex;align-items:center;gap:6px"><img src="/assets/benchy.png" style="width:13px;height:13px;object-fit:contain"/> HAI ${saldo} BENCHYS</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${saldo >= minSpediz ? `
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px">
            <input type="radio" name="benchyRiscatto" value="spedizione_gratuita" onchange="applicaBenchys(this.value)"/>
            Spedizione gratuita (−${minSpediz} Benchys)
          </label>` : `
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted)">Servono ${minSpediz} Benchys per la spedizione gratuita (ne hai ${saldo})</div>`}
        ${saldo >= 100 ? `
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px">
            <input type="radio" name="benchyRiscatto" value="sconto" onchange="applicaBenchys(this.value)"/>
            Sconto €${(Math.floor(saldo/100)*1).toFixed(2)} (−${Math.floor(saldo/100)*100} Benchys)
          </label>` : ''}
        ${(saldo >= minSpediz || saldo >= 100) ? `
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px">
            <input type="radio" name="benchyRiscatto" value="nessuno" onchange="applicaBenchys(this.value)" checked/>
            Non usare Benchys
          </label>` : ''}
      </div>
    </div>`;
}

function applicaBenchys(tipo) {
  const saldo = typeof benchySaldo !== 'undefined' ? benchySaldo : 0;
  if (tipo === 'spedizione_gratuita') {
    benchysRiscattati = { tipo: 'spedizione_gratuita', sconto: 0 };
  } else if (tipo === 'sconto') {
    const benchyUsati = Math.floor(saldo / 100) * 100;
    benchysRiscattati = { tipo: 'sconto', sconto: (benchyUsati / 100) * 1.00 };
  } else {
    benchysRiscattati = { tipo: null, sconto: 0 };
  }
  aggiornaRiepilogoOrdine();
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
        codice_promo:          (typeof promoApplicato !== 'undefined' && promoApplicato) ? promoApplicato.codice : null,
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
    btn.textContent = 'CONFERMA ORDINE';
  }
}
