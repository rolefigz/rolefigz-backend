const { sequelize, Company, Subscription, Payment } = require("../../../models");
const { addMonths } = require("../utils/dateHelpers");
const { registraAzione } = require("./auditLogService");
const ErroreAzienda = require("../utils/erroreAzienda");
const pageCache = require("../utils/pageCache");
const { MESI_MINIMI } = require("../utils/abbonamento");

// Un pagamento in contanti, in un'unica transazione: crea il pagamento,
// estende paid_until e registra tutto in audit_logs. Il primo pagamento di
// un'azienda deve coprire almeno MESI_MINIMI mesi (impegno minimo di un anno).
async function registraPagamentoContanti({ companyId, amountCents, monthsCovered, receivedAt, note, actorUserId }) {
  const graceDays = parseInt(process.env.NFC_GRACE_DAYS || "7", 10);

  return sequelize.transaction(async (t) => {
    const company = await Company.findByPk(companyId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!company) throw new ErroreAzienda("Azienda non trovata", 404);

    const subscription = await Subscription.findOne({
      where: { company_id: companyId }, transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!subscription) throw new ErroreAzienda("Abbonamento non trovato", 404);

    const pagamentiPrecedenti = await Payment.count({ where: { company_id: companyId }, transaction: t });
    if (!pagamentiPrecedenti && monthsCovered < MESI_MINIMI) {
      throw new ErroreAzienda(`Il primo pagamento deve coprire almeno ${MESI_MINIMI} mesi`, 400);
    }

    const dataRiferimento = receivedAt ? new Date(receivedAt) : new Date();
    const copertoFinoAPrima = subscription.paid_until ? new Date(subscription.paid_until) : null;

    let cEBuco = true;
    if (copertoFinoAPrima) {
      const limiteSenzaBuco = new Date(copertoFinoAPrima);
      limiteSenzaBuco.setDate(limiteSenzaBuco.getDate() + graceDays);
      cEBuco = dataRiferimento > limiteSenzaBuco;
    }
    const nuovaRacha = cEBuco ? monthsCovered : (subscription.consecutive_paid_months || 0) + monthsCovered;

    const baseEstensione  = (copertoFinoAPrima && copertoFinoAPrima > dataRiferimento) ? copertoFinoAPrima : dataRiferimento;
    const nuovoPaidUntil  = addMonths(baseEstensione, monthsCovered);

    const payment = await Payment.create({
      company_id: companyId, amount_cents: amountCents, method: "cash",
      months_covered: monthsCovered, received_at: dataRiferimento,
      recorded_by_user_id: actorUserId, note: note || null,
    }, { transaction: t });

    await subscription.update({
      status: "active", paid_until: nuovoPaidUntil, consecutive_paid_months: nuovaRacha,
    }, { transaction: t });

    await registraAzione({
      actorUserId, companyId, action: "payment_registered",
      details: {
        paymentId: payment.id, amountCents, monthsCovered,
        paidUntilBefore: copertoFinoAPrima, paidUntilAfter: nuovoPaidUntil, streak: nuovaRacha,
      },
    }, t);

    pageCache.invalidate(company.slug);
    return { payment, subscription, streak: nuovaRacha };
  });
}

// La prova gratuita e' idonea solo prima del primo pagamento.
async function attivaProva({ companyId, actorUserId }) {
  return sequelize.transaction(async (t) => {
    const subscription = await Subscription.findOne({
      where: { company_id: companyId }, transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!subscription) throw new ErroreAzienda("Abbonamento non trovato", 404);
    if (subscription.paid_until) throw new ErroreAzienda("L'azienda ha gia' pagamenti registrati, non e' piu' idonea alla prova gratuita", 400);
    if (subscription.status === "trial" && subscription.trial_ends_at) throw new ErroreAzienda("La prova e' gia' attiva", 400);

    const giorni = parseInt(process.env.NFC_TRIAL_DAYS || "7", 10);
    const scadenza = new Date();
    scadenza.setDate(scadenza.getDate() + giorni);

    await subscription.update({ status: "trial", trial_ends_at: scadenza }, { transaction: t });
    await registraAzione({ actorUserId, companyId, action: "trial_activated", details: { giorni, scadenza } }, t);

    const company = await Company.findByPk(companyId, { transaction: t, attributes: ["slug"] });
    if (company) pageCache.invalidate(company.slug);

    return subscription;
  });
}

// Attivazione indefinita senza pagamento (account di cortesia, partner,
// test interno) — stessa logica di accesso di un abbonamento pagato
// (paginaAccessibile in publicPageController.js), solo con paid_until
// fissato molto lontano nel tempo cosi' non scade mai e non serve un
// rinnovo. Un pagamento in contanti registrato in seguito estende comunque
// la data da li' in avanti (resta lontanissima), non la riduce mai.
async function attivaIndefinitamente({ companyId, actorUserId }) {
  return sequelize.transaction(async (t) => {
    const company = await Company.findByPk(companyId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!company) throw new ErroreAzienda("Azienda non trovata", 404);

    const subscription = await Subscription.findOne({
      where: { company_id: companyId }, transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!subscription) throw new ErroreAzienda("Abbonamento non trovato", 404);

    const paidUntil = new Date("2099-12-31");
    await subscription.update({ status: "active", paid_until: paidUntil }, { transaction: t });

    await registraAzione({
      actorUserId, companyId, action: "lifetime_activated", details: { paidUntil },
    }, t);

    pageCache.invalidate(company.slug);
    return subscription;
  });
}

module.exports = { registraPagamentoContanti, attivaProva, attivaIndefinitamente };
