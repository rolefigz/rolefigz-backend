const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,  // 👈 añadir puerto
    dialect: "mysql",
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false  // 👈 necesario para Railway MySQL
      }
    },
    logging: false  // 👈 limpia los logs en producción
  }
);

module.exports = sequelize;