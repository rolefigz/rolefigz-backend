const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Ordine  = require("./Ordine");
const Prodotto = require("./Prodotto");

const DettaglioOrdine = sequelize.define("DettaglioOrdine", {
  cantidad:      { type: DataTypes.INTEGER, allowNull: false },
  precio_unidad: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  subtotal:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  variante:           { type: DataTypes.STRING },
  foto_cliente:       { type: DataTypes.STRING },
  data_consegna:      { type: DataTypes.DATEONLY },
  supplemento_express: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 }
}, { tableName: "detalles_orden" });

DettaglioOrdine.belongsTo(Ordine,   { foreignKey: "orden_id" });
DettaglioOrdine.belongsTo(Prodotto, { foreignKey: "producto_id" });
Ordine.hasMany(DettaglioOrdine,     { foreignKey: "orden_id", as: "detalles" });

module.exports = DettaglioOrdine;
