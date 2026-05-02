const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Usuario = sequelize.define("Usuario", {
  nombre:    { type: DataTypes.STRING, allowNull: false },
  email:     { type: DataTypes.STRING, allowNull: false, unique: true },
  password:  { type: DataTypes.STRING, allowNull: false },
  rol:       { type: DataTypes.ENUM("admin", "user"), defaultValue: "user" },
  telefono:  { type: DataTypes.STRING },
  direccion: { type: DataTypes.TEXT },
  activo:              { type: DataTypes.BOOLEAN, defaultValue: true },
  verificado:          { type: DataTypes.BOOLEAN, defaultValue: false },
  codigoVerificacion:  { type: DataTypes.STRING },
  codigoExpira:        { type: DataTypes.DATE }
}, { tableName: "usuarios" });

module.exports = Usuario;