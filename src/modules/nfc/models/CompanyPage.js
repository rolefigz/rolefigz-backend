const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");
const Template  = require("./Template");

const CompanyPage = sequelize.define("CompanyPage", {
  company_id:       { type: DataTypes.INTEGER, allowNull: false, unique: true },
  template_id:      { type: DataTypes.INTEGER },
  is_published:     { type: DataTypes.BOOLEAN, defaultValue: false },
  published_at:     { type: DataTypes.DATE },
  design:           { type: DataTypes.JSON },
  logo_url:         { type: DataTypes.STRING },
  description:      { type: DataTypes.TEXT },
  hours:            { type: DataTypes.STRING(160) },
  seo_title:        { type: DataTypes.STRING(160) },
  seo_description:  { type: DataTypes.STRING(300) },
  og_image:         { type: DataTypes.STRING },
}, { tableName: "company_pages" });

CompanyPage.belongsTo(Company,  { foreignKey: "company_id" });
Company.hasOne(CompanyPage,     { foreignKey: "company_id" });
CompanyPage.belongsTo(Template, { foreignKey: "template_id" });

module.exports = CompanyPage;
