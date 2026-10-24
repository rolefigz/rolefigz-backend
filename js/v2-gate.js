// Ingresso privati / aziende. Si apre solo all'inizio della visita (vedi lo script
// in <head>); la scelta resta per la sessione e l'interruttore in alto permette di cambiarla.
(function () {
  const root = document.documentElement;
  const gate = document.getElementById('v2Gate');
  if (!gate) return;
  if (!root.classList.contains('gate-open')) { gate.remove(); return; }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;
  const lenis = window.__lenis;
  if (lenis) lenis.stop();

  const halves = gate.querySelectorAll('.v2-gate-half');
  const b2c = gate.querySelector('.is-b2c');
  const b2b = gate.querySelector('.is-b2b');

  // entrata: le due metà arrivano dai lati, i titoli salgono
  if (gsap && !reduce) {
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from(b2c, { xPercent: -8, opacity: 0, duration: 1.2 }, 0)
      .from(b2b, { xPercent: 8, opacity: 0, duration: 1.2 }, 0)
      .from(gate.querySelectorAll('.v2-gate-title'), { yPercent: 60, opacity: 0, duration: 1.2, stagger: 0.1 }, 0.25)
      .from(gate.querySelectorAll('.v2-gate-eyebrow, .v2-gate-text, .v2-gate-chips, .v2-gate-cta'), { y: 18, opacity: 0, duration: 0.9, stagger: 0.04 }, 0.45)
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
    const a = e.target.closest('[data-percorso]');
    if (!a || busy) return;
    e.preventDefault();
    busy = true;
    const scelta = a.dataset.percorso;
    try { sessionStorage.setItem('rf_percorso', scelta); } catch (_) {}
    gate.classList.add('is-chosen', 'chose-' + scelta);

    if (scelta === 'aziende') {
      // la metà aziende riempie lo schermo, poi si apre la pagina
      const vai = () => { window.location.href = a.href; };
      if (gsap && !reduce) {
        gsap.timeline({ onComplete: vai })
          .to(b2c, { flexGrow: 0.0001, opacity: 0, duration: 0.7, ease: 'expo.inOut' }, 0)
          .to(gate.querySelector('.v2-gate-center'), { opacity: 0, scale: 0.8, duration: 0.5 }, 0);
      } else vai();
      return;
    }

    // privati: il logo stampato passa nell'hero del negozio e l'ingresso si apre
    const heroHost = document.getElementById('hero3d');
    if (window.__hero3dMoveTo && heroHost) window.__hero3dMoveTo(heroHost);
    if (gsap && !reduce) {
      gsap.timeline({ onComplete: chiudi })
        .to(b2b, { flexGrow: 0.0001, opacity: 0, duration: 0.6, ease: 'expo.inOut' }, 0)
        .to(gate, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 0.35);
    } else chiudi();
  });

  // senza WebGL il canvas non arriva: la scelta funziona lo stesso
  halves.forEach(h => h.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); h.click(); } }));
})();
