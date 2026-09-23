const { Tag } = require("../../../models");
const { generaPng, generaSvg } = require("../utils/qrGenerator");

const listaMieiTag = async (req, res) => {
  try {
    const tags = await Tag.findAll({ where: { company_id: req.azienda.id }, order: [["createdAt", "DESC"]] });
    res.json(tags);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

function urlTag(tag) {
  const base = process.env.NFC_PUBLIC_BASE_URL || "";
  return `${base}/t/${tag.code}`;
}

const scaricaQrPng = async (req, res) => {
  try {
    const tag = await Tag.findOne({ where: { id: req.params.id, company_id: req.azienda.id } });
    if (!tag) return res.status(404).json({ error: "Tag non trovato" });
    const buffer = await generaPng(urlTag(tag));
    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `attachment; filename="nfc-${tag.code}.png"`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const scaricaQrSvg = async (req, res) => {
  try {
    const tag = await Tag.findOne({ where: { id: req.params.id, company_id: req.azienda.id } });
    if (!tag) return res.status(404).json({ error: "Tag non trovato" });
    const svg = await generaSvg(urlTag(tag));
    res.set("Content-Type", "image/svg+xml");
    res.set("Content-Disposition", `attachment; filename="nfc-${tag.code}.svg"`);
    res.send(svg);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listaMieiTag, scaricaQrPng, scaricaQrSvg };
