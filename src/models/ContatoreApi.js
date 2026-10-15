const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Chiamate al giorno ad API esterne a pagamento (es. Google Places): servono per fermarsi prima della soglia
// gratuita. Una riga per (giorno, chiave). Nel DB, così il conteggio sopravvive ai riavvii.
const ContatoreApi = sequelize.define("ContatoreApi", {
  giorno: { type: DataTypes.DATEONLY, allowNull: false },
  chiave: { type: DataTypes.STRING(40), allowNull: false },
  n:      { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: "contatori_api", indexes: [{ unique: true, fields: ["giorno", "chiave"] }] });

module.exports = ContatoreApi;
