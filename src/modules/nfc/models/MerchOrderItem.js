const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const MerchOrder   = require("./MerchOrder");
const MerchProduct = require("./MerchProduct");

const MerchOrderItem = sequelize.define("MerchOrderItem", {
  order_id:          { type: DataTypes.INTEGER, allowNull: false },
  product_id:        { type: DataTypes.INTEGER, allowNull: false },
  quantity:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  credits_each:      { type: DataTypes.INTEGER, allowNull: false },
  price_each_cents:  { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: "merch_order_items", updatedAt: false });

MerchOrderItem.belongsTo(MerchOrder,   { foreignKey: "order_id" });
MerchOrder.hasMany(MerchOrderItem,     { foreignKey: "order_id", as: "items" });
MerchOrderItem.belongsTo(MerchProduct, { foreignKey: "product_id" });

module.exports = MerchOrderItem;
