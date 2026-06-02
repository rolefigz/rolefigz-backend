const { CodicePromo, Ordine } = require("../models");
const { Op } = require("sequelize");

function calcolaSconto(codice, totaleCarrello, costoSpedizione) {
  if (!codice.attivo) return null;
  if (codice.data_scadenza && new Date() > new Date(codice.data_scadenza)) return null;
  if (codice.max_utilizzi !== null && codice.utilizzi_attuali >= codice.max_utilizzi) return null;

  const result = { tipo: codice.tipo, scontoEuro: 0, spedizioneGratis: false };

  if (codice.tipo === "percentuale") {
    result.scontoEuro = parseFloat(((totaleCarrello * parseFloat(codice.valore)) / 100).toFixed(2));
  } else if (codice.tipo === "fisso") {
    result.scontoEuro = Math.min(parseFloat(codice.valore), totaleCarrello);
  } else if (codice.tipo === "spedizione_gratuita") {
    result.spedizioneGratis = true;
    result.scontoEuro = costoSpedizione || 0;
  }

  return result;
}

const verificaCodice = async (req, res) => {
  try {
    const { codice, totale_carrello = 0, costo_spedizione = 0 } = req.body;
    if (!codice) return res.status(400).json({ error: "Codice mancante" });

    const promo = await CodicePromo.findOne({
      where: { codice: codice.toUpperCase().trim(), attivo: true }
    });
    if (!promo) return res.status(404).json({ error: "Codice non valido" });
    if (promo.data_scadenza && new Date() > new Date(promo.data_scadenza))
      return res.status(400).json({ error: "Codice scaduto" });
    if (promo.max_utilizzi !== null && promo.utilizzi_attuali >= promo.max_utilizzi)
      return res.status(400).json({ error: "Codice esaurito" });
    if (promo.minimo_ordine > 0 && parseFloat(totale_carrello) < parseFloat(promo.minimo_ordine))
      return res.status(400).json({ error: `Ordine minimo €${parseFloat(promo.minimo_ordine).toFixed(2)} per usare questo codice` });

    const sconto = calcolaSconto(promo, totale_carrello, costo_spedizione);
    res.json({ valido: true, promo, sconto });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getPopup = async (req, res) => {
  try {
    const popups = await CodicePromo.findAll({
      where: {
        attivo: true, mostra_popup: true,
        [Op.or]: [{ data_scadenza: null }, { data_scadenza: { [Op.gt]: new Date() } }]
      },
      attributes: ["id","codice","tipo","valore","popup_titolo","popup_testo","popup_colore","descrizione"]
    });
    res.json(popups);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const getTutti = async (req, res) => {
  try {
    const codici = await CodicePromo.findAll({ order: [["createdAt", "DESC"]] });
    res.json(codici);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const creaCodice = async (req, res) => {
  try {
    const { codice, tipo, valore, descrizione, data_scadenza, max_utilizzi,
            mostra_popup, popup_titolo, popup_testo, popup_colore } = req.body;
    if (!codice || !tipo) return res.status(400).json({ error: "Codice e tipo obbligatori" });

    const nuovo = await CodicePromo.create({
      codice: codice.toUpperCase().trim(), tipo,
      valore: valore || 0, descrizione,
      data_scadenza: data_scadenza || null,
      max_utilizzi: max_utilizzi || null,
      mostra_popup: !!mostra_popup, popup_titolo, popup_testo,
      popup_colore: popup_colore || "#1a1a1a"
    });
    res.status(201).json(nuovo);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError")
      return res.status(400).json({ error: "Codice già esistente" });
    res.status(500).json({ error: err.message });
  }
};

const aggiornaCodice = async (req, res) => {
  try {
    const promo = await CodicePromo.findByPk(req.params.id);
    if (!promo) return res.status(404).json({ error: "Codice non trovato" });
    const campi = ["tipo","valore","descrizione","attivo","data_scadenza","max_utilizzi",
                   "mostra_popup","popup_titolo","popup_testo","popup_colore"];
    const update = {};
    campi.forEach(c => { if (req.body[c] !== undefined) update[c] = req.body[c]; });
    await promo.update(update);
    res.json(promo);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const eliminaCodice = async (req, res) => {
  try {
    const promo = await CodicePromo.findByPk(req.params.id);
    if (!promo) return res.status(404).json({ error: "Codice non trovato" });
    await promo.destroy();
    res.json({ mensaje: "Codice eliminato" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// uso questa funzione internamente quando un ordine viene confermato
async function registraUtilizzo(codice, totaleOrdine) {
  try {
    const promo = await CodicePromo.findOne({ where: { codice: codice.toUpperCase().trim() } });
    if (!promo) return;
    await promo.increment("utilizzi_attuali");
    await promo.increment("fatturato_generato", { by: parseFloat(totaleOrdine) || 0 });
  } catch(e) { console.error("Promo registraUtilizzo:", e.message); }
}

module.exports = { verificaCodice, getPopup, getTutti, creaCodice, aggiornaCodice, eliminaCodice, registraUtilizzo, calcolaSconto };
