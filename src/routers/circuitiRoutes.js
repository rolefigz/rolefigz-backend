const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdminOCircuiti } = require("../middleware/auth");
const { creaOrdine, elencoAdmin, aggiornaAdmin } = require("../controllers/circuitiController");

router.post ("/ordini",                creaOrdine);
router.get  ("/admin/ordini",          verifyToken, soloAdminOCircuiti, elencoAdmin);
router.patch("/admin/ordini/:id",      verifyToken, soloAdminOCircuiti, aggiornaAdmin);

module.exports = router;
