const { body, validationResult } = require("express-validator");

// Ejecutar validaciones y devolver errores si los hay
const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      error: "Datos inválidos",
      detalles: errores.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  }
  next();
};

const validarLogin = [
  body("email").isEmail().withMessage("Email inválido").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Contraseña mínimo 6 caracteres"),
  validar
];

const validarRegistro = [
  body("nombre").trim().notEmpty().withMessage("El nombre es obligatorio"),
  body("email").isEmail().withMessage("Email inválido").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Contraseña mínimo 6 caracteres"),
  validar
];

const validarProducto = [
  body("nombre").trim().notEmpty().withMessage("El nombre es obligatorio"),
  body("precio").isFloat({ min: 0.01 }).withMessage("El precio debe ser mayor a 0"),
  body("stock").optional().isInt({ min: 0 }).withMessage("El stock debe ser un número positivo"),
  validar
];

const validarOrden = [
  body("nombre_cliente").trim().notEmpty().withMessage("El nombre es obligatorio"),
  body("email_cliente").isEmail().withMessage("Email inválido").normalizeEmail(),
  body("items").isArray({ min: 1 }).withMessage("El carrito no puede estar vacío"),
  body("items.*.producto_id").isInt({ min: 1 }).withMessage("ID de producto inválido"),
  body("items.*.cantidad").isInt({ min: 1 }).withMessage("La cantidad debe ser al menos 1"),
  validar
];

module.exports = { validarLogin, validarRegistro, validarProducto, validarOrden };