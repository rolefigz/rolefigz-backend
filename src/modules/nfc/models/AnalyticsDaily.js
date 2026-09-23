const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");
const Tag       = require("./Tag");
const PageLink  = require("./PageLink");

const AnalyticsDaily = sequelize.define("AnalyticsDaily", {
  company_id:    { type: DataTypes.INTEGER, allowNull: false },
  date:          { type: DataTypes.DATEONLY, allowNull: false },
  event_type:    { type: DataTypes.ENUM("page_view", "tag_scan", "link_click"), allowNull: false },
  tag_id:        { type: DataTypes.INTEGER },
  link_id:       { type: DataTypes.INTEGER },
  count:         { type: DataTypes.INTEGER, defaultValue: 0 },
  unique_count:  { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: "analytics_daily" });

AnalyticsDaily.belongsTo(Company, { foreignKey: "company_id" });
AnalyticsDaily.belongsTo(Tag,      { foreignKey: "tag_id" });
AnalyticsDaily.belongsTo(PageLink, { foreignKey: "link_id" });

module.exports = AnalyticsDaily;
