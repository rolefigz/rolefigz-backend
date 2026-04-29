const { Orden, DetalleOrden, Producto } = require("../models");
const { emailConfirmacionPedido, emailNuevoPedidoAdmin } = require("../utils/mailer");
// POST /api/ordenes — crear pedido (público)
const crearOrden = async (req, res) => {
  const t = await require("../config/db").transaction();
  try {
    const { nombre_cliente, email_cliente, telefono, direccion, notas, items } = req.body;

    // items: [{ producto_id, cantidad }]
    if (!items || !items.length)
      return res.status(400).json({ error: "El carrito está vacío" });

    // Calcular total y verificar stock
    let total = 0;
    const detalles = [];

    for (const item of items) {
      const producto = await Producto.findByPk(item.producto_id);
      if (!producto) throw new Error(`Producto #${item.producto_id} no encontrado`);
      if (producto.stock < item.cantidad)
        throw new Error(`Stock insuficiente para "${producto.nombre}" (disponible: ${producto.stock})`);

      const precioBase = parseFloat(producto.precio);
      const precioEnviado = item.precio_unidad ? parseFloat(item.precio_unidad) : precioBase;
      const precio_unidad = precioEnviado >= precioBase ? precioEnviado : precioBase;
      const subtotal = precio_unidad * item.cantidad;
      total += subtotal;
      detalles.push({ producto, cantidad: item.cantidad, precio_unidad, subtotal });
    }

    // Crear orden
    const orden = await Orden.create({
      nombre_cliente, email_cliente, telefono, direccion, notas, total
    }, { transaction: t });

    // Crear detalles y descontar stock
    for (const d of detalles) {
      await DetalleOrden.create({
        orden_id:      orden.id,
        producto_id:   d.producto.id,
        cantidad:      d.cantidad,
        precio_unidad: d.precio_unidad,
        subtotal:      d.subtotal
      }, { transaction: t });

      await d.producto.update(
        { stock: d.producto.stock - d.cantidad },
        { transaction: t }
      );
    }

    await t.commit();

    // Enviar emails
    // Enviar emails (sin bloquear la respuesta si falla)
const ordenConDetalles = await Orden.findByPk(orden.id, {
  include: [{
    model: DetalleOrden,
    as: "detalles",
    include: [{ model: Producto, attributes: ["nombre"] }]
  }]
});

emailConfirmacionPedido(ordenConDetalles, ordenConDetalles.detalles).catch(console.error);
emailNuevoPedidoAdmin(ordenConDetalles).catch(console.error);

    res.status(201).json({
      mensaje: "Pedido creado correctamente",
      orden_id: orden.id,
      total: orden.total,
      estado: orden.estado
    });

  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// GET /api/ordenes — todas (admin)
const getOrdenes = async (req, res) => {
  try {
    const ordenes = await Orden.findAll({
      order: [["createdAt", "DESC"]],
      include: [{
        model: DetalleOrden,
        as: "detalles",
        include: [{ model: require("../models").Producto, attributes: ["nombre", "imagen"] }]
      }]
    });
    res.json(ordenes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/ordenes/:id — una orden (admin)
const getOrdenById = async (req, res) => {
  try {
    const orden = await Orden.findByPk(req.params.id, {
      include: [{
        model: DetalleOrden,
        as: "detalles",
        include: [{ model: require("../models").Producto, attributes: ["nombre", "precio", "imagen"] }]
      }]
    });
    if (!orden) return res.status(404).json({ error: "Orden no encontrada" });
    res.json(orden);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/ordenes/:id/estado — cambiar estado (admin)
const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const validos = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"];
    if (!validos.includes(estado))
      return res.status(400).json({ error: "Estado no válido" });

    const orden = await Orden.findByPk(req.params.id);
    if (!orden) return res.status(404).json({ error: "Orden no encontrada" });

    await orden.update({ estado });
    res.json({ mensaje: "Estado actualizado", estado: orden.estado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { crearOrden, getOrdenes, getOrdenById, cambiarEstado };