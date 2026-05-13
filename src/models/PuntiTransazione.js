const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Utente    = require("./Utente");

const PuntiTransazione = sequelize.define("PuntiTransazione", {
  utente_id:     { type: DataTypes.INTEGER, allowNull: false },
  tipo:          { type: DataTypes.ENUM("acquisto","recensione","instagram_follow","registrazione","sconto","spedizione_gratuita"), allowNull: false },
  punti:         { type: DataTypes.INTEGER, allowNull: false },         // positivo = guadagnati, negativo = spesi
  descrizione:   { type: DataTypes.STRING },
  stato:         { type: DataTypes.ENUM("approvato","in_attesa","rifiutato"), defaultValue: "approvato" },
  riferimento_id:{ type: DataTypes.INTEGER },                           // id ordine o recensione
}, { tableName: "punti_transazioni" });

PuntiTransazione.belongsTo(Utente, { foreignKey: "utente_id" });
Utente.hasMany(PuntiTransazione,   { foreignKey: "utente_id" });

module.exports = PuntiTransazione;
