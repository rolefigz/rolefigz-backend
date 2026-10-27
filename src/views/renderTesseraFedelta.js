// Pagina pubblica della tessera fedeltà: la apre il cliente scansionando la
// sua tessera fisica NFC (programmata a mano con l'URL /fedelta/<codice>).
// Nessun login: il codice stesso (es. RF-9F3A21C0) fa da chiave.

function escHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderTesseraFedelta({ cliente, timbriPerPremio, valorePremio }) {
  const nome = cliente.nombre ? escHtml(cliente.nombre) : "Ciao!";
  const pieni = cliente.timbri_attuali;
  const dots = Array.from({ length: timbriPerPremio }, (_, i) =>
    `<div class="t-dot ${i < pieni ? 'is-pieno' : ''}">${i < pieni ? '<iconify-icon icon="mdi:check-bold" width="20"></iconify-icon>' : ''}</div>`
  ).join("");

  const premi = cliente.premi_disponibili;
  const premioBlock = premi > 0
    ? `<div class="t-premio">
         <iconify-icon icon="mdi:gift-outline" width="28"></iconify-icon>
         <div>
           <strong>${premi} premio${premi > 1 ? 'i' : ''} disponibil${premi > 1 ? 'i' : ''}</strong>
           <span>-€${valorePremio} sul tuo prossimo ordine, senza minimo d'acquisto. Mostra questa pagina in negozio.</span>
         </div>
       </div>`
    : `<p class="t-hint">Ancora ${timbriPerPremio - pieni} ordine${timbriPerPremio - pieni === 1 ? '' : 'i'} da almeno 100€ e sblocchi un premio di €${valorePremio} senza minimo.</p>`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Tessera fedeltà · RoleFigz</title>
<meta name="robots" content="noindex, nofollow"/>
<link rel="icon" type="image/png" href="/assets/LogoSfondoNero.png"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap"/>
<link rel="stylesheet" href="/css/v2-tokens.css"/>
<script src="/js/iconify-lite.js"></script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:28px 16px}
  .t-wrap{width:100%;max-width:420px}
  .t-logo{display:block;height:24px;margin:0 auto 22px}
  .t-card{background:var(--dark);color:#fff;border-radius:24px;padding:28px 26px;box-shadow:var(--shadow-lg);position:relative;overflow:hidden}
  .t-card::after{content:'';position:absolute;inset:0;background:radial-gradient(120% 90% at 100% 0%,rgba(242,106,27,.25),transparent 60%);pointer-events:none}
  .t-eyebrow{font-family:var(--mono);font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.5);position:relative}
  .t-nombre{font-family:var(--display);font-weight:800;font-size:30px;line-height:1.05;margin:6px 0 20px;position:relative}
  .t-dots{display:flex;gap:10px;position:relative;margin-bottom:10px}
  .t-dot{flex:1;aspect-ratio:1;border-radius:12px;border:1.5px dashed rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;color:#fff}
  .t-dot.is-pieno{background:var(--accent);border-style:solid;border-color:var(--accent)}
  .t-count{font-family:var(--mono);font-size:11px;color:rgba(255,255,255,.55);position:relative;margin-bottom:4px}
  .t-codice{font-family:var(--mono);font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.4);margin-top:18px;position:relative}
  .t-premio{margin-top:20px;background:var(--accent);border-radius:16px;padding:16px 18px;display:flex;gap:12px;align-items:flex-start}
  .t-premio strong{display:block;font-size:16px;margin-bottom:3px}
  .t-premio span{font-size:12.5px;line-height:1.5;opacity:.95}
  .t-hint{margin-top:20px;font-size:13px;color:var(--muted);text-align:center;line-height:1.6}
  .t-footer{text-align:center;margin-top:22px}
  .t-footer a{display:inline-flex;align-items:center;gap:6px;color:var(--accent2);text-decoration:none;font-size:13px;font-weight:600}
</style>
</head>
<body>
  <div class="t-wrap">
    <img class="t-logo" src="/assets/opt/logo-header.webp" alt="RoleFigz"/>
    <div class="t-card">
      <div class="t-eyebrow">Tessera fedeltà</div>
      <div class="t-nombre">${nome}</div>
      <div class="t-dots">${dots}</div>
      <div class="t-count">${pieni}/${timbriPerPremio} ordini verso il prossimo premio</div>
      <div class="t-codice">${escHtml(cliente.codice_tarjeta)}</div>
    </div>
    ${premioBlock}
    <div class="t-footer"><a href="https://wa.me/393928225406" target="_blank" rel="noopener"><iconify-icon icon="mdi:whatsapp" width="16"></iconify-icon> Scrivici su WhatsApp</a></div>
  </div>
</body>
</html>`;
}

module.exports = { renderTesseraFedelta };
