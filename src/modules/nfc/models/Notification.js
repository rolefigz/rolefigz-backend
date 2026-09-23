const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");
const Utente    = require("../../../models/Utente");

const Notification = sequelize.define("Notification", {
  company_id:  { type: DataTypes.INTEGER },
  user_id:     { type: DataTypes.INTEGER },
  type:        { type: DataTypes.STRING, allowNull: false },
  message:     { type: DataTypes.TEXT, allowNull: false },
  read_at:     { type: DataTypes.DATE },
}, { tableName: "notifications" });

Notification.belongsTo(Company, { foreignKey: "company_id" });
Notification.belongsTo(Utente,  { foreignKey: "user_id" });

module.exports = Notification;
