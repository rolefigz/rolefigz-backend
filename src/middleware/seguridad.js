const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");

// CORS — dominios permitidos
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:5500",   // Live Server de VS Code
    "http://localhost:5500",
    // "https://tudominio.com"  // añadir en producción
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Rate limit general — 100 req / 15 min por IP
const limitGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Demasiadas peticiones, espera unos minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit estricto para auth — 10 intentos / 15 min
const limitAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos de login, espera 15 minutos" },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { corsOptions, limitGeneral, limitAuth };