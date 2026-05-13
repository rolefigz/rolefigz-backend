const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CodicePromo = sequelize.define("CodicePromo", {
  codice:              { type: DataTypes.STRING(30), allowNull: false, unique: true },
  tipo:                { type: DataTypes.STRING(20), allowNull: false },
  valore:              { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },  // % o € fisso
  descrizione:         { type: DataTypes.STRING },
  attivo:              { type: DataTypes.BOOLEAN, defaultValue: true },
  data_scadenza:       { type: DataTypes.DATE },
  max_utilizzi:        { type: DataTypes.INTEGER },                         // null = illimitato
  utilizzi_attuali:    { type: DataTypes.INTEGER, defaultValue: 0 },
  fatturato_generato:  { type: DataTypes.DECIMAL(10,2), defaultValue: 0 }, // revenue tracciato
  mostra_popup:        { type: DataTypes.BOOLEAN, defaultValue: false },
  popup_titolo:        { type: DataTypes.STRING },
  popup_testo:         { type: DataTypes.STRING },
  popup_colore:        { type: DataTypes.STRING(7), defaultValue: "#1a1a1a" },
}, { tableName: "codici_promo" });

module.exports = CodicePromo;
