const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Prodotto  = require("./Prodotto");

const Visita = sequelize.define("Visita", {
  tipo:   { type: DataTypes.STRING, defaultValue: "home" },
  pais:   { type: DataTypes.STRING(3) },
  ciudad: { type: DataTypes.STRING },
  ip:     { type: DataTypes.STRING },
}, { tableName: "visitas" });

Visita.belongsTo(Prodotto, { foreignKey: "producto_id", allowNull: true });

module.exports = Visita;
