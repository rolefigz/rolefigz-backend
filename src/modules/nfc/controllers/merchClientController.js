const { MerchProduct, MerchOrder, MerchOrderItem } = require("../../../models");
const { creaOrdine } = require("../services/merchOrderService");

const listaProdottiCatalogo = async (req, res) => {
  try {
    const prodotti = await MerchProduct.findAll({ where: { active: true }, order: [["position", "ASC"], ["id", "ASC"]] });
    res.json({ prodotti });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const creaOrdineCliente = async (req, res) => {
  try {
    const { items, delivery_method, shipping_address, notes } = req.body;
    const risultato = await creaOrdine({
      companyId: req.azienda.id, items, deliveryMethod: delivery_method,
      shippingAddress: shipping_address, notes, actorUserId: req.usuario.id,
    });
    res.status(201).json(risultato);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, ...(err.dettagli && { dettagli: err.dettagli }) });
  }
};

const listaMieiOrdini = async (req, res) => {
  try {
    const ordini = await MerchOrder.findAll({
      where: { company_id: req.azienda.id },
      include: [{ model: MerchOrderItem, as: "items", include: [{ model: MerchProduct, attributes: ["id", "name", "image"] }] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(ordini);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listaProdottiCatalogo, creaOrdineCliente, listaMieiOrdini };
