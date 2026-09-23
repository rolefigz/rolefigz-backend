module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("subscriptions", {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_id:     {
        type: Sequelize.INTEGER, allowNull: false, unique: true,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      plan_id:        {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "plans", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT",
      },
      status:         { type: Sequelize.ENUM("trial", "active", "grace", "cancelled", "suspended"), defaultValue: "trial" },
      trial_ends_at:  { type: Sequelize.DATE },
      paid_until:     { type: Sequelize.DATE },
      cancelled_at:   { type: Sequelize.DATE },
      started_at:     { type: Sequelize.DATE, allowNull: false },
      createdAt:      { type: Sequelize.DATE, allowNull: false },
      updatedAt:      { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("subscriptions", ["plan_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("subscriptions");
  },
};
