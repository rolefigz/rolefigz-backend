const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Utente = require("./Utente");

const Ordine = sequelize.define("Ordine", {
  nombre_cliente: { type: DataTypes.STRING, allowNull: false },
  email_cliente:  { type: DataTypes.STRING, allowNull: false },
  telefono:       { type: DataTypes.STRING },
  direccion:      { type: DataTypes.TEXT },
  total:          { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  estado: {
    type: DataTypes.ENUM("pendiente", "confirmado", "enviado", "entregado", "cancelado"),
    defaultValue: "pendiente"
  },
  notas:                 { type: DataTypes.TEXT },
  tracking_number:       { type: DataTypes.STRING },
  carrier:               { type: DataTypes.STRING },
  label_url:             { type: DataTypes.STRING },
  costo_spedizione:      { type: DataTypes.DECIMAL(10,2) },
  shippo_transaction_id: { type: DataTypes.STRING },
  shippo_rate_id:        { type: DataTypes.STRING },
  codice_promo:          { type: DataTypes.STRING(30) }
}, { tableName: "ordenes" });

Ordine.belongsTo(Utente, { foreignKey: "usuario_id", allowNull: true });

module.exports = Ordine;
