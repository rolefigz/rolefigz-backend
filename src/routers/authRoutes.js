const express = require("express");
const router  = express.Router();
const { register, login } = require("../controllers/authController");
const { validarLogin, validarRegistro } = require("../middleware/validaciones");

router.post("/register", validarRegistro, register);
router.post("/login",    validarLogin,    login);

module.exports = router;