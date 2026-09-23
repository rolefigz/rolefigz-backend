const TIPI_LINK = [
  "whatsapp", "instagram", "facebook", "tiktok", "linkedin", "youtube",
  "website", "menu", "booking", "maps", "tripadvisor", "phone", "email", "custom",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("page_links", {
      id:          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_id:  {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      type:        { type: Sequelize.ENUM(...TIPI_LINK), allowNull: false },
      label:       { type: Sequelize.STRING, allowNull: false },
      url:         { type: Sequelize.STRING, allowNull: false },
      position:    { type: Sequelize.INTEGER, defaultValue: 0 },
      is_visible:  { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt:   { type: Sequelize.DATE, allowNull: false },
      updatedAt:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("page_links", ["company_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("page_links");
  },
};
