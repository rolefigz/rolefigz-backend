const {
  sequelize, Company, MerchProduct, MerchOrder, MerchOrderItem,
} = require("../../../models");
const { registraAzione } = require("./auditLogService");
const ErroreAzienda = require("../utils/erroreAzienda");
const { sendMessage } = require("../../../utils/telegram");

const STATI_ATTIVI_PRODUZIONE = ["confermato", "in_produzione"];

function euro(cents) {
  return (cents / 100).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Telegram e' in parse_mode HTML: nomi e note del cliente vanno escapati.
function escTg(v) {
  return String(v || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

// Ordine fatto dal cliente nel suo pannello: ogni riga al prezzo del listino
// del prodotto (snapshot al momento dell'ordine), rispettando la quantita'
// minima del prodotto. Si paga in contanti alla consegna; l'admin riceve
// subito l'avviso su Telegram e lo trova in NFC → Ordini.
async function creaOrdine({ companyId, items, deliveryMethod, shippingAddress, notes, actorUserId }) {
  if (!Array.isArray(items) || !items.length) throw new ErroreAzienda("Il carrello e' vuoto", 400);
  if (items.length > 30) throw new ErroreAzienda("Troppi articoli nel carrello", 400);
  if (deliveryMethod === "shipping" && !shippingAddress?.indirizzo) {
    throw new ErroreAzienda("Indirizzo di spedizione obbligatorio", 400);
  }

  const { ordine, company, righe, totaleCents } = await sequelize.transaction(async (t) => {
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
      const minimo = prodotto.min_quantity || 1;
      if (quantity < minimo) throw new ErroreAzienda(`${prodotto.name}: minimo ${minimo}`, 400);
      return { prodotto, quantity, price_each_cents: prodotto.price_cents || 0 };
    });

    const totaleCents = righe.reduce((s, r) => s + r.quantity * r.price_each_cents, 0);

    const ordine = await MerchOrder.create({
      company_id: companyId, status: "in_attesa", total_cents: totaleCents,
      shipping_address_snapshot: deliveryMethod === "shipping" ? shippingAddress : null,
      delivery_method: deliveryMethod === "shipping" ? "shipping" : "hand",
      notes: notes || null, created_by_user_id: actorUserId,
    }, { transaction: t });

    for (const r of righe) {
      await MerchOrderItem.create({
        order_id: ordine.id, product_id: r.prodotto.id, quantity: r.quantity, price_each_cents: r.price_each_cents,
      }, { transaction: t });
    }

    await registraAzione({
      actorUserId, companyId, action: "merch_order_created",
      details: { orderId: ordine.id, totaleCents },
    }, t);

    return { ordine, company, righe, totaleCents };
  });

  sendMessage(
    `🛒 <b>Nuovo ordine NFC #${ordine.id}</b> — ${escTg(company.name)}\n` +
    righe.map(r => `• ${escTg(r.prodotto.name)} × ${r.quantity} = € ${euro(r.quantity * r.price_each_cents)}`).join("\n") +
    `\n<b>Totale: € ${euro(totaleCents)}</b> · ${ordine.delivery_method === "shipping" ? "spedizione" : "ritiro a mano"}` +
    (ordine.notes ? `\nNote: ${escTg(ordine.notes)}` : "")
  ).catch(err => console.error("Telegram ordine NFC:", err.message));

  return { ordine, totaleCents };
}

async function cambiaStatoOrdine({ orderId, status, actorUserId }) {
  return sequelize.transaction(async (t) => {
    const ordine = await MerchOrder.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!ordine) throw new ErroreAzienda("Ordine non trovato", 404);
    if (ordine.status === "consegnato" && status !== "consegnato") {
      throw new ErroreAzienda("Impossibile modificare un ordine gia' consegnato", 400);
    }

    const statoPrecedente = ordine.status;
    await ordine.update({ status }, { transaction: t });
    await registraAzione({
      actorUserId, companyId: ordine.company_id, action: "merch_order_status_changed",
      details: { orderId: ordine.id, da: statoPrecedente, a: status },
    }, t);

    return ordine;
  });
}

module.exports = { creaOrdine, cambiaStatoOrdine, STATI_ATTIVI_PRODUZIONE };
