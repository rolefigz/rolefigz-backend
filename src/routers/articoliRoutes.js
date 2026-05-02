const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const {
  getArticoli, getArticoloBySlug,
  crearArticolo, editarArticolo, togglePublicar
} = require("../controllers/articoliController");

router.get("/",              getArticoli);
router.get("/:slug",         getArticoloBySlug);
router.post("/",             verifyToken, soloAdmin, crearArticolo);
router.put("/:id",           verifyToken, soloAdmin, editarArticolo);
router.patch("/:id/publish", verifyToken, soloAdmin, togglePublicar);

module.exports = router;
