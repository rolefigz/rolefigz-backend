const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { Categoria } = require("../models");

router.get("/", async (req, res) => {
  const categorias = await Categoria.findAll();
  res.json(categorias);
});

router.post("/", verifyToken, soloAdmin, async (req, res) => {
  try {
    const cat = await Categoria.create(req.body);
    res.status(201).json({ mensaje: "Categoría creada", cat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;