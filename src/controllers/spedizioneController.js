const { Ordine, OpzioneSpedizione } = require("../models");
const { emailSpedizione } = require("../utils/mailer");
const { Op } = require("sequelize");

const PAESI_EU = new Set([
  "ES","FR","DE","AT","NL","BE","PT","LU","SE","NO","DK","FI",
  "PL","CZ","SK","HU","RO","HR","GR","BG","EE","LV","LT","SI",
  "IE","CY","MT","CH","GB","LI","IS"
]);

// GET /api/spedizione/opzioni?nazione=IT — tariffe per il cliente (pubblico)
const getOpzioniCliente = async (req, res) => {
  try {
    const nazione = (req.query.nazione || "IT").toUpperCase();
    let zone;
    if (nazione === "IT")              zone = ["IT", "ALL"];
    else if (PAESI_EU.has(nazione))    zone = ["EU", "ALL"];
    else                               zone = ["MONDO", "ALL"];

    const opzioni = await OpzioneSpedizione.findAll({
      where: { attivo: true, zona: { [Op.in]: zone } },
      order: [["prezzo", "ASC"]]
    });
    res.json(opzioni);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/spedizione/opzioni/admin — tutte le tariffe (admin)
const getOpzioniAdmin = async (req, res) => {
  try {
    const opzioni = await OpzioneSpedizione.findAll({
      order: [["zona", "ASC"], ["prezzo", "ASC"]]
    });
    res.json(opzioni);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/spedizione/opzioni — crea tariffa (admin)
const creaOpzione = async (req, res) => {
  try {
    const { nome, prezzo, giorni, zona } = req.body;
    if (!nome || prezzo == null) return res.status(400).json({ error: "Nome e prezzo obbligatori" });
    const op = await OpzioneSpedizione.create({ nome, prezzo, giorni: giorni || null, zona: zona || "IT" });
    res.status(201).json(op);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /api/spedizione/opzioni/:id — modifica tariffa (admin)
const aggiornaOpzione = async (req, res) => {
  try {
    const op = await OpzioneSpedizione.findByPk(req.params.id);
    if (!op) return res.status(404).json({ error: "Tariffa non trovata" });
    await op.update(req.body);
    res.json(op);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/spedizione/opzioni/:id — elimina tariffa (admin)
const eliminaOpzione = async (req, res) => {
  try {
    await OpzioneSpedizione.destroy({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const SHIPPO_BASE = "https://api.goshippo.com";

// Helper — chiamata autenticata a Shippo
async function shippoFetch(path, metodo = "GET", corpo = null) {
  const opzioni = {
    method:  metodo,
    headers: {
      "Authorization": `ShippoToken ${process.env.SHIPPO_API_KEY}`,
      "Content-Type":  "application/json",
    },
  };
  if (corpo) opzioni.body = JSON.stringify(corpo);
  const r = await fetch(`${SHIPPO_BASE}${path}`, opzioni);
  const data = await r.json();
  if (!r.ok) throw new Error(data.detail || data.message || `Shippo errore ${r.status}`);
  return data;
}

// Indirizzo mittente dal .env
function indirizzoMittente() {
  return {
    name:    process.env.SHOP_NOME      || "RoleFigz",
    street1: process.env.SHOP_VIA       || "215 Clayton St.",
    city:    process.env.SHOP_CITTA     || "San Francisco",
    zip:     process.env.SHOP_CAP       || "94117",
    state:   process.env.SHOP_PROV      || "CA",
    country: process.env.SHOP_NAZIONE   || "US",
    phone:   process.env.SHOP_TELEFONO  || "",
    email:   process.env.SHOP_EMAIL     || "",
  };
}

// POST /api/spedizione/rate — calcola tariffe in tempo reale
const calcolaTariffe = async (req, res) => {
  try {
    const {
      nome_destinatario, via, citta, cap, provincia = "",
      lunghezza_cm = 20, larghezza_cm = 15, altezza_cm = 10,
    } = req.body;
    // Fix 2: normalizza nazione a 2 lettere maiuscole
    const nazione = (req.body.nazione || "IT").trim().toUpperCase().slice(0, 2);
    const peso_grammi = req.body.peso_grammi || parseInt(process.env.SPEDIZ_PESO_DEFAULT || 500);

    if (!nome_destinatario || !via || !citta || !cap)
      return res.status(400).json({ error: "Compila tutti i campi obbligatori" });

    const mittente = indirizzoMittente();

    // Fix 4: unità imperiali per spedizioni USA↔USA, metriche altrimenti
    const usaImperiale = mittente.country === "US";
    const parcel = usaImperiale ? {
      length:        String(Math.round(lunghezza_cm / 2.54)),
      width:         String(Math.round(larghezza_cm / 2.54)),
      height:        String(Math.round(altezza_cm   / 2.54)),
      distance_unit: "in",
      weight:        String((peso_grammi / 453.592).toFixed(2)),
      mass_unit:     "lb",
    } : {
      length:        String(lunghezza_cm),
      width:         String(larghezza_cm),
      height:        String(altezza_cm),
      distance_unit: "cm",
      weight:        String((peso_grammi / 1000).toFixed(3)),
      mass_unit:     "kg",
    };

    // Fix 1 & 3: log origine per verifica e header ShippoToken già corretto
    console.log(`📦 Shippo request — da: ${mittente.street1}, ${mittente.city} ${mittente.country} → a: ${via}, ${citta} ${nazione} | peso: ${usaImperiale ? parcel.weight+'lb' : parcel.weight+'kg'}`);

    const spedizione = await shippoFetch("/shipments/", "POST", {
      address_from: mittente,
      address_to: {
        name:    nome_destinatario,
        street1: via,
        city:    citta,
        zip:     cap,
        state:   provincia,
        country: nazione,
      },
      parcels: [parcel],
      async: false,
    });

    // Log diagnostico in console per debug
    const msgShippo = (spedizione.messages || []).map(m => `[${m.source}] ${m.text}`).join(" | ");
    if (msgShippo) console.warn("⚠️ Shippo messages:", msgShippo);
    console.log(`📦 Shippo: ${spedizione.rates?.length ?? 0} tariffe restituite`);

    if (!spedizione.rates || !spedizione.rates.length) {
      const dettaglio = msgShippo || "Nessun corriere disponibile per questo percorso.";
      return res.status(400).json({ error: dettaglio });
    }

    const tariffe = spedizione.rates
      .filter(r => r.amount != null)
      .map(r => ({
        id:       r.object_id,
        corriere: r.provider,
        servizio: r.servicelevel?.name || r.servicelevel?.token || r.attributes?.[0] || "—",
        prezzo:   parseFloat(r.amount).toFixed(2),
        valuta:   r.currency,
        giorni:   r.estimated_days || null,
        include:  r.included_insurance_price ? `Assicurazione inclusa` : null,
      }))
      .sort((a, b) => parseFloat(a.prezzo) - parseFloat(b.prezzo));

    if (!tariffe.length)
      return res.status(400).json({ error: "Tariffe ricevute da Shippo ma senza importo valido." });

    res.json({ shipment_id: spedizione.object_id, tariffe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/spedizione/acquista — acquista etichetta e aggiorna ordine
const acquistaEtichetta = async (req, res) => {
  try {
    const { rate_id, ordine_id } = req.body;
    if (!rate_id || !ordine_id)
      return res.status(400).json({ error: "rate_id e ordine_id obbligatori" });

    const transazione = await shippoFetch("/transactions/", "POST", {
      rate:            rate_id,
      label_file_type: "PDF",
      async:           false,
    });

    if (transazione.status !== "SUCCESS") {
      const errMsg = transazione.messages?.map(m => m.text).join("; ") || "Errore generazione etichetta";
      return res.status(400).json({ error: errMsg });
    }

    // Aggiorna ordine con dati di spedizione
    await Ordine.update({
      tracking_number:       transazione.tracking_number,
      label_url:             transazione.label_url,
      carrier:               transazione.rate?.provider || "",
      costo_spedizione:      transazione.rate?.amount   || 0,
      shippo_transaction_id: transazione.object_id,
      estado:                "enviado",
    }, { where: { id: ordine_id } });

    // Invia email di spedizione al cliente
    const ordineAggiornato = await Ordine.findByPk(ordine_id);
    if (ordineAggiornato) {
      emailSpedizione(ordineAggiornato).catch(err => console.error("Email spedizione fallita:", err.message));
    }

    res.json({
      tracking_number:    transazione.tracking_number,
      tracking_url:       transazione.tracking_url_provider,
      label_url:          transazione.label_url,
      carrier:            transazione.rate?.provider || "",
      servizio:           transazione.rate?.servicelevel?.name || "",
      costo:              transazione.rate?.amount || "0",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/spedizione/ordine/:id — stato spedizione ordine
const getStatoSpedizione = async (req, res) => {
  try {
    const ordine = await Ordine.findByPk(req.params.id, {
      attributes: ["id", "tracking_number", "carrier", "label_url", "costo_spedizione", "estado"]
    });
    if (!ordine) return res.status(404).json({ error: "Ordine non trovato" });
    res.json(ordine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/spedizione/acquista-checkout — genera etichetta al checkout (pubblico, rate ancora valido)
const acquistaEtichettaCheckout = async (req, res) => {
  try {
    const { rate_id } = req.body;
    if (!rate_id) return res.status(400).json({ error: "rate_id obbligatorio" });

    const transazione = await shippoFetch("/transactions/", "POST", {
      rate:            rate_id,
      label_file_type: "PDF",
      async:           false,
    });

    if (transazione.status !== "SUCCESS") {
      const msg = transazione.messages?.map(m => m.text).join("; ") || "Errore generazione etichetta";
      return res.status(400).json({ error: msg });
    }

    res.json({
      tracking_number:       transazione.tracking_number,
      label_url:             transazione.label_url,
      carrier:               transazione.rate?.provider || "",
      servizio:              transazione.rate?.servicelevel?.name || "",
      costo:                 transazione.rate?.amount || "0",
      shippo_transaction_id: transazione.object_id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/spedizione/webhook — Shippo invia eventi qui
const shippoWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;
    if (!event || !data) return res.json({ received: true });

    console.log(`📬 Shippo webhook: ${event}`);

    // Etichetta creata con successo
    if (event === "transaction_created" || event === "transaction_updated") {
      if (data.status === "SUCCESS" && data.tracking_number) {
        // Cerca ordine per shippo_transaction_id
        const ordine = await Ordine.findOne({ where: { shippo_transaction_id: data.object_id } });
        if (ordine && !ordine.tracking_number) {
          await ordine.update({
            tracking_number: data.tracking_number,
            label_url:       data.label_url || ordine.label_url,
            estado:          "enviado",
          });
          emailSpedizione(ordine).catch(() => {});
          console.log(`✅ Tracking aggiornato via webhook — ordine #${ordine.id}: ${data.tracking_number}`);
        }
      }
    }

    // Aggiornamento stato tracking
    if (event === "track_updated") {
      const stato = data.tracking_status?.status;
      if (data.tracking_number && stato) {
        const ordine = await Ordine.findOne({ where: { tracking_number: data.tracking_number } });
        if (ordine) {
          if (stato === "DELIVERED" && ordine.estado !== "entregado") {
            await ordine.update({ estado: "entregado" });
            console.log(`✅ Ordine #${ordine.id} segnato come CONSEGNATO via webhook`);
          } else if (stato === "TRANSIT" && ordine.estado === "confirmado") {
            await ordine.update({ estado: "enviado" });
          }
        }
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("❌ Shippo webhook errore:", err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  calcolaTariffe, acquistaEtichetta, acquistaEtichettaCheckout, getStatoSpedizione,
  getOpzioniCliente, getOpzioniAdmin, creaOpzione, aggiornaOpzione, eliminaOpzione,
  shippoWebhook,
};
