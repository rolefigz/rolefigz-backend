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

// Rate limit general — 300 req / 15 min por IP (excluye estáticos)
const limitGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Troppe richieste, riprova tra qualche minuto" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path.startsWith('/css') ||
           req.path.startsWith('/js') ||
           req.path.startsWith('/assets') ||
           req.path.startsWith('/uploads');
  }
});

// Rate limit estricto para auth — 20 intentos / 15 min
const limitAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Troppi tentativi di accesso, riprova tra 15 minuti" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit para rutas API — 200 req / 15 min
const limitAPI = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Troppe richieste API, riprova tra qualche minuto" },
});

module.exports = { corsOptions, limitGeneral, limitAuth, limitAPI };
