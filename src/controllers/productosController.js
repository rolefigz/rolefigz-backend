const { Producto, Categoria, VarianteProducto, ImagenProducto } = require("../models");

// GET /api/productos — listado (público)
const getProductos = async (req, res) => {
  try {
    const productos = await Producto.findAll({
      where: { activo: true },
      include: [
        { model: Categoria,      attributes: ["id", "nombre"] },
        { model: ImagenProducto, as: "imagenes", attributes: ["url", "orden"], limit: 1, order: [["orden", "ASC"]] }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(productos);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/productos/:id — detalle completo (público)
const getProductoById = async (req, res) => {
  try {
    const producto = await Producto.findOne({
      where: { id: req.params.id, activo: true },
      include: [
        { model: Categoria,        attributes: ["id", "nombre"] },
        { model: VarianteProducto, as: "variantes" },
        { model: ImagenProducto,   as: "imagenes", order: [["orden", "ASC"]] }
      ]
    });
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(producto);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/productos — crear (admin)
const crearProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, imagen, categoria_id } = req.body;
    const producto = await Producto.create({ nombre, descripcion, precio, stock, imagen, categoria_id });
    res.status(201).json({ mensaje: "Producto creado", producto });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /api/productos/:id — editar (admin)
const editarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    await producto.update(req.body);
    res.json({ mensaje: "Producto actualizado", producto });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/productos/:id — soft delete (admin)
const eliminarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    await producto.update({ activo: false });
    res.json({ mensaje: "Producto desactivado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/productos/admin/todos — todos incluidos inactivos (admin)
const getTodosProductos = async (req, res) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Categoria,      attributes: ["id", "nombre"] },
        { model: ImagenProducto, as: "imagenes", attributes: ["url", "orden"], limit: 1, order: [["orden", "ASC"]] }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(productos);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getProductos, getProductoById, crearProducto, editarProducto, eliminarProducto, getTodosProductos };
