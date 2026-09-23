const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");

const Tag = sequelize.define("Tag", {
  code:        { type: DataTypes.STRING(7), allowNull: false, unique: true },
  company_id:  { type: DataTypes.INTEGER },
  type:        { type: DataTypes.ENUM("qr", "nfc"), defaultValue: "qr" },
  label:       { type: DataTypes.STRING },
  is_active:   { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "tags" });

Tag.belongsTo(Company, { foreignKey: "company_id" });
Company.hasMany(Tag,   { foreignKey: "company_id" });

module.exports = Tag;
