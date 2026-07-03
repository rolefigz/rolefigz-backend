const express = require("express");
const router  = express.Router();
const { getAll, aggiorna } = require("../controllers/impostazioniController");
const { verifyToken, soloAdmin } = require("../middleware/auth");

router.get("/",  verifyToken, soloAdmin, getAll);
router.put("/",  verifyToken, soloAdmin, aggiorna);

module.exports = router;
