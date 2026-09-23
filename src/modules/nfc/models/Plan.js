const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");

const Plan = sequelize.define("Plan", {
  name:                { type: DataTypes.STRING, allowNull: false },
  monthly_price_cents: { type: DataTypes.INTEGER, allowNull: false },
  monthly_credits:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  features:            { type: DataTypes.JSON },
  limits:               { type: DataTypes.JSON },
  active:               { type: DataTypes.BOOLEAN, defaultValue: true },
  position:             { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: "plans" });

module.exports = Plan;
