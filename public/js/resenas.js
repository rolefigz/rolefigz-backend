function estrellas(n, size) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star${i < n ? ' on' : ''}" style="${size ? 'font-size:' + size + 'px' : ''}">★</span>`
  ).join('');
}

async function loadResenas(productoId) {
  const listEl = document.getElementById('resenas-list');
  const formEl = document.getElementById('resenas-form-wrap');
  if (!listEl) return;

  try {
    const r = await fetch(`${API}/resenas/${productoId}`);
    if (!r.ok) throw new Error('Errore caricamento recensioni');
    const data = await r.json();
    renderResenas(data, listEl);
  } catch(e) {
    listEl.innerHTML = `<div class="resenas-empty">Impossibile caricare le recensioni.</div>`;
  }

  if (!formEl) return;
  if (!token) {
    formEl.innerHTML = '<div class="resena-aviso">Accedi per lasciare una recensione.</div>';
    return;
  }
  try {
    const r2 = await fetch(`${API}/resenas/puedo/${productoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r2.ok) throw new Error();
    const puede = await r2.json();
    renderFormResena(productoId, puede, formEl);
  } catch {
    formEl.innerHTML = '';
  }
}

function renderResenas({ resenas, promedio, total }, listEl) {
  if (!total) {
    listEl.innerHTML = '<div class="resenas-empty">Nessuna recensione ancora. Acquista e sii il primo a recensire!</div>';
    return;
  }

  const filled = Math.round(promedio);
  const stats = `
    <div class="resenas-stats">
      <div class="resenas-avg">${promedio}</div>
      <div>
        <div>${estrellas(filled, 20)}</div>
        <div class="resenas-count">${total} RECENSION${total === 1 ? 'E' : 'I'} VERIFICAT${total === 1 ? 'A' : 'E'}</div>
      </div>
    </div>`;

  const cards = resenas.map(r => `
    <div class="resena-card">
      <div class="resena-header">
        <div>${estrellas(r.puntuacion, 15)}</div>
        ${r.compra_verificada ? '<div class="resena-badge">✓ ACQUISTO VERIFICATO</div>' : ''}
      </div>
      ${r.comentario ? `<div class="resena-texto">"${r.comentario}"</div>` : ''}
      <div class="resena-autor">
        <strong>${r.nombre_autor || (r.Usuario ? r.Usuario.nombre : 'Cliente')}</strong>
        <span>${new Date(r.createdAt).toLocaleDateString('it-IT')}</span>
      </div>
    </div>`).join('');

  listEl.innerHTML = stats + `<div class="resenas-cards">${cards}</div>`;
}

function renderFormResena(productoId, puede, formEl) {
  if (!puede.puedeResenar) {
    const msgs = {
      ya_reseno:   'Hai già lasciato una recensione per questo prodotto.',
      no_comprado: 'Solo chi ha acquistato questo prodotto può lasciare una recensione.'
    };
    formEl.innerHTML = `<div class="resena-aviso">${msgs[puede.motivo] || ''}</div>`;
    return;
  }

  formEl.innerHTML = `
    <div class="resena-form-title">LASCIA UNA RECENSIONE</div>
    <div class="star-input" id="starInput">
      <span class="star-pick" onclick="selectStar(1)">★</span>
      <span class="star-pick" onclick="selectStar(2)">★</span>
      <span class="star-pick" onclick="selectStar(3)">★</span>
      <span class="star-pick" onclick="selectStar(4)">★</span>
      <span class="star-pick" onclick="selectStar(5)">★</span>
    </div>
    <input type="hidden" id="resenaPuntuacion" value="0"/>
    <div class="field" style="margin-top:16px">
      <label>Commento</label>
      <textarea id="resenaComentario" placeholder="Descrivi la tua esperienza con questo prodotto..." rows="3"></textarea>
    </div>
    <button class="add-cart-btn" style="width:100%;margin-top:8px;height:48px" onclick="submitResena(${productoId})">INVIA RECENSIONE</button>
    <div id="resenaMsg"></div>`;
}

function selectStar(n) {
  document.getElementById('resenaPuntuacion').value = n;
  document.querySelectorAll('#starInput .star-pick').forEach((s, i) => {
    s.classList.toggle('on', i < n);
  });
}

async function submitResena(productoId) {
  const puntuacion = parseInt(document.getElementById('resenaPuntuacion').value);
  const comentario = document.getElementById('resenaComentario').value.trim();
  if (!puntuacion) { showMsg('resenaMsg', 'Seleziona un punteggio', 'err'); return; }

  try {
    const r = await fetch(`${API}/resenas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ puntuacion, comentario, producto_id: productoId })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    const formEl = document.getElementById('resenas-form-wrap');
    if (formEl) formEl.innerHTML = '<div class="resena-aviso">✅ Grazie! La tua recensione è in attesa di approvazione.</div>';
  } catch(e) { showMsg('resenaMsg', e.message, 'err'); }
}

async function loadResenasDestacadas() {
  const sec = document.getElementById('resenasDestacadas');
  if (!sec) return;
  try {
    const r = await fetch(`${API}/resenas/destacadas`);
    if (!r.ok) throw new Error();
    const resenas = await r.json();
    if (!resenas.length) { sec.style.display = 'none'; return; }

    sec.querySelector('.resenas-dest-grid').innerHTML = resenas.map(r => `
      <div class="resena-dest-card">
        <div class="resena-dest-stars">${estrellas(r.puntuacion, 16)}</div>
        <div class="resena-dest-texto">"${r.comentario || ''}"</div>
        <div class="resena-dest-footer">
          <div class="resena-dest-autor">${r.nombre_autor || (r.Usuario ? r.Usuario.nombre : 'Cliente')}</div>
          <div class="resena-dest-prod">${r.Producto ? r.Producto.nombre : ''}</div>
        </div>
      </div>`).join('');
  } catch { sec.style.display = 'none'; }
}
