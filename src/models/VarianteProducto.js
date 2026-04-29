const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Producto  = require("./Producto");

const VarianteProducto = sequelize.define("VarianteProducto", {
  tipo:         { type: DataTypes.STRING,       allowNull: false },
  valor:        { type: DataTypes.STRING,       allowNull: false },
  stock:        { type: DataTypes.INTEGER,      defaultValue: 0 },
  precio_extra: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 }
}, { tableName: "variantes_producto" });

VarianteProducto.belongsTo(Producto, { foreignKey: "producto_id" });
Producto.hasMany(VarianteProducto,   { foreignKey: "producto_id", as: "variantes" });

module.exports = VarianteProducto;
