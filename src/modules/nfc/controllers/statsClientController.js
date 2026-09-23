const { Op } = require("sequelize");
const { AnalyticsDaily, AnalyticsEvent, Tag } = require("../../../models");

const RANGE_GIORNI = { today: 0, "7": 7, "30": 30, "90": 90 };

const statistiche = async (req, res) => {
  try {
    const range = RANGE_GIORNI[req.query.range] !== undefined ? req.query.range : "7";
    const giorni = RANGE_GIORNI[range];
    const companyId = req.azienda.id;

    // Giorno "di oggi" calcolato in UTC, non in ora locale del server: il job
    // di aggregazione raggruppa con DATE(createdAt) in UTC (createdAt e'
    // salvato in UTC), quindi il confine tra i giorni deve coincidere,
    // altrimenti "oggi" finisce etichettato con la data sbagliata.
    const adesso = new Date();
    const oggi = new Date(Date.UTC(adesso.getUTCFullYear(), adesso.getUTCMonth(), adesso.getUTCDate()));
    const dataInizio = new Date(oggi);
    if (giorni > 0) dataInizio.setUTCDate(dataInizio.getUTCDate() - (giorni - 1));

    const [storico, eventiOggi] = await Promise.all([
      giorni > 0
        ? AnalyticsDaily.findAll({ where: { company_id: companyId, date: { [Op.gte]: dataInizio, [Op.lt]: oggi } } })
        : Promise.resolve([]),
      AnalyticsEvent.findAll({ where: { company_id: companyId, createdAt: { [Op.gte]: oggi } } }),
    ]);

    const totali = { page_view: 0, tag_scan: 0, link_click: 0 };
    const perGiorno = {};
    const perTag = {};

    storico.forEach(r => {
      totali[r.event_type] = (totali[r.event_type] || 0) + r.count;
      perGiorno[r.date] = perGiorno[r.date] || { date: r.date, page_view: 0, tag_scan: 0, link_click: 0 };
      perGiorno[r.date][r.event_type] += r.count;
      if (r.event_type === "tag_scan" && r.tag_id) perTag[r.tag_id] = (perTag[r.tag_id] || 0) + r.count;
    });

    const dataOggi = oggi.toISOString().slice(0, 10);
    perGiorno[dataOggi] = perGiorno[dataOggi] || { date: dataOggi, page_view: 0, tag_scan: 0, link_click: 0 };
    eventiOggi.forEach(e => {
      totali[e.event_type] = (totali[e.event_type] || 0) + 1;
      perGiorno[dataOggi][e.event_type] += 1;
      if (e.event_type === "tag_scan" && e.tag_id) perTag[e.tag_id] = (perTag[e.tag_id] || 0) + 1;
    });

    const idTag = Object.keys(perTag).map(Number);
    const tags = idTag.length ? await Tag.findAll({ where: { id: idTag } }) : [];
    const mappaTag = new Map(tags.map(t => [t.id, t]));

    res.json({
      range,
      totali,
      serieGiornaliera: Object.values(perGiorno).sort((a, b) => (a.date < b.date ? -1 : 1)),
      perTag: idTag.map(id => ({
        tag_id: id,
        code: mappaTag.get(id)?.code || "—",
        label: mappaTag.get(id)?.label || null,
        scansioni: perTag[id],
      })).sort((a, b) => b.scansioni - a.scansioni),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { statistiche };
