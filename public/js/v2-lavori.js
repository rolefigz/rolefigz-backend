// Galleria "Lavori reali" (segnaposti): filtro per tipo e foto ingrandita.
(function () {
  const sez = document.getElementById('k-lavori');
  if (!sez) return;
  const lavori = [...sez.querySelectorAll('.k-work')];
  const bottoni = [...sez.querySelectorAll('[data-filter]')];

  sez.querySelector('.k-works-filter').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    const f = b.dataset.filter;
    bottoni.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    lavori.forEach(el => { el.hidden = f !== 'all' && el.dataset.cat !== f; });
  });

  const zoom = document.getElementById('kWorksZoom');
  if (!zoom || typeof zoom.showModal !== 'function') return;
  const img = zoom.querySelector('img');
  const testo = zoom.querySelector('p');
  sez.querySelector('.k-works-grid').addEventListener('click', e => {
    const el = e.target.closest('.k-work');
    if (!el) return;
    img.src = el.dataset.full;
    img.alt = el.querySelector('img').alt;
    testo.innerHTML = el.querySelector('.k-work-cap').innerHTML;
    zoom.showModal();
  });
  zoom.addEventListener('click', e => { if (e.target === zoom || e.target.closest('.k-works-close')) zoom.close(); });
})();
