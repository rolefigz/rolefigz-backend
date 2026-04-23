const express    = require("express");
const router     = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const upload     = require("../utils/upload");
const { validarProducto } = require("../middleware/validaciones");
const {
  getProductos, getProductoById,
  crearProducto, editarProducto, eliminarProducto
} = require("../controllers/productosController");

router.get("/",     getProductos);
router.get("/:id",  getProductoById);
router.post("/",    verifyToken, soloAdmin, validarProducto, crearProducto);
router.put("/:id",  verifyToken, soloAdmin, editarProducto);
router.delete("/:id", verifyToken, soloAdmin, eliminarProducto);

router.post("/:id/imagen", verifyToken, soloAdmin, upload.single("imagen"), async (req, res) => {
  try {
    const { Producto } = require("../models");
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    if (!req.file)  return res.status(400).json({ error: "No se recibió ninguna imagen" });
    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    await producto.update({ imagen: url });
    res.json({ mensaje: "Imagen subida correctamente", imagen: url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;