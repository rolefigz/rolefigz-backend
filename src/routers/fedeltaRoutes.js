const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { elencoAdmin, dettaglioAdmin, aggiungiTimbro, annullaTimbro, riscattaPremio } = require("../controllers/fedeltaController");

router.get  ("/admin",                 verifyToken, soloAdmin, elencoAdmin);
router.get  ("/admin/:id",             verifyToken, soloAdmin, dettaglioAdmin);
router.post ("/admin/timbro",          verifyToken, soloAdmin, aggiungiTimbro);
router.post ("/admin/timbro/annulla",  verifyToken, soloAdmin, annullaTimbro);
router.post ("/admin/premio/riscatta", verifyToken, soloAdmin, riscattaPremio);

module.exports = router;
