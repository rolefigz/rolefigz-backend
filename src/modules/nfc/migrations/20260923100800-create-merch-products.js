module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("merch_products", {
      id:                    { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:                  { type: Sequelize.STRING, allowNull: false },
      description:           { type: Sequelize.TEXT },
      image:                 { type: Sequelize.STRING },
      credit_cost:           { type: Sequelize.INTEGER, allowNull: false },
      extra_price_cents:     { type: Sequelize.INTEGER, defaultValue: 0 },
      internal_cost_cents:   { type: Sequelize.INTEGER },
      production_days:       { type: Sequelize.INTEGER },
      active:                { type: Sequelize.BOOLEAN, defaultValue: true },
      position:              { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt:             { type: Sequelize.DATE, allowNull: false },
      updatedAt:             { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("merch_products");
  },
};
