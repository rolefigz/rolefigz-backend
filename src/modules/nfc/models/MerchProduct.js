const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");

const MerchProduct = sequelize.define("MerchProduct", {
  name:                 { type: DataTypes.STRING, allowNull: false },
  description:          { type: DataTypes.TEXT },
  image:                { type: DataTypes.STRING },
  credit_cost:          { type: DataTypes.INTEGER, allowNull: false },
  extra_price_cents:    { type: DataTypes.INTEGER, defaultValue: 0 },
  internal_cost_cents:  { type: DataTypes.INTEGER },
  production_days:      { type: DataTypes.INTEGER },
  active:               { type: DataTypes.BOOLEAN, defaultValue: true },
  position:             { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: "merch_products" });

module.exports = MerchProduct;
