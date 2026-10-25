const { MerchProduct } = require("../../../models");
const { renderLandingNfc } = require("../views/renderLandingNfc");
const pageCache = require("../utils/pageCache");

const CACHE_KEY = "__landing_nfc__";

async function mostraLanding(req, res) {
  const cache = pageCache.get(CACHE_KEY);
  if (cache) {
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.send(cache);
  }

  const prodotti = await MerchProduct.findAll({ where: { active: true }, order: [["position", "ASC"], ["id", "ASC"]] });
  const html = renderLandingNfc(prodotti);
  pageCache.set(CACHE_KEY, html);

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

module.exports = { mostraLanding, CACHE_KEY };
