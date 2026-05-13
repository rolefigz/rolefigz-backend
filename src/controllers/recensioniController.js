const { Recensione, Utente, Ordine, DettaglioOrdine, Prodotto } = require("../models");
const { Op } = require("sequelize");

const getResenasByProducto = async (req, res) => {
  try {
    const recensioni = await Recensione.findAll({
      where: { producto_id: req.params.producto_id, verificado: true },
      include: [{ model: Utente, attributes: ["nombre"], required: false }],
      order: [["createdAt", "DESC"]]
    });
    const totale   = recensioni.length;
    const promedio = totale > 0
      ? (recensioni.reduce((s, r) => s + r.puntuacion, 0) / totale).toFixed(1)
      : 0;
    res.json({ resenas: recensioni, promedio: parseFloat(promedio), total: totale });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const puedeResenar = async (req, res) => {
  try {
    const { producto_id } = req.params;
    const usuario_id = req.usuario.id;

    const giàRecensito = await Recensione.findOne({ where: { usuario_id, producto_id } });
    if (giàRecensito) return res.json({ puedeResenar: false, motivo: "ya_reseno" });

    const acquisto = await DettaglioOrdine.findOne({
      where: { producto_id },
      include: [{
        model: Ordine,
        where: { usuario_id, estado: { [Op.ne]: "cancelado" } },
        required: true
      }]
    });

    res.json({ puedeResenar: !!acquisto, motivo: acquisto ? null : "no_comprado" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const crearResena = async (req, res) => {
  try {
    const { puntuacion, comentario, producto_id } = req.body;
    const usuario_id   = req.usuario.id;
    const nombre_autor = req.usuario.nombre;

    if (!puntuacion || puntuacion < 1 || puntuacion > 5)
      return res.status(400).json({ error: "Il voto deve essere tra 1 e 5" });

    const giàRecensito = await Recensione.findOne({ where: { usuario_id, producto_id } });
    if (giàRecensito)
      return res.status(400).json({ error: "Hai già recensito questo prodotto" });

    const acquisto = await DettaglioOrdine.findOne({
      where: { producto_id },
      include: [{
        model: Ordine,
        where: { usuario_id, estado: { [Op.ne]: "cancelado" } },
        required: true
      }]
    });

    if (!acquisto)
      return res.status(403).json({ error: "Solo chi ha acquistato il prodotto può recensirlo" });

    const recensione = await Recensione.create({
      puntuacion, comentario, nombre_autor,
      producto_id, usuario_id,
      compra_verificada: true,
      verificado: false
    });

    res.status(201).json({ mensaje: "Recensione inviata, in attesa di approvazione", resena: recensione });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getResenasDestacadas = async (req, res) => {
  try {
    const recensioni = await Recensione.findAll({
      where: { verificado: true, compra_verificada: true, puntuacion: { [Op.gte]: 4 } },
      include: [
        { model: Utente,   attributes: ["nombre"], required: false },
        { model: Prodotto, attributes: ["nombre"], required: true }
      ],
      order: [["puntuacion", "DESC"], ["createdAt", "DESC"]],
      limit: 6
    });
    res.json(recensioni);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const moderarResena = async (req, res) => {
  try {
    const recensione = await Recensione.findByPk(req.params.id);
    if (!recensione) return res.status(404).json({ error: "Recensione non trovata" });
    await recensione.update({ verificado: req.body.verificado });
    // Assegna Benchys quando la recensione viene approvata
    if (req.body.verificado && !recensione.verificado && recensione.usuario_id) {
      try {
        const { assegnaPunti } = require("./puntiController");
        await assegnaPunti(recensione.usuario_id, "recensione", 20, `Recensione approvata — prodotto #${recensione.producto_id}`, recensione.id);
      } catch(e) { console.error("Punti recensione:", e.message); }
    }
    res.json({ mensaje: "Stato aggiornato", resena: recensione });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAllResenas = async (req, res) => {
  try {
    const recensioni = await Recensione.findAll({
      include: [
        { model: Utente,   attributes: ["nombre", "email"], required: false },
        { model: Prodotto, attributes: ["nombre"],          required: false }
      ],
      order: [["createdAt", "DESC"]]
    });
    res.json(recensioni);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getResenasByProducto, crearResena, puedeResenar, getResenasDestacadas, moderarResena, getAllResenas };
