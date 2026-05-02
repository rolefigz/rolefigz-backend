const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { Op } = require("sequelize");
const { Usuario, Orden, DetalleOrden, Producto } = require("../models");
const { emailVerificacion } = require("../utils/mailer");

const register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(400).json({ error: "Email ya registrado" });
    const hash = await bcrypt.hash(password, 10);
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60 * 1000);
    await Usuario.create({
      nombre, email, password: hash, rol: "user",
      codigoVerificacion: codigo, codigoExpira: expira
    });
    await emailVerificacion(email, codigo, nombre);
    res.status(201).json({ mensaje: "Codice inviato", email });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const verificarCodigo = async (req, res) => {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ error: "Email e codice obbligatori" });
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "Utente non trovato" });
    if (usuario.codigoVerificacion !== codigo)
      return res.status(400).json({ error: "Codice non valido" });
    if (!usuario.codigoExpira || new Date() > usuario.codigoExpira)
      return res.status(400).json({ error: "Codice scaduto. Registrati di nuovo" });
    await usuario.update({ verificado: true, codigoVerificacion: null, codigoExpira: null });
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      mensaje: "Account verificato",
      token,
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
    if (!usuario.verificado) {
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();
      const expira = new Date(Date.now() + 15 * 60 * 1000);
      await usuario.update({ codigoVerificacion: codigo, codigoExpira: expira });
      await emailVerificacion(usuario.email, codigo, usuario.nombre);
      return res.status(403).json({
        error: "Account non verificato. Ti abbiamo inviato un nuovo codice.",
        email: usuario.email,
        verificacion_pendiente: true
      });
    }
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

const recuperarPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "Nessun account con questa email" });
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expira = new Date(Date.now() + 15 * 60 * 1000);
    await usuario.update({ codigoVerificacion: codigo, codigoExpira: expira });
    await emailVerificacion(email, codigo, usuario.nombre);
    res.json({ mensaje: "Codice inviato", email });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const resetPassword = async (req, res) => {
  try {
    const { email, codigo, nuevaPassword } = req.body;
    if (!email || !codigo || !nuevaPassword)
      return res.status(400).json({ error: "Dati incompleti" });
    if (nuevaPassword.length < 6)
      return res.status(400).json({ error: "La password deve avere almeno 6 caratteri" });
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(404).json({ error: "Account non trovato" });
    if (usuario.codigoVerificacion !== codigo)
      return res.status(400).json({ error: "Codice non valido" });
    if (!usuario.codigoExpira || new Date() > usuario.codigoExpira)
      return res.status(400).json({ error: "Codice scaduto. Richiedi un nuovo codice." });
    const hash = await bcrypt.hash(nuevaPassword, 10);
    await usuario.update({ password: hash, verificado: true, codigoVerificacion: null, codigoExpira: null });
    res.json({ mensaje: "Password aggiornata con successo" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { register, verificarCodigo, login, getPerfil, updatePerfil, getMisOrdenes, recuperarPassword, resetPassword };
