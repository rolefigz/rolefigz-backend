document.addEventListener('DOMContentLoaded', async () => {
  if (!verificaToken()) { window.location.href = '/index.html'; return; }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.rol !== 'admin') { window.location.href = '/index.html'; return; }
    utente = payload;
  } catch(e) { window.location.href = '/index.html'; return; }
  await verificaAPI();
  await caricaCategorie();
  adminTab('ordenes', document.querySelector('.admin-menu-item'));
  setInterval(verificaToken, 5 * 60 * 1000);
  verificaNonLettiAdmin();
  setInterval(verificaNonLettiAdmin, 20000);
  const guard = document.getElementById('adminGuard');
  if (guard) guard.style.display = 'none';
  document.documentElement.style.display = '';
});

function verificaAPI() {
  return fetch('http://localhost:3000/')
    .then(r => { if (r.ok) { setSd('apiDot', 'ok'); setTxt('apiStatus', 'API CONNESSA'); } })
    .catch(() => { setSd('apiDot', 'err'); setTxt('apiStatus', 'API OFFLINE'); });
}

function showMsg(id, testo, tipo) {
  const el = document.getElementById(id);
  if (el) { el.className = `msg ${tipo}`; el.textContent = testo; }
}

function setTxt(id, testo) {
  const el = document.getElementById(id);
  if (el) el.textContent = testo;
}

function setSd(id, cls) {
  const el = document.getElementById(id);
  if (el) el.className = `sd ${cls}`;
}
