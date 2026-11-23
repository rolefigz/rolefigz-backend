// Service worker de la app: guarda la «cáscara» (HTML, CSS, JS, visor 3D) para que se abra sin cobertura.
// Las llamadas a /api nunca se cachean: las lecturas NFC sin conexión las guarda la propia app y las sube luego.
const VERSION = 'rf-app-20261123a';
const CASCARA = [
  '/app/', '/app/app.css?v=20261123a', '/app/comun.js?v=20261123a', '/app/visitas.js?v=20261123a', '/app/nfc.js?v=20261123a',
  '/app/p21.js?v=20261123a', '/app/etiquetas.js?v=20261123a', '/app/main.js?v=20261123a', '/js/kit-video.js?v=20261123a',
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
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // red primero (siempre la última versión); sin red, lo guardado
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && (u.pathname.startsWith('/app/') || u.pathname.startsWith('/vendor/') || u.pathname.startsWith('/js/'))) {
      const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia));
    }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: u.pathname === '/app/' || u.pathname === '/app' })));
});
