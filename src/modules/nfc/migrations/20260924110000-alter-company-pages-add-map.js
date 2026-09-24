module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("company_pages", "map_embed_url", { type: Sequelize.TEXT });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("company_pages", "map_embed_url");
  },
};
