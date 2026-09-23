module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("company_pages", "logo_url", { type: Sequelize.STRING });
    await queryInterface.addColumn("company_pages", "description", { type: Sequelize.TEXT });
    await queryInterface.addColumn("company_pages", "hours", { type: Sequelize.STRING(160) });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("company_pages", "logo_url");
    await queryInterface.removeColumn("company_pages", "description");
    await queryInterface.removeColumn("company_pages", "hours");
  },
};
