const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");
const Utente    = require("../../../models/Utente");

const Payment = sequelize.define("Payment", {
  company_id:          { type: DataTypes.INTEGER, allowNull: false },
  amount_cents:        { type: DataTypes.INTEGER, allowNull: false },
  method:              { type: DataTypes.ENUM("cash"), allowNull: false, defaultValue: "cash" },
  months_covered:      { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  received_at:         { type: DataTypes.DATE, allowNull: false },
  recorded_by_user_id: { type: DataTypes.INTEGER, allowNull: false },
  note:                { type: DataTypes.TEXT },
}, { tableName: "payments" });

Payment.belongsTo(Company, { foreignKey: "company_id" });
Company.hasMany(Payment,   { foreignKey: "company_id" });
Payment.belongsTo(Utente,  { foreignKey: "recorded_by_user_id", as: "registratoDa" });

module.exports = Payment;
