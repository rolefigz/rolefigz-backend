const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Producto  = require("./Producto");
const Usuario   = require("./Usuario");

const Resena = sequelize.define("Resena", {
  puntuacion:   { type: DataTypes.INTEGER, allowNull: false },
  comentario:   { type: DataTypes.TEXT },
  nombre_autor: { type: DataTypes.STRING },
  verificado:   { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: "resenas" });

Resena.belongsTo(Producto, { foreignKey: "producto_id" });
Resena.belongsTo(Usuario,  { foreignKey: "usuario_id", allowNull: true });
Producto.hasMany(Resena,   { foreignKey: "producto_id", as: "resenas" });

module.exports = Resena;
