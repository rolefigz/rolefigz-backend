const express = require("express");
const router  = express.Router();
const { getResenasByProducto, crearResena } = require("../controllers/resenasController");

router.get("/:producto_id", getResenasByProducto);
router.post("/",            crearResena);

module.exports = router;
