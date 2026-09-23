module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("payments", {
      id:                   { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_id:           {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      amount_cents:         { type: Sequelize.INTEGER, allowNull: false },
      method:               { type: Sequelize.ENUM("cash"), allowNull: false, defaultValue: "cash" },
      months_covered:       { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      received_at:          { type: Sequelize.DATE, allowNull: false },
      recorded_by_user_id:  {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "usuarios", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT",
      },
      note:                 { type: Sequelize.TEXT },
      createdAt:            { type: Sequelize.DATE, allowNull: false },
      updatedAt:            { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("payments", ["company_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("payments");
  },
};
