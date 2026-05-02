const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Usuario   = require("./Usuario");

const Ticket = sequelize.define("Ticket", {
  asunto:  { type: DataTypes.STRING, allowNull: false },
  estado:  { type: DataTypes.ENUM("abierto", "cerrado"), defaultValue: "abierto" }
}, { tableName: "tickets" });

Ticket.belongsTo(Usuario, { foreignKey: "usuario_id" });
Usuario.hasMany(Ticket,   { foreignKey: "usuario_id" });

module.exports = Ticket;
