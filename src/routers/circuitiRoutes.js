const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin, soloAdminOCircuiti } = require("../middleware/auth");
const c = require("../controllers/circuitiController");

// Pubblico: checkout della pagina /circuiti
router.post("/ordini", c.creaOrdine);

// Admin e account "circuiti": gestione ordini
router.get   ("/admin/catalogo",    verifyToken, soloAdminOCircuiti, c.catalogo);
router.get   ("/admin/ordini",      verifyToken, soloAdminOCircuiti, c.elencoAdmin);
router.post  ("/admin/ordini",      verifyToken, soloAdminOCircuiti, c.creaManuale);
router.patch ("/admin/ordini/:id",  verifyToken, soloAdminOCircuiti, c.aggiornaAdmin);
router.delete("/admin/ordini/:id",  verifyToken, soloAdminOCircuiti, c.eliminaAdmin);

// Solo admin: storico modifiche, ripristino e analytics
router.post("/admin/ordini/:id/ripristina", verifyToken, soloAdmin, c.ripristinaAdmin);
router.get ("/admin/movimenti",             verifyToken, soloAdmin, c.movimentiAdmin);
router.get ("/admin/analytics",             verifyToken, soloAdmin, c.analyticsAdmin);

module.exports = router;
