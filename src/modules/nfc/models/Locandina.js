const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/db");
const Company   = require("./Company");

// Locandina (volantino/evento) che l'azienda carica dal pannello e che la
// pagina pubblica /nfc/:slug mostra in un pop-up all'apertura.
// - inizio_evento/fine_evento: se c'e' l'inizio, il pop-up offre "Aggiungi al calendario"
// - mostra_dal/mostra_fino: finestra in cui il pop-up compare (vuoto = subito / fino alla fine dell'evento)
// - raccogli_email: il pop-up mostra un form per lasciare l'email (con consenso)
const Locandina = sequelize.define("Locandina", {
  company_id:     { type: DataTypes.INTEGER, allowNull: false },
  titolo:         { type: DataTypes.STRING(120), allowNull: false },
  descrizione:    { type: DataTypes.TEXT },
  immagine_url:   { type: DataTypes.STRING },
  luogo:          { type: DataTypes.STRING(200) },
  inizio_evento:  { type: DataTypes.DATE },
  fine_evento:    { type: DataTypes.DATE },
  mostra_dal:     { type: DataTypes.DATE },
  mostra_fino:    { type: DataTypes.DATE },
  raccogli_email: { type: DataTypes.BOOLEAN, defaultValue: false },
  testo_email:    { type: DataTypes.STRING(120) },
  link_url:       { type: DataTypes.STRING(500) },
  link_label:     { type: DataTypes.STRING(60) },
  attiva:         { type: DataTypes.BOOLEAN, defaultValue: true },
  // ogni quanto si apre da solo il pop-up per lo stesso visitatore: "giorno" (una volta al giorno),
  // "sempre" (a ogni apertura della pagina) o "una_volta" (solo la prima volta)
  frequenza:      { type: DataTypes.STRING(12), allowNull: false, defaultValue: "giorno" },
  // fascia oraria del giorno (ora di Roma, "HH:MM") in cui compare: vuoto = tutto il giorno.
  // Se ora_al e' prima di ora_dal la fascia passa la mezzanotte (es. 22:00 → 02:00).
  ora_dal:        { type: DataTypes.STRING(5) },
  ora_al:         { type: DataTypes.STRING(5) },
}, {
  tableName: "nfc_locandine",
  indexes: [{ fields: ["company_id", "attiva"] }],
});

Locandina.belongsTo(Company, { foreignKey: "company_id" });
Company.hasMany(Locandina,   { foreignKey: "company_id" });

// frequenza e ora_dal/ora_al sono arrivate dopo la creazione della tabella (sync non altera
// le tabelle esistenti): si aggiungono solo se mancano.
Locandina.FREQUENZE = ["giorno", "sempre", "una_volta"];
Locandina.assicuraColonne = async function () {
  const qi = sequelize.getQueryInterface();
  const colonne = await qi.describeTable("nfc_locandine");
  if (!colonne.frequenza) {
    await qi.addColumn("nfc_locandine", "frequenza", { type: DataTypes.STRING(12), allowNull: false, defaultValue: "giorno" });
  }
  for (const col of ["ora_dal", "ora_al"]) {
    if (!colonne[col]) await qi.addColumn("nfc_locandine", col, { type: DataTypes.STRING(5), allowNull: true });
  }
};

module.exports = Locandina;
