module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("nfc_leads", {
      id:                  { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_name:        { type: Sequelize.STRING, allowNull: false },
      contact_name:        { type: Sequelize.STRING, allowNull: false },
      email:               { type: Sequelize.STRING, allowNull: false },
      phone:               { type: Sequelize.STRING },
      message:             { type: Sequelize.TEXT },
      status:              { type: Sequelize.ENUM("nuova", "contattata", "convertita", "scartata"), defaultValue: "nuova" },
      converted_company_id:{
        type: Sequelize.INTEGER,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      createdAt:           { type: Sequelize.DATE, allowNull: false },
      updatedAt:           { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("nfc_leads", ["status"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("nfc_leads");
  },
};
