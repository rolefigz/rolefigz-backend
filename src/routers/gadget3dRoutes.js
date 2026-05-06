const express = require("express");
const router  = express.Router();
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const { RichiestaGadget, Ordine } = require("../models");
const { emailGadget3D, emailGadget3DAdmin } = require("../utils/mailer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:        "rolefigz/gadget-logos",
    resource_type: "auto",
    public_id:     "logo-" + Date.now() + "-" + Math.round(Math.random() * 1e9),
  }),
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

    const logo_url = req.file ? (req.file.path || req.file.secure_url) : null;

    const notas = [
      `[GADGET 3D — Career Day 2026]`,
      `Gadget: ${gadget}`,
      `Azienda: ${azienda}`,
      `Settore: ${settore}`,
      `Dimensione: ${dimensione}`,
      `Utilizzo: ${utilizzo}`,
      note ? `Note: ${note}` : null,
      logo_url ? `Logo: ${logo_url}` : "Logo: non caricato",
    ].filter(Boolean).join("\n");

    // Crea ordine nel sistema ordini (total 0 = campione gratuito)
    const ordine = await Ordine.create({
      nombre_cliente:   nome,
      email_cliente:    email,
      direccion:        `${azienda} — Career Day 2026`,
      total:            0,
      estado:           "pendiente",
      carrier:          "Gadget 3D",
      costo_spedizione: 0,
      notas,
    });

    // Salva anche nella tabella dedicata ai gadget
    await RichiestaGadget.create({
      order_id:   `G3D-${ordine.id}`,
      nome, azienda, email, logo_url: logo_url || null,
      gadget, settore, dimensione, utilizzo, note: note || null,
    });

    // Email al cliente (fire-and-forget)
    emailGadget3D({ id: ordine.id, nome, email, gadget, azienda }).catch(err =>
      console.error("Email gadget3D cliente:", err.message)
    );
    // Email all'admin (fire-and-forget)
    emailGadget3DAdmin({ id: ordine.id, nome, email, gadget, azienda, settore, dimensione, utilizzo, note, logo_url }).catch(err =>
      console.error("Email gadget3D admin:", err.message)
    );

    console.log(`✅ Gadget3D ordine #${ordine.id} — ${azienda} (${email})`);
    res.json({ success: true, order_id: ordine.id, message: "Ordine ricevuto con successo" });

  } catch (err) {
    console.error("❌ Gadget3D errore:", err.message);
    res.status(500).json({ error: "Errore del server. Riprova tra qualche minuto." });
  }
});

module.exports = router;
