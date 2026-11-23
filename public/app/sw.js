// Service worker de la app: guarda la «cáscara» (HTML, CSS, JS, visor 3D, editor de etiquetas) para que se abra sin
// cobertura. Las llamadas a /api nunca se cachean: las lecturas NFC sin conexión las guarda la propia app y las sube luego.
// Las fuentes de Google se guardan la primera vez que se usan, para que las etiquetas salgan igual sin red.
const VERSION = 'rf-app-20261124a';
const FUENTES = 'rf-fuentes-1';
const CASCARA = [
  '/app/', '/app/app.css?v=20261124a', '/app/comun.js?v=20261124a', '/app/visitas.js?v=20261124a', '/app/nfc.js?v=20261124a',
  '/app/p21.js?v=20261124a', '/app/etiquetas.js?v=20261124a', '/app/main.js?v=20261124a', '/js/kit-video.js?v=20261124a',
  '/app/etq-render.js?v=20261124a', '/app/etq-barcode.js?v=20261124a', '/app/etq-barcode-tablas.js?v=20261124a', '/app/etq-xlsx.js?v=20261124a',
  '/vendor/qrcode-generator/qrcode.js', '/app/rolefigz-logo.png',
  '/vendor/model-viewer.min.js', '/app/manifest.webmanifest', '/app/icon-192.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CASCARA)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('rf-app-') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // fuentes de Google: lo guardado primero (no cambian), si no, la red
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FUENTES).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok || r.type === 'opaque') c.put(e.request, r.clone());
      return r;
    }))));
    return;
  }
  if (u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // red primero (siempre la última versión); sin red, lo guardado
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && (u.pathname.startsWith('/app/') || u.pathname.startsWith('/vendor/') || u.pathname.startsWith('/js/'))) {
      const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia));
    }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: u.pathname === '/app/' || u.pathname === '/app' })));
});
