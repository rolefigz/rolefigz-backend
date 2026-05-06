const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { Categoria } = require("../models");

router.get("/", async (req, res) => {
  const categorie = await Categoria.findAll();
  res.json(categorie);
});

router.post("/", verifyToken, soloAdmin, async (req, res) => {
  try {
    const cat = await Categoria.create(req.body);
    res.status(201).json({ mensaje: "Categoria creata", cat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
