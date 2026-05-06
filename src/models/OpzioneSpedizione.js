const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const OpzioneSpedizione = sequelize.define("OpzioneSpedizione", {
  nome:   { type: DataTypes.STRING, allowNull: false },
  prezzo: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  giorni: { type: DataTypes.STRING },
  zona:   { type: DataTypes.ENUM("IT", "EU", "MONDO", "ALL"), defaultValue: "IT" },
  attivo: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "opzioni_spedizione" });

module.exports = OpzioneSpedizione;
