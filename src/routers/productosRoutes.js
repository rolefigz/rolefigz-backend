const express    = require("express");
const router     = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const upload     = require("../utils/upload");
const { validarProducto } = require("../middleware/validaciones");
const {
  getProductos, getProductoById,
  crearProducto, editarProducto, eliminarProducto, getTodosProductos
} = require("../controllers/productosController");

router.get("/",              getProductos);
router.get("/admin/todos",   verifyToken, soloAdmin, getTodosProductos);
router.get("/:id",           getProductoById);
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

// ── Variantes ──────────────────────────────────────────────
const { VarianteProducto, ImagenProducto, Producto } = require("../models");

router.get("/:id/variantes", async (req, res) => {
  try {
    const variantes = await VarianteProducto.findAll({ where: { producto_id: req.params.id } });
    res.json(variantes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/variantes", verifyToken, soloAdmin, async (req, res) => {
  try {
    const { tipo, valor, stock, precio_extra } = req.body;
    const variante = await VarianteProducto.create({
      producto_id: req.params.id, tipo, valor,
      stock: stock || 0, precio_extra: precio_extra || 0
    });
    res.status(201).json({ mensaje: "Variante añadida", variante });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/variantes/:id", verifyToken, soloAdmin, async (req, res) => {
  try {
    await VarianteProducto.destroy({ where: { id: req.params.id } });
    res.json({ mensaje: "Variante eliminada" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Imágenes múltiples ────────────────────────────────────

router.post("/:id/imagenes", verifyToken, soloAdmin, upload.single("imagen"), async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    if (!req.file)  return res.status(400).json({ error: "No se recibió imagen" });
    const url   = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    const orden = await ImagenProducto.count({ where: { producto_id: req.params.id } });
    const imagen = await ImagenProducto.create({ producto_id: req.params.id, url, orden });
    if (orden === 0) await producto.update({ imagen: url });
    res.json({ mensaje: "Imagen añadida", imagen });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/imagenes/:id", verifyToken, soloAdmin, async (req, res) => {
  try {
    await ImagenProducto.destroy({ where: { id: req.params.id } });
    res.json({ mensaje: "Imagen eliminada" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/productos/:id/stock — actualizar stock (admin)
router.patch("/:id/stock", verifyToken, soloAdmin, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0)
      return res.status(400).json({ error: "Stock inválido" });

    const { Producto } = require("../models");
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });

    await producto.update({ stock: parseInt(stock) });
    res.json({ mensaje: "Stock actualizado", stock: producto.stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;