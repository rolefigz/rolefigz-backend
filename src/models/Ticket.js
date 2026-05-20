const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Utente    = require("./Utente");

const Ticket = sequelize.define("Ticket", {
  asunto:       { type: DataTypes.STRING, allowNull: false },
  estado:       { type: DataTypes.ENUM("abierto", "cerrado"), defaultValue: "abierto" },
  guest_token:  { type: DataTypes.STRING(36), allowNull: true, unique: true },
  guest_nombre: { type: DataTypes.STRING, allowNull: true },
  guest_email:  { type: DataTypes.STRING, allowNull: true },
}, { tableName: "tickets" });

Ticket.belongsTo(Utente, { foreignKey: "usuario_id" });
Utente.hasMany(Ticket,   { foreignKey: "usuario_id" });

module.exports = Ticket;
