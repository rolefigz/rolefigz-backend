const express = require("express");
const router  = express.Router();
const { creaLead } = require("../controllers/leadPublicController");
const { validaCreaLead } = require("../middleware/validazioniNfc");

router.post("/", validaCreaLead, creaLead);

module.exports = router;
