module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("analytics_daily", {
      id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_id:    {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      date:          { type: Sequelize.DATEONLY, allowNull: false },
      event_type:    { type: Sequelize.ENUM("page_view", "tag_scan", "link_click"), allowNull: false },
      tag_id:        {
        type: Sequelize.INTEGER,
        references: { model: "tags", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      link_id:       {
        type: Sequelize.INTEGER,
        references: { model: "page_links", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      count:         { type: Sequelize.INTEGER, defaultValue: 0 },
      unique_count:  { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt:     { type: Sequelize.DATE, allowNull: false },
      updatedAt:     { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("analytics_daily", ["company_id", "date"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("analytics_daily");
  },
};
