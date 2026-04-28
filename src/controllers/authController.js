const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { Usuario, Orden, DetalleOrden, Producto } = require("../models");

const register = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(400).json({ error: "Email ya registrado" });
    const hash = await bcrypt.hash(password, 10);
    const usuario = await Usuario.create({ nombre, email, password: hash, rol: rol || "user" });
    res.status(201).json({
      mensaje: "Usuario creado",
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ where: { email, activo: true } });
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) return res.status(401).json({ error: "Contraseña incorrecta" });
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      mensaje: "Login exitoso", token,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      attributes: ["id", "nombre", "email", "telefono", "direccion", "rol", "createdAt"]
    });
    res.json(usuario);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updatePerfil = async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body;
    const usuario = await Usuario.findByPk(req.usuario.id);
    await usuario.update({ nombre, telefono, direccion });
    res.json({ mensaje: "Perfil actualizado", usuario });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getMisOrdenes = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id);
    const ordenes = await Orden.findAll({
      where: { email_cliente: usuario.email },
      order: [["createdAt", "DESC"]],
      include: [{
        model: DetalleOrden,
        as: "detalles",
        include: [{ model: Producto, attributes: ["nombre", "imagen"] }]
      }]
    });
    res.json(ordenes);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { register, login, getPerfil, updatePerfil, getMisOrdenes };
