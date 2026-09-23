module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("analytics_events", {
      id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_id:    {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      event_type:    { type: Sequelize.ENUM("page_view", "tag_scan", "link_click"), allowNull: false },
      tag_id:        {
        type: Sequelize.INTEGER,
        references: { model: "tags", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      link_id:       {
        type: Sequelize.INTEGER,
        references: { model: "page_links", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      device_type:   { type: Sequelize.STRING(20) },
      country:       { type: Sequelize.STRING(3) },
      visitor_hash:  { type: Sequelize.STRING(64) },
      createdAt:     { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("analytics_events", ["company_id"]);
    await queryInterface.addIndex("analytics_events", ["createdAt"]);
    await queryInterface.addIndex("analytics_events", ["tag_id"]);
    await queryInterface.addIndex("analytics_events", ["link_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("analytics_events");
  },
};
