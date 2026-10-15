const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Pagina NFC di prova (/nfc/<slug>) creata alla prenotazione del kit campione con i dati pubblici di Google Maps
// dell'attività: il QR dello stand campione la apre. Non è un'azienda del modulo NFC (niente account né piano):
// si mostra solo se non esiste un'azienda vera con lo stesso slug, con il banner «anteprima» e noindex,
// e scade da sola. Se il cliente compra, si crea l'azienda vera dal pannello NFC.
const PaginaDemo = sequelize.define("PaginaDemo", {
  slug:        { type: DataTypes.STRING(50), allowNull: false, unique: true },
  richiesta_id: { type: DataTypes.INTEGER },                         // richieste_kit.id
  place_id:    { type: DataTypes.STRING(300), allowNull: false },
  nome:        { type: DataTypes.STRING, allowNull: false },
  categoria:   { type: DataTypes.STRING },
  indirizzo:   { type: DataTypes.STRING },
  telefono:    { type: DataTypes.STRING(40) },
  telefono_int: { type: DataTypes.STRING(40) },
  sito:        { type: DataTypes.STRING(500) },
  maps_url:    { type: DataTypes.STRING(500) },
  orari:       { type: DataTypes.JSON },                             // ["lunedì: 9:00–19:00", …]
  valutazione: { type: DataTypes.DECIMAL(2, 1) },
  recensioni:  { type: DataTypes.INTEGER },
  lat:         { type: DataTypes.DOUBLE },
  lng:         { type: DataTypes.DOUBLE },
  logo_url:    { type: DataTypes.STRING },
  scadenza:    { type: DataTypes.DATE, allowNull: false },
  attiva:      { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "pagine_demo" });

module.exports = PaginaDemo;
