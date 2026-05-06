const { Prodotto, Categoria, VarianteProdotto, ImmagineProdotto } = require("../models");

// GET /api/prodotti — elenco (pubblico)
const getProductos = async (req, res) => {
  try {
    const prodotti = await Prodotto.findAll({
      where: { activo: true },
      include: [
        { model: Categoria,        attributes: ["id", "nombre"] },
        { model: ImmagineProdotto, as: "imagenes", attributes: ["url", "orden"], limit: 1, order: [["orden", "ASC"]] }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(prodotti);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/prodotti/:id — dettaglio completo (pubblico)
const getProductoById = async (req, res) => {
  try {
    const prodotto = await Prodotto.findOne({
      where: { id: req.params.id, activo: true },
      include: [
        { model: Categoria,        attributes: ["id", "nombre"] },
        { model: VarianteProdotto, as: "variantes" },
        { model: ImmagineProdotto, as: "imagenes", order: [["orden", "ASC"]] }
      ]
    });
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });
    res.json(prodotto);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

function generaSlug(nome) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// POST /api/prodotti — crea (admin)
const crearProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, imagen, categoria_id,
            richiede_foto, selettore_data, giorni_produzione, giorni_spedizione, prezzo_per_giorno_express } = req.body;
    let slug = generaSlug(nombre);
    const esiste = await Prodotto.findOne({ where: { slug } });
    if (esiste) slug = slug + "-" + Date.now();
    const prodotto = await Prodotto.create({
      nombre, descripcion, precio, stock, imagen, categoria_id, slug,
      richiede_foto:             richiede_foto             || false,
      selettore_data:            selettore_data            || false,
      giorni_produzione:         giorni_produzione         || 7,
      giorni_spedizione:         giorni_spedizione         || 3,
      prezzo_per_giorno_express: prezzo_per_giorno_express || 0,
    });
    res.status(201).json({ mensaje: "Prodotto creato", producto: prodotto });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/prodotti/admin/:id — dettaglio completo per admin (include inattivi)
const getProductoByIdAdmin = async (req, res) => {
  try {
    const prodotto = await Prodotto.findByPk(req.params.id, {
      include: [
        { model: Categoria,        attributes: ["id", "nombre"] },
        { model: VarianteProdotto, as: "variantes" },
        { model: ImmagineProdotto, as: "imagenes", order: [["orden", "ASC"]] }
      ]
    });
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });
    res.json(prodotto);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /api/prodotti/:id — modifica (admin)
const editarProducto = async (req, res) => {
  try {
    const prodotto = await Prodotto.findByPk(req.params.id);
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });
    await prodotto.update(req.body);
    res.json({ mensaje: "Prodotto aggiornato", producto: prodotto });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/prodotti/:id — soft delete (admin)
const eliminarProducto = async (req, res) => {
  try {
    const prodotto = await Prodotto.findByPk(req.params.id);
    if (!prodotto) return res.status(404).json({ error: "Prodotto non trovato" });
    await prodotto.update({ activo: false });
    res.json({ mensaje: "Prodotto disattivato" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/prodotti/admin/tutti — tutti inclusi inattivi (admin)
const getTodosProductos = async (req, res) => {
  try {
    const prodotti = await Prodotto.findAll({
      include: [
        { model: Categoria,        attributes: ["id", "nombre"] },
        { model: ImmagineProdotto, as: "imagenes", attributes: ["url", "orden"], limit: 1, order: [["orden", "ASC"]] }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(prodotti);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getProductos, getProductoById, getProductoByIdAdmin, crearProducto, editarProducto, eliminarProducto, getTodosProductos };
