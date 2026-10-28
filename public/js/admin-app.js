document.addEventListener('DOMContentLoaded', async () => {
  if (!verificaToken()) { window.location.href = '/index.html'; return; }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.rol !== 'admin' && payload.rol !== 'circuiti') { window.location.href = '/index.html'; return; }
    utente = payload;
  } catch(e) { window.location.href = '/index.html'; return; }

  // Accesso limitato: solo la sezione "Circuiti 3D", il resto del menu resta nascosto.
  if (utente.rol === 'circuiti') {
    document.querySelectorAll('.adm-nav > .adm-group').forEach(g => { if (g.id !== 'admGroupCircuiti') g.remove(); });
    document.getElementById('admItemPanoramica')?.remove();
    await verificaAPI();
    adminTab('circuiti_ordini');
    setInterval(verificaToken, 5 * 60 * 1000);
    const guard = document.getElementById('adminGuard');
    if (guard) guard.style.display = 'none';
    document.documentElement.style.display = '';
    return;
  }

  await verificaAPI();
  await caricaCategorie();
  adminTab('panoramica');
  setInterval(verificaToken, 5 * 60 * 1000);
  verificaNonLettiAdmin();
  setInterval(verificaNonLettiAdmin, 20000);
  verificaNonLettiAdminBenchys();
  setInterval(verificaNonLettiAdminBenchys, 30000);
  const guard = document.getElementById('adminGuard');
  if (guard) guard.style.display = 'none';
  document.documentElement.style.display = '';
});

function verificaAPI() {
  return fetch(`${API}/productos?limit=1`)
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
