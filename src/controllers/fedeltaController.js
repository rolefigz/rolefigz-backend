const { ClienteFedelta, FedeltaMovimiento } = require("../models");
const { Op } = require("sequelize");
const crypto = require("crypto");

const TIMBRI_PER_PREMIO = 4;
const VALORE_PREMIO     = 100; // €, senza minimo d'ordine

function generaCodiceTarjeta() {
  return "RF-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function trovaOCreaCliente(email, nombre, telefono) {
  const emailNorm = String(email).trim().toLowerCase();
  let cliente = await ClienteFedelta.findOne({ where: { email: emailNorm } });
  if (cliente) {
    const dati = {};
    if (nombre && !cliente.nombre) dati.nombre = nombre;
    if (telefono && !cliente.telefono) dati.telefono = telefono;
    if (Object.keys(dati).length) await cliente.update(dati);
    return cliente;
  }
  let codice;
  do { codice = generaCodiceTarjeta(); } while (await ClienteFedelta.findOne({ where: { codice_tarjeta: codice } }));
  return ClienteFedelta.create({ email: emailNorm, nombre: nombre || null, telefono: telefono || null, codice_tarjeta: codice });
}

// ── GET /api/fedelta/admin — elenco tessere (con ricerca) ─────────────────────
const elencoAdmin = async (req, res) => {
  try {
    const { q } = req.query;
    const where = q
      ? { [Op.or]: [{ email: { [Op.like]: `%${q}%` } }, { nombre: { [Op.like]: `%${q}%` } }] }
      : {};
    const clienti = await ClienteFedelta.findAll({ where, order: [["updatedAt", "DESC"]] });
    res.json({ clienti, config: { timbri_per_premio: TIMBRI_PER_PREMIO, valore_premio: VALORE_PREMIO } });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/fedelta/admin/:id — dettaglio + storico movimenti ────────────────
const dettaglioAdmin = async (req, res) => {
  try {
    const cliente = await ClienteFedelta.findByPk(req.params.id);
    if (!cliente) return res.status(404).json({ error: "Tessera non trovata" });
    const movimenti = await FedeltaMovimiento.findAll({
      where: { cliente_fedelta_id: cliente.id },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    res.json({ cliente, movimenti });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── POST /api/fedelta/admin/timbro — aggiunge un timbro (ordine ≥100€) ───────
const aggiungiTimbro = async (req, res) => {
  try {
    const { email, nombre, telefono, nota } = req.body;
    if (!email || !email.trim()) return res.status(400).json({ error: "Email richiesta" });

    const cliente = await trovaOCreaCliente(email, nombre, telefono);

    let nuoviTimbri = cliente.timbri_attuali + 1;
    let nuoviPremi  = cliente.premi_disponibili;
    let premioSbloccato = false;

    if (nuoviTimbri >= TIMBRI_PER_PREMIO) {
      nuoviTimbri = 0;
      nuoviPremi += 1;
      premioSbloccato = true;
    }

    await cliente.update({
      timbri_attuali: nuoviTimbri,
      timbri_totali: cliente.timbri_totali + 1,
      premi_disponibili: nuoviPremi,
    });

    await FedeltaMovimiento.create({
      cliente_fedelta_id: cliente.id, tipo: "timbro", nota: nota || null, admin_id: req.usuario.id,
    });
    if (premioSbloccato) {
      await FedeltaMovimiento.create({
        cliente_fedelta_id: cliente.id, tipo: "premio_generato",
        nota: `Premio di €${VALORE_PREMIO} sbloccato`, admin_id: req.usuario.id,
      });
    }

    res.json({ mensaje: premioSbloccato ? `Timbro aggiunto — premio di €${VALORE_PREMIO} sbloccato!` : "Timbro aggiunto", cliente, premioSbloccato });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── POST /api/fedelta/admin/timbro/annulla — toglie l'ultimo timbro ──────────
const annullaTimbro = async (req, res) => {
  try {
    const { id } = req.body;
    const cliente = await ClienteFedelta.findByPk(id);
    if (!cliente) return res.status(404).json({ error: "Tessera non trovata" });
    if (cliente.timbri_attuali === 0) return res.status(400).json({ error: "Non ci sono timbri da togliere in questo ciclo" });

    await cliente.update({
      timbri_attuali: cliente.timbri_attuali - 1,
      timbri_totali: Math.max(0, cliente.timbri_totali - 1),
    });
    await FedeltaMovimiento.create({
      cliente_fedelta_id: cliente.id, tipo: "timbro_annullato", nota: "Timbro tolto dall'admin", admin_id: req.usuario.id,
    });
    res.json({ mensaje: "Timbro tolto", cliente });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── POST /api/fedelta/admin/premio/riscatta — segna un premio come usato ─────
const riscattaPremio = async (req, res) => {
  try {
    const { id, nota } = req.body;
    const cliente = await ClienteFedelta.findByPk(id);
    if (!cliente) return res.status(404).json({ error: "Tessera non trovata" });
    if (cliente.premi_disponibili === 0) return res.status(400).json({ error: "Nessun premio disponibile" });

    await cliente.update({
      premi_disponibili: cliente.premi_disponibili - 1,
      premi_riscattati: cliente.premi_riscattati + 1,
    });
    await FedeltaMovimiento.create({
      cliente_fedelta_id: cliente.id, tipo: "premio_riscattato",
      nota: nota || `Sconto di €${VALORE_PREMIO} applicato`, admin_id: req.usuario.id,
    });
    res.json({ mensaje: "Premio segnato come riscattato", cliente });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { elencoAdmin, dettaglioAdmin, aggiungiTimbro, annullaTimbro, riscattaPremio, TIMBRI_PER_PREMIO, VALORE_PREMIO };
