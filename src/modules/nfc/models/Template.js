const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");

const Template = sequelize.define("Template", {
  name:           { type: DataTypes.STRING, allowNull: false },
  sector:         { type: DataTypes.STRING },
  default_blocks: { type: DataTypes.JSON },
  active:         { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "templates" });

module.exports = Template;
