// Da questa versione i crediti sono salvati internamente in "mezzi crediti"
// (1 unita' = 0,5 crediti reali) per supportare costi frazionari (es. 1,5)
// senza cambiare il tipo delle colonne (restano INTEGER). Le righe create
// PRIMA di questo cambio sono nel vecchio sistema (1 unita' = 1 credito
// reale): vanno raddoppiate una sola volta per mantenere lo stesso valore
// reale con la nuova interpretazione.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE merch_products SET credit_cost = credit_cost * 2");
    await queryInterface.sequelize.query("UPDATE credit_ledger SET delta = delta * 2");
    await queryInterface.sequelize.query("UPDATE merch_orders SET credits_used = credits_used * 2");
    await queryInterface.sequelize.query("UPDATE merch_order_items SET credits_each = credits_each * 2");
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query("UPDATE merch_products SET credit_cost = credit_cost / 2");
    await queryInterface.sequelize.query("UPDATE credit_ledger SET delta = delta / 2");
    await queryInterface.sequelize.query("UPDATE merch_orders SET credits_used = credits_used / 2");
    await queryInterface.sequelize.query("UPDATE merch_order_items SET credits_each = credits_each / 2");
  },
};
