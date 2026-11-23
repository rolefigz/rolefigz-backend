const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// App personale di Oskar (/app): lotti di portachiavi NFC da programmare e contare dal telefono.
// Un lotto = un locale/ordine (es. «La Rocca del Lupo · 50 portachiavi») con l'URL da scrivere nei chip.
const LottoNfc = sequelize.define("LottoNfc", {
  nome:      { type: DataTypes.STRING(120), allowNull: false },
  url:       { type: DataTypes.STRING(500) },                 // vuoto = solo contare, non scrivere
  obiettivo: { type: DataTypes.INTEGER },                     // quanti pezzi ha il lotto (facoltativo)
  chiuso:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  note:      { type: DataTypes.STRING(500) },
}, { tableName: "app_lotti_nfc" });

// Una riga per chip (UID di fabbrica) e lotto: l'indice unico impedisce di contare due volte lo stesso
// portachiavi anche se si passa due volte o se due richieste arrivano insieme.
const ScansioneNfc = sequelize.define("ScansioneNfc", {
  lotto_id: { type: DataTypes.INTEGER, allowNull: false },
  uid:      { type: DataTypes.STRING(40), allowNull: false },  // «04:A2:3B:…» in maiuscolo
  scritto:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  url:      { type: DataTypes.STRING(500) },                   // URL che il chip contiene dopo la scansione
  letto_il: { type: DataTypes.DATE },                          // ora sul telefono (anche se sincronizzata dopo)
}, { tableName: "app_scansioni_nfc", indexes: [{ unique: true, fields: ["lotto_id", "uid"] }, { fields: ["uid"] }] });

LottoNfc.hasMany(ScansioneNfc, { foreignKey: "lotto_id", onDelete: "CASCADE" });
ScansioneNfc.belongsTo(LottoNfc, { foreignKey: "lotto_id" });

module.exports = { LottoNfc, ScansioneNfc };
