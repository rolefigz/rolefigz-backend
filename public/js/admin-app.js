document.addEventListener('DOMContentLoaded', async () => {
  if (!checkTokenValidity()) { window.location.href = '/index.html'; return; }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.rol !== 'admin') { window.location.href = '/index.html'; return; }
    usuario = payload;
  } catch(e) { window.location.href = '/index.html'; return; }
  await checkAPI();
  await loadCats();
  adminTab('ordenes', document.querySelector('.admin-menu-item'));
  setInterval(checkTokenValidity, 5 * 60 * 1000);
  checkAdminUnread();
  setInterval(checkAdminUnread, 20000);
  const guard = document.getElementById('adminGuard');
  if (guard) guard.style.display = 'none';
  document.documentElement.style.display = '';
});

function checkAPI() {
  return fetch('http://localhost:3000/')
    .then(r => { if (r.ok) { setSd('apiDot', 'ok'); setTxt('apiStatus', 'API CONNESSA'); } })
    .catch(() => { setSd('apiDot', 'err'); setTxt('apiStatus', 'API OFFLINE'); });
}

function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (el) { el.className = `msg ${type}`; el.textContent = text; }
}

function setTxt(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setSd(id, cls) {
  const el = document.getElementById(id);
  if (el) el.className = `sd ${cls}`;
}
