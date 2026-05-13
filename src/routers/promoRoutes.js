const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { verificaCodice, getPopup, getTutti, creaCodice, aggiornaCodice, eliminaCodice } = require("../controllers/promoController");

router.post  ("/verifica",  verificaCodice);                          // pubblico
router.get   ("/popup",     getPopup);                                // pubblico
router.get   ("/",          verifyToken, soloAdmin, getTutti);
router.post  ("/",          verifyToken, soloAdmin, creaCodice);
router.put   ("/:id",       verifyToken, soloAdmin, aggiornaCodice);
router.delete("/:id",       verifyToken, soloAdmin, eliminaCodice);

module.exports = router;
