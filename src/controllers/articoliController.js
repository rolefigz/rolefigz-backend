const { Articolo, Usuario } = require("../models");

const slugify = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const makeUniqueSlug = async (base) => {
  let slug = base;
  let n = 1;
  while (await Articolo.findOne({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
};

const getArticoli = async (req, res) => {
  try {
    const articoli = await Articolo.findAll({
      where: { pubblicato: true },
      attributes: ["id", "titolo", "slug", "estratto", "immagine", "tags", "createdAt"],
      order: [["createdAt", "DESC"]],
    });
    res.json(articoli);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getArticoloBySlug = async (req, res) => {
  try {
    const articolo = await Articolo.findOne({
      where: { slug: req.params.slug, pubblicato: true },
      include: [{ model: Usuario, attributes: ["nombre"], foreignKey: "autore_id" }],
    });
    if (!articolo) return res.status(404).json({ error: "Articolo non trovato" });
    res.json(articolo);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const crearArticolo = async (req, res) => {
  try {
    const { titolo, estratto, contenuto, meta_desc, tags, immagine, pubblicato } = req.body;
    const slug = await makeUniqueSlug(slugify(titolo));
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
    if (titolo && titolo !== articolo.titolo) {
      req.body.slug = await makeUniqueSlug(slugify(titolo));
    }
    await articolo.update({ titolo, slug: req.body.slug || articolo.slug, estratto, contenuto, meta_desc, tags, immagine, pubblicato });
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

module.exports = { getArticoli, getArticoloBySlug, crearArticolo, editarArticolo, togglePublicar };
