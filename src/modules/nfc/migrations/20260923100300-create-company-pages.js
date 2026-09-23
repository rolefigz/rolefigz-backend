module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("company_pages", {
      id:               { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_id:       {
        type: Sequelize.INTEGER, allowNull: false, unique: true,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      template_id:      {
        type: Sequelize.INTEGER,
        references: { model: "templates", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      is_published:     { type: Sequelize.BOOLEAN, defaultValue: false },
      published_at:     { type: Sequelize.DATE },
      design:           { type: Sequelize.JSON },
      seo_title:        { type: Sequelize.STRING(160) },
      seo_description:  { type: Sequelize.STRING(300) },
      og_image:         { type: Sequelize.STRING },
      createdAt:        { type: Sequelize.DATE, allowNull: false },
      updatedAt:        { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("company_pages");
  },
};
