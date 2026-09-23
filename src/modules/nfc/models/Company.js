const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Utente     = require("../../../models/Utente");

const Company = sequelize.define("Company", {
  owner_user_id: { type: DataTypes.INTEGER, allowNull: false },
  name:          { type: DataTypes.STRING, allowNull: false },
  slug:          { type: DataTypes.STRING(50), allowNull: false, unique: true },
  status:        { type: DataTypes.ENUM("active", "suspended"), defaultValue: "active" },
  sector:        { type: DataTypes.STRING },
  piva:            { type: DataTypes.STRING(20) },
  codice_fiscale:  { type: DataTypes.STRING(20) },
  codice_sdi:      { type: DataTypes.STRING(10) },
  pec:             { type: DataTypes.STRING },
}, {
  tableName: "companies",
  paranoid: true,
  validate: {
    slugFormatoValido() {
      if (this.slug && !/^[a-z0-9-]{3,50}$/.test(this.slug)) {
        throw new Error("Slug non valido: solo minuscole, numeri e trattini, 3-50 caratteri");
      }
    },
  },
});

Company.belongsTo(Utente, { foreignKey: "owner_user_id" });

module.exports = Company;
