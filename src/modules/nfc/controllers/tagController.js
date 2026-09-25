const { Tag, Company } = require("../../../models");
const { generaCodiceUnivoco } = require("../utils/tagCode");
const { registraAzione } = require("../services/auditLogService");
const ErroreAzienda = require("../utils/erroreAzienda");
const { generaPng, generaSvg } = require("../utils/qrGenerator");

// Il link che va programmato sul tag fisico (NFC) o stampato come QR —
// stessa rotta /t/:code che poi registra lo scan e reindirizza alla pagina.
function urlTag(tag) {
  const base = process.env.NFC_PUBLIC_BASE_URL || "";
  return `${base}/t/${tag.code}`;
}

const listaTag = async (req, res) => {
  try {
    const where = {};
    if (req.query.company_id) where.company_id = req.query.company_id;
    if (req.query.non_assegnati === "true") where.company_id = null;

    const tags = await Tag.findAll({
      where,
      include: [{ model: Company, attributes: ["id", "name", "slug"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(tags.map(t => ({ ...t.toJSON(), url: urlTag(t) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const creaTag = async (req, res) => {
  try {
    const { type, quantity, label, company_id } = req.body;
    const qty = Math.min(parseInt(quantity, 10) || 1, 100);

    if (company_id) {
      const azienda = await Company.findByPk(company_id);
      if (!azienda) return res.status(400).json({ error: "Azienda non valida" });
    }

    const creati = [];
    for (let i = 0; i < qty; i++) {
      const code = await generaCodiceUnivoco();
      const tag = await Tag.create({
        code, type: type === "nfc" ? "nfc" : "qr",
        label: label || null, company_id: company_id || null,
      });
      creati.push(tag);
    }

    await registraAzione({
      actorUserId: req.usuario.id, companyId: company_id || null, action: "tags_created",
      details: { quantity: qty, type, codici: creati.map(t => t.code) },
    });

    res.status(201).json(creati);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const aggiornaTag = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ error: "Tag non trovato" });

    const { label, company_id, is_active } = req.body;

    if (company_id !== undefined && company_id !== tag.company_id) {
      if (company_id) {
        const azienda = await Company.findByPk(company_id);
        if (!azienda) throw new ErroreAzienda("Azienda non valida", 400);
      }
      await registraAzione({
        actorUserId: req.usuario.id, companyId: company_id || tag.company_id,
        action: "tag_reassigned", details: { tagId: tag.id, code: tag.code, da: tag.company_id, a: company_id || null },
      });
    }

    await tag.update({
      ...(label !== undefined && { label }),
      ...(company_id !== undefined && { company_id: company_id || null }),
      ...(is_active !== undefined && { is_active }),
    });

    res.json(tag);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

// Un solo link per azienda, riusabile su tutti i suoi tag fisici (portachiavi,
// calamite, ecc.) — non serve un codice diverso per ogni oggetto stampato.
// Idempotente: se l'azienda ha gia' un tag lo riusa, altrimenti ne crea uno.
const otteniLinkAzienda = async (req, res) => {
  try {
    const azienda = await Company.findByPk(req.params.id);
    if (!azienda) return res.status(404).json({ error: "Azienda non trovata" });

    let tag = await Tag.findOne({ where: { company_id: azienda.id }, order: [["createdAt", "ASC"]] });
    if (!tag) {
      const code = await generaCodiceUnivoco();
      tag = await Tag.create({ code, type: "nfc", company_id: azienda.id });
      await registraAzione({
        actorUserId: req.usuario.id, companyId: azienda.id, action: "tags_created",
        details: { quantity: 1, type: "nfc", codici: [code] },
      });
    }
    res.json({ ...tag.toJSON(), url: urlTag(tag) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const scaricaQrPng = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ error: "Tag non trovato" });
    const buffer = await generaPng(urlTag(tag));
    res.set("Content-Type", "image/png");
    res.set("Content-Disposition", `attachment; filename="nfc-${tag.code}.png"`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const scaricaQrSvg = async (req, res) => {
  try {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) return res.status(404).json({ error: "Tag non trovato" });
    const svg = await generaSvg(urlTag(tag));
    res.set("Content-Type", "image/svg+xml");
    res.set("Content-Disposition", `attachment; filename="nfc-${tag.code}.svg"`);
    res.send(svg);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { listaTag, creaTag, aggiornaTag, otteniLinkAzienda, scaricaQrPng, scaricaQrSvg };
