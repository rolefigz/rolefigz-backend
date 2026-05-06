const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const {
  calcolaTariffe, acquistaEtichetta, acquistaEtichettaCheckout, getStatoSpedizione,
  getOpzioniCliente, getOpzioniAdmin, creaOpzione, aggiornaOpzione, eliminaOpzione,
  shippoWebhook,
} = require("../controllers/spedizioneController");

// Tariffe configurabili — cliente (pubblico, usa ?nazione=IT)
router.get("/opzioni",               getOpzioniCliente);
// Tariffe configurabili — gestione admin (ordine importante: /admin prima di /:id)
router.get("/opzioni/admin",         verifyToken, soloAdmin, getOpzioniAdmin);
router.post("/opzioni",              verifyToken, soloAdmin, creaOpzione);
router.put("/opzioni/:id",           verifyToken, soloAdmin, aggiornaOpzione);
router.delete("/opzioni/:id",        verifyToken, soloAdmin, eliminaOpzione);

// Shippo webhook (pubblico — Shippo chiama qui)
router.post("/webhook",              shippoWebhook);

// Shippo — solo admin (generazione etichette)
router.post("/acquista-checkout",    acquistaEtichettaCheckout);
router.post("/rate-pubblica",        calcolaTariffe);
router.post("/rate",                 verifyToken, soloAdmin, calcolaTariffe);
router.post("/acquista",             verifyToken, soloAdmin, acquistaEtichetta);
router.get("/ordine/:id",            verifyToken, soloAdmin, getStatoSpedizione);

module.exports = router;
