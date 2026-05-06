const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { Op } = require("sequelize");
const { Utente, Ordine, DettaglioOrdine, Prodotto } = require("../models");
const { emailVerificacion } = require("../utils/mailer");

const register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const esiste = await Utente.findOne({ where: { email } });
    if (esiste) return res.status(400).json({ error: "Email già registrata" });
    const hash   = await bcrypt.hash(password, 10);
    const codice = Math.floor(100000 + Math.random() * 900000).toString();
    const scade  = new Date(Date.now() + 15 * 60 * 1000);
    await Utente.create({
      nombre, email, password: hash, rol: "user",
      codigoVerificacion: codice, codigoExpira: scade
    });
    await emailVerificacion(email, codice, nombre);
    res.status(201).json({ mensaje: "Codice inviato", email });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const verificarCodigo = async (req, res) => {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ error: "Email e codice obbligatori" });
    const utente = await Utente.findOne({ where: { email } });
    if (!utente) return res.status(404).json({ error: "Utente non trovato" });
    if (utente.codigoVerificacion !== codigo)
      return res.status(400).json({ error: "Codice non valido" });
    if (!utente.codigoExpira || new Date() > utente.codigoExpira)
      return res.status(400).json({ error: "Codice scaduto. Registrati di nuovo" });
    await utente.update({ verificado: true, codigoVerificacion: null, codigoExpira: null });
    const token = jwt.sign(
      { id: utente.id, email: utente.email, rol: utente.rol, nombre: utente.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      mensaje: "Account verificato",
      token,
      usuario: { id: utente.id, nombre: utente.nombre, email: utente.email, rol: utente.rol }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const utente = await Utente.findOne({ where: { email, activo: true } });
    if (!utente) return res.status(404).json({ error: "Utente non trovato" });
    const valido = await bcrypt.compare(password, utente.password);
    if (!valido) return res.status(401).json({ error: "Password errata" });
    if (!utente.verificado) {
      const codice = Math.floor(100000 + Math.random() * 900000).toString();
      const scade  = new Date(Date.now() + 15 * 60 * 1000);
      await utente.update({ codigoVerificacion: codice, codigoExpira: scade });
      await emailVerificacion(utente.email, codice, utente.nombre);
      return res.status(403).json({
        error: "Account non verificato. Ti abbiamo inviato un nuovo codice.",
        email: utente.email,
        verificacion_pendiente: true
      });
    }
    const token = jwt.sign(
      { id: utente.id, email: utente.email, rol: utente.rol, nombre: utente.nombre },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      mensaje: "Accesso riuscito", token,
      usuario: { id: utente.id, nombre: utente.nombre, email: utente.email, rol: utente.rol }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getPerfil = async (req, res) => {
  try {
    const utente = await Utente.findByPk(req.usuario.id, {
      attributes: ["id", "nombre", "email", "telefono", "direccion", "rol", "createdAt"]
    });
    res.json(utente);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updatePerfil = async (req, res) => {
  try {
    const { nombre, telefono, direccion } = req.body;
    const utente = await Utente.findByPk(req.usuario.id);
    await utente.update({ nombre, telefono, direccion });
    res.json({ mensaje: "Profilo aggiornato", usuario: utente });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getMisOrdenes = async (req, res) => {
  try {
    const utente = await Utente.findByPk(req.usuario.id);
    const ordini = await Ordine.findAll({
      where: { email_cliente: utente.email },
      order: [["createdAt", "DESC"]],
      include: [{
        model: DettaglioOrdine,
        as: "detalles",
        include: [{ model: Prodotto, attributes: ["nombre", "imagen"] }]
      }]
    });
    res.json(ordini);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const recuperarPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const utente = await Utente.findOne({ where: { email } });
    if (!utente) return res.status(404).json({ error: "Nessun account con questa email" });
    const codice = Math.floor(100000 + Math.random() * 900000).toString();
    const scade  = new Date(Date.now() + 15 * 60 * 1000);
    await utente.update({ codigoVerificacion: codice, codigoExpira: scade });
    await emailVerificacion(email, codice, utente.nombre);
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
    const utente = await Utente.findOne({ where: { email } });
    if (!utente) return res.status(404).json({ error: "Account non trovato" });
    if (utente.codigoVerificacion !== codigo)
      return res.status(400).json({ error: "Codice non valido" });
    if (!utente.codigoExpira || new Date() > utente.codigoExpira)
      return res.status(400).json({ error: "Codice scaduto. Richiedi un nuovo codice." });
    const hash = await bcrypt.hash(nuevaPassword, 10);
    await utente.update({ password: hash, verificado: true, codigoVerificacion: null, codigoExpira: null });
    res.json({ mensaje: "Password aggiornata con successo" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/auth/google-config — espone il client ID (non segreto)
const getGoogleConfig = (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || null });
};

// POST /api/auth/google — verifica credenziale Google e autentica
const loginGoogle = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Credenziale Google mancante" });

    const verifica = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const payload  = await verifica.json();

    if (!verifica.ok || payload.error_description)
      return res.status(401).json({ error: "Token Google non valido" });
    if (payload.aud !== process.env.GOOGLE_CLIENT_ID)
      return res.status(401).json({ error: "Token non valido per questa applicazione" });
    if (payload.email_verified !== "true" && payload.email_verified !== true)
      return res.status(401).json({ error: "Email Google non verificata" });

    let utente = await Utente.findOne({ where: { email: payload.email } });
    if (!utente) {
      utente = await Utente.create({
        nombre:    payload.name || payload.email.split("@")[0],
        email:     payload.email,
        password:  await bcrypt.hash(Math.random().toString(36) + Date.now(), 10),
        rol:       "user",
        verificado: true,
        activo:    true,
      });
    } else if (!utente.verificado) {
      await utente.update({ verificado: true });
    }

    if (!utente.activo) return res.status(403).json({ error: "Account disabilitato" });

    const tkn = jwt.sign({ id: utente.id, rol: utente.rol }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token: tkn, usuario: { id: utente.id, nombre: utente.nombre, email: utente.email, rol: utente.rol } });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { register, verificarCodigo, login, getPerfil, updatePerfil, getMisOrdenes, recuperarPassword, resetPassword, getGoogleConfig, loginGoogle };
