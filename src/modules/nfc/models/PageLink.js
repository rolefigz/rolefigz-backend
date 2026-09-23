const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");

const TIPI_LINK = [
  "whatsapp", "instagram", "facebook", "tiktok", "linkedin", "youtube",
  "website", "menu", "booking", "maps", "tripadvisor", "phone", "email", "custom",
];

const PageLink = sequelize.define("PageLink", {
  company_id:  { type: DataTypes.INTEGER, allowNull: false },
  type:        { type: DataTypes.ENUM(...TIPI_LINK), allowNull: false },
  label:       { type: DataTypes.STRING, allowNull: false },
  url:         { type: DataTypes.STRING, allowNull: false },
  position:    { type: DataTypes.INTEGER, defaultValue: 0 },
  is_visible:  { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "page_links" });

PageLink.belongsTo(Company, { foreignKey: "company_id" });
Company.hasMany(PageLink,   { foreignKey: "company_id" });

module.exports = PageLink;
module.exports.TIPI_LINK = TIPI_LINK;
