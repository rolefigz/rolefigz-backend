module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("merch_order_items", {
      id:                 { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      order_id:           {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "merch_orders", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE",
      },
      product_id:         {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: "merch_products", key: "id" }, onUpdate: "CASCADE", onDelete: "RESTRICT",
      },
      quantity:           { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      credits_each:       { type: Sequelize.INTEGER, allowNull: false },
      price_each_cents:   { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt:          { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("merch_order_items", ["order_id"]);
    await queryInterface.addIndex("merch_order_items", ["product_id"]);
  },
  async down(queryInterface) {
    await queryInterface.dropTable("merch_order_items");
  },
};
