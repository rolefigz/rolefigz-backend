// Aggiunge N mesi a una data mantenendo la semantica di fatturazione standard:
// se il giorno non esiste nel mese di destinazione (es. 31 gen + 1 mese),
// si usa l'ultimo giorno di quel mese invece di traboccare al mese successivo.
function addMonths(data, mesi) {
  const base = new Date(data);
  const risultato = new Date(base);
  risultato.setMonth(base.getMonth() + mesi);
  if (risultato.getDate() !== base.getDate()) {
    risultato.setDate(0);
  }
  return risultato;
}

module.exports = { addMonths };
