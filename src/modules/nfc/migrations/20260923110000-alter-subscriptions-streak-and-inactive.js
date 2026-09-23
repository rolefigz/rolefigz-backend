module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("subscriptions", "consecutive_paid_months", {
      type: Sequelize.INTEGER, allowNull: false, defaultValue: 0,
    });
    await queryInterface.changeColumn("subscriptions", "status", {
      type: Sequelize.ENUM("inactive", "trial", "active", "grace", "cancelled", "suspended"),
      defaultValue: "inactive",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("subscriptions", "consecutive_paid_months");
    await queryInterface.changeColumn("subscriptions", "status", {
      type: Sequelize.ENUM("trial", "active", "grace", "cancelled", "suspended"),
      defaultValue: "trial",
    });
  },
};
