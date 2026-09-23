module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("templates", {
      id:              { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:            { type: Sequelize.STRING, allowNull: false },
      sector:          { type: Sequelize.STRING },
      default_blocks:  { type: Sequelize.JSON },
      active:          { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt:       { type: Sequelize.DATE, allowNull: false },
      updatedAt:       { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("templates");
  },
};
