module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("plans", {
      id:                   { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:                 { type: Sequelize.STRING, allowNull: false },
      monthly_price_cents:  { type: Sequelize.INTEGER, allowNull: false },
      monthly_credits:      { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      features:             { type: Sequelize.JSON },
      limits:                { type: Sequelize.JSON },
      active:                { type: Sequelize.BOOLEAN, defaultValue: true },
      position:              { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt:             { type: Sequelize.DATE, allowNull: false },
      updatedAt:             { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("plans");
  },
};
