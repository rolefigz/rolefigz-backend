const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Ordini della pagina pubblica /circuiti (negozio statico, carrello in
// localStorage): arrivano via API pubblica, non richiedono account. Pensato
// come sezione separata del pannello admin, cosi' in futuro si puo' dare un
// accesso limitato a una sola persona (es. il partner NRG) senza esporle il
// resto del negozio.
const CircuitoOrdine = sequelize.define("CircuitoOrdine", {
  numero:        { type: DataTypes.STRING(30), allowNull: false, unique: true }, // generato dal client, es. RF-20261028-A1B2
  nombre:        { type: DataTypes.STRING, allowNull: false },
  email:         { type: DataTypes.STRING, allowNull: false },
  telefono:      { type: DataTypes.STRING },
  direccion:     { type: DataTypes.STRING, allowNull: false },
  codigo_postal: { type: DataTypes.STRING },
  ciudad:        { type: DataTypes.STRING },
  pais:          { type: DataTypes.STRING },
  notas:         { type: DataTypes.TEXT },
  articoli:      { type: DataTypes.JSON, allowNull: false },   // [{ nome, meta, prezzo, quantita }]
  totale:        { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stato:         { type: DataTypes.ENUM("pendiente", "confirmado", "enviado", "entregado", "cancelado"), defaultValue: "pendiente" },
  tracking_number: { type: DataTypes.STRING },
  carrier:         { type: DataTypes.STRING },
}, { tableName: "circuiti_ordini" });

module.exports = CircuitoOrdine;
