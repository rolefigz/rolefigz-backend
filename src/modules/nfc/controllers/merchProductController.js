const { MerchProduct } = require("../../../models");
const { registraAzione } = require("../services/auditLogService");

const listaProdotti = async (req, res) => {
  try {
    const prodotti = await MerchProduct.findAll({ order: [["position", "ASC"], ["id", "ASC"]] });
    res.json(prodotti);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const creaProdotto = async (req, res) => {
  try {
    const { name, description, price_cents, min_quantity, internal_cost_cents, production_days, position } = req.body;
    const image = req.file ? (req.file.path || req.file.secure_url) : null;

    const prodotto = await MerchProduct.create({
      name, description: description || null, image,
      price_cents, min_quantity: min_quantity || 1,
      internal_cost_cents: internal_cost_cents || null,
      production_days: production_days || null, position: position || 0,
    });
    await registraAzione({ actorUserId: req.usuario.id, action: "merch_product_created", details: { id: prodotto.id, name } });
    res.status(201).json(prodotto);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const aggiornaProdotto = async (req, res) => {
  try {
    const prodotto = await MerchProduct.findByPk(req.params.id);
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });

    const { name, description, price_cents, min_quantity, internal_cost_cents, production_days, position, active } = req.body;
    const image = req.file ? (req.file.path || req.file.secure_url) : undefined;

    if (price_cents !== undefined && !(parseInt(price_cents, 10) >= 0)) {
      return res.status(400).json({ error: "Prezzo non valido" });
    }
    if (min_quantity !== undefined && !(parseInt(min_quantity, 10) >= 1)) {
      return res.status(400).json({ error: "La quantita' minima deve essere almeno 1" });
    }

    await prodotto.update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price_cents !== undefined && { price_cents: parseInt(price_cents, 10) }),
      ...(min_quantity !== undefined && { min_quantity: parseInt(min_quantity, 10) }),
      ...(internal_cost_cents !== undefined && { internal_cost_cents }),
      ...(production_days !== undefined && { production_days }),
      ...(position !== undefined && { position }),
      ...(active !== undefined && { active }),
      ...(image !== undefined && { image }),
    });
    await registraAzione({ actorUserId: req.usuario.id, action: "merch_product_updated", details: { id: prodotto.id } });
    res.json(prodotto);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listaProdotti, creaProdotto, aggiornaProdotto };
