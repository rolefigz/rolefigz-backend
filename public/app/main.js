// Arranque: acceso de admin, pestañas y estado de la conexión.
const Main = (() => {
  const { $, vista, sesion, api, aviso } = App;
  const TABS = { visitas: () => Visitas.lista(), nfc: o => Nfc.lista(o), etiquetas: o => Etiquetas.mostrar(o) };

  function ir(tab, opciones = {}) {
    if (tab !== 'nfc') Nfc.pararEscaneo();
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    localStorage.setItem('app-tab', tab);
    window.scrollTo(0, 0);
    TABS[tab](opciones);
  }

  function login() {
    $('#tabs').hidden = true;
    vista().innerHTML = `
      <div class="login">
        <h1 style="margin-bottom:4px">Hola, Oskar</h1>
        <p class="mono" style="margin:0 0 18px">Entra con tu cuenta de admin de rolefigz.com</p>
        <form id="fLogin">
          <label class="campo"><span>Email</span><input id="lEmail" type="email" autocomplete="username" required/></label>
          <label class="campo"><span>Contraseña</span><input id="lPass" type="password" autocomplete="current-password" required/></label>
          <button class="btn prim ancho">Entrar</button>
          <div class="estado" id="lEstado"></div>
        </form>
      </div>`;
    $('#fLogin').onsubmit = async e => {
      e.preventDefault();
      const est = $('#lEstado'); est.textContent = 'Entrando…'; est.classList.remove('err');
      try {
        const r = await api('/auth/login', { metodo: 'POST', json: { email: $('#lEmail').value.trim(), password: $('#lPass').value } });
        if (r.usuario?.rol !== 'admin') throw new Error('Esta cuenta no es de admin.');
        sesion.guardar(r.token);
        arrancar();
      } catch (er) { est.textContent = er.message; est.classList.add('err'); }
    };
  }

  function arrancar() {
    if (!sesion.valida()) return login();
    $('#tabs').hidden = false;
    $('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) ir(b.dataset.tab); };
    const inicial = new URLSearchParams(location.search).get('tab') || localStorage.getItem('app-tab') || 'visitas';
    ir(TABS[inicial] ? inicial : 'visitas');
  }

  const red = () => { $('#estadoRed').hidden = navigator.onLine; };
  window.addEventListener('online', red); window.addEventListener('offline', red); red();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});   // que el móvil no borre las visitas
  window.addEventListener('unhandledrejection', e => aviso(e.reason?.message || 'Error inesperado', true));

  arrancar();
  return { ir };
})();
