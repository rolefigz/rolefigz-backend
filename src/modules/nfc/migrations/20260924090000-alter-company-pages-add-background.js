module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("company_pages", "background_url", { type: Sequelize.STRING });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("company_pages", "background_url");
  },
};
