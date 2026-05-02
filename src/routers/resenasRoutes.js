const express = require("express");
const router  = express.Router();
const { getResenasByProducto, crearResena, puedeResenar, getResenasDestacadas, moderarResena, getAllResenas } = require("../controllers/resenasController");
const { verifyToken, soloAdmin } = require("../middleware/auth");

router.get("/destacadas",          getResenasDestacadas);
router.get("/admin/todas",         verifyToken, soloAdmin, getAllResenas);
router.get("/puedo/:producto_id",  verifyToken, puedeResenar);
router.get("/:producto_id",        getResenasByProducto);
router.post("/",                   verifyToken, crearResena);
router.patch("/:id/verificar",     verifyToken, soloAdmin, moderarResena);

module.exports = router;
