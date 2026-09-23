const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Utente    = require("../../../models/Utente");
const Company   = require("./Company");

const AuditLog = sequelize.define("AuditLog", {
  actor_user_id: { type: DataTypes.INTEGER, allowNull: false },
  company_id:    { type: DataTypes.INTEGER },
  action:        { type: DataTypes.STRING, allowNull: false },
  details:       { type: DataTypes.JSON },
}, {
  tableName: "audit_logs",
  updatedAt: false,
});

AuditLog.belongsTo(Utente,  { foreignKey: "actor_user_id" });
AuditLog.belongsTo(Company, { foreignKey: "company_id" });

module.exports = AuditLog;
