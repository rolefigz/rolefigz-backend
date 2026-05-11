function stelline(n, size) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star${i < n ? ' on' : ''}" style="${size ? 'font-size:' + size + 'px' : ''}">★</span>`
  ).join('');
}

async function caricaRecensioni(prodottoId) {
  const listaEl = document.getElementById('resenas-list');
  const formEl  = document.getElementById('resenas-form-wrap');
  if (!listaEl) return;

  try {
    const r = await fetch(`${API}/resenas/${prodottoId}`);
    if (!r.ok) throw new Error('Errore nel caricamento delle recensioni');
    const data = await r.json();
    renderRecensioni(data, listaEl);
  } catch(e) {
    listaEl.innerHTML = `<div class="resenas-empty">Impossibile caricare le recensioni.</div>`;
  }

  if (!formEl) return;
  if (!token) {
    formEl.innerHTML = '<div class="resena-aviso">Accedi per lasciare una recensione.</div>';
    return;
  }
  try {
    const r2 = await fetch(`${API}/resenas/puedo/${prodottoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r2.ok) throw new Error();
    const puo = await r2.json();
    renderFormRecensione(prodottoId, puo, formEl);
  } catch {
    formEl.innerHTML = '';
  }
}

function renderRecensioni({ resenas, promedio, total }, listaEl) {
  if (!total) {
    listaEl.innerHTML = '<div class="resenas-empty">Ancora nessuna recensione. Acquista e sii il primo a recensire!</div>';
    return;
  }

  const filled = Math.round(promedio);
  const stats = `
    <div class="resenas-stats">
      <div class="resenas-avg">${promedio}</div>
      <div>
        <div>${stelline(filled, 20)}</div>
        <div class="resenas-count">${total} RECENSIONE${total === 1 ? '' : 'I'} VERIFICATA${total === 1 ? '' : 'E'}</div>
      </div>
    </div>`;

  const cards = resenas.map(r => `
    <div class="resena-card">
      <div class="resena-header">
        <div>${stelline(r.puntuacion, 15)}</div>
        ${r.compra_verificada ? '<div class="resena-badge">✓ COMPRA VERIFICADA</div>' : ''}
      </div>
      ${r.comentario ? `<div class="resena-texto">"${r.comentario}"</div>` : ''}
      <div class="resena-autor">
        <strong>${r.nombre_autor || (r.Utente ? r.Utente.nombre : 'Cliente')}</strong>
        <span>${new Date(r.createdAt).toLocaleDateString(localeDate())}</span>
      </div>
    </div>`).join('');

  listaEl.innerHTML = stats + `<div class="resenas-cards">${cards}</div>`;
}

function renderFormRecensione(prodottoId, puo, formEl) {
  if (!puo.puedeResenar) {
    const messaggi = {
      ya_reseno:   'Hai già lasciato una recensione per questo prodotto.',
      no_comprado: 'Solo chi ha acquistato questo prodotto può lasciare una recensione.'
    };
    formEl.innerHTML = `<div class="resena-aviso">${messaggi[puo.motivo] || ''}</div>`;
    return;
  }

  formEl.innerHTML = `
    <div class="resena-form-title">LASCIA UNA RECENSIONE</div>
    <div class="star-input" id="starInput">
      <span class="star-pick" onclick="selezionaStella(1)">★</span>
      <span class="star-pick" onclick="selezionaStella(2)">★</span>
      <span class="star-pick" onclick="selezionaStella(3)">★</span>
      <span class="star-pick" onclick="selezionaStella(4)">★</span>
      <span class="star-pick" onclick="selezionaStella(5)">★</span>
    </div>
    <input type="hidden" id="resenaPuntuacion" value="0"/>
    <div class="field" style="margin-top:16px">
      <label>Commento</label>
      <textarea id="resenaComentario" placeholder="Descrivi la tua esperienza con questo prodotto..." rows="3"></textarea>
    </div>
    <button class="add-cart-btn" style="width:100%;margin-top:8px;height:48px" onclick="inviaRecensione(${prodottoId})">INVIA RECENSIONE</button>
    <div id="resenaMsg"></div>`;
}

function selezionaStella(n) {
  document.getElementById('resenaPuntuacion').value = n;
  document.querySelectorAll('#starInput .star-pick').forEach((s, i) => {
    s.classList.toggle('on', i < n);
  });
}

async function inviaRecensione(prodottoId) {
  const voto      = parseInt(document.getElementById('resenaPuntuacion').value);
  const commento  = document.getElementById('resenaComentario').value.trim();
  if (!voto) { showMsg('resenaMsg', 'Seleziona una valutazione', 'err'); return; }

  try {
    const r = await fetch(`${API}/resenas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ puntuacion: voto, comentario: commento, producto_id: prodottoId })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    const formEl = document.getElementById('resenas-form-wrap');
    if (formEl) formEl.innerHTML = '<div class="resena-aviso">✅ Grazie! La tua recensione è in attesa di approvazione.</div>';
  } catch(e) { showMsg('resenaMsg', e.message, 'err'); }
}

async function caricaRecensioniInEvidenza() {
  const sec = document.getElementById('resenasDestacadas');
  if (!sec) return;
  try {
    const r = await fetch(`${API}/resenas/destacadas`);
    if (!r.ok) throw new Error();
    const recensioni = await r.json();
    if (!recensioni.length) { sec.style.display = 'none'; return; }

    sec.querySelector('.resenas-dest-grid').innerHTML = recensioni.map(r => `
      <div class="resena-dest-card">
        <div class="resena-dest-stars">${stelline(r.puntuacion, 16)}</div>
        <div class="resena-dest-texto">"${r.comentario || ''}"</div>
        <div class="resena-dest-footer">
          <div class="resena-dest-autor">${r.nombre_autor || (r.Utente ? r.Utente.nombre : 'Cliente')}</div>
          <div class="resena-dest-prod">${r.Prodotto ? r.Prodotto.nombre : ''}</div>
        </div>
      </div>`).join('');
  } catch { sec.style.display = 'none'; }
}
