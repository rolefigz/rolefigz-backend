const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");

// Prezzo del listino (lo stesso dei preventivi): price_cents per unita' di
// vendita — un pezzo, o un pack per i segnaposti — con min_quantity unita'
// minime per ordine. price_cents riusa la colonna storica extra_price_cents;
// credit_cost resta solo perche' la colonna e' NOT NULL (i crediti non esistono piu').
const MerchProduct = sequelize.define("MerchProduct", {
  name:                 { type: DataTypes.STRING, allowNull: false },
  description:          { type: DataTypes.TEXT },
  image:                { type: DataTypes.STRING },
  price_cents:          { type: DataTypes.INTEGER, defaultValue: 0, field: "extra_price_cents" },
  min_quantity:         { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  credit_cost:          { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  internal_cost_cents:  { type: DataTypes.INTEGER },
  production_days:      { type: DataTypes.INTEGER },
  active:               { type: DataTypes.BOOLEAN, defaultValue: true },
  position:             { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: "merch_products",
  defaultScope: { attributes: { exclude: ["credit_cost"] } },
});

// min_quantity e' arrivata dopo la creazione della tabella (sync non altera
// mai le tabelle esistenti, vedi server.js): si aggiunge solo se manca.
MerchProduct.assicuraColonne = async function () {
  const qi = sequelize.getQueryInterface();
  const colonne = await qi.describeTable("merch_products");
  if (!colonne.min_quantity) {
    await qi.addColumn("merch_products", "min_quantity", { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 });
  }
};

module.exports = MerchProduct;
