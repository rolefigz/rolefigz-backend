const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Locandina = require("./Locandina");

// Email lasciate dai visitatori nel pop-up della locandina. Il titolare dei
// dati e' l'azienda (le vede ed esporta dal suo pannello); consenso_at
// registra quando il visitatore ha spuntato il consenso.
const IscrizioneLocandina = sequelize.define("IscrizioneLocandina", {
  locandina_id: { type: DataTypes.INTEGER, allowNull: false },
  company_id:   { type: DataTypes.INTEGER, allowNull: false },
  email:        { type: DataTypes.STRING(190), allowNull: false },
  nome:         { type: DataTypes.STRING(80) },
  consenso_at:  { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: "nfc_locandine_iscrizioni",
  indexes: [
    { unique: true, fields: ["locandina_id", "email"] },
    { fields: ["company_id"] },
  ],
});

IscrizioneLocandina.belongsTo(Locandina, { foreignKey: "locandina_id" });
Locandina.hasMany(IscrizioneLocandina,   { foreignKey: "locandina_id" });

module.exports = IscrizioneLocandina;
