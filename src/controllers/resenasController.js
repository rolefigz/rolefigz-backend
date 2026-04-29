const jwt = require("jsonwebtoken");
const { Resena, Usuario } = require("../models");

const getResenasByProducto = async (req, res) => {
  try {
    const resenas = await Resena.findAll({
      where: { producto_id: req.params.producto_id },
      include: [{ model: Usuario, attributes: ["nombre"], required: false }],
      order: [["createdAt", "DESC"]]
    });
    res.json(resenas);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const crearResena = async (req, res) => {
  try {
    const { puntuacion, comentario, nombre_autor, producto_id } = req.body;
    if (!puntuacion || puntuacion < 1 || puntuacion > 5)
      return res.status(400).json({ error: "Puntuación debe ser entre 1 y 5" });

    let usuario_id = null;
    let autor = nombre_autor;

    const authHeader = req.headers["authorization"];
    const tkn = authHeader && authHeader.split(" ")[1];
    if (tkn) {
      try {
        const decoded = jwt.verify(tkn, process.env.JWT_SECRET);
        usuario_id = decoded.id;
        autor = decoded.nombre;
      } catch {}
    }

    const resena = await Resena.create({ puntuacion, comentario, nombre_autor: autor, producto_id, usuario_id });
    res.status(201).json({ mensaje: "Reseña creada", resena });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getResenasByProducto, crearResena };
