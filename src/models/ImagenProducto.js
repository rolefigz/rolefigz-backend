const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Producto  = require("./Producto");

const ImagenProducto = sequelize.define("ImagenProducto", {
  url:   { type: DataTypes.STRING, allowNull: false },
  orden: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: "imagenes_producto" });

ImagenProducto.belongsTo(Producto, { foreignKey: "producto_id" });
Producto.hasMany(ImagenProducto,   { foreignKey: "producto_id", as: "imagenes" });

module.exports = ImagenProducto;
