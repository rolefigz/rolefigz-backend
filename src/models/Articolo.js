const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Usuario   = require("./Usuario");

const Articolo = sequelize.define("Articolo", {
  titolo:     { type: DataTypes.STRING,      allowNull: false },
  slug:       { type: DataTypes.STRING,      allowNull: false, unique: true },
  contenuto:  { type: DataTypes.TEXT("long"), allowNull: false },
  estratto:   { type: DataTypes.TEXT },
  immagine:   { type: DataTypes.STRING },
  pubblicato: { type: DataTypes.BOOLEAN,     defaultValue: false },
  meta_desc:  { type: DataTypes.STRING(160) },
  tags:       { type: DataTypes.STRING }
}, { tableName: "articoli" });

Articolo.belongsTo(Usuario, { foreignKey: "autore_id" });

module.exports = Articolo;
