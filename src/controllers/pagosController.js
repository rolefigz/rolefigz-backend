const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt    = require("jsonwebtoken");
const { Orden, DetalleOrden, Producto } = require("../models");
const { emailConfirmacionPedido, emailNuevoPedidoAdmin } = require("../utils/mailer");

const crearSesion = async (req, res) => {
  const t = await require("../config/db").transaction();
  try {
    const { nombre_cliente, email_cliente, telefono, direccion, notas, items } = req.body;

    if (!nombre_cliente || !email_cliente)
      return res.status(400).json({ error: "Nome e email obbligatori" });
    if (!items || !items.length)
      return res.status(400).json({ error: "Il carrello è vuoto" });

    // Extraer usuario_id del token si está presente
    let usuario_id = null;
    const authHeader = req.headers["authorization"];
    const tkn = authHeader && authHeader.split(" ")[1];
    if (tkn) {
      try {
        const decoded = jwt.verify(tkn, process.env.JWT_SECRET);
        usuario_id = decoded.id;
      } catch {}
    }

    // Verificar stock y construir line_items de Stripe
    let total = 0;
    const detalles = [];
    const lineItems = [];

    for (const item of items) {
      const producto = await Producto.findByPk(item.producto_id);
      if (!producto) throw new Error(`Prodotto #${item.producto_id} non trovato`);
      if (producto.stock < item.cantidad)
        throw new Error(`Stock insufficiente per "${producto.nombre}" (disponibile: ${producto.stock})`);

      const precioBase    = parseFloat(producto.precio);
      const precio_unidad = item.precio_unidad
        ? Math.max(parseFloat(item.precio_unidad), precioBase)
        : precioBase;
      const subtotal = precio_unidad * item.cantidad;
      total += subtotal;
      detalles.push({ producto, cantidad: item.cantidad, precio_unidad, subtotal, variante: item.variante || null });

      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: { name: producto.nombre },
          unit_amount: Math.round(precio_unidad * 100),
        },
        quantity: item.cantidad,
      });
    }

    // Crear la orden en la DB (estado: pendiente hasta confirmar pago)
    const orden = await Orden.create({
      nombre_cliente, email_cliente, telefono, direccion, notas, total, usuario_id
    }, { transaction: t });

    for (const d of detalles) {
      await DetalleOrden.create({
        orden_id:      orden.id,
        producto_id:   d.producto.id,
        cantidad:      d.cantidad,
        precio_unidad: d.precio_unidad,
        subtotal:      d.subtotal,
        variante:      d.variante,
      }, { transaction: t });

      await d.producto.update(
        { stock: d.producto.stock - d.cantidad },
        { transaction: t }
      );
    }

    await t.commit();

    // Crear sesión de pago en Stripe
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items:           lineItems,
      mode:                 "payment",
      customer_email:       email_cliente,
      metadata:             { orden_id: String(orden.id) },
      success_url:          `${BASE_URL}/index.html?pago=ok&orden_id=${orden.id}&sid={CHECKOUT_SESSION_ID}`,
      cancel_url:           `${BASE_URL}/index.html?pago=cancelado`,
    });

    res.json({ url: session.url, orden_id: orden.id });

  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// POST /api/pagos/confirmar — llamado desde el frontend al volver de Stripe
const confirmarPago = async (req, res) => {
  try {
    const { orden_id, session_id } = req.body;
    if (!orden_id || !session_id)
      return res.status(400).json({ error: "Datos incompletos" });

    // Verificar con Stripe que el pago fue completado
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid")
      return res.status(400).json({ error: "Pago no completado" });
    if (session.metadata?.orden_id !== String(orden_id))
      return res.status(400).json({ error: "Orden no válida" });

    const orden = await Orden.findByPk(orden_id, {
      include: [{
        model: DetalleOrden,
        as: "detalles",
        include: [{ model: Producto, attributes: ["nombre"] }]
      }]
    });
    if (!orden) return res.status(404).json({ error: "Orden no encontrada" });

    if (orden.estado !== "confirmado") {
      await orden.update({ estado: "confirmado" });
      emailConfirmacionPedido(orden, orden.detalles).catch(console.error);
      emailNuevoPedidoAdmin(orden).catch(console.error);
    }

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// Webhook: Stripe llama aquí cuando el pago se confirma
const webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // Sin secreto configurado (desarrollo sin Stripe CLI)
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(400).json({ error: err.message });
  }

  if (event.type === "checkout.session.completed") {
    const session  = event.data.object;
    const orden_id = session.metadata?.orden_id;

    if (orden_id) {
      try {
        const orden = await Orden.findByPk(orden_id, {
          include: [{
            model: DetalleOrden,
            as: "detalles",
            include: [{ model: Producto, attributes: ["nombre"] }]
          }]
        });
        if (orden && orden.estado === "pendiente") {
          await orden.update({ estado: "confirmado" });
          emailConfirmacionPedido(orden, orden.detalles).catch(console.error);
          emailNuevoPedidoAdmin(orden).catch(console.error);
          console.log(`✅ Pago confirmado — Orden #${orden_id}`);
        }
      } catch (err) {
        console.error("Error al procesar webhook:", err.message);
      }
    }
  }

  res.json({ received: true });
};

module.exports = { crearSesion, confirmarPago, webhook };
