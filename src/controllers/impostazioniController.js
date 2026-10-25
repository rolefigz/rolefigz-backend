const { Impostazione } = require("../models");

const CHIAVI_VALIDE = ["stripe_attivo"];

async function get(chiave) {
  const row = await Impostazione.findOne({ where: { chiave } });
  return row ? row.valore : null;
}

async function set(chiave, valore) {
  await Impostazione.upsert({ chiave, valore: String(valore) });
}

const getAll = async (req, res) => {
  try {
    const rows = await Impostazione.findAll({ where: { chiave: CHIAVI_VALIDE } });
    const result = {};
    rows.forEach(r => { result[r.chiave] = r.valore; });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const aggiorna = async (req, res) => {
  try {
    const { chiave, valore } = req.body;
    if (!CHIAVI_VALIDE.includes(chiave))
      return res.status(400).json({ error: "Chiave non valida" });
    await set(chiave, valore);
    res.json({ ok: true, chiave, valore });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { get, set, getAll, aggiorna };
