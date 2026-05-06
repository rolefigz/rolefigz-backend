const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const router  = express.Router();
const { RichiestaGadget } = require("../models");

// Assicura che la cartella esista
const uploadDir = path.join(__dirname, "../../uploads/logos");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Formato non supportato. Usa PNG, JPG, SVG o WEBP."));
  },
});

router.post("/orders/gadget3d", upload.single("logo"), async (req, res) => {
  try {
    const { nome, azienda, email, gadget, settore, dimensione, utilizzo, note } = req.body;

    if (!nome || !azienda || !email || !gadget || !settore || !dimensione || !utilizzo)
      return res.status(400).json({ error: "Compila tutti i campi obbligatori." });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: "Email non valida." });

    const order_id = "G3D-" + Date.now();
    const logo_url = req.file
      ? req.file.path
      : null;

    await RichiestaGadget.create({
      order_id, nome, azienda, email, logo_url,
      gadget, settore, dimensione, utilizzo, note: note || null,
    });

    console.log(`✅ Gadget3D richiesta #${order_id} — ${azienda} (${email})`);
    res.json({ success: true, order_id, message: "Ordine ricevuto con successo" });

  } catch (err) {
    console.error("❌ Gadget3D errore:", err.message);
    res.status(500).json({ error: "Errore del server. Riprova tra qualche minuto." });
  }
});

module.exports = router;
