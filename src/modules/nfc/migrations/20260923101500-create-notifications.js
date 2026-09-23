module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notifications", {
      id:          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_id:  {
        type: Sequelize.INTEGER,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      user_id:     {
        type: Sequelize.INTEGER,
        references: { model: "usuarios", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      type:        { type: Sequelize.STRING, allowNull: false },
      message:     { type: Sequelize.TEXT, allowNull: false },
      read_at:     { type: Sequelize.DATE },
      createdAt:   { type: Sequelize.DATE, allowNull: false },
      updatedAt:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("notifications", ["company_id"]);
    await queryInterface.addIndex("notifications", ["user_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
  },
};
