// Motion v2 — scroll fluido (Lenis), reveal e micro-interazioni (GSAP).
// Tutto è progressivo: senza JS o con "riduci movimento" il contenuto resta visibile e statico.
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  document.documentElement.classList.add('js-motion');

  // barra di avanzamento dello scroll
  const bar = document.createElement('div');
  bar.className = 'v2-progress';
  document.body.appendChild(bar);
  const setBar = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', setBar, { passive: true });

  // header compatto dopo lo scroll
  const header = document.querySelector('header');
  const onScrollHeader = () => header && header.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  if (reduce || !hasGsap) return;

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  // ── scroll fluido ─────────────────────────────────────────────
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis;
    // i modali e il carrello devono poter scorrere al loro interno
    document.querySelectorAll('.drawer, .modal, .chat-panel, .nav-panel, .avatar-dropdown').forEach(el => el.setAttribute('data-lenis-prevent', ''));
  }

  // ── utilità: divide un titolo in parole mascherate ────────────
  function splitWords(el) {
    if (!el || el.dataset.split) return [];
    el.dataset.split = '1';
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'v2-w';
            const i = document.createElement('span'); i.className = 'v2-wi'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    return el.querySelectorAll('.v2-wi');
  }

  // ── intro dell'hero ───────────────────────────────────────────
  const hero = document.querySelector('.v2-hero');
  if (hero) {
    hero.classList.add('is-animated');
    const words = splitWords(hero.querySelector('.v2-hero-h1'));
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from(hero.querySelector('.v2-hero-bg'), { scale: 1.18, opacity: 0, duration: 2.2, ease: 'power2.out' }, 0)
      .from(hero.querySelector('.v2-chip'), { y: 20, opacity: 0, duration: 1 }, 0.15)
      .from(words, { yPercent: 115, rotate: 4, duration: 1.3, stagger: 0.06 }, 0.25)
      .from(hero.querySelector('.v2-hero-p'), { y: 24, opacity: 0, duration: 1.1 }, 0.6)
      .from(hero.querySelectorAll('.v2-hero-ctas .v2-btn'), { y: 20, opacity: 0, duration: 1, stagger: 0.08 }, 0.75)
      .from(hero.querySelectorAll('.v2-stat'), { y: 30, opacity: 0, duration: 1, stagger: 0.07 }, 0.9);

    // parallasse in uscita + rotazione del modello 3D
    gsap.to(hero.querySelector('.v2-hero-copy'), {
      yPercent: -18, opacity: 0.2, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
    gsap.to(hero.querySelector('.v2-hero-bg'), {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
    ScrollTrigger.create({
      trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: self => { if (window.__hero3d) window.__hero3d.scroll = self.progress; }
    });
  }

  // contatori numerici (data-count)
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split('.')[1] || '').length;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.8, ease: 'power3.out', delay: 1,
      onUpdate: () => { el.firstChild.textContent = obj.v.toFixed(dec).replace('.', ','); }
    });
  });

  // ── titoli di sezione ─────────────────────────────────────────
  document.querySelectorAll('.v2-section-head').forEach(head => {
    if (head.closest('.v2-hero')) return;
    const words = splitWords(head.querySelector('.v2-h2'));
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: 'top 85%' }, defaults: { ease: 'expo.out' } });
    const eyebrow = head.querySelector('.v2-eyebrow');
    if (eyebrow) tl.from(eyebrow, { y: 14, opacity: 0, duration: 0.8 }, 0);
    if (words.length) tl.from(words, { yPercent: 110, duration: 1.1, stagger: 0.05 }, 0.05);
    const lead = head.querySelector('.v2-lead');
    if (lead) tl.from(lead, { y: 16, opacity: 0, duration: 0.9 }, 0.3);
  });

  // ── tessere servizi: apertura a sipario + parallasse dell'immagine ──
  gsap.utils.toArray('.v2-tile').forEach((tile, i) => {
    gsap.from(tile, {
      clipPath: 'inset(18% 10% 18% 10% round 22px)', opacity: 0, duration: 1.4, ease: 'expo.out', delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: tile, start: 'top 90%' }
    });
    const img = tile.querySelector('img');
    if (img) gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, {
      yPercent: 6, scale: 1.12, ease: 'none',
      scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // ── elementi a griglia: comparsa a gruppi ─────────────────────
  const batchReveal = selector => ScrollTrigger.batch(selector, {
    start: 'top 92%',
    onEnter: els => gsap.fromTo(els, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.07, overwrite: true })
  });
  batchReveal('.step, .why-card, .v2-faq-list details, .v2-f1-card, .footer-grid > div');

  // le card dei prodotti arrivano dall'API: le osserviamo quando compaiono
  const list = document.getElementById('productosList');
  if (list) {
    new MutationObserver(() => {
      const cards = list.querySelectorAll('.card:not([data-rv])');
      if (!cards.length) return;
      cards.forEach(c => { c.dataset.rv = '1'; c.style.animation = 'none'; });
      ScrollTrigger.batch(cards, {
        start: 'top 95%',
        onEnter: els => gsap.fromTo(els, { y: 50, opacity: 0, rotateX: -8 }, { y: 0, opacity: 1, rotateX: 0, duration: 1.1, ease: 'expo.out', stagger: 0.06 })
      });
      if (lenis) lenis.resize();
      ScrollTrigger.refresh();
    }).observe(list, { childList: true, subtree: true });
  }

  // linea di avanzamento del processo
  const steps = document.querySelector('.v2-steps');
  if (steps) {
    const line = document.createElement('div');
    line.className = 'v2-steps-line';
    steps.prepend(line);
    gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: steps, start: 'top 80%', end: 'bottom 55%', scrub: true } });
  }

  // CTA finale: leggero zoom d'ingresso
  const cta = document.querySelector('.v2-cta');
  if (cta) gsap.from(cta, { scale: 0.94, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: cta, start: 'top 88%' } });

  // ── micro-interazioni (solo mouse) ────────────────────────────
  if (finePointer) {
    // pulsanti magnetici
    document.querySelectorAll('.v2-btn').forEach(btn => {
      const qx = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
      const qy = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.25);
        qy((e.clientY - r.top - r.height / 2) * 0.35);
      });
      btn.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });

    // inclinazione 3D di card e tessere (delegata: vale anche per le card caricate dopo)
    const tiltSel = '.card, .v2-tile, .why-card, .v2-f1-card';
    let current = null;
    document.addEventListener('pointermove', e => {
      const el = e.target.closest && e.target.closest(tiltSel);
      if (current && current !== el) { gsap.to(current, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' }); current.style.removeProperty('--mx'); }
      current = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      gsap.to(el, { rotateX: (0.5 - py) * 6, rotateY: (px - 0.5) * 8, transformPerspective: 900, duration: 0.5, ease: 'power3.out' });
      el.style.setProperty('--mx', (px * 100) + '%');
      el.style.setProperty('--my', (py * 100) + '%');
    }, { passive: true });
  }

  // ── navigazione SPA: transizione tra le viste ─────────────────
  if (typeof window.mostraVista === 'function') {
    const original = window.mostraVista;
    window.mostraVista = function (nome) {
      const res = original.apply(this, arguments);
      const view = document.getElementById('view-' + nome);
      if (view) gsap.fromTo(view, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', clearProps: 'transform' });
      if (lenis) lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0);
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return res;
    };
  }

  // i link "scrollIntoView" esistenti passano da Lenis per restare fluidi
  if (lenis) {
    const nativeSIV = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (opts) {
      if (opts && typeof opts === 'object' && opts.behavior === 'smooth' && !this.closest('[data-lenis-prevent]')) {
        lenis.scrollTo(this, { offset: -80, duration: 1.4 });
      } else nativeSIV.apply(this, arguments);
    };
    // blocca lo scroll di fondo quando un pannello è aperto
    const lockers = ['.drawer', '.modal-bg', '.nav-panel'];
    new MutationObserver(() => {
      const open = lockers.some(s => [...document.querySelectorAll(s)].some(el => el.classList.contains('on')));
      open ? lenis.stop() : lenis.start();
    }).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  // l'altezza cambia quando arrivano immagini e prodotti: ricalcola i limiti dello scroll
  window.addEventListener('load', () => { if (lenis) lenis.resize(); ScrollTrigger.refresh(); });
  if (lenis && 'ResizeObserver' in window) new ResizeObserver(() => lenis.resize()).observe(document.body);
})();
