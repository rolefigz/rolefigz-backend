const { sequelize, Company, Subscription, Plan, Payment, CreditLedger } = require("../../../models");
const { get: getImpostazione } = require("../../../controllers/impostazioniController");
const { addMonths } = require("../utils/dateHelpers");
const { registraAzione } = require("./auditLogService");
const ErroreAzienda = require("../utils/erroreAzienda");
const pageCache = require("../utils/pageCache");
const { unitaAReale, realeAUnita } = require("../utils/crediti");

async function calcolaSaldoCrediti(companyId, transaction = null) {
  const somma = await CreditLedger.sum("delta", {
    where: { company_id: companyId },
    ...(transaction ? { transaction } : {}),
  });
  return somma || 0;
}

// Un pagamento in contanti, in un'unica transazione: crea il pagamento,
// estende paid_until, accredita i crediti del ciclo (+ bonus fedelta' se la
// racha di mesi pagati senza buchi raggiunge la soglia configurata), e
// registra tutto in audit_logs.
async function registraPagamentoContanti({ companyId, amountCents, monthsCovered, receivedAt, note, actorUserId }) {
  const sogliaMesi       = parseInt((await getImpostazione("nfc_bonus_meses_soglia")) ?? "6", 10);
  const percentualeBonus = parseFloat((await getImpostazione("nfc_bonus_percentuale")) ?? "10");
  const graceDays        = parseInt(process.env.NFC_GRACE_DAYS || "7", 10);

  return sequelize.transaction(async (t) => {
    const company = await Company.findByPk(companyId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!company) throw new ErroreAzienda("Azienda non trovata", 404);

    const subscription = await Subscription.findOne({
      where: { company_id: companyId }, transaction: t, lock: t.LOCK.UPDATE,
    });
    if (!subscription) throw new ErroreAzienda("Abbonamento non trovato", 404);

    const piano = await Plan.findByPk(subscription.plan_id, { transaction: t });
    if (!piano) throw new ErroreAzienda("Piano non trovato", 404);

    const dataRiferimento = receivedAt ? new Date(receivedAt) : new Date();
    const copertoFinoAPrima = subscription.paid_until ? new Date(subscription.paid_until) : null;

    let cEBuco = true;
    if (copertoFinoAPrima) {
      const limiteSenzaBuco = new Date(copertoFinoAPrima);
      limiteSenzaBuco.setDate(limiteSenzaBuco.getDate() + graceDays);
      cEBuco = dataRiferimento > limiteSenzaBuco;
    }
    const nuovaRacha = cEBuco ? 1 : (subscription.consecutive_paid_months || 0) + 1;

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

    const creditiBase = piano.monthly_credits * monthsCovered;
    await CreditLedger.create({
      company_id: companyId, delta: realeAUnita(creditiBase), reason: "cycle_grant",
      reference_type: "payment", reference_id: payment.id, created_by_user_id: actorUserId,
    }, { transaction: t });

    let creditiBonus = 0;
    if (nuovaRacha >= sogliaMesi && percentualeBonus > 0) {
      creditiBonus = Math.round(creditiBase * percentualeBonus / 100);
      if (creditiBonus > 0) {
        await CreditLedger.create({
          company_id: companyId, delta: realeAUnita(creditiBonus), reason: "loyalty_bonus",
          reference_type: "payment", reference_id: payment.id, created_by_user_id: actorUserId,
        }, { transaction: t });
      }
    }

    await registraAzione({
      actorUserId, companyId, action: "payment_registered",
      details: {
        paymentId: payment.id, amountCents, monthsCovered,
        paidUntilBefore: copertoFinoAPrima, paidUntilAfter: nuovoPaidUntil,
        creditiBase, creditiBonus, streak: nuovaRacha,
      },
    }, t);

    const risultato = { payment, subscription, creditiBase, creditiBonus, streak: nuovaRacha, saldoCrediti: unitaAReale(await calcolaSaldoCrediti(companyId, t)) };
    pageCache.invalidate(company.slug);
    return risultato;
  });
}

// La prova gratuita non genera crediti; e' solo idonea prima del primo pagamento.
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

// Aggiustamento manuale del saldo crediti — motivo sempre obbligatorio,
// finisce in audit_logs (il ledger stesso resta append-only e anonimo sul motivo).
// "delta" arriva gia' convertito in unita' (mezzi crediti) dal validatore.
async function aggiustaCrediti({ companyId, delta, motivo, actorUserId }) {
  if (!motivo || !motivo.trim()) throw new ErroreAzienda("Il motivo e' obbligatorio", 400);
  if (!Number.isInteger(delta) || delta === 0) throw new ErroreAzienda("Il delta crediti non e' valido", 400);

  return sequelize.transaction(async (t) => {
    const company = await Company.findByPk(companyId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!company) throw new ErroreAzienda("Azienda non trovata", 404);

    const voce = await CreditLedger.create({
      company_id: companyId, delta, reason: "manual_adjustment", created_by_user_id: actorUserId,
    }, { transaction: t });

    await registraAzione({
      actorUserId, companyId, action: "credit_manual_adjustment",
      details: { delta, motivo, ledgerId: voce.id },
    }, t);

    return { voce, saldoCrediti: unitaAReale(await calcolaSaldoCrediti(companyId, t)) };
  });
}

module.exports = { calcolaSaldoCrediti, registraPagamentoContanti, attivaProva, aggiustaCrediti };
