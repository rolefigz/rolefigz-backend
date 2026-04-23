const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Orden    = require("./Orden");
const Producto = require("./Producto");

const DetalleOrden = sequelize.define("DetalleOrden", {
  cantidad:       { type: DataTypes.INTEGER, allowNull: false },
  precio_unidad:  { type: DataTypes.DECIMAL(10,2), allowNull: false }, // precio en el momento de compra
  subtotal:       { type: DataTypes.DECIMAL(10,2), allowNull: false }
}, { tableName: "detalles_orden" });

DetalleOrden.belongsTo(Orden,    { foreignKey: "orden_id" });
DetalleOrden.belongsTo(Producto, { foreignKey: "producto_id" });
Orden.hasMany(DetalleOrden,      { foreignKey: "orden_id", as: "detalles" });

module.exports = DetalleOrden;