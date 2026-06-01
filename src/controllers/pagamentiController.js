let _stripe = null;
function getStripe() {
  if (!_stripe) _stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}
const jwt    = require("jsonwebtoken");
const { Ordine, DettaglioOrdine, Prodotto } = require("../models");
const { emailConfirmacionPedido, emailNuevoPedidoAdmin, emailSpedizione } = require("../utils/mailer");

// Genera etichetta Shippo automaticamente dopo il pagamento
async function autoGeneraEtichetta(ordine) {
  if (!ordine.shippo_rate_id || ordine.tracking_number) return null;
  try {
    const r = await fetch("https://api.goshippo.com/transactions/", {
      method:  "POST",
      headers: {
        "Authorization": `ShippoToken ${process.env.SHIPPO_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        rate:            ordine.shippo_rate_id,
        label_file_type: "PDF",
        async:           false,
      }),
    });
    const tx = await r.json();

    if (tx.status !== "SUCCESS") {
      const msg = tx.messages?.map(m => m.text).join("; ") || "Errore sconosciuto";
      console.warn(`⚠️ Auto-etichetta Shippo fallita (ordine #${ordine.id}): ${msg}`);
      return null;
    }

    await ordine.update({
      tracking_number:       tx.tracking_number,
      label_url:             tx.label_url,
      carrier:               tx.rate?.provider        || ordine.carrier || "",
      costo_spedizione:      tx.rate?.amount          || ordine.costo_spedizione,
      shippo_transaction_id: tx.object_id,
      estado:                "enviado",
    });

    emailSpedizione(ordine).catch(err => console.error("Email spedizione:", err.message));
    console.log(`✅ Etichetta auto-generata — ordine #${ordine.id} tracking: ${tx.tracking_number}`);
    return tx.tracking_number;
  } catch (err) {
    console.error(`❌ Auto-etichetta errore (ordine #${ordine.id}):`, err.message);
    return null;
  }
}

const crearSesion = async (req, res) => {
  const t = await require("../config/db").transaction();
  let committed = false;
  try {
    const { nombre_cliente, email_cliente, telefono, direccion, notas, items,
            costo_spedizione, carrier, shipping_service, shippo_rate_id,
            tracking_number, label_url, shippo_transaction_id,
            codice_promo } = req.body;

    if (!nombre_cliente || !email_cliente)
      return res.status(400).json({ error: "Nome e email obbligatori" });
    if (!items || !items.length)
      return res.status(400).json({ error: "Il carrello è vuoto" });

    // Estrae usuario_id dal token se presente
    let usuario_id = null;
    const authHeader = req.headers["authorization"];
    const tkn = authHeader && authHeader.split(" ")[1];
    if (tkn) {
      try {
        const decoded = jwt.verify(tkn, process.env.JWT_SECRET);
        usuario_id = decoded.id;
      } catch {}
    }

    // Verifica stock e costruisce line_items di Stripe
    let totale = 0;
    const dettagli  = [];
    const lineItems = [];

    for (const item of items) {
      const prodotto = await Prodotto.findByPk(item.producto_id);
      if (!prodotto) throw new Error(`Prodotto #${item.producto_id} non trovato`);
      if (prodotto.stock < item.cantidad)
        throw new Error(`Stock insufficiente per "${prodotto.nombre}" (disponibile: ${prodotto.stock})`);

      const prezzoBase    = parseFloat(prodotto.precio);
      const precio_unidad = item.precio_unidad
        ? Math.max(parseFloat(item.precio_unidad), prezzoBase)
        : prezzoBase;
      const subtotale = precio_unidad * item.cantidad;
      totale += subtotale;
      dettagli.push({ prodotto, cantidad: item.cantidad, precio_unidad, subtotal: subtotale, variante: item.variante || null, foto_cliente: item.foto_cliente || null, data_consegna: item.data_consegna || null, supplemento_express: item.supplemento_express || 0 });

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: prodotto.nombre },
          unit_amount: Math.round(precio_unidad * 100),
        },
        quantity: item.cantidad,
      });
    }

    // Verifica codice promo spedizione gratuita
    let spedizioneGratis = false;
    let codicePromoValido = null;
    if (codice_promo) {
      try {
        const { CodicePromo } = require("../models");
        const promo = await CodicePromo.findOne({
          where: { codice: codice_promo.toUpperCase().trim(), attivo: true }
        });
        if (promo) {
          const ora = new Date();
          const nonScaduto = !promo.data_scadenza || new Date(promo.data_scadenza) >= ora;
          const nonEsaurito = promo.max_utilizzi === null || promo.utilizzi_attuali < promo.max_utilizzi;
          if (nonScaduto && nonEsaurito && promo.tipo === "spedizione_gratuita") {
            spedizioneGratis = true;
            codicePromoValido = promo.codice;
          }
        }
      } catch (e) { console.error("Promo checkout:", e.message); }
    }

    // Aggiunge spedizione al totale e a Stripe
    const costoSpediz = spedizioneGratis ? 0 : parseFloat(costo_spedizione || 0);
    if (costoSpediz > 0) {
      totale += costoSpediz;
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: `Spedizione — ${shipping_service || carrier || "Standard"}` },
          unit_amount: Math.round(costoSpediz * 100),
        },
        quantity: 1,
      });
    }

    // Stripe richiede un minimo di €0.50 per EUR
    const totaleLineItems = lineItems.reduce((sum, li) => sum + li.price_data.unit_amount * li.quantity, 0);
    if (totaleLineItems < 50)
      throw new Error("L'importo minimo per il pagamento è €0.50");

    // Crea l'ordine nel DB (stato: pendente fino alla conferma pagamento)
    const ordine = await Ordine.create({
      nombre_cliente, email_cliente, telefono, direccion, notas, total: totale, usuario_id,
      costo_spedizione:      costoSpediz > 0 ? costoSpediz : null,
      carrier:               carrier || null,
      shippo_rate_id:        shippo_rate_id        || null,
      tracking_number:       tracking_number       || null,
      label_url:             label_url             || null,
      shippo_transaction_id: shippo_transaction_id || null,
      codice_promo:          codicePromoValido     || null,
    }, { transaction: t });

    for (const d of dettagli) {
      await DettaglioOrdine.create({
        orden_id:      ordine.id,
        producto_id:   d.prodotto.id,
        cantidad:      d.cantidad,
        precio_unidad: d.precio_unidad,
        subtotal:            d.subtotal,
        variante:            d.variante,
        foto_cliente:        d.foto_cliente,
        data_consegna:       d.data_consegna,
        supplemento_express: d.supplemento_express,
      }, { transaction: t });
      // Stock decrementato solo dopo conferma pagamento
    }

    await t.commit();
    committed = true;

    // Crea sessione di pagamento su Stripe
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    const session  = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items:           lineItems,
      mode:                 "payment",
      customer_email:       email_cliente,
      metadata:             { orden_id: String(ordine.id) },
      success_url:          `${BASE_URL}/index.html?pago=ok&orden_id=${ordine.id}&sid={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${BASE_URL}/index.html?pago=cancelado`,
    });

    res.json({ url: session.url, orden_id: ordine.id });

  } catch (err) {
    if (!committed) await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// POST /api/pagos/confirmar — chiamato dal frontend al ritorno da Stripe
const confirmarPago = async (req, res) => {
  try {
    const { orden_id, session_id } = req.body;
    if (!orden_id || !session_id)
      return res.status(400).json({ error: "Dati incompleti" });

    // Verifica con Stripe che il pagamento sia stato completato
    const session = await getStripe().checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid")
      return res.status(400).json({ error: "Pagamento non completato" });
    if (session.metadata?.orden_id !== String(orden_id))
      return res.status(400).json({ error: "Ordine non valido" });

    const ordine = await Ordine.findByPk(orden_id, {
      include: [{
        model: DettaglioOrdine,
        as: "detalles",
        include: [{ model: Prodotto, attributes: ["nombre"] }]
      }]
    });
    if (!ordine) return res.status(404).json({ error: "Ordine non trovato" });

    if (ordine.estado !== "confirmado") {
      await ordine.update({ estado: "confirmado" });

      // Decrementa stock solo ora che il pagamento è confermato
      for (const d of ordine.detalles) {
        await Prodotto.decrement("stock", { by: d.cantidad, where: { id: d.producto_id } });
      }

      emailConfirmacionPedido(ordine, ordine.detalles).catch(console.error);
      emailNuevoPedidoAdmin(ordine).catch(console.error);
    }

    res.json({ ok: true, tracking_number: ordine.tracking_number || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// Webhook: Stripe chiama qui quando il pagamento è confermato
const webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = getStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Senza segreto configurato (sviluppo senza Stripe CLI)
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error("Webhook errore:", err.message);
    return res.status(400).json({ error: err.message });
  }

  if (event.type === "checkout.session.completed") {
    const session  = event.data.object;
    const orden_id = session.metadata?.orden_id;

    if (orden_id) {
      try {
        const ordine = await Ordine.findByPk(orden_id, {
          include: [{
            model: DettaglioOrdine,
            as: "detalles",
            include: [{ model: Prodotto, attributes: ["nombre"] }]
          }]
        });
        if (ordine && ordine.estado === "pendiente") {
          await ordine.update({ estado: "confirmado" });
          emailConfirmacionPedido(ordine, ordine.detalles).catch(console.error);
          emailNuevoPedidoAdmin(ordine).catch(console.error);
          console.log(`✅ Pagamento confermato — Ordine #${orden_id}`);
        }
      } catch (err) {
        console.error("Errore elaborazione webhook:", err.message);
      }
    }
  }

  res.json({ received: true });
};

module.exports = { crearSesion, confirmarPago, webhook };
