const { Op, fn, col, literal } = require("sequelize");
const geoip = require("geoip-lite");
const { Visita, Producto, Orden, DetalleOrden } = require("../models");

// ── POST /api/analytics/track — registrar visita (público) ──────────────────
const trackVisita = async (req, res) => {
  try {
    const { tipo = "home", producto_id } = req.body;

    const rawIp = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "0.0.0.0";
    // Anonimizar último octeto (GDPR)
    const parts  = rawIp.split(".");
    const ipAnon = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : rawIp;

    const geo    = geoip.lookup(rawIp);
    const pais   = geo?.country || null;
    const ciudad = geo?.city    || null;

    await Visita.create({ tipo, producto_id: producto_id || null, pais, ciudad, ip: ipAnon });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/analytics/resumen — KPIs globales (admin) ──────────────────────
const getResumen = async (req, res) => {
  try {
    const hoyInicio = new Date(); hoyInicio.setHours(0, 0, 0, 0);
    const semanaAtras = new Date(); semanaAtras.setDate(semanaAtras.getDate() - 7);

    const [totalVisitas, visitasHoy, visitasSemana, totalOrdenes, ingresoTotal, ordenesSemana, ingresoSemana] =
      await Promise.all([
        Visita.count(),
        Visita.count({ where: { createdAt: { [Op.gte]: hoyInicio } } }),
        Visita.count({ where: { createdAt: { [Op.gte]: semanaAtras } } }),
        Orden.count({ where: { estado: { [Op.ne]: "cancelado" } } }),
        Orden.sum("total", { where: { estado: { [Op.ne]: "cancelado" } } }),
        Orden.count({ where: { estado: { [Op.ne]: "cancelado" }, createdAt: { [Op.gte]: semanaAtras } } }),
        Orden.sum("total", { where: { estado: { [Op.ne]: "cancelado" }, createdAt: { [Op.gte]: semanaAtras } } }),
      ]);

    const conversion = totalVisitas > 0 ? ((totalOrdenes / totalVisitas) * 100).toFixed(1) : "0.0";

    res.json({
      totalVisitas, visitasHoy, visitasSemana,
      totalOrdenes, ordenesSemana,
      ingresoTotal:   parseFloat(ingresoTotal  || 0).toFixed(2),
      ingresoSemana:  parseFloat(ingresoSemana || 0).toFixed(2),
      conversion,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/analytics/visitas?dias=30 — visitas por día (admin) ────────────
const getVisitasPorDia = async (req, res) => {
  try {
    const dias  = Math.min(parseInt(req.query.dias) || 30, 365);
    const desde = new Date(); desde.setDate(desde.getDate() - dias);

    const rows = await Visita.findAll({
      attributes: [[fn("DATE", col("createdAt")), "fecha"], [fn("COUNT", col("id")), "total"]],
      where:  { createdAt: { [Op.gte]: desde } },
      group:  [fn("DATE", col("createdAt"))],
      order:  [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true,
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/analytics/ingresos?dias=30 — ingresos por día (admin) ──────────
const getIngresosPorDia = async (req, res) => {
  try {
    const dias  = Math.min(parseInt(req.query.dias) || 30, 365);
    const desde = new Date(); desde.setDate(desde.getDate() - dias);

    const rows = await Orden.findAll({
      attributes: [
        [fn("DATE", col("createdAt")), "fecha"],
        [fn("COUNT", col("id")),  "ordenes"],
        [fn("SUM",   col("total")), "total"],
      ],
      where: { createdAt: { [Op.gte]: desde }, estado: { [Op.ne]: "cancelado" } },
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true,
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/analytics/paises — top países por visitas (admin) ───────────────
const getPaises = async (req, res) => {
  try {
    const rows = await Visita.findAll({
      attributes: ["pais", [fn("COUNT", col("id")), "total"]],
      where: { pais: { [Op.ne]: null } },
      group: ["pais"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      limit: 10,
      raw: true,
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/analytics/productos — top productos más vistos (admin) ──────────
const getProductosTop = async (req, res) => {
  try {
    const rows = await Visita.findAll({
      attributes: ["producto_id", [fn("COUNT", col("id")), "visitas"]],
      where: { tipo: "producto", producto_id: { [Op.ne]: null } },
      group: ["producto_id"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      limit: 10,
      raw: true,
    });
    if (!rows.length) return res.json([]);
    const ids   = rows.map(r => r.producto_id);
    const prods = await Producto.findAll({ where: { id: ids }, attributes: ["id", "nombre", "precio"], raw: true });
    const map   = Object.fromEntries(prods.map(p => [p.id, p]));
    res.json(rows.map(r => ({ ...r, nombre: map[r.producto_id]?.nombre || "—", precio: map[r.producto_id]?.precio })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/analytics/vendidos — top productos más vendidos (admin) ─────────
const getProductosVendidos = async (req, res) => {
  try {
    const rows = await DetalleOrden.findAll({
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
    if (!rows.length) return res.json([]);
    const ids   = rows.map(r => r.producto_id);
    const prods = await Producto.findAll({ where: { id: ids }, attributes: ["id", "nombre"], raw: true });
    const map   = Object.fromEntries(prods.map(p => [p.id, p]));
    res.json(rows.map(r => ({
      producto_id: r.producto_id,
      nombre:   map[r.producto_id]?.nombre || "—",
      unidades: parseInt(r.unidades),
      ingresos: parseFloat(r.ingresos).toFixed(2),
      ordenes:  parseInt(r.ordenes),
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/analytics/estados — distribución de estados de órdenes (admin) ─
const getEstadosOrdenes = async (req, res) => {
  try {
    const rows = await Orden.findAll({
      attributes: ["estado", [fn("COUNT", col("id")), "total"]],
      group: ["estado"],
      raw: true,
    });
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { trackVisita, getResumen, getVisitasPorDia, getIngresosPorDia, getPaises, getProductosTop, getProductosVendidos, getEstadosOrdenes };
