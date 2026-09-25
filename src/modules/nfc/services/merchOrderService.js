const {
  sequelize, Company, MerchProduct, MerchOrder, MerchOrderItem, CreditLedger,
} = require("../../../models");
const { calcolaSaldoCrediti } = require("./subscriptionService");
const { registraAzione } = require("./auditLogService");
const ErroreAzienda = require("../utils/erroreAzienda");
const { unitaAReale } = require("../utils/crediti");

const STATI_ATTIVI_PRODUZIONE = ["confermato", "in_produzione"];

// Alloca i crediti disponibili sulle righe dell'ordine nell'ordine in cui
// arrivano: quello che non ci sta nei crediti residui va in eccedenza euro,
// al prezzo extra di quel prodotto specifico (snapshot al momento dell'ordine).
// Lavora sempre in unita' (mezzi crediti, interi) — la conversione in crediti
// reali avviene solo nella risposta finale di creaOrdine.
function allocaCrediti(righe, creditiDisponibili) {
  let residuo = creditiDisponibili;
  let creditiTotali = 0;
  let extraTotaleCents = 0;
  const dettagli = righe.map(r => {
    const unitaCoperte = Math.max(0, Math.min(r.quantity, Math.floor(residuo / r.credit_cost) || 0));
    const creditiUsati = unitaCoperte * r.credit_cost;
    residuo -= creditiUsati;
    creditiTotali += creditiUsati;
    const unitaExtra = r.quantity - unitaCoperte;
    const extraCents = unitaExtra * r.extra_price_cents;
    extraTotaleCents += extraCents;
    return { ...r, unitaCoperte, unitaExtra, creditiUsati, extraCents };
  });
  return { dettagli, creditiTotali, extraTotaleCents };
}

async function creaOrdine({ companyId, items, deliveryMethod, shippingAddress, notes, actorUserId }) {
  if (!Array.isArray(items) || !items.length) throw new ErroreAzienda("Il carrello e' vuoto", 400);
  if (items.length > 30) throw new ErroreAzienda("Troppi articoli nel carrello", 400);

  return sequelize.transaction(async (t) => {
    const company = await Company.findByPk(companyId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!company) throw new ErroreAzienda("Azienda non trovata", 404);

    const idProdotti = items.map(i => i.product_id);
    const prodotti = await MerchProduct.findAll({ where: { id: idProdotti, active: true }, transaction: t });
    const mappaProdotti = new Map(prodotti.map(p => [p.id, p]));

    const righe = items.map(i => {
      const prodotto = mappaProdotti.get(i.product_id);
      if (!prodotto) throw new ErroreAzienda(`Prodotto non disponibile: ${i.product_id}`, 400);
      const quantity = parseInt(i.quantity, 10);
      if (!Number.isInteger(quantity) || quantity < 1) throw new ErroreAzienda("Quantita' non valida", 400);
      return {
        product_id: prodotto.id, quantity,
        credit_cost: prodotto.credit_cost, extra_price_cents: prodotto.extra_price_cents || 0,
      };
    });

    const saldoAttuale = await calcolaSaldoCrediti(companyId, t);
    const { dettagli, creditiTotali, extraTotaleCents } = allocaCrediti(righe, saldoAttuale);

    if (deliveryMethod === "shipping" && !shippingAddress?.indirizzo) {
      throw new ErroreAzienda("Indirizzo di spedizione obbligatorio", 400);
    }

    const ordine = await MerchOrder.create({
      company_id: companyId, status: "in_attesa",
      credits_used: creditiTotali, extra_amount_cents: extraTotaleCents,
      shipping_address_snapshot: deliveryMethod === "shipping" ? shippingAddress : null,
      delivery_method: deliveryMethod === "shipping" ? "shipping" : "hand",
      notes: notes || null, created_by_user_id: actorUserId,
    }, { transaction: t });

    for (const r of dettagli) {
      await MerchOrderItem.create({
        order_id: ordine.id, product_id: r.product_id, quantity: r.quantity,
        credits_each: r.credit_cost, price_each_cents: r.extra_price_cents,
      }, { transaction: t });
    }

    if (creditiTotali > 0) {
      await CreditLedger.create({
        company_id: companyId, delta: -creditiTotali, reason: "order",
        reference_type: "merch_order", reference_id: ordine.id, created_by_user_id: actorUserId,
      }, { transaction: t });
    }

    await registraAzione({
      actorUserId, companyId, action: "merch_order_created",
      details: { orderId: ordine.id, creditiTotali, extraTotaleCents },
    }, t);

    const ordineJson = ordine.toJSON();
    ordineJson.credits_used = unitaAReale(ordineJson.credits_used);
    return {
      ordine: ordineJson,
      creditiUsati: unitaAReale(creditiTotali),
      extraAmountCents: extraTotaleCents,
      saldoCreditiResiduo: unitaAReale(saldoAttuale - creditiTotali),
    };
  });
}

async function cambiaStatoOrdine({ orderId, status, actorUserId }) {
  return sequelize.transaction(async (t) => {
    const ordine = await MerchOrder.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!ordine) throw new ErroreAzienda("Ordine non trovato", 404);
    if (ordine.status === "consegnato" && status !== "consegnato") {
      throw new ErroreAzienda("Impossibile modificare un ordine gia' consegnato", 400);
    }

    const statoPrecedente = ordine.status;
    const eraGiaAnnullato = statoPrecedente === "annullato";

    if (status === "annullato" && !eraGiaAnnullato && ordine.credits_used > 0) {
      await CreditLedger.create({
        company_id: ordine.company_id, delta: ordine.credits_used, reason: "order_cancelled",
        reference_type: "merch_order", reference_id: ordine.id, created_by_user_id: actorUserId,
      }, { transaction: t });
    }

    await ordine.update({ status }, { transaction: t });
    await registraAzione({
      actorUserId, companyId: ordine.company_id, action: "merch_order_status_changed",
      details: { orderId: ordine.id, da: statoPrecedente, a: status },
    }, t);

    return ordine;
  });
}

module.exports = { creaOrdine, cambiaStatoOrdine, allocaCrediti, STATI_ATTIVI_PRODUZIONE };
