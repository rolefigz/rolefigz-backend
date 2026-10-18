// Listino dei segnaposti: un'unica fonte per la pagina /kit/segnaposti (browser) e per le email (Node).
// Ogni pack è un piatto pieno di frontali della stessa taglia. Prezzi finali, senza IVA da aggiungere.
(function (root) {
  const TAGLIE = [
    { chiave: "S",  nome: "S",             include: "QR",       pezzi: 14, prezzo: 89 },
    { chiave: "M",  nome: "M",             include: "QR + NFC", pezzi: 10, prezzo: 99, consigliato: true },
    { chiave: "L",  nome: "L verticale",   include: "QR + NFC", pezzi: 8,  prezzo: 119 },
    { chiave: "LH", nome: "L orizzontale", include: "QR + NFC", pezzi: 8,  prezzo: 119 },
    { chiave: "XL", nome: "XL",            include: "QR + NFC", pezzi: 6,  prezzo: 129 },
  ];

  // Per ogni taglia: quanti pack servono per avere un segnaposto per tavolo, quanti ne avanzano e il totale.
  function preventivo(tavoli) {
    const n = Math.max(1, Math.floor(Number(tavoli) || 0));
    return TAGLIE.map(t => {
      const pack = Math.ceil(n / t.pezzi);
      const pezzi = pack * t.pezzi;
      const totale = pack * t.prezzo;
      return { ...t, tavoli: n, pack, pezziTotali: pezzi, scorta: pezzi - n, totale, perTavolo: totale / n };
    });
  }

  const api = { TAGLIE, preventivo };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PrezziSegnaposti = api;
})(this);
