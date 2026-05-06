const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Ticket    = require("./Ticket");

const Messaggio = sequelize.define("Messaggio", {
  remitente: { type: DataTypes.ENUM("cliente", "admin"), allowNull: false },
  texto:     { type: DataTypes.TEXT, allowNull: false },
  leido:     { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: "mensajes" });

Messaggio.belongsTo(Ticket, { foreignKey: "ticket_id" });
Ticket.hasMany(Messaggio,   { foreignKey: "ticket_id", as: "messaggi" });

module.exports = Messaggio;
