const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const RichiestaGadget = sequelize.define("RichiestaGadget", {
  order_id:   { type: DataTypes.STRING, allowNull: false, unique: true },
  nome:       { type: DataTypes.STRING, allowNull: false },
  azienda:    { type: DataTypes.STRING, allowNull: false },
  email:      { type: DataTypes.STRING, allowNull: false },
  logo_url:   { type: DataTypes.STRING },
  gadget:     { type: DataTypes.STRING, allowNull: false },
  settore:    { type: DataTypes.STRING, allowNull: false },
  dimensione: { type: DataTypes.STRING, allowNull: false },
  utilizzo:   { type: DataTypes.STRING, allowNull: false },
  note:       { type: DataTypes.TEXT },
  stato:      { type: DataTypes.ENUM("ricevuta","in_lavorazione","spedita"), defaultValue: "ricevuta" },
}, { tableName: "richieste_gadget" });

module.exports = RichiestaGadget;
