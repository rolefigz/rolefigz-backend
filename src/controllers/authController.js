const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { Op } = require("sequelize");
const crypto = require("crypto");
const { Utente, Ordine, DettaglioOrdine, Prodotto, PuntiTransazione, Recensione, Ticket, Messaggio } = require("../models");
const { generaCodice, registraErrore, azzeraTentativi, codiceUguale } = require("../utils/codiceVerifica");

const BCRYPT_ROUNDS = 12;
const firmaToken = (utente) => jwt.sign(
  { id: utente.id, email: utente.email, rol: utente.rol, nombre: utente.nombre },
  process.env.JWT_SECRET,
  { expiresIn: "7d", algorithm: "HS256" }
);

// Controlla il codice di verifica con limite di tentativi per account.
// Restituisce un messaggio d'errore oppure null se il codice è valido.
const erroreCodice = async (utente, codigo, msgScaduto) => {
  if (!utente.codigoVerificacion || !utente.codigoExpira || new Date() > utente.codigoExpira)
    return msgScaduto;
  if (!codiceUguale(utente.codigoVerificacion, codigo)) {
    if (registraErrore(utente.email)) {
      await utente.update({ codigoVerificacion: null, codigoExpira: null });
      return "Troppi tentativi. Richiedi un nuovo codice.";
    }
    return "Codice non valido";
  }
  azzeraTentativi(utente.email);
  return null;
};

const register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    const esiste = await Utente.findOne({ where: { email } });
    if (esiste) return res.status(400).json({ error: "Email già registrata" });
    const hash   = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const codice = generaCodice();
    const scade  = new Date(Date.now() + 15 * 60 * 1000);
    await Utente.create({
      nombre, email, password: hash, rol: "user",
      verificado: false, codigoVerificacion: codice, codigoExpira: scade
    });
    const { emailVerificacion } = require("../utils/mailer");
    emailVerificacion(email, codice, nombre).catch(err =>
      console.error("Email verifica:", err.message)
    );
    res.status(201).json({ mensaje: "Codice inviato", email });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const verificarCodigo = async (req, res) => {
  try {
    const { email, codigo } = req.body;
    if (!email || !codigo) return res.status(400).json({ error: "Email e codice obbligatori" });
    const utente = await Utente.findOne({ where: { email } });
    if (!utente) return res.status(400).json({ error: "Codice non valido" });
    const errore = await erroreCodice(utente, codigo, "Codice scaduto. Registrati di nuovo");
    if (errore) return res.status(400).json({ error: errore });
    await utente.update({ verificado: true, codigoVerificacion: null, codigoExpira: null });
    // Assegna Benchys di benvenuto
    try {
      const { assegnaPunti } = require("./puntiController");
      await assegnaPunti(utente.id, "registrazione", 30, "Benvenuto su RoleFigz! 🚢");
    } catch(e) { console.error("Punti registrazione:", e.message); }
    const token = firmaToken(utente);
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
    // Stesso messaggio per email inesistente e password sbagliata: non si deve
    // poter scoprire quali email hanno un account.
    const valido = utente && await bcrypt.compare(password, utente.password);
    if (!valido) return res.status(401).json({ error: "Email o password non corretti" });
    if (!utente.verificado) {
      const codice = generaCodice();
      const scade  = new Date(Date.now() + 15 * 60 * 1000);
      await utente.update({ codigoVerificacion: codice, codigoExpira: scade });
      const { emailVerificacion } = require("../utils/mailer");
      emailVerificacion(utente.email, codice, utente.nombre).catch(err =>
        console.error("Email verifica:", err.message)
      );
      return res.status(403).json({
        error: "Account non verificato. Ti abbiamo inviato un nuovo codice.",
        email: utente.email,
        verificacion_pendiente: true
      });
    }
    const token = firmaToken(utente);
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
    const utente = await Utente.findOne({ where: { email, activo: true } });
    // Risposta identica che l'account esista o no (niente enumerazione delle email)
    if (utente) {
      const codice = generaCodice();
      const scade  = new Date(Date.now() + 15 * 60 * 1000);
      await utente.update({ codigoVerificacion: codice, codigoExpira: scade });
      const { emailVerificacion } = require("../utils/mailer");
      emailVerificacion(utente.email, codice, utente.nombre).catch(err =>
        console.error("Email recupero password:", err.message)
      );
    }
    res.json({ mensaje: "Se l'email è registrata, riceverai un codice", email });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const resetPassword = async (req, res) => {
  try {
    const { email, codigo, nuevaPassword } = req.body;
    if (!email || !codigo || !nuevaPassword)
      return res.status(400).json({ error: "Dati incompleti" });
    if (String(nuevaPassword).length < 8)
      return res.status(400).json({ error: "La password deve avere almeno 8 caratteri" });
    const utente = await Utente.findOne({ where: { email } });
    if (!utente) return res.status(400).json({ error: "Codice non valido" });
    const errore = await erroreCodice(utente, codigo, "Codice scaduto. Richiedi un nuovo codice.");
    if (errore) return res.status(400).json({ error: errore });
    const hash = await bcrypt.hash(nuevaPassword, BCRYPT_ROUNDS);
    await utente.update({ password: hash, verificado: true, codigoVerificacion: null, codigoExpira: null });
    res.json({ mensaje: "Password aggiornata con successo" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/auth/mis-datos — esporta tutti i dati personali dell'utente in JSON
// (GDPR art. 15 e 20, ISO 27701: accesso e portabilità).
const esportaDati = async (req, res) => {
  try {
    const id = req.usuario.id;
    const utente = await Utente.findByPk(id, {
      attributes: ["id", "nombre", "email", "telefono", "direccion", "rol", "verificado", "createdAt", "updatedAt"]
    });
    if (!utente) return res.status(404).json({ error: "Account non trovato" });
    const [ordini, punti, recensioni, ticket] = await Promise.all([
      Ordine.findAll({
        where: { email_cliente: utente.email },
        include: [{ model: DettaglioOrdine, as: "detalles" }],
        order: [["createdAt", "ASC"]]
      }),
      PuntiTransazione.findAll({ where: { utente_id: id }, order: [["createdAt", "ASC"]] }),
      Recensione.findAll({ where: { usuario_id: id }, order: [["createdAt", "ASC"]] }),
      Ticket.findAll({ where: { usuario_id: id }, include: [{ model: Messaggio, as: "messaggi" }], order: [["createdAt", "ASC"]] }),
    ]);
    res.setHeader("Content-Disposition", `attachment; filename="rolefigz-dati-${id}.json"`);
    res.json({
      esportato_il: new Date().toISOString(),
      titolare: "RoleFigz — rolefigz@gmail.com",
      account: utente, ordini, punti, recensioni, ticket
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/auth/cuenta — cancella l'account (GDPR art. 17, ISO 27701).
// Gli ordini restano 10 anni per obbligo fiscale; i dati dell'account vengono
// anonimizzati, così il login non è più possibile e non resta nulla che
// identifichi la persona fuori dagli ordini.
const eliminaAccount = async (req, res) => {
  try {
    const { password } = req.body || {};
    const utente = await Utente.findByPk(req.usuario.id);
    if (!utente || !utente.activo) return res.status(404).json({ error: "Account non trovato" });
    if (utente.rol !== "user")
      return res.status(403).json({ error: "Gli account amministrativi si eliminano a mano" });
    if (!password || !(await bcrypt.compare(password, utente.password)))
      return res.status(401).json({ error: "Password non corretta" });

    const casuale = crypto.randomBytes(32).toString("hex");
    await Recensione.update({ nombre_autor: "Utente eliminato", usuario_id: null }, { where: { usuario_id: utente.id } });
    await utente.update({
      nombre: "Utente eliminato",
      email: `eliminato-${utente.id}-${casuale.slice(0, 8)}@deleted.invalid`,
      password: await bcrypt.hash(casuale, BCRYPT_ROUNDS),
      telefono: null, direccion: null,
      activo: false, verificado: false,
      codigoVerificacion: null, codigoExpira: null
    });
    res.json({ mensaje: "Account eliminato" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { register, verificarCodigo, login, getPerfil, updatePerfil, getMisOrdenes, recuperarPassword, resetPassword, esportaDati, eliminaAccount };
