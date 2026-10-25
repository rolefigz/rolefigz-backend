const {
  sequelize, Company, Subscription, CompanyPage, Payment, MerchOrder,
} = require("../../../models");
const { Utente } = require("../../../models");
const { risolviProprietario, reimpostaPassword } = require("../services/ownerService");
const {
  registraPagamentoContanti, attivaProva, attivaIndefinitamente,
} = require("../services/subscriptionService");
const { registraAzione } = require("../services/auditLogService");
const { SLUG_RISERVATI } = require("../utils/reservedSlugs");
const ErroreAzienda = require("../utils/erroreAzienda");
const pageCache = require("../utils/pageCache");
const { pianoUnico } = require("../utils/abbonamento");

const listaAziende = async (req, res) => {
  try {
    const aziende = await Company.findAll({
      include: [
        { model: Utente, attributes: ["id", "nombre", "email"] },
        { model: Subscription },
        { model: CompanyPage, attributes: ["is_published"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    const ordini = await MerchOrder.findAll({
      attributes: ["company_id", [sequelize.fn("COUNT", sequelize.col("id")), "totale"]],
      group: ["company_id"],
      raw: true,
    });
    const ordiniPerAzienda = Object.fromEntries(ordini.map(o => [o.company_id, parseInt(o.totale, 10)]));

    res.json(aziende.map(a => ({
      ...a.toJSON(),
      ordiniTotali: ordiniPerAzienda[a.id] || 0,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const ottieniAzienda = async (req, res) => {
  try {
    const azienda = await Company.findByPk(req.params.id, {
      include: [
        { model: Utente, attributes: ["id", "nombre", "email", "telefono"] },
        { model: Subscription },
        { model: CompanyPage },
      ],
    });
    if (!azienda) return res.status(404).json({ error: "Azienda non trovata" });

    const pagamenti = await Payment.findAll({ where: { company_id: azienda.id }, order: [["received_at", "DESC"]], limit: 50 });
    res.json({ azienda, pagamenti });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const creaAzienda = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      name, slug, sector, piva, codice_fiscale, codice_sdi, pec,
      owner_user_id, owner_nombre, owner_email,
    } = req.body;

    const slugPulito = String(slug).trim().toLowerCase();
    if (SLUG_RISERVATI.includes(slugPulito)) throw new ErroreAzienda("Questo slug e' riservato", 400);

    const esisteSlug = await Company.findOne({ where: { slug: slugPulito }, transaction: t });
    if (esisteSlug) throw new ErroreAzienda("Slug gia' in uso", 400);

    const piano = await pianoUnico(t);

    const { utente, passwordGenerata } = await risolviProprietario({ owner_user_id, owner_nombre, owner_email }, t);

    const azienda = await Company.create({
      owner_user_id: utente.id, name, slug: slugPulito, sector: sector || null,
      piva: piva || null, codice_fiscale: codice_fiscale || null, codice_sdi: codice_sdi || null, pec: pec || null,
    }, { transaction: t });

    await Subscription.create({
      company_id: azienda.id, plan_id: piano.id, status: "inactive", started_at: new Date(),
    }, { transaction: t });

    await registraAzione({
      actorUserId: req.usuario.id, companyId: azienda.id, action: "company_created",
      details: { name, slug: slugPulito, ownerCreato: !!passwordGenerata },
    }, t);

    await t.commit();
    res.status(201).json({
      azienda,
      proprietario: { id: utente.id, email: utente.email, nombre: utente.nombre },
      passwordGenerata,
    });
  } catch (err) {
    await t.rollback();
    res.status(err.status || 500).json({ error: err.message });
  }
};

const aggiornaAzienda = async (req, res) => {
  try {
    const azienda = await Company.findByPk(req.params.id);
    if (!azienda) return res.status(404).json({ error: "Azienda non trovata" });

    const { name, sector, piva, codice_fiscale, codice_sdi, pec } = req.body;
    await azienda.update({
      ...(name !== undefined && { name }),
      ...(sector !== undefined && { sector }),
      ...(piva !== undefined && { piva }),
      ...(codice_fiscale !== undefined && { codice_fiscale }),
      ...(codice_sdi !== undefined && { codice_sdi }),
      ...(pec !== undefined && { pec }),
    });

    await registraAzione({ actorUserId: req.usuario.id, companyId: azienda.id, action: "company_updated", details: req.body });
    res.json(azienda);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const cambiaStato = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) return res.status(400).json({ error: "Stato non valido" });

    const azienda = await Company.findByPk(req.params.id);
    if (!azienda) return res.status(404).json({ error: "Azienda non trovata" });

    await azienda.update({ status });
    pageCache.invalidate(azienda.slug);
    await registraAzione({
      actorUserId: req.usuario.id, companyId: azienda.id,
      action: status === "suspended" ? "company_suspended" : "company_reactivated",
    });
    res.json(azienda);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const eliminaAzienda = async (req, res) => {
  try {
    const azienda = await Company.findByPk(req.params.id);
    if (!azienda) return res.status(404).json({ error: "Azienda non trovata" });

    await azienda.destroy();
    pageCache.invalidate(azienda.slug);
    await registraAzione({ actorUserId: req.usuario.id, companyId: azienda.id, action: "company_deleted" });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const registraPagamento = async (req, res) => {
  try {
    const { amount_cents, months_covered, received_at, note } = req.body;
    const risultato = await registraPagamentoContanti({
      companyId: req.params.id, amountCents: amount_cents, monthsCovered: months_covered,
      receivedAt: received_at, note, actorUserId: req.usuario.id,
    });
    res.status(201).json(risultato);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const attivaProvaController = async (req, res) => {
  try {
    const subscription = await attivaProva({ companyId: req.params.id, actorUserId: req.usuario.id });
    res.json(subscription);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

const attivaIndefinitamenteController = async (req, res) => {
  try {
    const subscription = await attivaIndefinitamente({ companyId: req.params.id, actorUserId: req.usuario.id });
    res.json(subscription);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

// Rigenera la password dell'account del cliente (es. l'ha persa) — mostrata
// una sola volta all'admin, esattamente come alla creazione dell'azienda.
const reimpostaPasswordController = async (req, res) => {
  try {
    const azienda = await Company.findByPk(req.params.id);
    if (!azienda) return res.status(404).json({ error: "Azienda non trovata" });

    const { passwordGenerata } = await reimpostaPassword(azienda.owner_user_id);
    await registraAzione({ actorUserId: req.usuario.id, companyId: azienda.id, action: "owner_password_reset" });
    res.json({ passwordGenerata });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

module.exports = {
  listaAziende, ottieniAzienda, creaAzienda, aggiornaAzienda, cambiaStato, eliminaAzienda,
  registraPagamento, attivaProvaController, attivaIndefinitamenteController, reimpostaPasswordController,
};
