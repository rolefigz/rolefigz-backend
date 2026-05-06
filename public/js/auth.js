let emailAttesaVerifica  = '';
let emailAttesaRecupero  = '';

function apriAuth(tab) {
  document.getElementById('authModal').classList.add('on');
  cambiaTabAuth(tab);
}

function chiudiModalAuth() {
  document.getElementById('authModal').classList.remove('on');
  cambiaTabAuth('login');
}

function cambiaTabAuth(tab) {
  document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(tab === 'login' ? 'tabLogin' : 'tabRegister').classList.add('active');
  document.getElementById(tab === 'login' ? 'panelLogin' : 'panelRegister').classList.add('active');
  const titleEl = document.querySelector('#authModal .modal-title');
  if (titleEl) titleEl.textContent = 'ACCESSO';
  const tabs = document.getElementById('authTabs');
  if (tabs) tabs.style.display = '';
}

function alternaMostraPassword(inputId, iconId) {
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

function _impostaPannelloModale(panelId, titolo) {
  document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(panelId).classList.add('active');
  const titleEl = document.querySelector('#authModal .modal-title');
  if (titleEl) titleEl.textContent = titolo;
  const tabs = document.getElementById('authTabs');
  if (tabs) tabs.style.display = 'none';
}

async function accedi() {
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
        emailAttesaVerifica = data.email;
        document.getElementById('authModal').classList.add('on');
        mostraPannelloVerifica(data.email);
        showMsg('verificaMsg', '✅ Codice inviato! Controlla la tua email.', 'ok');
        return;
      }
      throw new Error(data.error || 'Errore');
    }
    token = data.token;
    localStorage.setItem('rfToken', token);
    utente = data.usuario;
    impostaSessione();
    chiudiModalAuth();
    if (utente.rol === 'admin') { window.location.href = '/admin.html'; return; }
    else mostraVista('tienda');
  } catch(e) {
    showMsg('loginMsg', e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = t('auth_login');
  }
}

async function registrati() {
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
    emailAttesaVerifica = email;
    mostraPannelloVerifica(email);
  } catch(e) {
    showMsg('registerMsg', e.message, 'err');
    btn.disabled = false;
    btn.textContent = t('auth_register_btn');
  }
}

function mostraPannelloVerifica(email) {
  _impostaPannelloModale('panelVerifica', 'VERIFICA EMAIL');
  const el = document.getElementById('emailVerifica');
  if (el) el.textContent = email;
  const input = document.getElementById('codigoInput');
  if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
}

async function verificaCodice() {
  const codice = document.getElementById('codigoInput').value.trim();
  const email  = emailAttesaVerifica;
  if (!codice || codice.length !== 6) {
    showMsg('verificaMsg', 'Inserisci il codice a 6 cifre', 'err'); return;
  }
  const btn = document.getElementById('verificarBtn');
  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/auth/verificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, codigo: codice })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('rfToken', token);
    utente = data.usuario;
    impostaSessione(utente);
    chiudiModalAuth();
  } catch(e) {
    showMsg('verificaMsg', e.message, 'err');
    btn.disabled = false; btn.textContent = 'VERIFICA E ACCEDI';
  }
}

// ── RECUPERO PASSWORD ────────────────────────────────────────────────────────

function mostraRecupera() {
  _impostaPannelloModale('panelRecupera', 'RECUPERA PASSWORD');
  const el = document.getElementById('recuperaEmail');
  if (el) { el.value = ''; setTimeout(() => el.focus(), 100); }
}

async function inviaRecupera() {
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
    emailAttesaRecupero = email;
    _impostaPannelloModale('panelResetPass', 'NUOVA PASSWORD');
    const el = document.getElementById('emailReset');
    if (el) el.textContent = email;
    const input = document.getElementById('resetCodigo');
    if (input) { input.value = ''; setTimeout(() => input.focus(), 100); }
  } catch(e) {
    showMsg('recuperaMsg', e.message, 'err');
    btn.disabled = false; btn.textContent = 'INVIA CODICE';
  }
}

async function reimpostaPassword() {
  const codice    = document.getElementById('resetCodigo').value.trim();
  const nuovaPass = document.getElementById('resetPass').value;
  if (!codice || codice.length !== 6) { showMsg('resetMsg', 'Inserisci il codice a 6 cifre', 'err'); return; }
  if (!nuovaPass || nuovaPass.length < 6) { showMsg('resetMsg', 'La password deve avere almeno 6 caratteri', 'err'); return; }
  const btn = document.getElementById('resetBtn');
  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAttesaRecupero, codigo: codice, nuevaPassword: nuovaPass })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    showMsg('resetMsg', '✅ Password aggiornata. Ora puoi accedere.', 'ok');
    setTimeout(() => cambiaTabAuth('login'), 1800);
  } catch(e) {
    showMsg('resetMsg', e.message, 'err');
    btn.disabled = false; btn.textContent = 'REIMPOSTA PASSWORD';
  }
}

// ── GOOGLE SIGN-IN ───────────────────────────────────────────────────────────

async function inizializzaGoogle() {
  try {
    const r = await fetch(`${API}/auth/google-config`);
    const { clientId } = await r.json();
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      google.accounts.id.initialize({
        client_id:   clientId,
        callback:    handleGoogleCredential,
        auto_select: false,
      });
      const opzioniBtn = { theme: 'outline', size: 'large', width: 340, shape: 'rectangular', logo_alignment: 'left' };
      const bl = document.getElementById('googleBtnLogin');
      if (bl) google.accounts.id.renderButton(bl, { ...opzioniBtn, text: 'signin_with' });
      const br = document.getElementById('googleBtnRegister');
      if (br) google.accounts.id.renderButton(br, { ...opzioniBtn, text: 'signup_with' });
    };
    document.head.appendChild(script);
  } catch(e) { /* Google non disponibile, nessuna azione */ }
}

async function handleGoogleCredential(response) {
  try {
    // Estrai foto profilo dal JWT Google (lato client, non segreto)
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      if (payload.picture) localStorage.setItem('rfFoto', payload.picture);
    } catch {}

    const r = await fetch(`${API}/auth/google`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ credential: response.credential })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('rfToken', token);
    utente = data.usuario;
    impostaSessione();
    chiudiModalAuth();
    if (utente.rol === 'admin') { window.location.href = '/admin.html'; return; }
    mostraVista('tienda');
  } catch(e) {
    showMsg('loginMsg',    e.message, 'err');
    showMsg('registerMsg', e.message, 'err');
  }
}

// ── SESSIONE ─────────────────────────────────────────────────────────────────

function _impostaVisibilitaFabChat(visibile) {
  const fab = document.getElementById('chatFab');
  if (fab) fab.classList.toggle('visible', visibile);
  if (visibile) avviaPollingFab();
  else { fermaPollingFab(); fermaPollingChat(); }
}

function impostaSessione() {
  document.getElementById('loginBtn').style.display     = 'none';
  document.getElementById('logoutBtn').style.display    = 'block';
  document.getElementById('headerLoginBtn').style.display = 'none';
  document.getElementById('perfilBtn').style.display    = 'block';
  document.getElementById('adminBtn').style.display     = utente.rol === 'admin' ? 'block' : 'none';

  // Avatar header
  const wrap = document.getElementById('avatarWrap');
  if (wrap) wrap.style.display = 'block';
  const iniziale = document.getElementById('avatarIniziale');
  if (iniziale) iniziale.textContent = (utente.nombre || '?').charAt(0).toUpperCase();
  const foto = document.getElementById('avatarFoto');
  const fotoUrl = utente.foto || localStorage.getItem('rfFoto');
  if (foto && fotoUrl) { foto.src = fotoUrl; foto.style.display = 'block'; if (iniziale) iniziale.style.display = 'none'; }
  setTxt('ddNome',  utente.nombre || '');
  setTxt('ddEmail', utente.email  || '');

  setSd('authDot', 'ok');
  setTxt('authStatus', `${t(utente.rol === 'admin' ? 'status_admin' : 'status_client')}: ${utente.nombre}`);
  const el = document.getElementById('perfilAvatar');
  if (el) el.textContent = (utente.nombre || '?').charAt(0).toUpperCase();
  setTxt('perfilNombre', utente.nombre || '');
  setTxt('perfilEmail',  utente.email  || '');
  document.querySelectorAll('[onclick*="apriAuth"]').forEach(el => { el.style.display = 'none'; });
  if (utente.rol !== 'admin') _impostaVisibilitaFabChat(true);
  if (utente.rol === 'admin') {
    const bar = document.getElementById('statusBar');
    if (bar) bar.style.display = 'flex';
  }
}

function toggleDropdownProfilo(e) {
  e.stopPropagation();
  document.getElementById('avatarDropdown').classList.toggle('open');
}
function chiudiDropdownProfilo() {
  document.getElementById('avatarDropdown')?.classList.remove('open');
}
document.addEventListener('click', chiudiDropdownProfilo);

function disconnetti() {
  token = null;
  utente = null;
  localStorage.removeItem('rfToken');
  localStorage.removeItem('rfFoto');
  const wrap = document.getElementById('avatarWrap');
  if (wrap) wrap.style.display = 'none';
  chiudiDropdownProfilo();
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
    document.querySelectorAll('[onclick*="apriAuth"]').forEach(el => { el.style.display = ''; });
    _impostaVisibilitaFabChat(false);
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) chatPanel.classList.remove('on');
    const bar = document.getElementById('statusBar');
    if (bar) bar.style.display = 'none';
    mostraVista('tienda');
  }
}

function verificaToken() {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) { disconnetti(); return false; }
    return true;
  } catch(e) { disconnetti(); return false; }
}
