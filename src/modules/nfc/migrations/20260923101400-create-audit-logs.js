module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("audit_logs", {
      id:              { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      actor_user_id:   {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "usuarios", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT",
      },
      company_id:      {
        type: Sequelize.INTEGER,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      action:          { type: Sequelize.STRING, allowNull: false },
      details:         { type: Sequelize.JSON },
      createdAt:       { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("audit_logs", ["company_id"]);
    await queryInterface.addIndex("audit_logs", ["createdAt"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("audit_logs");
  },
};
