module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("tags", {
      id:          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      code:        { type: Sequelize.STRING(7), allowNull: false, unique: true },
      company_id:  {
        type: Sequelize.INTEGER,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      type:        { type: Sequelize.ENUM("qr", "nfc"), defaultValue: "qr" },
      label:       { type: Sequelize.STRING },
      is_active:   { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt:   { type: Sequelize.DATE, allowNull: false },
      updatedAt:   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("tags", ["company_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("tags");
  },
};
