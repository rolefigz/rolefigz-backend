const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Registro di ogni modifica agli ordini dei circuiti 3D (chi, quando, cosa).
// Lo legge solo l'admin, per controllare quello che fa l'account "circuiti".
const CircuitoMovimento = sequelize.define("CircuitoMovimento", {
  ordine_id:   { type: DataTypes.INTEGER },
  numero:      { type: DataTypes.STRING(30) },
  azione:      { type: DataTypes.STRING(30), allowNull: false }, // creato_web | creato_manuale | modificato | eliminato | ripristinato
  dettagli:    { type: DataTypes.JSON },                         // { campo: [prima, dopo] } o riassunto
  utente_id:   { type: DataTypes.INTEGER },
  utente_nome: { type: DataTypes.STRING },
  utente_rol:  { type: DataTypes.STRING(20) },
}, { tableName: "circuiti_movimenti", updatedAt: false });

module.exports = CircuitoMovimento;
