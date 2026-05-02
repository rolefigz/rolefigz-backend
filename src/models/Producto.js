const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Categoria = require("./Categoria");

const Producto = sequelize.define("Producto", {
  nombre:      { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  precio:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stock:       { type: DataTypes.INTEGER, defaultValue: 0 },
  imagen:      { type: DataTypes.STRING },
  activo:      { type: DataTypes.BOOLEAN, defaultValue: true },
  slug:        { type: DataTypes.STRING, unique: true }
}, { tableName: "productos" });

Producto.belongsTo(Categoria, { foreignKey: "categoria_id" });
Categoria.hasMany(Producto,   { foreignKey: "categoria_id" });

module.exports = Producto;