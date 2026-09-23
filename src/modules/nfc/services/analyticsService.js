const geoip = require("geoip-lite");
const { AnalyticsEvent } = require("../../../models");
const { otteniSaleOggi, hashVisitatore } = require("./analyticsSalt");

const BOT_REGEX = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview|monitor|headless/i;

function estraiIp(req) {
  return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "0.0.0.0";
}

// Registra un evento (page_view/tag_scan/link_click) in modo GDPR-safe: mai
// l'IP in chiaro, solo un hash con sale giornaliero e il paese derivato.
async function registraEvento(eventType, { companyId, tag = null, link = null }, req) {
  const userAgent = req.headers["user-agent"] || "";
  if (BOT_REGEX.test(userAgent)) return;

  const ip = estraiIp(req);
  const [sale, geo] = await Promise.all([otteniSaleOggi(), Promise.resolve(geoip.lookup(ip))]);

  await AnalyticsEvent.create({
    company_id: companyId,
    event_type: eventType,
    tag_id: tag?.id || null,
    link_id: link?.id || null,
    device_type: /mobile|android|iphone/i.test(userAgent) ? "mobile" : "desktop",
    country: geo?.country || null,
    visitor_hash: hashVisitatore(ip, userAgent, sale),
  });
}

module.exports = { registraEvento };
