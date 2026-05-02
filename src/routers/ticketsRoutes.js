const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const {
  crearTicket, getMisTickets, getUnreadCliente,
  getMensajes, enviarMensaje,
  getAllTickets, getUnreadAdmin, cambiarEstado
} = require("../controllers/ticketsController");

// Cliente
router.post("/",                verifyToken,            crearTicket);
router.get("/mis",              verifyToken,            getMisTickets);
router.get("/unread",           verifyToken,            getUnreadCliente);

// Admin
router.get("/admin/unread",     verifyToken, soloAdmin, getUnreadAdmin);
router.get("/",                 verifyToken, soloAdmin, getAllTickets);
router.patch("/:id/estado",     verifyToken, soloAdmin, cambiarEstado);

// Compartido (verifica ownership dentro del controller)
router.get("/:id/mensajes",     verifyToken,            getMensajes);
router.post("/:id/mensajes",    verifyToken,            enviarMensaje);

module.exports = router;
