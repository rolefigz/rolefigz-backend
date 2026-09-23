require("dotenv").config();

// Stessa connessione di src/config/db.js — il CLI di sequelize non puo'
// riusare l'istanza gia' creata li', quindi la ripetiamo qui.
const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 3306,
  dialect:  "mysql",
  dialectOptions: {
    ssl: { rejectUnauthorized: false },
  },
};

module.exports = {
  development: base,
  test:        base,
  production:  base,
};
