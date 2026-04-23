const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Usuario = require("./Usuario");

const Orden = sequelize.define("Orden", {
  nombre_cliente:  { type: DataTypes.STRING, allowNull: false },
  email_cliente:   { type: DataTypes.STRING, allowNull: false },
  telefono:        { type: DataTypes.STRING },
  direccion:       { type: DataTypes.TEXT },
  total:           { type: DataTypes.DECIMAL(10,2), allowNull: false },
  estado:          {
    type: DataTypes.ENUM("pendiente", "confirmado", "enviado", "entregado", "cancelado"),
    defaultValue: "pendiente"
  },
  notas:           { type: DataTypes.TEXT }
}, { tableName: "ordenes" });

Orden.belongsTo(Usuario, { foreignKey: "usuario_id", allowNull: true });

module.exports = Orden;