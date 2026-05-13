const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { Ordine, DettaglioOrdine, Prodotto } = require("../models");
const { emailConfirmacionPedido, emailNuevoPedidoAdmin } = require("../utils/mailer");

// POST /api/ordines — crea ordine (pubblico, collega utente se c'è token)
const crearOrden = async (req, res) => {
  const t = await require("../config/db").transaction();
  try {
    const { nombre_cliente, email_cliente, telefono, direccion, notas, items, codice_promo } = req.body;

    let usuario_id = null;
    const authHeader = req.headers["authorization"];
    const tkn = authHeader && authHeader.split(" ")[1];
    if (tkn) {
      try {
        const decoded = jwt.verify(tkn, process.env.JWT_SECRET);
        usuario_id = decoded.id;
      } catch {}
    }

    if (!items || !items.length)
      return res.status(400).json({ error: "Il carrello è vuoto" });

    // Calcola totale e verifica stock
    let totale = 0;
    const dettagli = [];

    for (const item of items) {
      const prodotto = await Prodotto.findByPk(item.producto_id);
      if (!prodotto) throw new Error(`Prodotto #${item.producto_id} non trovato`);
      if (prodotto.stock < item.cantidad)
        throw new Error(`Stock insufficiente per "${prodotto.nombre}" (disponibile: ${prodotto.stock})`);

      const prezzoBase   = parseFloat(prodotto.precio);
      const prezzoInviat = item.precio_unidad ? parseFloat(item.precio_unidad) : prezzoBase;
      const precio_unidad = prezzoInviat >= prezzoBase ? prezzoInviat : prezzoBase;
      const subtotale    = precio_unidad * item.cantidad;
      totale += subtotale;
      dettagli.push({ prodotto, cantidad: item.cantidad, precio_unidad, subtotal: subtotale, variante: item.variante || null, foto_cliente: item.foto_cliente || null, data_consegna: item.data_consegna || null, supplemento_express: item.supplemento_express || 0 });
    }

    // Applica codice promo se presente
    let scontoPromo = 0;
    let spedizioneGratis = false;
    if (codice_promo) {
      try {
        const { CodicePromo } = require("../models");
        const promo = await CodicePromo.findOne({ where: { codice: codice_promo.toUpperCase().trim(), attivo: true } });
        if (promo) {
          if (promo.tipo === "percentuale") scontoPromo = (totale * parseFloat(promo.valore)) / 100;
          else if (promo.tipo === "fisso")  scontoPromo = Math.min(parseFloat(promo.valore), totale);
          else if (promo.tipo === "spedizione_gratuita") spedizioneGratis = true;
        }
      } catch(e) { console.error("Promo apply:", e.message); }
    }

    // Crea ordine
    const ordine = await Ordine.create({
      nombre_cliente, email_cliente, telefono, direccion, notas, total: totale,
      usuario_id, codice_promo: codice_promo || null
    }, { transaction: t });

    // Crea dettagli e decrementa stock
    for (const d of dettagli) {
      await DettaglioOrdine.create({
        orden_id:      ordine.id,
        producto_id:   d.prodotto.id,
        cantidad:      d.cantidad,
        precio_unidad: d.precio_unidad,
        subtotal:            d.subtotal,
        variante:            d.variante,
        foto_cliente:        d.foto_cliente,
        data_consegna:       d.data_consegna,
        supplemento_express: d.supplemento_express,
      }, { transaction: t });

      await d.prodotto.update(
        { stock: d.prodotto.stock - d.cantidad },
        { transaction: t }
      );
    }

    await t.commit();

    // Invia email (senza bloccare la risposta in caso di errore)
    const ordineConDettagli = await Ordine.findByPk(ordine.id, {
      include: [{
        model: DettaglioOrdine,
        as: "detalles",
        include: [{ model: Prodotto, attributes: ["nombre"] }]
      }]
    });

    emailConfirmacionPedido(ordineConDettagli, ordineConDettagli.detalles).catch(console.error);
    emailNuevoPedidoAdmin(ordineConDettagli).catch(console.error);

    res.status(201).json({
      mensaje: "Ordine creato con successo",
      orden_id: ordine.id,
      total:    ordine.total,
      estado:   ordine.estado
    });

  } catch (err) {
    await t.rollback();
    res.status(400).json({ error: err.message });
  }
};

// GET /api/ordini — tutti (admin)
const getOrdenes = async (req, res) => {
  try {
    const ordini = await Ordine.findAll({
      where: { estado: { [Op.ne]: "pendiente" } },
      order: [["createdAt", "DESC"]],
      include: [{
        model: DettaglioOrdine,
        as: "detalles",
        include: [{ model: Prodotto, attributes: ["nombre", "imagen"] }]
      }]
    });
    res.json(ordini);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/ordini/:id — singolo ordine (admin)
const getOrdenById = async (req, res) => {
  try {
    const ordine = await Ordine.findByPk(req.params.id, {
      include: [{
        model: DettaglioOrdine,
        as: "detalles",
        include: [{ model: Prodotto, attributes: ["nombre", "precio", "imagen"] }]
      }]
    });
    if (!ordine) return res.status(404).json({ error: "Ordine non trovato" });
    res.json(ordine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/ordini/:id/estado — cambia stato (admin)
const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body;
    const validi = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"];
    if (!validi.includes(estado))
      return res.status(400).json({ error: "Stato non valido" });

    const ordine = await Ordine.findByPk(req.params.id);
    if (!ordine) return res.status(404).json({ error: "Ordine non trovato" });

    await ordine.update({ estado });
    // Traccia fatturato codice promo alla conferma
    if (estado === "confirmado" && ordine.codice_promo) {
      try {
        const { registraUtilizzo } = require("./promoController");
        await registraUtilizzo(ordine.codice_promo, ordine.total);
      } catch(e) { console.error("Promo tracking:", e.message); }
    }

    // Assegna Benchys quando l'ordine viene confermato
    if (estado === "confirmado" && ordine.estado !== "confirmado") {
      try {
        const { assegnaPunti, BENCHY } = require("./puntiController");
        const euroSpesi = parseFloat(ordine.total) - parseFloat(ordine.costo_spedizione || 0);
        const punti = Math.floor(euroSpesi * BENCHY.acquisto_per_euro);
        if (punti > 0)
          await assegnaPunti(ordine.usuario_id, "acquisto", punti, `Ordine #${ordine.id} confermato`, ordine.id);
      } catch(e) { console.error("Punti ordine:", e.message); }
    }
    res.json({ mensaje: "Stato aggiornato", estado: ordine.estado });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { crearOrden, getOrdenes, getOrdenById, cambiarEstado };
