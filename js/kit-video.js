// Video del kit da mandare su WhatsApp ai locali (pannello admin → Video kit).
// Si registra un <model-viewer>: ogni pezzo fa un giro completo e alla fine tutto il kit con l'invito al kit
// campione. Ogni fotogramma si compone su un canvas 1080×1350 (4:5) con nome dell'azienda, pezzo e misure;
// MediaRecorder lo salva in MP4 (Chrome, Safari) o WebM (Firefox).
// La scheda deve restare visibile: il browser ferma l'animazione nelle schede nascoste.
const KitVideo = (() => {
  const V = { w: 1080, h: 1350, testa: 150, fps: 30, giroMs: 2600, finaleMs: 2400, dissolvenzaMs: 350 };

  function formato() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    return ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
      .find(t => MediaRecorder.isTypeSupported(t)) || null;
  }

  // il canvas WebGL visibile dentro <model-viewer> (l'altro resta nascosto finché c'è un solo visore)
  function canvas3d(mv) {
    const tele = [...mv.shadowRoot.querySelectorAll('canvas')].filter(c => c.width && c.height);
    return tele.find(c => c.offsetWidth > 0) || tele[0];
  }

  function adatta(ctx, testo, peso, max, larghezza, famiglia) {
    let px = max;
    do { ctx.font = `${peso} ${px}px ${famiglia}`; px -= 2; } while (px > 20 && ctx.measureText(testo).width > larghezza);
  }

  const BARLOW = '"Barlow Condensed", sans-serif', MONO = '"DM Mono", monospace';

  // testi del video: titolo in alto e indirizzo della pagina del kit (merch o segnaposti)
  let T = { titolo: 'IL KIT DI', url: 'rolefigz.com/kit' };

  function disegna(ctx, mv, pezzo, azienda, alfa, chiusura) {
    const { w, h, testa } = V, lato = w, piede = testa + lato;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#141412'; ctx.fillRect(0, 0, w, h);
    // stesso fondo del visore di /kit
    const g = ctx.createRadialGradient(w / 2, testa + lato * .4, 0, w / 2, testa + lato * .4, lato * .75);
    g.addColorStop(0, '#f7f5f0'); g.addColorStop(1, '#ddd8ce');
    ctx.fillStyle = g; ctx.fillRect(0, testa, w, lato);
    // dal canvas 3D si prende il quadrato centrale della zona visibile
    const c = canvas3d(mv);
    if (c && alfa > 0) {
      const dpr = c.width / (c.clientWidth || c.width);
      const sw = Math.min(c.width, mv.clientWidth * dpr), sh = Math.min(c.height, mv.clientHeight * dpr), q = Math.min(sw, sh);
      ctx.globalAlpha = alfa;
      ctx.drawImage(c, (sw - q) / 2, (sh - q) / 2, q, q, 0, testa, lato, lato);
      ctx.globalAlpha = 1;
    }
    // testata
    ctx.fillStyle = '#C17F3A'; ctx.font = `500 22px ${MONO}`;
    ctx.fillText(T.titolo, 60, 58);
    ctx.fillStyle = '#f0ece4'; adatta(ctx, azienda, 900, 66, w - 120, BARLOW);
    ctx.fillText(azienda, 60, 126);
    // piede
    const nome = pezzo.nome.toUpperCase();
    ctx.fillStyle = '#f0ece4'; adatta(ctx, nome, 700, 40, w * .55, BARLOW);
    ctx.fillText(nome, 60, piede + 55);
    ctx.fillStyle = '#999'; adatta(ctx, pezzo.misure || '', 400, 20, w * .55, MONO);
    ctx.fillText(pezzo.misure || '', 60, piede + 92);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#C17F3A'; ctx.font = `700 32px ${BARLOW}`;
    ctx.fillText(T.url.toUpperCase(), w - 60, piede + 55);
    ctx.fillStyle = '#999'; ctx.font = `400 18px ${MONO}`;
    ctx.fillText('STAMPA 3D · PIACENZA', w - 60, piede + 92);
    // chiusura: invito al kit campione sopra l'ultimo giro
    if (chiusura > 0) {
      const y = testa + lato / 2;
      ctx.fillStyle = `rgba(20,20,18,${.82 * chiusura})`; ctx.fillRect(0, testa, w, lato);
      ctx.globalAlpha = chiusura; ctx.textAlign = 'center';
      ctx.fillStyle = '#f0ece4'; ctx.font = `900 92px ${BARLOW}`;
      ctx.fillText('VUOI TOCCARLO', w / 2, y - 60);
      ctx.fillText('CON MANO?', w / 2, y + 30);
      ctx.fillStyle = '#C17F3A'; ctx.font = `700 44px ${BARLOW}`;
      ctx.fillText('KIT CAMPIONE 19,90 € · RITIRO A PIACENZA', w / 2, y + 120);
      ctx.fillStyle = '#f0ece4'; ctx.font = `500 28px ${MONO}`;
      ctx.fillText(T.url, w / 2, y + 180);
      ctx.globalAlpha = 1;
    }
  }

  // se la scheda si nasconde il browser ferma i fotogrammi ma MediaRecorder continua: il video verrebbe con pezzi
  // congelati, quindi si interrompe e si avvisa
  let interrotto = null;
  const fotogramma = () => Promise.race([new Promise(r => requestAnimationFrame(r)), interrotto].filter(Boolean));

  // carica il pezzo nel visore e aspetta il modello (se è già quello caricato non arriva nessun «load»)
  async function carica(mv, pezzo) {
    if (mv.src !== pezzo.glb || !mv.loaded) {
      const caricato = new Promise(r => { mv.addEventListener('load', r, { once: true }); setTimeout(r, 15000); });
      mv.src = pezzo.glb;
      await caricato;
    }
    if (!mv.loaded) throw new Error(`Il 3D di «${pezzo.nome}» non si è caricato. Riprova tenendo la scheda in primo piano.`);
    // dopo il «load» il visore impiega ancora un attimo a disegnare il modello: si aspetta che nel canvas 3D
    // (trasparente: il fondo è CSS) compaia qualcosa, se no il video ha un secondo di fondo vuoto
    const t0 = performance.now();
    do {
      mv.cameraOrbit = '-30deg 62deg auto'; mv.jumpCameraToGoal();
      await fotogramma();
    } while (!disegnato(mv) && performance.now() - t0 < 5000);
  }

  const sonda = document.createElement('canvas'); sonda.width = sonda.height = 24;
  function disegnato(mv) {
    const c = canvas3d(mv);
    if (!c) return false;
    const s = sonda.getContext('2d', { willReadFrequently: true });
    s.clearRect(0, 0, 24, 24); s.drawImage(c, 0, 0, 24, 24);
    const d = s.getImageData(0, 0, 24, 24).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  }

  // un giro completo del pezzo, con accelerazione e frenata morbide; nel finale continua piano sotto la chiusura
  async function giro(mv, ctx, pezzo, azienda, finale) {
    const durata = V.giroMs + (finale ? V.finaleMs : 0), t0 = performance.now();
    for (let ms = 0; ms <= durata; ms = performance.now() - t0) {
      const t = Math.min(ms / V.giroMs, 1), morbido = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const extra = t >= 1 ? (ms - V.giroMs) / 40 : 0;
      mv.cameraOrbit = `${-30 + 360 * morbido + extra}deg 62deg auto`;
      mv.jumpCameraToGoal();
      const chiusura = finale ? Math.max(0, Math.min((ms - V.giroMs) / 500, 1)) : 0;
      disegna(ctx, mv, pezzo, azienda, Math.min(ms / V.dissolvenzaMs, 1), chiusura);
      await fotogramma();
    }
  }

  function slug(testo) {
    return testo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // pezzi: [{ nome, misure, glb }], l'ultimo è «tutto il kit». Restituisce un File (mp4 o webm).
  async function crea({ mv, pezzi, azienda, onStato = () => {}, titolo = 'IL KIT DI', url = 'rolefigz.com/kit' }) {
    T = { titolo, url };
    const tipo = formato();
    if (!tipo) throw new Error('Questo browser non può creare il video: usa Chrome.');
    azienda = (azienda || 'La tua azienda').toUpperCase();
    const prima = { altezza: mv.style.height, auto: mv.autoRotate };
    // visore quadrato durante la registrazione: più risoluzione nel ritaglio
    mv.style.height = mv.clientWidth + 'px'; mv.autoRotate = false;
    // font del video e modelli 3D già in cache prima di registrare: i cambi di pezzo sono più rapidi
    onStato('Preparo il video…');
    await Promise.all([`900 66px ${BARLOW}`, `700 40px ${BARLOW}`, `500 22px ${MONO}`, `400 20px ${MONO}`]
      .map(f => document.fonts.load(f).catch(() => null))
      .concat(pezzi.map(p => fetch(p.glb).then(r => r.blob()).catch(() => null))));

    const tela = document.createElement('canvas'); tela.width = V.w; tela.height = V.h;
    const ctx = tela.getContext('2d');
    const reg = new MediaRecorder(tela.captureStream(V.fps), { mimeType: tipo, videoBitsPerSecond: 6000000 });
    const dati = []; reg.ondataavailable = e => { if (e.data.size) dati.push(e.data); };
    const fermo = new Promise(r => { reg.onstop = r; });
    let nascosta;
    interrotto = new Promise((_, ko) => {
      nascosta = () => { if (document.hidden) ko(new Error('Hai cambiato scheda durante la registrazione: rifai il video restando su questa pagina.')); };
      document.addEventListener('visibilitychange', nascosta);
      nascosta();
    });
    interrotto.catch(() => {});
    try {
      await carica(mv, pezzi[0]);
      reg.start(250);
      for (let n = 0; n < pezzi.length; n++) {
        onStato(`Registro il video… ${n + 1} / ${pezzi.length} · non cambiare scheda`);
        if (n) await carica(mv, pezzi[n]);
        await giro(mv, ctx, pezzi[n], azienda, n === pezzi.length - 1);
      }
    } finally {
      document.removeEventListener('visibilitychange', nascosta); interrotto = null;
      // se si interrompe prima di reg.start() non arriva nessun «stop»: non va aspettato
      if (reg.state !== 'inactive') { reg.stop(); await fermo; }
      mv.style.height = prima.altezza; mv.autoRotate = prima.auto; mv.cameraOrbit = '0deg 55deg auto';
    }
    if (!dati.length) throw new Error('Il video è vuoto. Riprova tenendo la scheda in primo piano.');
    const est = tipo.startsWith('video/mp4') ? 'mp4' : 'webm';
    return new File(dati, `kit-${slug(azienda) || 'rolefigz'}.${est}`, { type: tipo.split(';')[0] });
  }

  return { crea, formato };
})();
