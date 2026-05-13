let promoApplicato = null; // { codice, tipo, scontoEuro, spedizioneGratis }

// ── Verifica e applica codice promo nel checkout ──────────────────────────────
async function applicaPromo() {
  const input = document.getElementById('promoInput');
  const btn   = document.getElementById('promoBtnApplica');
  const codice = input?.value.trim().toUpperCase();
  if (!codice) return;

  btn.disabled = true; btn.textContent = '...';
  promoApplicato = null;

  try {
    const totaleCarrello = typeof totaleCarrello_ === 'function' ? totaleCarrello_() : 0;
    const r = await fetch(`${API}/promo/verifica`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codice, totale_carrello: totaleCarrello, costo_spedizione: 10 })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);

    promoApplicato = { codice, ...data.sconto };
    const desc = data.promo.tipo === 'percentuale'
      ? `−${data.promo.valore}%`
      : data.promo.tipo === 'fisso'
      ? `−€${parseFloat(data.promo.valore).toFixed(2)}`
      : 'Spedizione gratuita';

    showMsg('promoMsg', `✅ "${codice}" applicato: ${desc}`, 'ok');
    if (typeof aggiornaRiepilogoOrdine === 'function') aggiornaRiepilogoOrdine();
  } catch(e) {
    promoApplicato = null;
    showMsg('promoMsg', e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = 'APPLICA';
  }
}

function rimuoviPromo() {
  promoApplicato = null;
  const input = document.getElementById('promoInput');
  if (input) input.value = '';
  const msg = document.getElementById('promoMsg');
  if (msg) msg.textContent = '';
  if (typeof aggiornaRiepilogoOrdine === 'function') aggiornaRiepilogoOrdine();
}

// ── Popup promozionale ────────────────────────────────────────────────────────
async function caricaPopupPromo() {
  try {
    const r = await fetch(`${API}/promo/popup`);
    if (!r.ok) return;
    const popups = await r.json();
    if (!popups.length) return;

    // Mostra il primo popup attivo (non già visto in sessione)
    const popup = popups.find(p => !sessionStorage.getItem(`popup_visto_${p.id}`));
    if (!popup) return;

    const overlay = document.getElementById('promoPopupOverlay');
    const box     = document.getElementById('promoPopupBox');
    const content = document.getElementById('promoPopupContent');
    if (!overlay || !box || !content) return;

    const descSconto = popup.tipo === 'percentuale'
      ? `−${popup.valore}%`
      : popup.tipo === 'fisso'
      ? `−€${parseFloat(popup.valore).toFixed(2)}`
      : '🚚 Spedizione gratuita';

    box.style.background  = popup.popup_colore || '#1a1a1a';
    box.style.color       = _coloreTesto(popup.popup_colore || '#1a1a1a');
    box.style.borderLeft  = `4px solid #C17F3A`;

    content.innerHTML = `
      ${popup.popup_titolo ? `<div style="font-family:'Barlow Condensed',sans-serif;font-size:32px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;margin-bottom:8px">${popup.popup_titolo}</div>` : ''}
      ${popup.popup_testo  ? `<div style="font-size:11px;letter-spacing:1px;margin-bottom:20px;opacity:.8">${popup.popup_testo}</div>` : ''}
      <div style="background:rgba(255,255,255,.12);padding:16px 20px;text-align:center;margin-bottom:20px">
        <div style="font-size:9px;letter-spacing:2px;opacity:.7;margin-bottom:6px">USA IL CODICE</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:36px;font-weight:900;letter-spacing:4px">${popup.codice}</div>
        <div style="font-size:11px;margin-top:4px;color:#C17F3A;font-weight:700">${descSconto}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="copiaCodicePromo('${popup.codice}')" style="flex:1;padding:12px;background:#C17F3A;border:none;color:#fff;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:2px;cursor:pointer;font-weight:700">
          📋 COPIA CODICE
        </button>
        <button onclick="chiudiPromoPopup()" style="padding:12px 16px;background:none;border:1px solid rgba(255,255,255,.3);color:inherit;font-family:'DM Mono',monospace;font-size:10px;cursor:pointer">
          CHIUDI
        </button>
      </div>`;

    overlay.style.display = 'flex';
    sessionStorage.setItem(`popup_visto_${popup.id}`, '1');
  } catch(e) {}
}

function chiudiPromoPopup() {
  const overlay = document.getElementById('promoPopupOverlay');
  if (overlay) overlay.style.display = 'none';
}

async function copiaCodicePromo(codice) {
  try {
    await navigator.clipboard.writeText(codice);
    const btn = event.target;
    const orig = btn.textContent;
    btn.textContent = '✓ COPIATO!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  } catch(e) {}
}

function _coloreTesto(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (0.299*r + 0.587*g + 0.114*b) > 128 ? '#1a1a1a' : '#f0ece4';
}

// Avvia popup dopo 3 secondi dal caricamento
setTimeout(caricaPopupPromo, 3000);
