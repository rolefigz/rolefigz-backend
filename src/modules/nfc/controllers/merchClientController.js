const { MerchProduct, MerchOrder, MerchOrderItem } = require("../../../models");
const { creaOrdine } = require("../services/merchOrderService");
const { calcolaSaldoCrediti } = require("../services/subscriptionService");
const { unitaAReale } = require("../utils/crediti");

function ordineConCreditiReali(ordine) {
  const o = ordine.toJSON ? ordine.toJSON() : ordine;
  return {
    ...o,
    credits_used: unitaAReale(o.credits_used),
    items: (o.items || []).map(it => ({ ...it, credits_each: unitaAReale(it.credits_each) })),
  };
}

const listaProdottiCatalogo = async (req, res) => {
  try {
    const prodotti = await MerchProduct.findAll({ where: { active: true }, order: [["position", "ASC"], ["id", "ASC"]] });
    const creditiSaldo = await calcolaSaldoCrediti(req.azienda.id);
    res.json({
      prodotti: prodotti.map(p => ({ ...p.toJSON(), credit_cost: unitaAReale(p.credit_cost) })),
      creditiSaldo: unitaAReale(creditiSaldo),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const creaOrdineCliente = async (req, res) => {
  try {
    const { items, delivery_method, shipping_address, notes, conferma_eccedenza } = req.body;
    const risultato = await creaOrdine({
      companyId: req.azienda.id, items, deliveryMethod: delivery_method,
      shippingAddress: shipping_address, notes, actorUserId: req.usuario.id,
      confermaEccedenza: !!conferma_eccedenza,
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
    res.json(ordini.map(ordineConCreditiReali));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listaProdottiCatalogo, creaOrdineCliente, listaMieiOrdini };
