const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Prenotazioni del kit campione (pagina /kit) e richieste di revisione manuale del logo.
// I file (3D, 3MF, preventivo) stanno nel servizio rolemaker-api; qui solo i dati e i riferimenti.
const RichiestaKit = sequelize.define("RichiestaKit", {
  numero:          { type: DataTypes.STRING(20), allowNull: false, unique: true },   // es. K261015-F6C8
  tipo:            { type: DataTypes.ENUM("kit", "revisione"), allowNull: false, defaultValue: "kit" },
  kit_id:          { type: DataTypes.STRING(32) },
  logo_id:         { type: DataTypes.STRING(40), allowNull: false },
  verdetto:        { type: DataTypes.STRING(12) },                                   // automatico | revisar | manual
  nome:            { type: DataTypes.STRING, allowNull: false },
  azienda:         { type: DataTypes.STRING, allowNull: false },
  email:           { type: DataTypes.STRING, allowNull: false },
  telefono:        { type: DataTypes.STRING(40) },
  note:            { type: DataTypes.TEXT },
  logo_url:        { type: DataTypes.STRING },                                       // copia su Cloudinary
  qr_url:          { type: DataTypes.STRING },
  prezzo:          { type: DataTypes.DECIMAL(10, 2), defaultValue: 19.90 },
  stato:           { type: DataTypes.ENUM("prenotato", "in_stampa", "pronto", "ritirato", "annullato"), defaultValue: "prenotato" },
  codice_sconto:   { type: DataTypes.STRING(20) },
  data_ritiro:     { type: DataTypes.DATE },
  scadenza_sconto: { type: DataTypes.DATE },
  note_admin:      { type: DataTypes.TEXT },
}, { tableName: "richieste_kit" });

module.exports = RichiestaKit;
