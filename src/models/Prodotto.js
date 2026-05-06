const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Categoria = require("./Categoria");

const Prodotto = sequelize.define("Prodotto", {
  nombre:      { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.TEXT },
  precio:      { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  stock:       { type: DataTypes.INTEGER, defaultValue: 0 },
  imagen:      { type: DataTypes.STRING },
  activo:        { type: DataTypes.BOOLEAN, defaultValue: true },
  slug:          { type: DataTypes.STRING, unique: true },
  richiede_foto:             { type: DataTypes.BOOLEAN,      defaultValue: false },
  selettore_data:            { type: DataTypes.BOOLEAN,      defaultValue: false },
  giorni_produzione:         { type: DataTypes.INTEGER,      defaultValue: 7 },
  giorni_spedizione:         { type: DataTypes.INTEGER,      defaultValue: 3 },
  prezzo_per_giorno_express: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 }
}, { tableName: "productos" });

Prodotto.belongsTo(Categoria, { foreignKey: "categoria_id" });
Categoria.hasMany(Prodotto,   { foreignKey: "categoria_id" });

module.exports = Prodotto;
