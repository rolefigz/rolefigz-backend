const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Prodotto  = require("./Prodotto");

const VarianteProdotto = sequelize.define("VarianteProdotto", {
  tipo:         { type: DataTypes.STRING,        allowNull: false },
  valor:        { type: DataTypes.STRING,        allowNull: false },
  stock:        { type: DataTypes.INTEGER,       defaultValue: 0 },
  precio_extra: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 }
}, { tableName: "variantes_producto" });

VarianteProdotto.belongsTo(Prodotto, { foreignKey: "producto_id" });
Prodotto.hasMany(VarianteProdotto,   { foreignKey: "producto_id", as: "variantes" });

module.exports = VarianteProdotto;
