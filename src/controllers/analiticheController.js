const { Op, fn, col } = require("sequelize");
const geoip = require("geoip-lite");
const { Visita, Prodotto, Ordine, DettaglioOrdine } = require("../models");

// POST /api/analytics/track — registra visita (pubblico)
const trackVisita = async (req, res) => {
  try {
    const { tipo = "home", producto_id } = req.body;

    const rawIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "0.0.0.0";
    // Anonimizza ultimo ottetto (GDPR)
    const parti  = rawIp.split(".");
    const ipAnon = parti.length === 4 ? `${parti[0]}.${parti[1]}.${parti[2]}.0` : rawIp;

    const geo    = geoip.lookup(rawIp);
    const pais   = geo?.country || null;
    const ciudad = geo?.city    || null;

    await Visita.create({ tipo, producto_id: producto_id || null, pais, ciudad, ip: ipAnon });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/analytics/resumen — KPI globali (admin)
const getResumen = async (req, res) => {
  try {
    const oggiInizio  = new Date(); oggiInizio.setHours(0, 0, 0, 0);
    const settimanaFa = new Date(); settimanaFa.setDate(settimanaFa.getDate() - 7);

    const [totalVisitas, visitasHoy, visitasSemana, totalOrdenes, ingresoTotal, ordenesSemana, ingresoSemana] =
      await Promise.all([
        Visita.count(),
        Visita.count({ where: { createdAt: { [Op.gte]: oggiInizio } } }),
        Visita.count({ where: { createdAt: { [Op.gte]: settimanaFa } } }),
        Ordine.count({ where: { estado: { [Op.ne]: "cancelado" } } }),
        Ordine.sum("total", { where: { estado: { [Op.ne]: "cancelado" } } }),
        Ordine.count({ where: { estado: { [Op.ne]: "cancelado" }, createdAt: { [Op.gte]: settimanaFa } } }),
        Ordine.sum("total", { where: { estado: { [Op.ne]: "cancelado" }, createdAt: { [Op.gte]: settimanaFa } } }),
      ]);

    const conversion = totalVisitas > 0 ? ((totalOrdenes / totalVisitas) * 100).toFixed(1) : "0.0";

    res.json({
      totalVisitas, visitasHoy, visitasSemana,
      totalOrdenes, ordenesSemana,
      ingresoTotal:  parseFloat(ingresoTotal  || 0).toFixed(2),
      ingresoSemana: parseFloat(ingresoSemana || 0).toFixed(2),
      conversion,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/analytics/visitas?dias=30 — visite per giorno (admin)
const getVisitasPorDia = async (req, res) => {
  try {
    const giorni = Math.min(parseInt(req.query.dias) || 30, 365);
    const da     = new Date(); da.setDate(da.getDate() - giorni);

    const righe = await Visita.findAll({
      attributes: [[fn("DATE", col("createdAt")), "fecha"], [fn("COUNT", col("id")), "total"]],
      where:  { createdAt: { [Op.gte]: da } },
      group:  [fn("DATE", col("createdAt"))],
      order:  [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true,
    });
    res.json(righe);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/analytics/ingresos?dias=30 — incassi per giorno (admin)
const getIngresosPorDia = async (req, res) => {
  try {
    const giorni = Math.min(parseInt(req.query.dias) || 30, 365);
    const da     = new Date(); da.setDate(da.getDate() - giorni);

    const righe = await Ordine.findAll({
      attributes: [
        [fn("DATE", col("createdAt")), "fecha"],
        [fn("COUNT", col("id")),   "ordenes"],
        [fn("SUM",   col("total")), "total"],
      ],
      where: { createdAt: { [Op.gte]: da }, estado: { [Op.ne]: "cancelado" } },
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true,
    });
    res.json(righe);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/analytics/paises — top paesi per visite (admin)
const getPaises = async (req, res) => {
  try {
    const righe = await Visita.findAll({
      attributes: ["pais", [fn("COUNT", col("id")), "total"]],
      where: { pais: { [Op.ne]: null } },
      group: ["pais"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      limit: 10,
      raw: true,
    });
    res.json(righe);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/analytics/productos — top prodotti più visti (admin)
const getProductosTop = async (req, res) => {
  try {
    const righe = await Visita.findAll({
      attributes: ["producto_id", [fn("COUNT", col("id")), "visitas"]],
      where: { tipo: "producto", producto_id: { [Op.ne]: null } },
      group: ["producto_id"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      limit: 10,
      raw: true,
    });
    if (!righe.length) return res.json([]);
    const ids      = righe.map(r => r.producto_id);
    const prodotti = await Prodotto.findAll({ where: { id: ids }, attributes: ["id", "nombre", "precio"], raw: true });
    const mappa    = Object.fromEntries(prodotti.map(p => [p.id, p]));
    res.json(righe.map(r => ({ ...r, nombre: mappa[r.producto_id]?.nombre || "—", precio: mappa[r.producto_id]?.precio })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/analytics/vendidos — top prodotti più venduti (admin)
const getProductosVendidos = async (req, res) => {
  try {
    const righe = await DettaglioOrdine.findAll({
      attributes: [
        "producto_id",
        [fn("SUM", col("cantidad")), "unidades"],
        [fn("SUM", col("subtotal")), "ingresos"],
        [fn("COUNT", col("orden_id")), "ordenes"],
      ],
      group: ["producto_id"],
      order: [[fn("SUM", col("cantidad")), "DESC"]],
      limit: 10,
      raw: true,
    });
    if (!righe.length) return res.json([]);
    const ids      = righe.map(r => r.producto_id);
    const prodotti = await Prodotto.findAll({ where: { id: ids }, attributes: ["id", "nombre"], raw: true });
    const mappa    = Object.fromEntries(prodotti.map(p => [p.id, p]));
    res.json(righe.map(r => ({
      producto_id: r.producto_id,
      nombre:   mappa[r.producto_id]?.nombre || "—",
      unidades: parseInt(r.unidades),
      ingresos: parseFloat(r.ingresos).toFixed(2),
      ordenes:  parseInt(r.ordenes),
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/analytics/estados — distribuzione stati ordini (admin)
const getEstadosOrdenes = async (req, res) => {
  try {
    const righe = await Ordine.findAll({
      attributes: ["estado", [fn("COUNT", col("id")), "total"]],
      group: ["estado"],
      raw: true,
    });
    res.json(righe);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { trackVisita, getResumen, getVisitasPorDia, getIngresosPorDia, getPaises, getProductosTop, getProductosVendidos, getEstadosOrdenes };
