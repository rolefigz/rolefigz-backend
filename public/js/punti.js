let benchySaldo = 0;
let benchyConfig = { spedizione_minimo: 150, sconto_per_100: 1 };
let benchyTransazioni = [];

async function caricaBenchys() {
  if (!token) return;
  try {
    const r = await fetch(`${API}/punti`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return;
    const data = await r.json();
    benchySaldo     = data.saldo;
    benchyConfig    = data.config;
    benchyTransazioni = data.transazioni;
    aggiornaBannerBenchys();
  } catch(e) {}
}

function aggiornaBannerBenchys() {
  const banner = document.getElementById('benchyBanner');
  if (banner && utente) {
    banner.textContent = `🚢 ${benchySaldo} Benchys`;
    banner.style.display = '';
  }
}

// ── TAB BENCHYS nel profilo ───────────────────────────────────────────────────
function renderTabBenchys() {
  const TIPO_LABEL = {
    acquisto:          '🛒 Acquisto',
    recensione:        '⭐ Recensione approvata',
    instagram_follow:  '📸 Follow Instagram',
    registrazione:     '🎉 Benvenuto',
    sconto:            '💸 Sconto riscattato',
    spedizione_gratuita: '📦 Spedizione gratuita',
  };
  const STATO_BADGE = {
    approvato:   `<span class="pill" style="background:var(--green);color:#fff">APPROVATO</span>`,
    in_attesa:   `<span class="pill" style="background:var(--accent);color:#fff">IN ATTESA</span>`,
    rifiutato:   `<span class="pill" style="background:var(--muted);color:#fff">RIFIUTATO</span>`,
  };

  const haFollowPending = benchyTransazioni.some(
    t => t.tipo === 'instagram_follow' && ['approvato','in_attesa'].includes(t.stato)
  );

  const storico = benchyTransazioni.length
    ? benchyTransazioni.map(t => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;color:var(--dark)">${TIPO_LABEL[t.tipo] || t.tipo}</div>
            <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:2px">${t.descrizione || ''} · ${new Date(t.createdAt).toLocaleDateString('it-IT')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            ${STATO_BADGE[t.stato] || ''}
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;color:${t.punti > 0 ? 'var(--green)' : 'var(--accent)'}">
              ${t.punti > 0 ? '+' : ''}${t.punti}
            </div>
          </div>
        </div>`).join('')
    : `<div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--muted);padding:20px 0">Nessuna transazione ancora.</div>`;

  return `
    <div>
      <!-- SALDO -->
      <div style="background:var(--dark);padding:28px 24px;margin-bottom:24px;display:flex;align-items:center;gap:20px">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
          <img id="benchyImg" src="/assets/benchy.png" alt="Benchy"
            style="width:100%;height:100%;object-fit:cover"
            onerror="this.outerHTML='<span style=font-size:32px>🚢</span>'"/>
        </div>
        <div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--muted);margin-bottom:4px">IL TUO SALDO</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:52px;font-weight:900;color:#fff;line-height:1">${benchySaldo}</div>
          <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--accent);letter-spacing:2px">BENCHYS 🚢</div>
        </div>
      </div>

      <!-- COME USARLI -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px">
        <div style="padding:14px;border:1px solid var(--border);background:var(--surface)">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--muted);margin-bottom:6px">SPEDIZIONE GRATIS</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:900;color:var(--dark)">150 Benchys</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:4px">= €10 di spedizione gratuita</div>
        </div>
        <div style="padding:14px;border:1px solid var(--border);background:var(--surface)">
          <div style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:2px;color:var(--muted);margin-bottom:6px">SCONTO ORDINE</div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:24px;font-weight:900;color:var(--dark)">100 Benchys</div>
          <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:4px">= €1.00 di sconto</div>
        </div>
      </div>

      <!-- GUADAGNA BENCHYS -->
      <div style="margin-bottom:24px">
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;color:var(--muted);margin-bottom:12px">GUADAGNA BENCHYS</div>
        <div style="border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;color:var(--dark)">📸 Seguici su Instagram</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:2px">@rolefigz · approvazione manuale</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;color:var(--accent)">+50</div>
              ${haFollowPending
                ? `<span class="pill" style="background:var(--muted);color:#fff;font-size:9px">GIÀ INVIATO</span>`
                : `<button class="action-btn" onclick="richiediBenchyInstagram()">HO SEGUITO</button>`}
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;color:var(--dark)">⭐ Lascia una recensione</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:2px">automatico all'approvazione</div>
            </div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;color:var(--accent)">+20</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px">
            <div>
              <div style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;color:var(--dark)">🛒 Ogni acquisto</div>
              <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--muted);margin-top:2px">1 Benchy per ogni €1 speso</div>
            </div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:900;color:var(--accent)">+1/€</div>
          </div>
        </div>
      </div>

      <!-- STORICO -->
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:3px;color:var(--muted);margin-bottom:12px">STORICO TRANSAZIONI</div>
        ${storico}
      </div>

      <div id="benchyMsg" style="margin-top:12px"></div>
    </div>`;
}

async function richiediBenchyInstagram() {
  const btn = event.target;
  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/punti/richiedi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo: 'instagram_follow' })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('benchyMsg', '✅ Richiesta inviata! Approvazione in corso.', 'ok');
    await caricaBenchys();
    tabProfilo('benchys', null);
  } catch(e) {
    showMsg('benchyMsg', e.message, 'err');
    btn.disabled = false; btn.textContent = 'HO SEGUITO';
  }
}
