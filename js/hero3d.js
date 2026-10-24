// Hero 3D — il logo RoleFigz viene "stampato" layer per layer su un piano
// di stampa, poi resta interattivo (trascina per ruotare, segue il puntatore).
// Nessuna dipendenza esterna: Three.js è servito da /vendor.
import * as THREE from '../vendor/three/three.module.min.js';
import { SVGLoader } from '../vendor/three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from '../vendor/three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('hero3d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fallback() {
  if (!host) return;
  host.classList.add('is-fallback');
  host.innerHTML = '<img src="assets/logo.png" alt="" aria-hidden="true">';
}

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

if (host && webglOk()) init().catch(err => { console.warn('hero3d:', err); fallback(); });
else fallback();

async function init() {
  const svgText = await fetch('assets/logo-vector.svg').then(r => {
    if (!r.ok) throw new Error('logo svg ' + r.status);
    return r.text();
  });

  // ── renderer / scena ──────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

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

  // ── geometria dal logo ────────────────────────────────────────
  const data = new SVGLoader().parse(svgText);
  const shapes = [];
  data.paths.forEach(p => shapes.push(...SVGLoader.createShapes(p)));

  const lettersGeo = new THREE.ExtrudeGeometry(shapes, {
    depth: 70, bevelEnabled: true, bevelThickness: 6, bevelSize: 4, bevelSegments: 3, curveSegments: 10
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
    depth: 55, bevelEnabled: true, bevelThickness: 8, bevelSize: 8, bevelSegments: 4, curveSegments: 24
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
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(256, 256, 30, 256, 256, 256);
    grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1;
    for (let i = 0; i <= 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
    g.globalCompositeOperation = 'destination-in'; g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const bed = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: bedTex, transparent: true, depthWrite: false }));
  bed.rotation.x = -Math.PI / 2;
  bed.position.y = bottomY - 0.02;
  scene.add(bed);

  const nozzle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.42), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.35, metalness: 0.6 }));
  body.position.y = 0.42;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 24), new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.25, metalness: 0.9 }));
  tip.rotation.x = Math.PI; tip.position.y = 0.14;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffb36b }));
  nozzle.add(body, tip, glow);
  scene.add(nozzle);

  // linea incandescente sul layer corrente
  const seam = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2 + 0.2, 0.012),
    new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(seam);

  // ── interazione ───────────────────────────────────────────────
  const state = {
    print: reduceMotion ? 1 : 0, // 0 → 1 avanzamento stampa
    rotY: -0.5, rotX: 0.08, velY: 0, targetX: 0.08,
    pointerX: 0, pointerY: 0, dragging: false, lastX: 0, scroll: 0, idle: 0
  };
  window.__hero3d = state; // usato da v2-motion.js per lo scroll

  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', e => { state.dragging = true; state.lastX = e.clientX; el.setPointerCapture(e.pointerId); host.classList.add('is-grabbing'); });
  el.addEventListener('pointermove', e => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX; state.lastX = e.clientX;
    state.velY = dx * 0.006; state.rotY += state.velY;
  });
  const end = () => { state.dragging = false; host.classList.remove('is-grabbing'); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  window.addEventListener('pointermove', e => {
    state.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
    state.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // ── resize / visibilità ───────────────────────────────────────
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 600 ? 11.5 : (w / h < 0.9 ? 11.5 : 9.2);
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host);
  resize();

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });

  // ── loop ──────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  const PRINT_TIME = 3.4;
  let running = false;
  host.classList.add('is-ready');

  function loop() {
    if (running) return;
    running = true;
    requestAnimationFrame(tick);
  }

  function tick() {
    if (!visible || document.hidden) { running = false; return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (state.print < 1) state.print = Math.min(1, state.print + dt / PRINT_TIME);
    const p = state.print;
    const eased = 1 - Math.pow(1 - p, 2.2);
    const cutY = bottomY + (topY - bottomY + 0.05) * eased;
    const printing = p < 1;
    // mostra tutto ciò che sta sotto cutY; a stampa finita il taglio sparisce
    clip.constant = printing ? cutY : 1e3;
    if (!printing && !state.done) {
      // a stampa finita: via il "fuso" interno, facce piene da entrambi i lati
      state.done = true;
      plateIn.visible = lettersIn.visible = false;
      plateMat.side = letterMat.side = THREE.DoubleSide;
      plateMat.needsUpdate = letterMat.needsUpdate = true;
    }

    // ugello: zig-zag sul layer corrente, poi si allontana
    const fade = printing ? 1 : Math.max(0, 1 - (t - PRINT_TIME) * 1.6);
    nozzle.visible = seam.visible = fade > 0.01;
    nozzle.position.set(Math.sin(t * 9) * halfW * 0.85, cutY + (printing ? 0 : (1 - fade) * 1.5), 0.12);
    seam.position.set(0, cutY, 0.02);
    seam.material.opacity = 0.9 * fade;
    hot.position.copy(nozzle.position);
    hot.intensity = printing ? 6 + Math.sin(t * 40) * 1.5 : 6 * fade;

    // rotazione: inerzia del drag + rientro dolce + puntatore + scroll
    if (!state.dragging) {
      state.velY *= 0.94;
      state.rotY += state.velY;
      if (!printing && Math.abs(state.velY) < 0.002 && !reduceMotion) state.rotY += dt * 0.18;
    }
    const sx = state.scroll;
    const targetRotX = 0.06 + state.pointerY * 0.12 + sx * 0.5;
    state.rotX += (targetRotX - state.rotX) * 0.06;
    pivot.rotation.set(state.rotX, state.rotY + state.pointerX * 0.25 + sx * 1.2, 0);
    pivot.position.y = (printing || reduceMotion ? 0 : Math.sin(t * 1.1) * 0.06) - sx * 0.8;
    bed.material.opacity = 1 - Math.min(1, sx * 2);
    rim.position.x = -3.5 + state.pointerX * 1.5;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  loop();
}
