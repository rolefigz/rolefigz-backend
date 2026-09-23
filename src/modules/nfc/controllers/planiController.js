const { Plan } = require("../../../models");
const { registraAzione } = require("../services/auditLogService");
const pageCache = require("../utils/pageCache");
const { CACHE_KEY: LANDING_CACHE_KEY } = require("./landingController");

const listaPiani = async (req, res) => {
  try {
    const piani = await Plan.findAll({ order: [["position", "ASC"], ["id", "ASC"]] });
    res.json(piani);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const creaPiano = async (req, res) => {
  try {
    const { name, monthly_price_cents, monthly_credits, features, limits, position } = req.body;
    const piano = await Plan.create({
      name, monthly_price_cents, monthly_credits,
      features: features || null, limits: limits || null, position: position || 0,
    });
    await registraAzione({ actorUserId: req.usuario.id, action: "plan_created", details: { id: piano.id, name } });
    pageCache.invalidate(LANDING_CACHE_KEY);
    res.status(201).json(piano);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const aggiornaPiano = async (req, res) => {
  try {
    const piano = await Plan.findByPk(req.params.id);
    if (!piano) return res.status(404).json({ error: "Piano non trovato" });

    const { name, monthly_price_cents, monthly_credits, features, limits, position, active } = req.body;
    await piano.update({
      ...(name !== undefined && { name }),
      ...(monthly_price_cents !== undefined && { monthly_price_cents }),
      ...(monthly_credits !== undefined && { monthly_credits }),
      ...(features !== undefined && { features }),
      ...(limits !== undefined && { limits }),
      ...(position !== undefined && { position }),
      ...(active !== undefined && { active }),
    });
    await registraAzione({ actorUserId: req.usuario.id, action: "plan_updated", details: { id: piano.id } });
    pageCache.invalidate(LANDING_CACHE_KEY);
    res.json(piano);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listaPiani, creaPiano, aggiornaPiano };
