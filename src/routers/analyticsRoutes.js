const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const {
  trackVisita, getResumen, getVisitasPorDia, getIngresosPorDia,
  getPaises, getProductosTop, getProductosVendidos, getEstadosOrdenes
} = require("../controllers/analyticsController");

router.post("/track",     trackVisita);
router.get("/resumen",    verifyToken, soloAdmin, getResumen);
router.get("/visitas",    verifyToken, soloAdmin, getVisitasPorDia);
router.get("/ingresos",   verifyToken, soloAdmin, getIngresosPorDia);
router.get("/paises",     verifyToken, soloAdmin, getPaises);
router.get("/productos",  verifyToken, soloAdmin, getProductosTop);
router.get("/vendidos",   verifyToken, soloAdmin, getProductosVendidos);
router.get("/estados",    verifyToken, soloAdmin, getEstadosOrdenes);

module.exports = router;
