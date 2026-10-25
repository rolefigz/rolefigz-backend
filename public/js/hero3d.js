// Hero 3D — il logo RoleFigz viene "stampato" layer per layer su un piano di stampa,
// poi resta interattivo (trascina per ruotare, segue il puntatore).
// Prestazioni: Three.js si scarica solo a pagina già visibile, la geometria è leggera
// e si disegna un fotogramma solo quando qualcosa cambia (niente rendering continuo).
// Se all'ingresso c'è la scelta privati/aziende, il logo si stampa lì e poi passa
// nell'hero del negozio (stesso canvas, la stampa continua).

const heroHost = document.getElementById('hero3d');
const gateHost = document.documentElement.classList.contains('gate-open') ? document.getElementById('gate3d') : null;
let host = gateHost || heroHost;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = window.matchMedia('(pointer: coarse)').matches;

function fallback() {
  [heroHost, gateHost].forEach(h => {
    if (!h) return;
    h.classList.add('is-fallback');
    h.innerHTML = '<img src="/assets/opt/logo-white.webp" alt="" aria-hidden="true">';
  });
}

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

// si parte quando il browser è libero: prima testo, immagini e animazioni della pagina
function quandoLibero(fn) {
  const go = () => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 1200 }) : setTimeout(fn, 200));
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
}

if (host && webglOk()) quandoLibero(() => init().catch(err => { console.warn('hero3d:', err); fallback(); }));
else fallback();

async function init() {
  const [THREE, { SVGLoader }, { RoomEnvironment }, svgText] = await Promise.all([
    import('/vendor/three/three.module.min.js'),
    import('/vendor/three/addons/loaders/SVGLoader.js'),
    import('/vendor/three/addons/environments/RoomEnvironment.js'),
    fetch('/assets/logo-vector.svg').then(r => { if (!r.ok) throw new Error('logo svg ' + r.status); return r.text(); })
  ]);

  // ── renderer / scena ──────────────────────────────────────────
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75);
  const renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  // se la scelta all'ingresso è già stata fatta mentre caricavamo, si va dritti nell'hero
  if (host === gateHost && !document.documentElement.classList.contains('gate-open')) host = heroHost;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.35, 9.2);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0xff6a1b, 30, 14, 2);
  rim.position.set(-3.5, 1.2, -2.5);
  scene.add(rim);
  const hot = new THREE.PointLight(0xff7a2e, 0, 3.5, 2); // luce dell'ugello
  scene.add(hot);

  // ── geometria dal logo (curve poco suddivise: a questa distanza non si nota) ──
  const data = new SVGLoader().parse(svgText);
  const shapes = [];
  data.paths.forEach(p => shapes.push(...SVGLoader.createShapes(p)));

  const lettersGeo = new THREE.ExtrudeGeometry(shapes, {
    depth: 70, bevelEnabled: true, bevelThickness: 6, bevelSize: 4, bevelSegments: 1, curveSegments: 4
  });
  lettersGeo.computeBoundingBox();
  const lb = lettersGeo.boundingBox;
  const cx = (lb.max.x + lb.min.x) / 2, cy = (lb.max.y + lb.min.y) / 2;
  lettersGeo.translate(-cx, -cy, 0);
  const lw = lb.max.x - lb.min.x, lh = lb.max.y - lb.min.y;

  // placca del portachiavi (con foro per l'anello), come i prodotti veri
  const pad = 70, r = 90;
  const W = lw + pad * 2, H = lh + pad * 2 + 120;
  const plate = new THREE.Shape();
  // in coordinate SVG (Y verso il basso) il foro va sopra le lettere, cioè a Y minori
  const x0 = -W / 2, y0 = -lh / 2 - pad - 120;
  plate.moveTo(x0 + r, y0);
  plate.lineTo(x0 + W - r, y0);
  plate.quadraticCurveTo(x0 + W, y0, x0 + W, y0 + r);
  plate.lineTo(x0 + W, y0 + H - r);
  plate.quadraticCurveTo(x0 + W, y0 + H, x0 + W - r, y0 + H);
  plate.lineTo(x0 + r, y0 + H);
  plate.quadraticCurveTo(x0, y0 + H, x0, y0 + H - r);
  plate.lineTo(x0, y0 + r);
  plate.quadraticCurveTo(x0, y0, x0 + r, y0);
  const hole = new THREE.Path();
  hole.absarc(0, y0 + 70, 34, 0, Math.PI * 2, true);
  plate.holes.push(hole);
  const plateGeo = new THREE.ExtrudeGeometry(plate, {
    depth: 55, bevelEnabled: true, bevelThickness: 8, bevelSize: 8, bevelSegments: 2, curveSegments: 10
  });

  // l'SVG ha l'asse Y verso il basso: capovolgiamo tutto il gruppo
  const S = 3.6 / H;
  const model = new THREE.Group();
  model.scale.set(S, -S, S);

  // righe di layer (0,2 mm) simulate nello shader
  const layerLines = (mat, strength) => {
    mat.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
        .replace('#include <color_fragment>',
          '#include <color_fragment>\nfloat ln = smoothstep(0.35, 0.5, abs(fract(vWPos.y * 38.0) - 0.5));\ndiffuseColor.rgb *= 1.0 - ln * ' + strength.toFixed(2) + ';');
    };
  };

  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), -10);
  const plateMat = new THREE.MeshStandardMaterial({ color: 0x17171a, roughness: 0.55, metalness: 0.05, clippingPlanes: [clip] });
  const letterMat = new THREE.MeshStandardMaterial({ color: 0xf3efe7, roughness: 0.38, metalness: 0.0, clippingPlanes: [clip] });
  layerLines(plateMat, 0.35);
  layerLines(letterMat, 0.12);
  // le facce interne, visibili sul taglio, sembrano filamento fuso
  const moltenMat = new THREE.MeshBasicMaterial({ color: 0xff6a1b, side: THREE.BackSide, clippingPlanes: [clip] });

  const plateMesh = new THREE.Mesh(plateGeo, plateMat);
  const plateIn = new THREE.Mesh(plateGeo, moltenMat);
  plateMesh.position.z = plateIn.position.z = -55;
  const letters = new THREE.Mesh(lettersGeo, letterMat);
  const lettersIn = new THREE.Mesh(lettersGeo, moltenMat);
  letters.position.z = lettersIn.position.z = 4;
  model.add(plateMesh, plateIn, letters, lettersIn);

  // l'origine visiva al centro della placca
  const mid = (y0 + H / 2);
  model.children.forEach(m => { m.position.y -= mid; });
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  const modelBox = new THREE.Box3().setFromObject(model);
  const bottomY = modelBox.min.y, topY = modelBox.max.y;
  const halfW = (modelBox.max.x - modelBox.min.x) / 2;

  // ── piano di stampa + ugello ──────────────────────────────────
  const bedTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 15, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
    for (let i = 0; i <= 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: bedTex, transparent: true, depthWrite: false }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = bottomY - 0.02;
  scene.add(bed);

  const nozzle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.35, metalness: 0.6 }));
  body.position.y = 0.42;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 16), new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.25, metalness: 0.9 }));
  tip.rotation.x = Math.PI; tip.position.y = 0.14;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffb36b }));
  nozzle.add(body, tip, glow);
  scene.add(nozzle);

  // linea incandescente sul layer corrente
  const seam = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2 + 0.2, 0.012),
    new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(seam);

  const clock = new THREE.Clock();
  const PRINT_TIME = 3.4;
  let running = false;
  let visible = true;

  // ── stato e interazione ───────────────────────────────────────
  const state = {
    print: reduceMotion ? 1 : 0, // 0 → 1 avanzamento stampa
    rotY: -0.5, rotX: 0.08, velY: 0,
    pointerX: 0, pointerY: 0, dragging: false, lastX: 0, scroll: 0,
    done: false, fadeT: 0,
    wake: () => loop()
  };
  window.__hero3d = state; // v2-motion.js aggiorna "scroll" e chiama wake()

  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', e => { state.dragging = true; state.lastX = e.clientX; el.setPointerCapture(e.pointerId); host.classList.add('is-grabbing'); loop(); });
  el.addEventListener('pointermove', e => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX; state.lastX = e.clientX;
    state.velY = dx * 0.006; state.rotY += state.velY;
    loop();
  });
  const end = () => { state.dragging = false; host.classList.remove('is-grabbing'); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  if (!coarse) window.addEventListener('pointermove', e => {
    state.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    state.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    loop();
  }, { passive: true });

  // ── dimensioni / visibilità ───────────────────────────────────
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 600 ? 11.5 : (w / h < 0.9 ? 11.5 : 9.2);
    camera.updateProjectionMatrix();
    loop();
  };
  const hosts = [heroHost, gateHost].filter(Boolean);
  const ro = new ResizeObserver(resize);
  hosts.forEach(h => ro.observe(h));
  resize();

  const seen = new Map();
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => seen.set(en.target, en.isIntersecting));
    visible = seen.get(host) !== false;
    if (visible) loop();
  }, { threshold: 0 });
  hosts.forEach(h => io.observe(h));

  // chiamato dalla scelta "Privati": il canvas si sposta nell'hero del negozio
  window.__hero3dMoveTo = target => {
    if (!target || target === host) return;
    host.classList.remove('is-ready');
    target.appendChild(renderer.domElement);
    host = target;
    host.classList.add('is-ready');
    visible = true;
    resize();
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  // ── ciclo: gira solo mentre c'è qualcosa da animare ───────────
  host.classList.add('is-ready');

  function loop() {
    if (running || !visible || document.hidden) return;
    running = true;
    clock.getDelta(); // niente salto dopo una pausa
    requestAnimationFrame(tick);
  }

  function tick() {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    let attivo = false; // c'è ancora movimento da disegnare?

    if (state.print < 1) { state.print = Math.min(1, state.print + dt / PRINT_TIME); attivo = true; }
    const p = state.print;
    const eased = 1 - Math.pow(1 - p, 2.2);
    const cutY = bottomY + (topY - bottomY + 0.05) * eased;
    const printing = p < 1;
    // mostra tutto ciò che sta sotto cutY; a stampa finita il taglio sparisce
    clip.constant = printing ? cutY : 1e3;
    if (!printing && !state.done) {
      // a stampa finita: via il "fuso" interno, facce piene da entrambi i lati,
      // e un mezzo giro di presentazione
      state.done = true;
      plateIn.visible = lettersIn.visible = false;
      plateMat.side = letterMat.side = THREE.DoubleSide;
      plateMat.needsUpdate = letterMat.needsUpdate = true;
      if (!reduceMotion) state.velY = 0.045;
    }

    // ugello: zig-zag sul layer corrente, poi si allontana
    if (state.done) state.fadeT = Math.min(1, state.fadeT + dt * 1.6);
    const fade = printing ? 1 : 1 - state.fadeT;
    if (fade > 0.01) attivo = attivo || !printing;
    nozzle.visible = seam.visible = fade > 0.01;
    nozzle.position.set(Math.sin(t * 9) * halfW * 0.85, cutY + (printing ? 0 : (1 - fade) * 1.5), 0.12);
    seam.position.set(0, cutY, 0.02);
    seam.material.opacity = 0.9 * fade;
    hot.position.copy(nozzle.position);
    hot.intensity = printing ? 6 + Math.sin(t * 40) * 1.5 : 6 * fade;

    // rotazione: inerzia del drag + puntatore + scroll, con smorzamento
    if (!state.dragging) {
      state.velY *= 0.94;
      state.rotY += state.velY;
    }
    if (Math.abs(state.velY) > 0.0004) attivo = true;
    const sx = state.scroll;
    const targetRotX = 0.06 + state.pointerY * 0.12 + sx * 0.5;
    const dRot = targetRotX - state.rotX;
    state.rotX += dRot * 0.08;
    if (Math.abs(dRot) > 0.0005) attivo = true;
    const targetPY = state.pointerX * 0.25;
    state.py = (state.py || 0) + (targetPY - (state.py || 0)) * 0.08;
    if (Math.abs(targetPY - state.py) > 0.0005) attivo = true;
    pivot.rotation.set(state.rotX, state.rotY + state.py + sx * 1.2, 0);
    pivot.position.y = -sx * 0.8;
    bed.material.opacity = 1 - Math.min(1, sx * 2);
    rim.position.x = -3.5 + state.pointerX * 1.5;

    renderer.render(scene, camera);
    if (attivo || state.dragging) requestAnimationFrame(tick);
    else running = false; // fermo: nessun fotogramma finché non cambia qualcosa
  }
  loop();
}
