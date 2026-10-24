// Reveal leggero per le pagine secondarie: comparsa allo scroll + barra di avanzamento.
// Senza JS (o con "riduci movimento") tutto resta visibile.
(function () {
  const bar = document.createElement('div');
  bar.className = 'v2-progress';
  document.body.appendChild(bar);
  const setBar = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  window.addEventListener('scroll', setBar, { passive: true });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;

  const sel = [
    '.k-hero-inner > *', '.g3d-hero-inner > *', '.ki > *', '.ki-card', '.k-split-head > *', '.k-split-opt', '.k-contact-inner',
    '.k-label', '.k-title', '.k-lead', '.k-guide-col', '.k-ex', '.k-step-panel', '.k-book > *',
    '.g3d-label', '.g3d-title', '.g3d-step', '.g3d-card', '.g3d-chi-sono > *', '.g3d-form-wrap',
    '.v2-legal > *'
  ].join(',');

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  const tag = () => document.querySelectorAll(sel).forEach(el => {
    if (el.dataset.rv || el.closest('[hidden]')) return;
    el.dataset.rv = '1';
    // ritardo a cascata tra fratelli
    const idx = [...el.parentElement.children].indexOf(el);
    el.style.setProperty('--d', `${Math.min(idx, 6) * 0.07}s`);
    el.classList.add('v2-rv');
    io.observe(el);
  });
  tag();
  // le pagine mostrano/nascondono step: ricontrolla quando cambia il DOM
  new MutationObserver(() => requestAnimationFrame(tag)).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
})();
