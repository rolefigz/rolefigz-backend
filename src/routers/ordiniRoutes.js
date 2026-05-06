const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { validarOrden } = require("../middleware/validazioni");
const { crearOrden, getOrdenes, getOrdenById, cambiarEstado } = require("../controllers/ordiniController");

router.post("/",              validarOrden,              crearOrden);
router.get("/",               verifyToken, soloAdmin,    getOrdenes);
router.get("/:id",            verifyToken, soloAdmin,    getOrdenById);
router.patch("/:id/estado",   verifyToken, soloAdmin,    cambiarEstado);

// PATCH /api/ordenes/:id/tracking — inserimento tracking manuale
router.patch("/:id/tracking", verifyToken, soloAdmin, async (req, res) => {
  try {
    const { Ordine } = require("../models");
    const { emailSpedizione } = require("../utils/mailer");
    const { tracking_number, carrier, estado } = req.body;
    if (!tracking_number) return res.status(400).json({ error: "tracking_number obbligatorio" });
    const ordine = await Ordine.findByPk(req.params.id);
    if (!ordine) return res.status(404).json({ error: "Ordine non trovato" });
    await ordine.update({
      tracking_number,
      carrier: carrier || null,
      estado:  estado  || "enviado",
    });
    emailSpedizione(ordine).catch(() => {});
    res.json({ ok: true, tracking_number, carrier });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
