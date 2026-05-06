const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Prodotto = require("./Prodotto");
const Utente   = require("./Utente");

const Recensione = sequelize.define("Recensione", {
  puntuacion:        { type: DataTypes.INTEGER, allowNull: false },
  comentario:        { type: DataTypes.TEXT },
  nombre_autor:      { type: DataTypes.STRING },
  verificado:        { type: DataTypes.BOOLEAN, defaultValue: false },
  compra_verificada: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: "resenas" });

Recensione.belongsTo(Prodotto, { foreignKey: "producto_id" });
Recensione.belongsTo(Utente,   { foreignKey: "usuario_id", allowNull: true });
Prodotto.hasMany(Recensione,   { foreignKey: "producto_id", as: "recensioni" });

module.exports = Recensione;
