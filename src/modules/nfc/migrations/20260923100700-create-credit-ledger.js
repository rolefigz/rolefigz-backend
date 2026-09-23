module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("credit_ledger", {
      id:                  { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_id:          {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      delta:               { type: Sequelize.INTEGER, allowNull: false },
      reason:              {
        type: Sequelize.ENUM("cycle_grant", "loyalty_bonus", "order", "order_cancelled", "expiry", "manual_adjustment"),
        allowNull: false,
      },
      reference_type:      { type: Sequelize.STRING(30) },
      reference_id:        { type: Sequelize.INTEGER },
      created_by_user_id:  {
        type: Sequelize.INTEGER,
        references: { model: "usuarios", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      createdAt:           { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("credit_ledger", ["company_id"]);
    await queryInterface.addIndex("credit_ledger", ["reference_type", "reference_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("credit_ledger");
  },
};
