const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { validarOrden } = require("../middleware/validaciones");
const { crearOrden, getOrdenes, getOrdenById, cambiarEstado } = require("../controllers/ordenesController");

router.post("/",          validarOrden,              crearOrden);
router.get("/",           verifyToken, soloAdmin,    getOrdenes);
router.get("/:id",        verifyToken, soloAdmin,    getOrdenById);
router.patch("/:id/estado", verifyToken, soloAdmin,  cambiarEstado);

module.exports = router;