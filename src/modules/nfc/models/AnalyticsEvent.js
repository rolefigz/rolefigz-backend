const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");
const Tag       = require("./Tag");
const PageLink  = require("./PageLink");

const AnalyticsEvent = sequelize.define("AnalyticsEvent", {
  company_id:    { type: DataTypes.INTEGER, allowNull: false },
  event_type:    { type: DataTypes.ENUM("page_view", "tag_scan", "link_click"), allowNull: false },
  tag_id:        { type: DataTypes.INTEGER },
  link_id:       { type: DataTypes.INTEGER },
  device_type:   { type: DataTypes.STRING(20) },
  country:       { type: DataTypes.STRING(3) },
  visitor_hash:  { type: DataTypes.STRING(64) },
}, {
  tableName: "analytics_events",
  updatedAt: false,
});

AnalyticsEvent.belongsTo(Company, { foreignKey: "company_id" });
AnalyticsEvent.belongsTo(Tag,      { foreignKey: "tag_id" });
AnalyticsEvent.belongsTo(PageLink, { foreignKey: "link_id" });

module.exports = AnalyticsEvent;
