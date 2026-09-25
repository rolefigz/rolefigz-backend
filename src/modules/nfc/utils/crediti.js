// I campi di credito (credit_cost dei prodotti, delta del ledger, credits_used
// e credits_each degli ordini) restano colonne INTEGER e sono salvati
// internamente in "mezzi crediti" (1 unita' = 0,5 crediti reali), cosi' si
// supportano costi frazionari (es. 1,5) senza migrare le colonne a DECIMAL.
// La conversione avviene solo ai confini: input dall'admin/cliente -> unita',
// output verso l'utente -> reale.
function unitaAReale(unita) {
  if (unita === null || unita === undefined) return unita;
  return Math.round(Number(unita)) * 0.5;
}

function realeAUnita(reale) {
  return Math.round(Number(reale) * 2);
}

module.exports = { unitaAReale, realeAUnita };
