const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");
const Plan      = require("./Plan");

const Subscription = sequelize.define("Subscription", {
  company_id:      { type: DataTypes.INTEGER, allowNull: false, unique: true },
  plan_id:         { type: DataTypes.INTEGER, allowNull: false },
  status:          { type: DataTypes.ENUM("inactive", "trial", "active", "grace", "cancelled", "suspended"), defaultValue: "inactive" },
  trial_ends_at:   { type: DataTypes.DATE },
  paid_until:      { type: DataTypes.DATE },
  cancelled_at:    { type: DataTypes.DATE },
  started_at:      { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  consecutive_paid_months: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: "subscriptions" });

Subscription.belongsTo(Company, { foreignKey: "company_id" });
Company.hasOne(Subscription,    { foreignKey: "company_id" });
Subscription.belongsTo(Plan,    { foreignKey: "plan_id" });

module.exports = Subscription;
