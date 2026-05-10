const { Articolo, Utente } = require("../models");
const cloudinary = require("cloudinary").v2;
const multer     = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder:        "rolefigz/blog",
    resource_type: "auto",
    public_id:     "blog-" + Date.now() + "-" + Math.round(Math.random() * 1e9),
  }),
});

const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

const slugifica = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const creaSlugUnico = async (base, escludiId = null) => {
  let slug = base, n = 1;
  while (true) {
    const esiste = await Articolo.findOne({ where: { slug } });
    if (!esiste || (escludiId && esiste.id === escludiId)) break;
    slug = `${base}-${n++}`;
  }
  return slug;
};

const getArticoli = async (req, res) => {
  try {
    const articoli = await Articolo.findAll({
      where: { pubblicato: true },
      attributes: ["id","titolo","slug","estratto","immagine","tags","createdAt"],
      order: [["createdAt","DESC"]],
    });
    res.json(articoli);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getAllArticoliAdmin = async (req, res) => {
  try {
    const articoli = await Articolo.findAll({
      attributes: ["id","titolo","slug","estratto","immagine","tags","pubblicato","createdAt"],
      order: [["createdAt","DESC"]],
    });
    res.json(articoli);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getArticoloBySlug = async (req, res) => {
  try {
    const where = { slug: req.params.slug };
    if (!req.query.admin) where.pubblicato = true;
    const articolo = await Articolo.findOne({
      where,
      include: [{ model: Utente, attributes: ["nombre"], foreignKey: "autore_id" }],
    });
    if (!articolo) return res.status(404).json({ error: "Articolo non trovato" });
    res.json(articolo);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const crearArticolo = async (req, res) => {
  try {
    const { titolo, estratto, contenuto, meta_desc, tags, immagine, pubblicato } = req.body;
    if (!titolo || !contenuto) return res.status(400).json({ error: "Titolo e contenuto obbligatori" });
    const slug = await creaSlugUnico(slugifica(titolo));
    const articolo = await Articolo.create({
      titolo, slug, estratto, contenuto, meta_desc, tags, immagine,
      pubblicato: pubblicato || false,
      autore_id: req.usuario.id,
    });
    res.status(201).json({ mensaje: "Articolo creato", articolo });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const editarArticolo = async (req, res) => {
  try {
    const articolo = await Articolo.findByPk(req.params.id);
    if (!articolo) return res.status(404).json({ error: "Articolo non trovato" });
    const { titolo, estratto, contenuto, meta_desc, tags, immagine, pubblicato } = req.body;
    let slug = articolo.slug;
    if (titolo && titolo !== articolo.titolo) {
      slug = await creaSlugUnico(slugifica(titolo), articolo.id);
    }
    await articolo.update({ titolo, slug, estratto, contenuto, meta_desc, tags, immagine, pubblicato });
    res.json({ mensaje: "Articolo aggiornato", articolo });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const togglePublicar = async (req, res) => {
  try {
    const articolo = await Articolo.findByPk(req.params.id);
    if (!articolo) return res.status(404).json({ error: "Articolo non trovato" });
    await articolo.update({ pubblicato: !articolo.pubblicato });
    res.json({ mensaje: "Stato aggiornato", pubblicato: articolo.pubblicato });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const uploadImmagine = [
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Nessun file" });
      const url = req.file.path || req.file.secure_url;
      res.json({ url });
    } catch (err) { res.status(500).json({ error: err.message }); }
  }
];

module.exports = { getArticoli, getAllArticoliAdmin, getArticoloBySlug, crearArticolo, editarArticolo, togglePublicar, uploadImmagine };
