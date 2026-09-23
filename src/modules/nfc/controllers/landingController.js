const { Plan } = require("../../../models");
const { renderLandingNfc } = require("../views/renderLandingNfc");
const pageCache = require("../utils/pageCache");

const CACHE_KEY = "__landing_nfc__";

async function mostraLanding(req, res) {
  const cache = pageCache.get(CACHE_KEY);
  if (cache) {
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.send(cache);
  }

  const piani = await Plan.findAll({ where: { active: true }, order: [["position", "ASC"], ["id", "ASC"]] });
  const html = renderLandingNfc(piani);
  pageCache.set(CACHE_KEY, html);

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

module.exports = { mostraLanding, CACHE_KEY };
