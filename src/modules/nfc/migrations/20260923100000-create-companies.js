module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("companies", {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      owner_user_id:  {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "usuarios", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT",
      },
      name:            { type: Sequelize.STRING, allowNull: false },
      slug:            { type: Sequelize.STRING(50), allowNull: false, unique: true },
      status:          { type: Sequelize.ENUM("active", "suspended"), defaultValue: "active" },
      sector:          { type: Sequelize.STRING },
      piva:            { type: Sequelize.STRING(20) },
      codice_fiscale:  { type: Sequelize.STRING(20) },
      codice_sdi:      { type: Sequelize.STRING(10) },
      pec:             { type: Sequelize.STRING },
      createdAt:       { type: Sequelize.DATE, allowNull: false },
      updatedAt:       { type: Sequelize.DATE, allowNull: false },
      deletedAt:       { type: Sequelize.DATE },
    });
    await queryInterface.addIndex("companies", ["owner_user_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("companies");
  },
};
