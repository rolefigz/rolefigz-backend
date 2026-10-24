// Ingresso con scelta (home: privati / aziende; pagina aziende: tipo di attività).
// Si apre solo all'inizio della visita (vedi lo script in <head>); la scelta resta per
// la sessione. Le opzioni con data-stay restano sulla pagina, le altre seguono il link.
(function () {
  const root = document.documentElement;
  const gate = document.getElementById('v2Gate');
  if (!gate) return;
  if (!root.classList.contains('gate-open')) { gate.remove(); return; }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const lenis = window.__lenis;
  const storageKey = gate.dataset.storage || 'rf_percorso';
  if (lenis) lenis.stop();

  const options = [...gate.querySelectorAll('[data-scelta]')];

  // entrata: le opzioni arrivano in sequenza, i titoli salgono
  if (gsap && !reduce) {
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from(options, { yPercent: 6, opacity: 0, duration: 1.1, stagger: 0.08 }, 0)
      .from(gate.querySelectorAll('.v2-gate-title'), { yPercent: 60, opacity: 0, duration: 1.2, stagger: 0.08 }, 0.2)
      .from(gate.querySelectorAll('.v2-gate-eyebrow, .v2-gate-text, .v2-gate-chips, .v2-gate-cta'), { y: 18, opacity: 0, duration: 0.9, stagger: 0.03 }, 0.4)
      .from(gate.querySelector('.v2-gate-top'), { y: -12, opacity: 0, duration: 0.8 }, 0.3);
  }

  let busy = false;
  function chiudi() {
    root.classList.remove('gate-open');
    gate.remove();
    if (lenis) { lenis.start(); lenis.resize(); }
    window.dispatchEvent(new Event('v2:gate-closed'));
  }

  gate.addEventListener('click', e => {
    const a = e.target.closest('[data-scelta]');
    if (!a || busy) return;
    e.preventDefault();
    busy = true;
    const scelta = a.dataset.scelta;
    try { sessionStorage.setItem(storageKey, scelta); } catch (_) {}
    gate.classList.add('is-chosen');
    const altre = options.filter(o => o !== a);
    const centro = gate.querySelector('.v2-gate-center');

    if (!a.hasAttribute('data-stay')) {
      // l'opzione scelta riempie lo schermo, poi si apre la sua pagina
      const vai = () => { window.location.href = a.href; };
      if (gsap && !reduce) {
        gsap.timeline({ onComplete: vai })
          .to(altre, { flexGrow: 0.0001, opacity: 0, duration: 0.7, ease: 'expo.inOut' }, 0)
          .to(centro, { opacity: 0, scale: 0.8, duration: 0.5 }, 0);
      } else vai();
      return;
    }

    // si resta qui: la pagina si prepara per la scelta, il logo passa nell'hero
    window.dispatchEvent(new CustomEvent('v2:gate-choice', { detail: scelta }));
    if (window.__v2Hero) window.__v2Hero.prepare();
    const heroHost = document.getElementById('hero3d');
    if (window.__hero3dMoveTo && heroHost) window.__hero3dMoveTo(heroHost);
    if (gsap && !reduce) {
      gsap.timeline({ onComplete: chiudi })
        .to(altre, { flexGrow: 0.0001, opacity: 0, duration: 0.6, ease: 'expo.inOut' }, 0)
        .to(gate, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 0.35);
    } else chiudi();
  });

  options.forEach(o => o.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); o.click(); } }));
})();
