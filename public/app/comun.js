// Utilidades comunes de la app: sesión, llamadas a la API, base de datos local (IndexedDB) y avisos.
const App = (() => {
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vista = () => $('#vista');

  let token = localStorage.getItem('rfToken') || null;
  const sesion = {
    get token() { return token; },
    guardar(t) { token = t; localStorage.setItem('rfToken', t); },
    salir() { token = null; localStorage.removeItem('rfToken'); },
    // el JWT dura 7 días: si ha caducado o no es de admin, se vuelve a pedir el acceso
    valida() {
      if (!token) return false;
      try {
        const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return p.rol === 'admin' && (!p.exp || p.exp * 1000 > Date.now() + 60000);
      } catch { return false; }
    },
  };

  class ErrorApi extends Error { constructor(status, msg) { super(msg); this.status = status; } }

  async function api(ruta, { metodo = 'GET', json, form, crudo = false } = {}) {
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    let body;
    if (json !== undefined) { h['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
    else if (form) body = form;
    let r;
    try { r = await fetch(`${window.API}${ruta}`, { method: metodo, headers: h, body }); }
    catch { throw new ErrorApi(0, 'Sin conexión con rolefigz.com'); }
    if (r.status === 401 || r.status === 403) {
      const d = await r.json().catch(() => ({}));
      if (/token/i.test(d.error || '')) { sesion.salir(); location.reload(); }
      throw new ErrorApi(r.status, d.error || 'Acceso denegado');
    }
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw new ErrorApi(r.status, d.error || `Error ${r.status}`);
    }
    return crudo ? r : r.json();
  }

  // ── IndexedDB: visitas (con fotos y logos) guardadas en el teléfono ──
  let dbp;
  function db() {
    dbp = dbp || new Promise((ok, ko) => {
      const rq = indexedDB.open('rolefigz-app', 2);
      rq.onupgradeneeded = () => {
        const d = rq.result, hay = n => d.objectStoreNames.contains(n);
        if (!hay('visitas')) d.createObjectStore('visitas', { keyPath: 'id' });
        // etiquetas: mis plantillas, historial de impresiones y fuentes propias (.ttf/.otf)
        if (!hay('plantillas')) d.createObjectStore('plantillas', { keyPath: 'nombre' });
        if (!hay('historial')) d.createObjectStore('historial', { keyPath: 'id' });
        if (!hay('fuentes')) d.createObjectStore('fuentes', { keyPath: 'familia' });
      };
      rq.onsuccess = () => ok(rq.result);
      rq.onerror = () => ko(rq.error);
    });
    return dbp;
  }
  async function tx(almacen, modo, fn) {
    const d = await db();
    return new Promise((ok, ko) => {
      const t = d.transaction(almacen, modo), s = t.objectStore(almacen);
      const rq = fn(s);
      t.oncomplete = () => ok(rq && rq.result);
      t.onerror = () => ko(t.error);
    });
  }
  const local = {
    todas: a => tx(a, 'readonly', s => s.getAll()),
    una: (a, id) => tx(a, 'readonly', s => s.get(id)),
    guardar: (a, v) => tx(a, 'readwrite', s => s.put(v)),
    borrar: (a, id) => tx(a, 'readwrite', s => s.delete(id)),
  };

  let tAviso;
  function aviso(texto, err = false, ms = 3200) {
    const e = $('#aviso');
    e.textContent = texto; e.className = 'aviso' + (err ? ' err' : ''); e.hidden = false;
    clearTimeout(tAviso); tAviso = setTimeout(() => { e.hidden = true; }, ms);
  }

  // Compartir (WhatsApp, Instagram…) desde el teléfono; si no se puede, se descarga.
  async function compartir(archivos, titulo = '') {
    if (navigator.canShare && navigator.canShare({ files: archivos })) {
      try { await navigator.share({ files: archivos, title: titulo }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    for (const f of archivos) descargar(f, f.name);
  }
  function descargar(blob, nombre) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  }

  const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  const fecha = d => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function vibrar(p) { try { navigator.vibrate && navigator.vibrate(p); } catch {} }

  return { $, esc, vista, sesion, api, ErrorApi, local, aviso, compartir, descargar, slug, fecha, id, vibrar };
})();
