const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Ticket    = require("./Ticket");

const Mensaje = sequelize.define("Mensaje", {
  remitente: { type: DataTypes.ENUM("cliente", "admin"), allowNull: false },
  texto:     { type: DataTypes.TEXT, allowNull: false },
  leido:     { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: "mensajes" });

Mensaje.belongsTo(Ticket, { foreignKey: "ticket_id" });
Ticket.hasMany(Mensaje,   { foreignKey: "ticket_id", as: "mensajes" });

module.exports = Mensaje;
