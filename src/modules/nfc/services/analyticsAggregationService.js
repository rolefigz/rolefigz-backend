const { Op } = require("sequelize");
const { sequelize, AnalyticsEvent, AnalyticsDaily } = require("../../../models");

// Aggrega in analytics_daily tutti i giorni passati (mai il giorno corrente,
// che e' ancora in corso) che hanno eventi grezzi non ancora aggregati.
// Un giorno passato non riceve mai nuovi eventi, quindi findOrCreate basta:
// non serve aggiornare un aggregato gia' esistente.
async function aggregaEventiGiornalieri() {
  const [gruppi] = await sequelize.query(`
    SELECT company_id, event_type, tag_id, link_id, DATE(createdAt) AS date,
           COUNT(*) AS count, COUNT(DISTINCT visitor_hash) AS unique_count
    FROM analytics_events
    WHERE createdAt < CURDATE()
    GROUP BY company_id, event_type, tag_id, link_id, DATE(createdAt)
  `);

  let creati = 0;
  for (const g of gruppi) {
    const [, fuCreato] = await AnalyticsDaily.findOrCreate({
      where: {
        company_id: g.company_id, event_type: g.event_type,
        tag_id: g.tag_id, link_id: g.link_id, date: g.date,
      },
      defaults: { count: g.count, unique_count: g.unique_count },
    });
    if (fuCreato) creati++;
  }
  return { gruppiTrovati: gruppi.length, righeNuove: creati };
}

// Gli eventi grezzi non servono piu' oltre la finestra di retention — a
// questo punto sono gia' stati aggregati sopra.
async function pulisciEventiVecchi() {
  const retentionDays = parseInt(process.env.NFC_ANALYTICS_RETENTION_DAYS || "90", 10);
  const soglia = new Date();
  soglia.setDate(soglia.getDate() - retentionDays);
  const eliminati = await AnalyticsEvent.destroy({ where: { createdAt: { [Op.lt]: soglia } } });
  return { eliminati };
}

async function eseguiJobGiornalieroAnalytics() {
  const aggregazione = await aggregaEventiGiornalieri();
  const pulizia = await pulisciEventiVecchi();
  console.log(
    `[nfc analytics] aggregati ${aggregazione.righeNuove} nuovi gruppi su ${aggregazione.gruppiTrovati}, ` +
    `eliminati ${pulizia.eliminati} eventi oltre la retention`
  );
  return { ...aggregazione, ...pulizia };
}

module.exports = { aggregaEventiGiornalieri, pulisciEventiVecchi, eseguiJobGiornalieroAnalytics };
