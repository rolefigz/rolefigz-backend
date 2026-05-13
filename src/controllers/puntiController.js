const { PuntiTransazione, Utente } = require("../models");
const { Op } = require("sequelize");

// ── Configurazione Benchys ────────────────────────────────────────────────────
const BENCHY = {
  acquisto_per_euro:  1,    // 1 Benchy per ogni €1 speso
  instagram_follow:   50,   // 50 Benchys (approvazione manuale)
  recensione:         20,   // 20 Benchys (auto all'approvazione)
  registrazione:      30,   // 30 Benchys (auto)
  sconto_per_100:     1.00, // 100 Benchys = €1 di sconto
  spedizione_minimo:  150,  // 150 Benchys = spedizione gratuita
};

// ── Helper interno ────────────────────────────────────────────────────────────
async function assegnaPunti(utenteId, tipo, punti, descrizione, riferimentoId = null, stato = "approvato") {
  return PuntiTransazione.create({ utente_id: utenteId, tipo, punti, descrizione, stato, riferimento_id: riferimentoId });
}

async function calcolaSaldo(utenteId) {
  const transazioni = await PuntiTransazione.findAll({
    where: { utente_id: utenteId, stato: "approvato" },
    attributes: ["punti"],
  });
  return transazioni.reduce((s, t) => s + t.punti, 0);
}

// ── GET /api/punti — saldo + storico utente autenticato ───────────────────────
const getSaldo = async (req, res) => {
  try {
    const utenteId = req.usuario.id;
    const transazioni = await PuntiTransazione.findAll({
      where: { utente_id: utenteId },
      order: [["createdAt", "DESC"]],
    });
    const saldo = transazioni
      .filter(t => t.stato === "approvato")
      .reduce((s, t) => s + t.punti, 0);
    res.json({ saldo, config: BENCHY, transazioni });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── POST /api/punti/richiedi — richiesta azione manuale (Instagram) ───────────
const richiediAzione = async (req, res) => {
  try {
    const utenteId = req.usuario.id;
    const { tipo } = req.body;

    const tipiManuali = ["instagram_follow"];
    if (!tipiManuali.includes(tipo))
      return res.status(400).json({ error: "Tipo azione non valido" });

    // Controlla se già richiesta o approvata
    const esiste = await PuntiTransazione.findOne({
      where: { utente_id: utenteId, tipo, stato: { [Op.in]: ["approvato", "in_attesa"] } }
    });
    if (esiste) return res.status(400).json({ error: "Richiesta già inviata o già approvata" });

    const puntiMap = { instagram_follow: BENCHY.instagram_follow };
    const descMap  = { instagram_follow: "Follow Instagram @rolefigz" };

    await assegnaPunti(utenteId, tipo, puntiMap[tipo], descMap[tipo], null, "in_attesa");
    res.json({ mensaje: "Richiesta inviata, in attesa di approvazione admin" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── POST /api/punti/riscatta — usa Benchys al checkout ───────────────────────
const riscattaPunti = async (req, res) => {
  try {
    const utenteId = req.usuario.id;
    const { tipo, ordine_id } = req.body; // tipo: 'sconto' | 'spedizione_gratuita'

    const saldo = await calcolaSaldo(utenteId);

    if (tipo === "spedizione_gratuita") {
      if (saldo < BENCHY.spedizione_minimo)
        return res.status(400).json({ error: `Servono ${BENCHY.spedizione_minimo} Benchys (ne hai ${saldo})` });
      await assegnaPunti(utenteId, "spedizione_gratuita", -BENCHY.spedizione_minimo, "Spedizione gratuita riscattata", ordine_id);
      return res.json({ sconto_spedizione: 10, nuovoSaldo: saldo - BENCHY.spedizione_minimo });
    }

    if (tipo === "sconto") {
      const { benchys } = req.body;
      if (!benchys || benchys < 100) return res.status(400).json({ error: "Minimo 100 Benchys per lo sconto" });
      const arrotondati = Math.floor(benchys / 100) * 100;
      if (saldo < arrotondati) return res.status(400).json({ error: `Saldo insufficiente (hai ${saldo} Benchys)` });
      const sconto = (arrotondati / 100) * BENCHY.sconto_per_100;
      await assegnaPunti(utenteId, "sconto", -arrotondati, `Sconto €${sconto.toFixed(2)} riscattato`, ordine_id);
      return res.json({ sconto_euro: sconto, benchys_usati: arrotondati, nuovoSaldo: saldo - arrotondati });
    }

    res.status(400).json({ error: "Tipo riscatto non valido" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/punti/admin/pending — richieste in attesa (admin) ────────────────
const getPendingAdmin = async (req, res) => {
  try {
    const pending = await PuntiTransazione.findAll({
      where: { stato: "in_attesa" },
      include: [{ model: Utente, attributes: ["id", "nombre", "email"] }],
      order: [["createdAt", "DESC"]],
    });
    res.json(pending);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── PATCH /api/punti/admin/:id — approva o rifiuta (admin) ───────────────────
const gestisciRichiesta = async (req, res) => {
  try {
    const { stato } = req.body; // 'approvato' | 'rifiutato'
    if (!["approvato", "rifiutato"].includes(stato))
      return res.status(400).json({ error: "Stato non valido" });

    const t = await PuntiTransazione.findByPk(req.params.id);
    if (!t) return res.status(404).json({ error: "Transazione non trovata" });
    if (t.stato !== "in_attesa") return res.status(400).json({ error: "Non è in attesa" });

    await t.update({ stato });
    res.json({ mensaje: stato === "approvato" ? "Benchys assegnati!" : "Richiesta rifiutata", transazione: t });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getSaldo, richiediAzione, riscattaPunti, getPendingAdmin, gestisciRichiesta, assegnaPunti, calcolaSaldo, BENCHY };
