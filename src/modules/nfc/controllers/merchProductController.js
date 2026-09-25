const { MerchProduct } = require("../../../models");
const { registraAzione } = require("../services/auditLogService");
const { unitaAReale, realeAUnita } = require("../utils/crediti");

function prodottoConCreditiReali(prodotto) {
  const p = prodotto.toJSON ? prodotto.toJSON() : prodotto;
  return { ...p, credit_cost: unitaAReale(p.credit_cost) };
}

const listaProdotti = async (req, res) => {
  try {
    const prodotti = await MerchProduct.findAll({ order: [["position", "ASC"], ["id", "ASC"]] });
    res.json(prodotti.map(prodottoConCreditiReali));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const creaProdotto = async (req, res) => {
  try {
    const { name, description, credit_cost, extra_price_cents, internal_cost_cents, production_days, position } = req.body;
    const image = req.file ? (req.file.path || req.file.secure_url) : null;

    const prodotto = await MerchProduct.create({
      name, description: description || null, image,
      credit_cost, extra_price_cents: extra_price_cents || 0,
      internal_cost_cents: internal_cost_cents || null,
      production_days: production_days || null, position: position || 0,
    });
    await registraAzione({ actorUserId: req.usuario.id, action: "merch_product_created", details: { id: prodotto.id, name } });
    res.status(201).json(prodottoConCreditiReali(prodotto));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const aggiornaProdotto = async (req, res) => {
  try {
    const prodotto = await MerchProduct.findByPk(req.params.id);
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });

    const { name, description, credit_cost, extra_price_cents, internal_cost_cents, production_days, position, active } = req.body;
    const image = req.file ? (req.file.path || req.file.secure_url) : undefined;

    if (credit_cost !== undefined && (isNaN(parseFloat(credit_cost)) || Math.round(parseFloat(credit_cost) * 2) !== parseFloat(credit_cost) * 2)) {
      return res.status(400).json({ error: "I crediti devono essere multipli di 0,5" });
    }

    await prodotto.update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(credit_cost !== undefined && { credit_cost: realeAUnita(credit_cost) }),
      ...(extra_price_cents !== undefined && { extra_price_cents }),
      ...(internal_cost_cents !== undefined && { internal_cost_cents }),
      ...(production_days !== undefined && { production_days }),
      ...(position !== undefined && { position }),
      ...(active !== undefined && { active }),
      ...(image !== undefined && { image }),
    });
    await registraAzione({ actorUserId: req.usuario.id, action: "merch_product_updated", details: { id: prodotto.id } });
    res.json(prodottoConCreditiReali(prodotto));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listaProdotti, creaProdotto, aggiornaProdotto };
