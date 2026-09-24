const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");

// Richieste di contatto dal form pubblico di /nfc — non crea ancora
// un'azienda ne' un account di accesso: quello resta un passo manuale
// dell'admin (vendita di persona).
const Lead = sequelize.define("Lead", {
  company_name:          { type: DataTypes.STRING, allowNull: false },
  contact_name:          { type: DataTypes.STRING, allowNull: false },
  email:                 { type: DataTypes.STRING, allowNull: false },
  phone:                 { type: DataTypes.STRING },
  message:               { type: DataTypes.TEXT },
  status:                { type: DataTypes.ENUM("nuova", "contattata", "convertita", "scartata"), defaultValue: "nuova" },
  converted_company_id:  { type: DataTypes.INTEGER },
}, { tableName: "nfc_leads" });

Lead.belongsTo(Company, { foreignKey: "converted_company_id" });

module.exports = Lead;
