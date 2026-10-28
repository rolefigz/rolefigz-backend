const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Utente = sequelize.define("Utente", {
  nombre:    { type: DataTypes.STRING, allowNull: false },
  email:     { type: DataTypes.STRING, allowNull: false },
  password:  { type: DataTypes.STRING, allowNull: false },
  // "circuiti": accesso limitato alla sola sezione "Circuiti 3D" del pannello
  // admin (vedi middleware/auth.js soloAdminOCircuiti e admin-app.js).
  rol:       { type: DataTypes.ENUM("admin", "user", "circuiti"), defaultValue: "user" },
  telefono:  { type: DataTypes.STRING },
  direccion: { type: DataTypes.TEXT },
  activo:             { type: DataTypes.BOOLEAN, defaultValue: true },
  verificado:         { type: DataTypes.BOOLEAN, defaultValue: false },
  codigoVerificacion: { type: DataTypes.STRING },
  codigoExpira:       { type: DataTypes.DATE }
}, { tableName: "usuarios" });

module.exports = Utente;
