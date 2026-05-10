const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const {
  getArticoli, getAllArticoliAdmin, getArticoloBySlug,
  crearArticolo, editarArticolo, togglePublicar, uploadImmagine
} = require("../controllers/articoliController");

router.get("/admin/all",     verifyToken, soloAdmin, getAllArticoliAdmin);
router.get("/",              getArticoli);
router.get("/:slug",         getArticoloBySlug);
router.post("/",             verifyToken, soloAdmin, crearArticolo);
router.put("/:id",           verifyToken, soloAdmin, editarArticolo);
router.patch("/:id/publish", verifyToken, soloAdmin, togglePublicar);
router.post("/upload-image", verifyToken, soloAdmin, ...uploadImmagine);

module.exports = router;
