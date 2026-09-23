const { Op } = require("sequelize");
const { sequelize, MerchOrder, MerchOrderItem, MerchProduct, Company } = require("../../../models");
const { cambiaStatoOrdine, STATI_ATTIVI_PRODUZIONE } = require("../services/merchOrderService");
const { STATI_ORDINE } = require("../models/MerchOrder");

const listaOrdini = async (req, res) => {
  try {
    const where = {};
    if (req.query.company_id) where.company_id = req.query.company_id;
    if (req.query.status) where.status = req.query.status;

    const ordini = await MerchOrder.findAll({
      where,
      include: [
        { model: Company, attributes: ["id", "name", "slug"] },
        { model: MerchOrderItem, as: "items", include: [{ model: MerchProduct, attributes: ["id", "name"] }] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(ordini);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const cambiaStato = async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATI_ORDINE.includes(status)) return res.status(400).json({ error: "Stato non valido" });
    const ordine = await cambiaStatoOrdine({ orderId: req.params.id, status, actorUserId: req.usuario.id });
    res.json(ordine);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const riepilogoProduzione = async (req, res) => {
  try {
    const ordiniAttivi = await MerchOrder.findAll({
      where: { status: { [Op.in]: STATI_ATTIVI_PRODUZIONE } }, attributes: ["id"],
    });
    const orderIds = ordiniAttivi.map(o => o.id);
    if (!orderIds.length) return res.json([]);

    const righe = await MerchOrderItem.findAll({
      where: { order_id: { [Op.in]: orderIds } },
      attributes: ["product_id", [sequelize.fn("SUM", sequelize.col("quantity")), "totale"]],
      group: ["product_id"],
      raw: true,
    });

    const prodotti = await MerchProduct.findAll({
      where: { id: righe.map(r => r.product_id) }, attributes: ["id", "name", "production_days"],
    });
    const mappaProdotti = new Map(prodotti.map(p => [p.id, p]));

    res.json(righe.map(r => ({
      product_id: r.product_id,
      name: mappaProdotti.get(r.product_id)?.name || "—",
      production_days: mappaProdotti.get(r.product_id)?.production_days ?? null,
      quantity: parseInt(r.totale, 10),
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listaOrdini, cambiaStato, riepilogoProduzione };
