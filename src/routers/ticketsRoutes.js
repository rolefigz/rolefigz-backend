const express = require("express");
const router  = express.Router();
const rateLimit = require("express-rate-limit");
const { creaTicketOspite, elencoTicketOspite, messaggiOspite, inviaOspite } = require("../controllers/ticketsOspiteController");
const { verifyToken, soloAdmin } = require("../middleware/auth");
const {
  crearTicket, getMisTickets, getUnreadCliente,
  getMensajes, enviarMensaje,
  getAllTickets, getUnreadAdmin, cambiarEstado
} = require("../controllers/ticketsController");

// Senza account (nome + email; poi un token segreto). Limiti contro lo spam.
const limiteNuovo = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
  skipFailedRequests: true, message: { error: "Troppi ticket in poco tempo. Riprova tra un'ora." } });
const limiteChat = rateLimit({ windowMs: 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });
router.post("/ospite",                 limiteNuovo, creaTicketOspite);
router.post("/ospite/elenco",          limiteChat,  elencoTicketOspite);
router.get("/ospite/:token/mensajes",  limiteChat,  messaggiOspite);
router.post("/ospite/:token/mensajes", limiteChat,  inviaOspite);

// Cliente
router.post("/",              verifyToken,            crearTicket);
router.get("/mis",            verifyToken,            getMisTickets);
router.get("/unread",         verifyToken,            getUnreadCliente);

// Admin
router.get("/admin/unread",   verifyToken, soloAdmin, getUnreadAdmin);
router.get("/",               verifyToken, soloAdmin, getAllTickets);
router.patch("/:id/estado",   verifyToken, soloAdmin, cambiarEstado);

// Condiviso (verifica proprietà nel controller)
router.get("/:id/mensajes",   verifyToken,            getMensajes);
router.post("/:id/mensajes",  verifyToken,            enviarMensaje);

module.exports = router;
