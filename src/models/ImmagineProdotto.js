const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Prodotto  = require("./Prodotto");

const ImmagineProdotto = sequelize.define("ImmagineProdotto", {
  url:   { type: DataTypes.STRING, allowNull: false },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: "imagenes_producto" });

ImmagineProdotto.belongsTo(Prodotto, { foreignKey: "producto_id" });
Prodotto.hasMany(ImmagineProdotto,   { foreignKey: "producto_id", as: "imagenes" });

module.exports = ImmagineProdotto;
