const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const {
  crearTicket, getMisTickets, getUnreadCliente,
  getMensajes, enviarMensaje,
  getAllTickets, getUnreadAdmin, cambiarEstado,
  crearTicketGuest, getMensajesGuest, enviarMensajeGuest, getUnreadGuest
} = require("../controllers/ticketsController");

// Guest (no auth) — prima delle rotte con :id
router.post("/guest",                    crearTicketGuest);
router.get("/guest/:token",              getMensajesGuest);
router.post("/guest/:token/mensajes",    enviarMensajeGuest);
router.get("/guest/:token/unread",       getUnreadGuest);

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
