const express    = require("express");
const router     = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { getSaldo, richiediAzione, riscattaPunti, getPendingAdmin, gestisciRichiesta } = require("../controllers/puntiController");

router.get   ("/",               verifyToken,            getSaldo);
router.post  ("/richiedi",       verifyToken,            richiediAzione);
router.post  ("/riscatta",       verifyToken,            riscattaPunti);
router.get   ("/admin/pending",  verifyToken, soloAdmin, getPendingAdmin);
router.patch ("/admin/:id",      verifyToken, soloAdmin, gestisciRichiesta);

module.exports = router;
