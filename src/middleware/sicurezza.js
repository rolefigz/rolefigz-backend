const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");

// CORS — domini consentiti
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://127.0.0.1:5500",   // Live Server di VS Code
    "http://localhost:5500",
    // "https://tuodominio.com"  // aggiungere in produzione
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Rate limit generale — 300 req / 15 min per IP (esclude file statici)
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

// Rate limit rigoroso per auth — 20 tentativi / 15 min
const limitAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Troppi tentativi di accesso, riprova tra 15 minuti" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit per route API — 200 req / 15 min
const limitAPI = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Troppe richieste API, riprova tra qualche minuto" },
});

// Rate limit per gli scan dei tag NFC — piu' permissivo di limitAPI perche'
// un singolo tag puo' essere scansionato molte volte in poco tempo da persone diverse
const limitNfcScan = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { corsOptions, limitGeneral, limitAuth, limitAPI, limitNfcScan };
