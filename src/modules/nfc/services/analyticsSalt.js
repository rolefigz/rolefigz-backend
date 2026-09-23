const crypto = require("crypto");
const { get: getImpostazione, set: setImpostazione } = require("../../../controllers/impostazioniController");

// Sale giornaliero per l'hash dei visitatori — riusa la tabella impostazioni
// gia' esistente invece di crearne una nuova solo per questo. Cambia ogni
// giorno; quello vecchio non viene conservato da nessuna parte.
async function otteniSaleOggi() {
  const oggi = new Date().toISOString().slice(0, 10);
  const dataSalvata = await getImpostazione("nfc_analytics_salt_date");
  if (dataSalvata === oggi) {
    const saleEsistente = await getImpostazione("nfc_analytics_salt");
    if (saleEsistente) return saleEsistente;
  }
  const nuovoSale = crypto.randomBytes(16).toString("hex");
  await setImpostazione("nfc_analytics_salt", nuovoSale);
  await setImpostazione("nfc_analytics_salt_date", oggi);
  return nuovoSale;
}

function hashVisitatore(ip, userAgent, sale) {
  return crypto.createHash("sha256").update(`${ip}|${userAgent}|${sale}`).digest("hex");
}

module.exports = { otteniSaleOggi, hashVisitatore };
