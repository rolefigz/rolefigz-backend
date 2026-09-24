const pageCache = require("../utils/pageCache");

// Il cliente puo' modificare i propri dati anagrafici (nome, settore, dati
// fiscali) ma MAI slug (i tag NFC fisici gia' stampati puntano a quello),
// ne' piano/crediti/stato, che restano decisioni solo dell'admin.
const ottieniAzienda = async (req, res) => {
  const a = req.azienda;
  res.json({
    id: a.id, name: a.name, slug: a.slug, sector: a.sector,
    piva: a.piva, codice_fiscale: a.codice_fiscale, codice_sdi: a.codice_sdi, pec: a.pec,
  });
};

const aggiornaAzienda = async (req, res) => {
  try {
    const { name, sector, piva, codice_fiscale, codice_sdi, pec } = req.body;
    await req.azienda.update({
      ...(name !== undefined && { name }),
      ...(sector !== undefined && { sector }),
      ...(piva !== undefined && { piva }),
      ...(codice_fiscale !== undefined && { codice_fiscale }),
      ...(codice_sdi !== undefined && { codice_sdi }),
      ...(pec !== undefined && { pec }),
    });
    pageCache.invalidate(req.azienda.slug);
    res.json({
      id: req.azienda.id, name: req.azienda.name, slug: req.azienda.slug, sector: req.azienda.sector,
      piva: req.azienda.piva, codice_fiscale: req.azienda.codice_fiscale,
      codice_sdi: req.azienda.codice_sdi, pec: req.azienda.pec,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { ottieniAzienda, aggiornaAzienda };
