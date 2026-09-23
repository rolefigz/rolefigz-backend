const STATI_ORDINE = ["in_attesa", "confermato", "in_produzione", "pronto", "spedito", "consegnato", "annullato"];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("merch_orders", {
      id:                          { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      company_id:                  {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      status:                      { type: Sequelize.ENUM(...STATI_ORDINE), defaultValue: "in_attesa" },
      credits_used:                { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      extra_amount_cents:          { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      shipping_address_snapshot:   { type: Sequelize.JSON },
      delivery_method:             { type: Sequelize.ENUM("hand", "shipping"), defaultValue: "hand" },
      notes:                       { type: Sequelize.TEXT },
      created_by_user_id:          {
        type: Sequelize.INTEGER,
        references: { model: "usuarios", key: "id" }, onUpdate: "CASCADE", onDelete: "SET NULL",
      },
      createdAt:                   { type: Sequelize.DATE, allowNull: false },
      updatedAt:                   { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("merch_orders", ["company_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("merch_orders");
  },
};
