const express    = require("express");
const router     = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const upload     = require("../utils/upload");
const { validarProducto } = require("../middleware/validazioni");
const {
  getProductos, getProductoById, getProductoByIdAdmin,
  crearProducto, editarProducto, eliminarProducto, getTodosProductos
} = require("../controllers/prodottiController");

router.get("/",             getProductos);
router.get("/admin/todos",  verifyToken, soloAdmin, getTodosProductos);
router.get("/admin/:id",    verifyToken, soloAdmin, getProductoByIdAdmin);

// Upload foto cliente (pubblico — prima di /:id per evitare conflitti)
router.post("/foto-cliente", upload.single("foto"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nessuna foto ricevuta" });
    const url = req.file.path;
    res.json({ url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Ricerca per slug
router.get("/slug/:slug", async (req, res) => {
  try {
    const { Categoria, VarianteProdotto, ImmagineProdotto, Prodotto } = require("../models");
    const prodotto = await Prodotto.findOne({
      where: { slug: req.params.slug, activo: true },
      include: [
        { model: Categoria,        attributes: ["id", "nombre"] },
        { model: VarianteProdotto, as: "variantes" },
        { model: ImmagineProdotto, as: "imagenes", order: [["orden", "ASC"]] }
      ]
    });
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });
    res.json(prodotto);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/:id",            getProductoById);
router.post("/",    verifyToken, soloAdmin, validarProducto, crearProducto);
router.put("/:id",  verifyToken, soloAdmin, editarProducto);
router.delete("/:id", verifyToken, soloAdmin, async (req, res) => {
  try {
    const { Prodotto } = require("../models");
    const prodotto = await Prodotto.findByPk(req.params.id);
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });
    await prodotto.destroy();
    res.json({ mensaje: "Prodotto eliminato" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Immagine principale (legacy)
router.post("/:id/imagen", verifyToken, soloAdmin, upload.single("imagen"), async (req, res) => {
  try {
    const { Prodotto } = require("../models");
    const prodotto = await Prodotto.findByPk(req.params.id);
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });
    if (!req.file)  return res.status(400).json({ error: "Nessuna immagine ricevuta" });
    const url = req.file.path;
    await prodotto.update({ imagen: url });
    res.json({ mensaje: "Immagine caricata con successo", imagen: url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Varianti ──────────────────────────────────────────────
const { VarianteProdotto, ImmagineProdotto, Prodotto } = require("../models");

router.get("/:id/variantes", async (req, res) => {
  try {
    const varianti = await VarianteProdotto.findAll({ where: { producto_id: req.params.id } });
    res.json(varianti);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/:id/variantes", verifyToken, soloAdmin, async (req, res) => {
  try {
    const { tipo, valor, stock, precio_extra } = req.body;
    const variante = await VarianteProdotto.create({
      producto_id: req.params.id, tipo, valor,
      stock: stock || 0, precio_extra: precio_extra || 0
    });
    res.status(201).json({ mensaje: "Variante aggiunta", variante });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/variantes/:id", verifyToken, soloAdmin, async (req, res) => {
  try {
    await VarianteProdotto.destroy({ where: { id: req.params.id } });
    res.json({ mensaje: "Variante eliminata" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Immagini multiple ─────────────────────────────────────

router.post("/:id/imagenes", verifyToken, soloAdmin, upload.single("imagen"), async (req, res) => {
  try {
    const prodotto = await Prodotto.findByPk(req.params.id);
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });
    if (!req.file)  return res.status(400).json({ error: "Nessuna immagine ricevuta" });
    const url    = req.file.path;
    const ordine = await ImmagineProdotto.count({ where: { producto_id: req.params.id } });
    const immagine = await ImmagineProdotto.create({ producto_id: req.params.id, url, orden: ordine });
    if (ordine === 0) await prodotto.update({ imagen: url });
    res.json({ mensaje: "Immagine aggiunta", imagen: immagine });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/imagenes/:id", verifyToken, soloAdmin, async (req, res) => {
  try {
    await ImmagineProdotto.destroy({ where: { id: req.params.id } });
    res.json({ mensaje: "Immagine eliminata" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/prodotti/:id/stock — aggiorna stock (admin)
router.patch("/:id/stock", verifyToken, soloAdmin, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0)
      return res.status(400).json({ error: "Stock non valido" });

    const { Prodotto } = require("../models");
    const prodotto = await Prodotto.findByPk(req.params.id);
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });

    await prodotto.update({ stock: parseInt(stock) });
    res.json({ mensaje: "Stock aggiornato", stock: prodotto.stock });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
