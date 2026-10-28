const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { creaOrdine, elencoAdmin, aggiornaAdmin } = require("../controllers/circuitiController");

router.post ("/ordini",                creaOrdine);
router.get  ("/admin/ordini",          verifyToken, soloAdmin, elencoAdmin);
router.patch("/admin/ordini/:id",      verifyToken, soloAdmin, aggiornaAdmin);

module.exports = router;
