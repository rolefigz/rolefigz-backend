let emailPendienteVerificacion = '';
let emailPendienteRecupera     = '';

function openAuth(tab) {
  document.getElementById('authModal').classList.add('on');
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('on');
  switchAuthTab('login');
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(tab === 'login' ? 'tabLogin' : 'tabRegister').classList.add('active');
  document.getElementById(tab === 'login' ? 'panelLogin' : 'panelRegister').classList.add('active');
  const titleEl = document.querySelector('#authModal .modal-title');
  if (titleEl) titleEl.textContent = 'ACCESSO';
  const tabs = document.getElementById('authTabs');
  if (tabs) tabs.style.display = '';
}

function togglePass(inputId, iconId) {
  const el   = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!el) return;
  if (el.type === 'password') {
    el.type = 'text';
    if (icon) icon.setAttribute('icon', 'mdi:eye');
  } else {
    el.type = 'password';
    if (icon) icon.setAttribute('icon', 'mdi:eye-off');
  }
}

function _setModalPanel(panelId, title) {
  document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(panelId).classList.add('active');
  const titleEl = document.querySelector('#authModal .modal-title');
  if (titleEl) titleEl.textContent = title;
  const tabs = document.getElementById('authTabs');
  if (tabs) tabs.style.display = 'none';
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value;
  const pass  = document.getElementById('loginPass').value;
  const btn   = document.getElementById('loginSubmit');
  if (!email || !pass) { showMsg('loginMsg', 'Email e password obbligatori', 'err'); return; }
  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await r.json();
    if (!r.ok) {
      if (data.verificacion_pendiente) {
        emailPendienteVerificacion = data.email;
        document.getElementById('authModal').classList.add('on');
        showVerificaPanel(data.email);
        showMsg('verificaMsg', '✅ Codice inviato! Controlla la tua email.', 'ok');
        return;
      }
      throw new Error(data.error || 'Errore');
    }
    token = data.token;
    localStorage.setItem('rfToken', token);
    usuario = data.usuario;
    setLoggedIn();
    closeAuthModal();
    if (usuario.rol === 'admin') { window.location.href = '/admin.html'; return; }
    else showView('tienda');
  } catch(e) {
    showMsg('loginMsg', e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = t('auth_login');
  }
}

async function doRegister() {
  const nome  = document.getElementById('regNombre').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPassConfirm').value;
  const btn   = document.getElementById('registerSubmit');
  if (!nome || !email || !pass || !pass2) {
    showMsg('registerMsg', 'Tutti i campi sono obbligatori', 'err'); return;
  }
  if (pass !== pass2) {
    showMsg('registerMsg', 'Le password non coincidono', 'err'); return;
  }
  if (pass.length < 6) {
    showMsg('registerMsg', 'La password deve avere almeno 6 caratteri', 'err'); return;
  }
  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nome, email, password: pass })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    emailPendienteVerificacion = email;
    showVerificaPanel(email);
  } catch(e) {
    showMsg('registerMsg', e.message, 'err');
    btn.disabled = false;
    btn.textContent = t('auth_register_btn');
  }
}

function showVerificaPanel(email) {
  _setModalPanel('panelVerifica', 'VERIFICA EMAIL');
  const el = document.getElementById('emailVerifica');
  if (el) el.textContent = email;
  const input = document.getElementById('codigoInput');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
}

async function doVerificar() {
  const codigo = document.getElementById('codigoInput').value.trim();
  const email  = emailPendienteVerificacion;
  if (!codigo || codigo.length !== 6) {
    showMsg('verificaMsg', 'Inserisci il codice a 6 cifre', 'err'); return;
  }
  const btn = document.getElementById('verificarBtn');
  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/auth/verificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, codigo })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('rfToken', token);
    usuario = data.usuario;
    setLoggedIn(usuario);
    closeAuthModal();
  } catch(e) {
    showMsg('verificaMsg', e.message, 'err');
    btn.disabled = false; btn.textContent = 'VERIFICA E ACCEDI';
  }
}

// ── RECUPERA PASSWORD ────────────────────────────────────────────────────────

function showRecupera() {
  _setModalPanel('panelRecupera', 'RECUPERA PASSWORD');
  const el = document.getElementById('recuperaEmail');
  if (el) { el.value = ''; setTimeout(() => el.focus(), 100); }
}

async function enviarRecupera() {
  const email = document.getElementById('recuperaEmail').value.trim();
  if (!email) { showMsg('recuperaMsg', 'Inserisci la tua email', 'err'); return; }
  const btn = document.getElementById('recuperaBtn');
  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/auth/recuperar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    emailPendienteRecupera = email;
    _setModalPanel('panelResetPass', 'NUOVA PASSWORD');
    const el = document.getElementById('emailReset');
    if (el) el.textContent = email;
    const input = document.getElementById('resetCodigo');
    if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
  } catch(e) {
    showMsg('recuperaMsg', e.message, 'err');
    btn.disabled = false; btn.textContent = 'INVIA CODICE';
  }
}

async function doResetPass() {
  const codigo  = document.getElementById('resetCodigo').value.trim();
  const newPass = document.getElementById('resetPass').value;
  if (!codigo || codigo.length !== 6) { showMsg('resetMsg', 'Inserisci il codice a 6 cifre', 'err'); return; }
  if (!newPass || newPass.length < 6) { showMsg('resetMsg', 'La password deve avere almeno 6 caratteri', 'err'); return; }
  const btn = document.getElementById('resetBtn');
  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailPendienteRecupera, codigo, nuevaPassword: newPass })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('resetMsg', '✅ Password aggiornata. Ora puoi accedere.', 'ok');
    setTimeout(() => switchAuthTab('login'), 1800);
  } catch(e) {
    showMsg('resetMsg', e.message, 'err');
    btn.disabled = false; btn.textContent = 'REIMPOSTA PASSWORD';
  }
}

// ── SESSIONE ─────────────────────────────────────────────────────────────────

function _setChatFabVisible(visible) {
  const fab = document.getElementById('chatFab');
  if (fab) fab.classList.toggle('visible', visible);
  if (visible) startFabPolling();
  else { stopFabPolling(); stopChatPoll(); }
}

function setLoggedIn() {
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'block';
  const hLogin = document.getElementById('headerLoginBtn');
  const hLogout = document.getElementById('headerLogoutBtn');
  if (hLogin)  hLogin.style.display  = 'none';
  if (hLogout) hLogout.style.display = 'block';
  document.getElementById('perfilBtn').style.display = 'block';
  document.getElementById('adminBtn').style.display = usuario.rol === 'admin' ? 'block' : 'none';
  setSd('authDot', 'ok');
  setTxt('authStatus', `${t(usuario.rol === 'admin' ? 'status_admin' : 'status_client')}: ${usuario.nombre}`);
  const el = document.getElementById('perfilAvatar');
  if (el) el.textContent = (usuario.nombre || '?').charAt(0).toUpperCase();
  setTxt('perfilNombre', usuario.nombre || '');
  setTxt('perfilEmail', usuario.email || '');
  document.querySelectorAll('[onclick*="openAuth"]').forEach(el => { el.style.display = 'none'; });
  if (usuario.rol !== 'admin') _setChatFabVisible(true);
  if (usuario.rol === 'admin') {
    const bar = document.getElementById('statusBar');
    if (bar) bar.style.display = 'flex';
  }
}

function doLogout() {
  token = null;
  usuario = null;
  localStorage.removeItem('rfToken');
  if (window.location.pathname.includes('admin')) {
    window.location.href = '/index.html';
  } else {
    document.getElementById('loginBtn').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'none';
    const hLogin = document.getElementById('headerLoginBtn');
    const hLogout = document.getElementById('headerLogoutBtn');
    if (hLogin)  hLogin.style.display  = 'block';
    if (hLogout) hLogout.style.display = 'none';
    document.getElementById('perfilBtn').style.display = 'none';
    document.getElementById('adminBtn').style.display = 'none';
    setSd('authDot', '');
    setTxt('authStatus', t('status_no_session'));
    document.querySelectorAll('[onclick*="openAuth"]').forEach(el => { el.style.display = ''; });
    _setChatFabVisible(false);
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) chatPanel.classList.remove('on');
    const bar = document.getElementById('statusBar');
    if (bar) bar.style.display = 'none';
    showView('tienda');
  }
}

function checkTokenValidity() {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) { doLogout(); return false; }
    return true;
  } catch(e) { doLogout(); return false; }
}
