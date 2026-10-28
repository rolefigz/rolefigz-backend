const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Ordini dei circuiti 3D: quelli della pagina pubblica /circuiti (origine "web")
// e quelli inseriti a mano dal pannello (origine "manuale", es. fiere o WhatsApp).
// Gli ordini eliminati restano in tabella (eliminato = true) cosi' l'admin
// vede sempre lo storico completo; il registro e' in CircuitoMovimento.
const CircuitoOrdine = sequelize.define("CircuitoOrdine", {
  numero:        { type: DataTypes.STRING(30), allowNull: false, unique: true }, // es. RF-20261028-A1B2 / MAN-20261028-A1B2
  nombre:        { type: DataTypes.STRING, allowNull: false },
  email:         { type: DataTypes.STRING, allowNull: false },
  telefono:      { type: DataTypes.STRING },
  direccion:     { type: DataTypes.STRING, allowNull: false },
  codigo_postal: { type: DataTypes.STRING },
  ciudad:        { type: DataTypes.STRING },
  pais:          { type: DataTypes.STRING },
  notas:         { type: DataTypes.TEXT },
  articoli:      { type: DataTypes.JSON, allowNull: false },   // [{ tipo, slug, nome, taglia, categoria, prezzo, quantita }]
  totale:        { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stato:         { type: DataTypes.ENUM("pendiente", "confirmado", "enviado", "entregado", "cancelado"), defaultValue: "pendiente" },
  tracking_number: { type: DataTypes.STRING },
  carrier:         { type: DataTypes.STRING },
  origine:       { type: DataTypes.STRING(20), allowNull: false, defaultValue: "web" },  // web | manuale
  canale:        { type: DataTypes.STRING(30), allowNull: false, defaultValue: "web" },  // web | whatsapp | instagram | evento | persona | nrg | altro
  creato_da:     { type: DataTypes.STRING },
  eliminato:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  eliminato_at:  { type: DataTypes.DATE },
  eliminato_da:  { type: DataTypes.STRING },
}, { tableName: "circuiti_ordini" });

// La tabella esiste gia' in produzione: le colonne nuove si aggiungono senza toccare le altre.
CircuitoOrdine.assicuraColonne = async function () {
  const qi = sequelize.getQueryInterface();
  const colonne = await qi.describeTable("circuiti_ordini");
  const nuove = {
    origine:      { type: DataTypes.STRING(20), allowNull: false, defaultValue: "web" },
    canale:       { type: DataTypes.STRING(30), allowNull: false, defaultValue: "web" },
    creato_da:    { type: DataTypes.STRING },
    eliminato:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    eliminato_at: { type: DataTypes.DATE },
    eliminato_da: { type: DataTypes.STRING },
  };
  for (const [nome, def] of Object.entries(nuove)) {
    if (!colonne[nome]) await qi.addColumn("circuiti_ordini", nome, def);
  }
};

module.exports = CircuitoOrdine;
