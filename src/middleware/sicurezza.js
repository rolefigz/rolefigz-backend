const cors      = require("cors");
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt       = require("jsonwebtoken");

const IN_SVILUPPO = process.env.NODE_ENV === "development";

// CORS — domini consentiti (gli origin locali solo in sviluppo)
const corsOptions = {
  origin: [
    "https://www.rolefigz.com",
    "https://rolefigz.com",
    ...(process.env.NODE_ENV !== "production" ? [
      "http://localhost:3000",
      "http://127.0.0.1:5500",   // Live Server di VS Code
      "http://localhost:5500",
    ] : []),
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// L'admin con la sessione aperta (token valido con rol "admin") non conta nei limiti: il pannello fa polling
// da solo (messaggi ogni 20 s, Benchys ogni 30 s) e con un po' di lavoro arrivava a «Troppe richieste».
// Un token falso o scaduto non passa la verifica della firma, quindi conta come tutti gli altri.
function esAdmin(req) {
  const token = (req.headers.authorization || "").split(" ")[1];
  if (!token) return false;
  try {
    return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] }).rol === "admin";
  } catch {
    return false;
  }
}

// Rate limit generale — 300 req / 15 min per IP (esclude file statici e l'admin)
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
           req.path.startsWith('/uploads') ||
           esAdmin(req);
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

// Rate limit per route API — 200 req / 15 min (l'admin con la sessione aperta non conta)
const limitAPI = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Troppe richieste API, riprova tra qualche minuto" },
  skip: esAdmin,
});

// Rate limit per gli scan dei tag NFC — piu' permissivo di limitAPI perche'
// un singolo tag puo' essere scansionato molte volte in poco tempo da persone diverse
const limitNfcScan = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet (ISO 27001 A.8.26 / A.8.23). La CSP completa romperebbe gli script
// inline e i CDN delle pagine, quindi per ora solo le direttive che non
// toccano il caricamento delle risorse: niente framing da altri siti
// (clickjacking), niente plugin, niente <base> iniettato.
const helmetOptions = {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      "default-src":     helmet.contentSecurityPolicy.dangerouslyDisableDefaultSrc,
      "frame-ancestors": ["'self'"],
      "object-src":      ["'none'"],
      "base-uri":        ["'self'"],
      ...(IN_SVILUPPO ? {} : { "upgrade-insecure-requests": [] }),
    },
  },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  crossOriginEmbedderPolicy: false,
};

// Le API del browser che il sito non usa restano spente.
const permissionsPolicy = (req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), usb=(), payment=(self), interest-cohort=()");
  next();
};

// Le risposte 5xx non devono mostrare dettagli interni (messaggi di Sequelize,
// di Stripe, percorsi...): il dettaglio resta nei log, al client va un testo
// generico. In sviluppo si vede tutto come prima.
const nascondiErroriInterni = (req, res, next) => {
  if (IN_SVILUPPO) return next();
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500 && body && body.error) {
      console.error(`[${req.method} ${req.originalUrl}] ${res.statusCode}:`, body.error);
      body = { error: "Errore interno del server" };
    }
    return json(body);
  };
  next();
};

module.exports = {
  corsOptions, helmetOptions, permissionsPolicy, nascondiErroriInterni,
  limitGeneral, limitAuth, limitAPI, limitNfcScan,
};
