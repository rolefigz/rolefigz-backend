const crypto = require("crypto");
const { CircuitoOrdine, CircuitoMovimento } = require("../models");
const { sendMessage } = require("../utils/telegram");
const { CIRCUITI, TAGLIE, PRODOTTI, CANALI, normalizzaArticolo } = require("../utils/catalogoCircuiti");

const STATI = ["pendiente", "confirmado", "enviado", "entregado", "cancelado"];
const CAMPI_TESTO = ["nombre", "email", "telefono", "direccion", "codigo_postal", "ciudad", "pais", "notas", "tracking_number", "carrier"];
const slugCircuiti = new Set(CIRCUITI.map(c => c.slug));
const idTaglie = new Set(TAGLIE.map(t => t.id));
const idCanali = new Set(CANALI.map(c => c.id));

function euro(n) { return `€${Number(n || 0).toFixed(2)}`; }
function testo(v, max = 255) { return v == null ? "" : String(v).trim().slice(0, max); }
function riassuntoArticoli(articoli) {
  return (articoli || []).map(a => `${a.quantita}× ${a.nome}${a.taglia ? ` (${a.taglia})` : ""}`).join(", ");
}
function sommaArticoli(articoli) {
  return Math.round(articoli.reduce((s, a) => s + a.prezzo * a.quantita, 0) * 100) / 100;
}
function chi(req) {
  return req.usuario
    ? { utente_id: req.usuario.id, utente_nome: req.usuario.nombre || req.usuario.email, utente_rol: req.usuario.rol }
    : { utente_id: null, utente_nome: "Sito web", utente_rol: "web" };
}
function registra(req, ordine, azione, dettagli) {
  return CircuitoMovimento.create({ ordine_id: ordine.id, numero: ordine.numero, azione, dettagli, ...chi(req) })
    .catch(err => console.error("Registro circuiti:", err.message));
}
// L'admin riceve su Telegram quello che fa l'account limitato.
function avvisaAdmin(req, testoMsg) {
  if (req.usuario?.rol === "admin") return;
  sendMessage(`<b>Circuiti 3D</b> · ${chi(req).utente_nome}\n${testoMsg}`).catch(err => console.error("Telegram circuiti:", err.message));
}

// Valida le righe arrivate dal pannello: circuiti del catalogo con taglia, o prodotti con nome.
function validaArticoli(righe) {
  if (!Array.isArray(righe) || !righe.length) throw new Error("Aggiungi almeno un articolo");
  return righe.map(r => {
    const a = normalizzaArticolo({ ...r, tipo: r.tipo === "circuito" ? "circuito" : "prodotto" });
    if (a.tipo === "circuito" && (!slugCircuiti.has(a.slug) || !idTaglie.has(a.taglia))) throw new Error("Circuito o taglia non validi");
    if (a.tipo === "prodotto") {
      a.nome = testo(a.nome, 120);
      a.categoria = testo(a.categoria, 40) || "Altro";
      if (!a.nome) throw new Error("Manca il nome di un prodotto");
    }
    if (!(a.prezzo >= 0) || a.prezzo > 10000) throw new Error("Prezzo non valido");
    return a;
  });
}

// ── POST /api/circuiti/ordini — dalla pagina pubblica /circuiti ───────────────
const creaOrdine = async (req, res) => {
  try {
    const { numero, nombre, email, telefono, direccion, codigo_postal, ciudad, pais, notas, articoli, totale } = req.body;
    if (!numero || !nombre || !email || !direccion) return res.status(400).json({ error: "Dati mancanti" });
    if (!Array.isArray(articoli) || !articoli.length) return res.status(400).json({ error: "Carrello vuoto" });

    const esiste = await CircuitoOrdine.findOne({ where: { numero } });
    if (esiste) return res.json({ mensaje: "Ordine già registrato", numero: esiste.numero });

    const righe = articoli.slice(0, 100).map(normalizzaArticolo);
    const ordine = await CircuitoOrdine.create({
      numero: testo(numero, 30), nombre: testo(nombre), email: testo(email), telefono: testo(telefono) || null,
      direccion: testo(direccion), codigo_postal: testo(codigo_postal) || null, ciudad: testo(ciudad) || null,
      pais: testo(pais) || null, notas: testo(notas, 2000) || null, articoli: righe,
      totale: Number(totale) || sommaArticoli(righe), origine: "web", canale: "web",
    });
    registra(req, ordine, "creato_web", { articoli: riassuntoArticoli(righe), totale: euro(ordine.totale) });

    sendMessage(`<b>Nuovo ordine circuiti</b> · ${ordine.numero}\n${righe.map(a => `${a.quantita}× ${a.nome}${a.taglia ? ` (${a.taglia})` : ""} — ${euro(a.prezzo * a.quantita)}`).join("\n")}\nTotale: ${euro(ordine.totale)}\n${ordine.nombre} — ${ordine.email}${ordine.telefono ? " · " + ordine.telefono : ""}`)
      .catch(err => console.error("Telegram ordine circuiti:", err.message));

    res.json({ mensaje: "Ordine registrato", numero: ordine.numero });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/circuiti/admin/catalogo ──────────────────────────────────────────
const catalogo = (req, res) => res.json({ circuiti: CIRCUITI, taglie: TAGLIE, prodotti: PRODOTTI, canali: CANALI, stati: STATI });

// ── GET /api/circuiti/admin/ordini — l'admin puo' vedere anche gli eliminati ──
const elencoAdmin = async (req, res) => {
  try {
    const conEliminati = req.usuario.rol === "admin" && req.query.eliminati === "1";
    const ordini = await CircuitoOrdine.findAll({
      where: conEliminati ? {} : { eliminato: false },
      order: [["createdAt", "DESC"]],
    });
    res.json(ordini);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── POST /api/circuiti/admin/ordini — ordine inserito a mano ──────────────────
const creaManuale = async (req, res) => {
  try {
    const b = req.body;
    const nombre = testo(b.nombre);
    if (!nombre) return res.status(400).json({ error: "Manca il nome del cliente" });
    const articoli = validaArticoli(b.articoli);
    const canale = idCanali.has(b.canale) && b.canale !== "web" ? b.canale : "altro";
    const stato = STATI.includes(b.stato) ? b.stato : "confirmado";
    const totale = b.totale !== undefined && b.totale !== "" ? Number(b.totale) : sommaArticoli(articoli);
    if (!(totale >= 0)) return res.status(400).json({ error: "Totale non valido" });

    const oggi = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const ordine = await CircuitoOrdine.create({
      numero: `MAN-${oggi}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
      nombre, email: testo(b.email), telefono: testo(b.telefono) || null, direccion: testo(b.direccion),
      codigo_postal: testo(b.codigo_postal) || null, ciudad: testo(b.ciudad) || null, pais: testo(b.pais) || null,
      notas: testo(b.notas, 2000) || null, articoli, totale, stato, origine: "manuale", canale,
      creato_da: chi(req).utente_nome,
    });
    registra(req, ordine, "creato_manuale", { cliente: nombre, articoli: riassuntoArticoli(articoli), totale: euro(totale), canale, stato });
    avvisaAdmin(req, `Nuovo ordine a mano ${ordine.numero}\n${riassuntoArticoli(articoli)}\nTotale: ${euro(totale)} · ${nombre}`);
    res.json(ordine);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// ── PATCH /api/circuiti/admin/ordini/:id — modifica (ogni campo cambiato va nel registro) ──
const aggiornaAdmin = async (req, res) => {
  try {
    const ordine = await CircuitoOrdine.findByPk(req.params.id);
    if (!ordine || ordine.eliminato) return res.status(404).json({ error: "Ordine non trovato" });
    const b = req.body;
    const valori = {}, modifiche = {};

    for (const campo of CAMPI_TESTO) {
      if (b[campo] === undefined) continue;
      const nuovo = testo(b[campo], campo === "notas" ? 2000 : 255);
      if (["nombre"].includes(campo) && !nuovo) return res.status(400).json({ error: "Il nome non può essere vuoto" });
      const vecchio = ordine[campo] || "";
      if (nuovo !== vecchio) { valori[campo] = nuovo || (["nombre", "email", "direccion"].includes(campo) ? "" : null); modifiche[campo] = [vecchio, nuovo]; }
    }
    if (b.stato !== undefined && b.stato !== ordine.stato) {
      if (!STATI.includes(b.stato)) return res.status(400).json({ error: "Stato non valido" });
      valori.stato = b.stato; modifiche.stato = [ordine.stato, b.stato];
    }
    if (b.canale !== undefined && b.canale !== ordine.canale) {
      if (!idCanali.has(b.canale)) return res.status(400).json({ error: "Canale non valido" });
      valori.canale = b.canale; modifiche.canale = [ordine.canale, b.canale];
    }
    if (b.articoli !== undefined) {
      const articoli = validaArticoli(b.articoli);
      const prima = riassuntoArticoli(ordine.articoli), dopo = riassuntoArticoli(articoli);
      if (prima !== dopo || JSON.stringify(articoli) !== JSON.stringify(ordine.articoli)) { valori.articoli = articoli; modifiche.articoli = [prima, dopo]; }
    }
    if (b.totale !== undefined && b.totale !== "") {
      const totale = Number(b.totale);
      if (!(totale >= 0)) return res.status(400).json({ error: "Totale non valido" });
      if (Math.abs(totale - Number(ordine.totale)) > 0.001) { valori.totale = totale; modifiche.totale = [euro(ordine.totale), euro(totale)]; }
    }

    if (!Object.keys(valori).length) return res.json({ mensaje: "Nessuna modifica", ordine });
    await ordine.update(valori);
    registra(req, ordine, "modificato", modifiche);
    avvisaAdmin(req, `Modificato ${ordine.numero}: ${Object.keys(modifiche).join(", ")}`);
    res.json({ mensaje: "Aggiornato", ordine });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// ── DELETE /api/circuiti/admin/ordini/:id — resta nello storico dell'admin ───
const eliminaAdmin = async (req, res) => {
  try {
    const ordine = await CircuitoOrdine.findByPk(req.params.id);
    if (!ordine || ordine.eliminato) return res.status(404).json({ error: "Ordine non trovato" });
    await ordine.update({ eliminato: true, eliminato_at: new Date(), eliminato_da: chi(req).utente_nome });
    registra(req, ordine, "eliminato", { cliente: ordine.nombre, articoli: riassuntoArticoli(ordine.articoli), totale: euro(ordine.totale), motivo: testo(req.body?.motivo, 300) || undefined });
    avvisaAdmin(req, `Eliminato ${ordine.numero} (${ordine.nombre}, ${euro(ordine.totale)})`);
    res.json({ mensaje: "Ordine eliminato" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── POST /api/circuiti/admin/ordini/:id/ripristina — solo admin ──────────────
const ripristinaAdmin = async (req, res) => {
  try {
    const ordine = await CircuitoOrdine.findByPk(req.params.id);
    if (!ordine || !ordine.eliminato) return res.status(404).json({ error: "Ordine non trovato tra gli eliminati" });
    await ordine.update({ eliminato: false, eliminato_at: null, eliminato_da: null });
    registra(req, ordine, "ripristinato", {});
    res.json({ mensaje: "Ordine ripristinato" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/circuiti/admin/movimenti — registro modifiche (solo admin) ──────
const movimentiAdmin = async (req, res) => {
  try {
    const where = req.query.ordine ? { ordine_id: parseInt(req.query.ordine, 10) || 0 } : {};
    const movimenti = await CircuitoMovimento.findAll({ where, order: [["createdAt", "DESC"]], limit: 500 });
    res.json(movimenti);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── GET /api/circuiti/admin/analytics — numeri del negozio (solo admin) ──────
const analyticsAdmin = async (req, res) => {
  try {
    const tutti = await CircuitoOrdine.findAll({ order: [["createdAt", "ASC"]] });
    const attivi = tutti.filter(o => !o.eliminato);
    const validi = attivi.filter(o => o.stato !== "cancelado");
    const tot = o => Number(o.totale) || 0;
    const somma = arr => Math.round(arr.reduce((s, o) => s + tot(o), 0) * 100) / 100;

    const meseDi = d => new Date(d).toISOString().slice(0, 7);
    const ora = new Date();
    const meseOra = ora.toISOString().slice(0, 7);
    const mesePrima = new Date(Date.UTC(ora.getUTCFullYear(), ora.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);

    const mesi = [];
    for (let i = 11; i >= 0; i--) {
      const m = new Date(Date.UTC(ora.getUTCFullYear(), ora.getUTCMonth() - i, 1)).toISOString().slice(0, 7);
      const delMese = validi.filter(o => meseDi(o.createdAt) === m);
      mesi.push({ mese: m, ordini: delMese.length, fatturato: somma(delMese) });
    }

    // Clienti: email se c'e', altrimenti il nome (ordini a mano senza email).
    const perCliente = new Map();
    for (const o of validi) {
      const k = (o.email || o.nombre || "").trim().toLowerCase();
      if (!k) continue;
      const c = perCliente.get(k) || { nome: o.nombre, email: o.email, ordini: 0, speso: 0 };
      c.ordini++; c.speso += tot(o); perCliente.set(k, c);
    }
    const clienti = [...perCliente.values()];

    const conta = (lista, chiave, valore = () => 1) => {
      const m = new Map();
      for (const x of lista) { const k = chiave(x); if (!k) continue; m.set(k, (m.get(k) || 0) + valore(x)); }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    const righe = validi.flatMap(o => (o.articoli || []).map(normalizzaArticolo));
    const raggruppa = (lista, chiave) => {
      const m = new Map();
      for (const a of lista) {
        const k = chiave(a); if (!k) continue;
        const r = m.get(k) || { nome: k, pezzi: 0, fatturato: 0 };
        r.pezzi += a.quantita; r.fatturato = Math.round((r.fatturato + a.prezzo * a.quantita) * 100) / 100;
        m.set(k, r);
      }
      return [...m.values()].sort((a, b) => b.pezzi - a.pezzi || b.fatturato - a.fatturato);
    };
    const circuitiRighe = righe.filter(a => a.tipo === "circuito");
    const etichettaCanale = new Map(CANALI.map(c => [c.id, c.label]));
    const etichettaTaglia = new Map(TAGLIE.map(t => [t.id, `${t.id} · ${t.label}`]));

    const fatturato = somma(validi);
    res.json({
      kpi: {
        ordini: validi.length,
        fatturato,
        scontrinoMedio: validi.length ? Math.round(fatturato / validi.length * 100) / 100 : 0,
        pezzi: righe.reduce((s, a) => s + a.quantita, 0),
        clienti: clienti.length,
        clientiAbituali: clienti.filter(c => c.ordini > 1).length,
        daEvadere: attivi.filter(o => o.stato === "pendiente" || o.stato === "confirmado").length,
        inAttesa: attivi.filter(o => o.stato === "pendiente").length,
        meseOrdini: validi.filter(o => meseDi(o.createdAt) === meseOra).length,
        meseFatturato: somma(validi.filter(o => meseDi(o.createdAt) === meseOra)),
        mesePrimaOrdini: validi.filter(o => meseDi(o.createdAt) === mesePrima).length,
        mesePrimaFatturato: somma(validi.filter(o => meseDi(o.createdAt) === mesePrima)),
        annullati: attivi.filter(o => o.stato === "cancelado").length,
        eliminati: tutti.length - attivi.length,
        web: validi.filter(o => o.origine !== "manuale").length,
        manuali: validi.filter(o => o.origine === "manuale").length,
      },
      mesi,
      perStato: STATI.map(s => ({ nome: s, ordini: attivi.filter(o => o.stato === s).length })),
      perCanale: CANALI.map(c => {
        const l = validi.filter(o => (o.canale || "web") === c.id);
        return { nome: c.label, ordini: l.length, fatturato: somma(l) };
      }).filter(c => c.ordini),
      perCategoria: raggruppa(righe, a => a.categoria),
      topCircuiti: raggruppa(circuitiRighe, a => a.nome).slice(0, 12),
      taglie: TAGLIE.map(t => {
        const l = circuitiRighe.filter(a => a.taglia === t.id);
        return { nome: etichettaTaglia.get(t.id), pezzi: l.reduce((s, a) => s + a.quantita, 0), fatturato: Math.round(l.reduce((s, a) => s + a.prezzo * a.quantita, 0) * 100) / 100 };
      }),
      topProdotti: raggruppa(righe.filter(a => a.tipo !== "circuito"), a => a.nome).slice(0, 10),
      paesi: conta(validi, o => (o.pais || "").trim()).slice(0, 8).map(([nome, ordini]) => ({ nome, ordini })),
      citta: conta(validi, o => (o.ciudad || "").trim()).slice(0, 8).map(([nome, ordini]) => ({ nome, ordini })),
      topClienti: clienti.sort((a, b) => b.speso - a.speso).slice(0, 8).map(c => ({ ...c, speso: Math.round(c.speso * 100) / 100 })),
      canaliEtichette: Object.fromEntries(etichettaCanale),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { creaOrdine, catalogo, elencoAdmin, creaManuale, aggiornaAdmin, eliminaAdmin, ripristinaAdmin, movimentiAdmin, analyticsAdmin };
