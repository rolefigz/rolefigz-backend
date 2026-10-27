const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Tessera fedeltà: ogni 4 timbri (ordini da almeno 100€, dati a mano
// dall'admin) sblocca un premio di 100€ senza minimo d'ordine, da
// applicare al 5° ordine. codice_tarjeta è pensato per un futuro QR /
// pass per Apple o Google Wallet (non ancora collegato).
const ClienteFedelta = sequelize.define("ClienteFedelta", {
  email:               { type: DataTypes.STRING, allowNull: false, unique: true },
  nombre:              { type: DataTypes.STRING },
  telefono:            { type: DataTypes.STRING },
  codice_tarjeta:       { type: DataTypes.STRING(20), allowNull: false, unique: true },
  timbri_attuali:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // 0-3, verso il prossimo premio
  timbri_totali:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }, // storico, mai decrementato
  premi_disponibili:    { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  premi_riscattati:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: "clienti_fedelta" });

module.exports = ClienteFedelta;
