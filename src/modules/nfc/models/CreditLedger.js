const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");
const Utente    = require("../../../models/Utente");

// Append-only: nessuna riga va mai modificata o cancellata dopo la creazione.
// Il saldo crediti di un'azienda e' sempre la somma dei delta di questa tabella.
const CreditLedger = sequelize.define("CreditLedger", {
  company_id:          { type: DataTypes.INTEGER, allowNull: false },
  delta:               { type: DataTypes.INTEGER, allowNull: false },
  reason:              {
    type: DataTypes.ENUM("cycle_grant", "loyalty_bonus", "order", "order_cancelled", "expiry", "manual_adjustment"),
    allowNull: false,
  },
  reference_type:      { type: DataTypes.STRING(30) },
  reference_id:        { type: DataTypes.INTEGER },
  created_by_user_id:  { type: DataTypes.INTEGER },
}, {
  tableName: "credit_ledger",
  updatedAt: false,
});

CreditLedger.belongsTo(Company, { foreignKey: "company_id" });
Company.hasMany(CreditLedger,   { foreignKey: "company_id" });
CreditLedger.belongsTo(Utente,  { foreignKey: "created_by_user_id", as: "creatoDa" });

module.exports = CreditLedger;
