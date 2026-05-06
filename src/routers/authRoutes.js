const express = require("express");
const router  = express.Router();
const { register, verificarCodigo, login, getPerfil, updatePerfil, getMisOrdenes, recuperarPassword, resetPassword, getGoogleConfig, loginGoogle } = require("../controllers/authController");
const { validarLogin, validarRegistro } = require("../middleware/validazioni");
const { verifyToken } = require("../middleware/auth");

router.post("/register",        validarRegistro, register);
router.post("/verificar",                        verificarCodigo);
router.post("/login",           validarLogin,    login);
router.get("/perfil",           verifyToken,     getPerfil);
router.put("/perfil",           verifyToken,     updatePerfil);
router.get("/mis-ordenes",      verifyToken,     getMisOrdenes);
router.post("/recuperar",                        recuperarPassword);
router.post("/reset-password",                   resetPassword);
router.get("/google-config",                     getGoogleConfig);
router.post("/google",                           loginGoogle);

module.exports = router;
