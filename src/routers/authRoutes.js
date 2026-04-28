const express = require("express");
const router  = express.Router();
const { register, login, getPerfil, updatePerfil, getMisOrdenes } = require("../controllers/authController");
const { validarLogin, validarRegistro } = require("../middleware/validaciones");
const { verifyToken } = require("../middleware/auth");

router.post("/register",   validarRegistro, register);
router.post("/login",      validarLogin,    login);
router.get("/perfil",      verifyToken,     getPerfil);
router.put("/perfil",      verifyToken,     updatePerfil);
router.get("/mis-ordenes", verifyToken,     getMisOrdenes);

module.exports = router;
