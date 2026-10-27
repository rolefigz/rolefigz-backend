const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const ClienteFedelta = require("./ClienteFedelta");

// Storico dei movimenti di una tessera fedeltà: ogni timbro dato o tolto
// a mano dall'admin, ogni premio generato o riscattato.
const FedeltaMovimiento = sequelize.define("FedeltaMovimiento", {
  cliente_fedelta_id: { type: DataTypes.INTEGER, allowNull: false },
  tipo:                { type: DataTypes.ENUM("timbro", "timbro_annullato", "premio_generato", "premio_riscattato"), allowNull: false },
  nota:                { type: DataTypes.STRING },
  admin_id:            { type: DataTypes.INTEGER },
}, { tableName: "fedelta_movimenti" });

FedeltaMovimiento.belongsTo(ClienteFedelta, { foreignKey: "cliente_fedelta_id" });
ClienteFedelta.hasMany(FedeltaMovimiento,   { foreignKey: "cliente_fedelta_id" });

module.exports = FedeltaMovimiento;
