const { CircuitoOrdine } = require("../models");
const { sendMessage } = require("../utils/telegram");

function euro(n) { return `€${Number(n || 0).toFixed(2)}`; }

// ── POST /api/circuiti/ordini — creato dalla pagina pubblica /circuiti ───────
const creaOrdine = async (req, res) => {
  try {
    const { numero, nombre, email, telefono, direccion, codigo_postal, ciudad, pais, notas, articoli, totale } = req.body;

    if (!numero || !nombre || !email || !direccion) return res.status(400).json({ error: "Dati mancanti" });
    if (!Array.isArray(articoli) || !articoli.length) return res.status(400).json({ error: "Carrello vuoto" });

    const esiste = await CircuitoOrdine.findOne({ where: { numero } });
    if (esiste) return res.json({ mensaje: "Ordine già registrato", numero: esiste.numero });

    const ordine = await CircuitoOrdine.create({
      numero, nombre, email, telefono: telefono || null, direccion,
      codigo_postal: codigo_postal || null, ciudad: ciudad || null, pais: pais || null,
      notas: notas || null, articoli, totale: Number(totale) || 0,
    });

    const righe = articoli.map(a => `${a.quantita}× ${a.nome} — ${euro(a.prezzo * a.quantita)}`).join("\n");
    sendMessage(`<b>Nuovo ordine circuiti</b> · ${ordine.numero}\n${righe}\nTotale: ${euro(ordine.totale)}\n${ordine.nombre} — ${ordine.email}${ordine.telefono ? " · " + ordine.telefono : ""}`)
      .catch(err => console.error("Telegram ordine circuiti:", err.message));

    res.json({ mensaje: "Ordine registrato", numero: ordine.numero });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/circuiti/admin/ordini — elenco (admin) ───────────────────────────
const elencoAdmin = async (req, res) => {
  try {
    const ordini = await CircuitoOrdine.findAll({ order: [["createdAt", "DESC"]] });
    res.json(ordini);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── PATCH /api/circuiti/admin/ordini/:id — stato/tracking (admin) ────────────
const aggiornaAdmin = async (req, res) => {
  try {
    const { stato, tracking_number, carrier } = req.body;
    const ordine = await CircuitoOrdine.findByPk(req.params.id);
    if (!ordine) return res.status(404).json({ error: "Ordine non trovato" });

    const valori = {};
    if (stato) valori.stato = stato;
    if (tracking_number !== undefined) valori.tracking_number = tracking_number || null;
    if (carrier !== undefined) valori.carrier = carrier || null;

    await ordine.update(valori);
    res.json({ mensaje: "Aggiornato", ordine });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { creaOrdine, elencoAdmin, aggiornaAdmin };
