const { Resena, Usuario, Orden, DetalleOrden, Producto } = require("../models");
const { Op } = require("sequelize");

const getResenasByProducto = async (req, res) => {
  try {
    const resenas = await Resena.findAll({
      where: { producto_id: req.params.producto_id, verificado: true },
      include: [{ model: Usuario, attributes: ["nombre"], required: false }],
      order: [["createdAt", "DESC"]]
    });
    const total = resenas.length;
    const promedio = total > 0
      ? (resenas.reduce((s, r) => s + r.puntuacion, 0) / total).toFixed(1)
      : 0;
    res.json({ resenas, promedio: parseFloat(promedio), total });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const puedeResenar = async (req, res) => {
  try {
    const { producto_id } = req.params;
    const usuario_id = req.usuario.id;

    const yaReseno = await Resena.findOne({ where: { usuario_id, producto_id } });
    if (yaReseno) return res.json({ puedeResenar: false, motivo: "ya_reseno" });

    const compra = await DetalleOrden.findOne({
      where: { producto_id },
      include: [{
        model: Orden,
        where: { usuario_id, estado: { [Op.ne]: "cancelado" } },
        required: true
      }]
    });

    res.json({ puedeResenar: !!compra, motivo: compra ? null : "no_comprado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const crearResena = async (req, res) => {
  try {
    const { puntuacion, comentario, producto_id } = req.body;
    const usuario_id = req.usuario.id;
    const nombre_autor = req.usuario.nombre;

    if (!puntuacion || puntuacion < 1 || puntuacion > 5)
      return res.status(400).json({ error: "Puntuación debe ser entre 1 y 5" });

    const yaReseno = await Resena.findOne({ where: { usuario_id, producto_id } });
    if (yaReseno)
      return res.status(400).json({ error: "Hai già recensito questo prodotto" });

    const compra = await DetalleOrden.findOne({
      where: { producto_id },
      include: [{
        model: Orden,
        where: { usuario_id, estado: { [Op.ne]: "cancelado" } },
        required: true
      }]
    });

    if (!compra)
      return res.status(403).json({ error: "Solo chi ha acquistato il prodotto può recensirlo" });

    const resena = await Resena.create({
      puntuacion,
      comentario,
      nombre_autor,
      producto_id,
      usuario_id,
      compra_verificada: true,
      verificado: false
    });

    res.status(201).json({ mensaje: "Recensione inviata, in attesa di approvazione", resena });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getResenasDestacadas = async (req, res) => {
  try {
    const resenas = await Resena.findAll({
      where: { verificado: true, compra_verificada: true, puntuacion: { [Op.gte]: 4 } },
      include: [
        { model: Usuario, attributes: ["nombre"], required: false },
        { model: Producto, attributes: ["nombre"], required: true }
      ],
      order: [["puntuacion", "DESC"], ["createdAt", "DESC"]],
      limit: 6
    });
    res.json(resenas);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const moderarResena = async (req, res) => {
  try {
    const resena = await Resena.findByPk(req.params.id);
    if (!resena) return res.status(404).json({ error: "Reseña no encontrada" });
    await resena.update({ verificado: req.body.verificado });
    res.json({ mensaje: "Stato aggiornato", resena });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAllResenas = async (req, res) => {
  try {
    const resenas = await Resena.findAll({
      include: [
        { model: Usuario, attributes: ["nombre", "email"], required: false },
        { model: Producto, attributes: ["nombre"], required: false }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(resenas);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getResenasByProducto, crearResena, puedeResenar, getResenasDestacadas, moderarResena, getAllResenas };
