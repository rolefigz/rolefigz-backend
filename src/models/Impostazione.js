const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Impostazione = sequelize.define("Impostazione", {
  chiave: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  valore: { type: DataTypes.TEXT }
}, { tableName: "impostazioni" });

module.exports = Impostazione;
