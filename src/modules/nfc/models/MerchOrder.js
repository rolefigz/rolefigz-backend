const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");
const Utente    = require("../../../models/Utente");

const STATI_ORDINE = ["in_attesa", "confermato", "in_produzione", "pronto", "spedito", "consegnato", "annullato"];

const MerchOrder = sequelize.define("MerchOrder", {
  company_id:               { type: DataTypes.INTEGER, allowNull: false },
  status:                   { type: DataTypes.ENUM(...STATI_ORDINE), defaultValue: "in_attesa" },
  credits_used:             { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  extra_amount_cents:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  shipping_address_snapshot:{ type: DataTypes.JSON },
  delivery_method:          { type: DataTypes.ENUM("hand", "shipping"), defaultValue: "hand" },
  notes:                    { type: DataTypes.TEXT },
  created_by_user_id:       { type: DataTypes.INTEGER },
}, { tableName: "merch_orders" });

MerchOrder.belongsTo(Company, { foreignKey: "company_id" });
Company.hasMany(MerchOrder,   { foreignKey: "company_id" });
MerchOrder.belongsTo(Utente,  { foreignKey: "created_by_user_id", as: "creatoDa" });

module.exports = MerchOrder;
module.exports.STATI_ORDINE = STATI_ORDINE;
