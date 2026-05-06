const express = require("express");
const router  = express.Router();
const { crearSesion, confirmarPago } = require("../controllers/pagamentiController");

router.post("/crear-sesion", crearSesion);
router.post("/confirmar",    confirmarPago);

module.exports = router;
