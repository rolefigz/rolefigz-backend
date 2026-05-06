const { body, validationResult } = require("express-validator");

// Esegue le validazioni e restituisce errori se presenti
const valida = (req, res, next) => {
  const errori = validationResult(req);
  if (!errori.isEmpty()) {
    return res.status(400).json({
      error:     "Dati non validi",
      dettagli:  errori.array().map(e => ({ campo: e.path, messaggio: e.msg }))
    });
  }
  next();
};

const validarLogin = [
  body("email").isEmail().withMessage("Email non valida").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("La password deve avere almeno 6 caratteri"),
  valida
];

const validarRegistro = [
  body("nombre").trim().notEmpty().withMessage("Il nome è obbligatorio"),
  body("email").isEmail().withMessage("Email non valida").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("La password deve avere almeno 6 caratteri"),
  valida
];

const validarProducto = [
  body("nombre").trim().notEmpty().withMessage("Il nome è obbligatorio"),
  body("precio").isFloat({ min: 0.01 }).withMessage("Il prezzo deve essere maggiore di 0"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Lo stock deve essere un numero positivo"),
  valida
];

const validarOrden = [
  body("nombre_cliente").trim().notEmpty().withMessage("Il nome è obbligatorio"),
  body("email_cliente").isEmail().withMessage("Email non valida").normalizeEmail(),
  body("items").isArray({ min: 1 }).withMessage("Il carrello non può essere vuoto"),
  body("items.*.producto_id").isInt({ min: 1 }).withMessage("ID prodotto non valido"),
  body("items.*.cantidad").isInt({ min: 1 }).withMessage("La quantità deve essere almeno 1"),
  valida
];

module.exports = { validarLogin, validarRegistro, validarProducto, validarOrden };
