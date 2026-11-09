const express = require("express");
const router  = express.Router();
const { iscriviti } = require("../controllers/locandinaPublicController");

// POST /api/nfc-locandine/:id/iscrizione — email lasciata nel pop-up della locandina
router.post("/:id/iscrizione", iscriviti);

module.exports = router;
