const express         = require("express");
const path            = require("path");
const cors            = require("cors");
const helmet          = require("helmet");
const { sequelize }   = require("./src/models");
const { corsOptions, limitGeneral, limitAuth, limitAPI } = require("./src/middleware/sicurezza");
const authRoutes        = require("./src/routers/authRoutes");
const prodottiRoutes    = require("./src/routers/prodottiRoutes");
const categorieRoutes   = require("./src/routers/categorieRoutes");
const ordiniRoutes      = require("./src/routers/ordiniRoutes");
const recensioniRoutes  = require("./src/routers/recensioniRoutes");
const articoliRoutes    = require("./src/routers/articoliRoutes");
const pagamentiRoutes   = require("./src/routers/pagamentiRoutes");
const { webhook }       = require("./src/controllers/pagamentiController");
const analiticheRoutes  = require("./src/routers/analiticheRoutes");
const ticketsRoutes      = require("./src/routers/ticketsRoutes");
const spedizioneRoutes   = require("./src/routers/spedizioneRoutes");
require("dotenv").config();

const app = express();

// ── Sicurezza globale ─────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));

// ── Webhook Stripe (PRIMA di express.json — richiede raw body) ────────────
app.post("/api/pagos/webhook", express.raw({ type: "application/json" }), webhook);

// ── Body & file statici ───────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname)));

// ── Route ─────────────────────────────────────────────────
app.use(limitGeneral);
app.get("/", (req, res) => res.send("API RoleFigz operativa ✅"));
app.use("/api/auth",       limitAuth, authRoutes);
app.use("/api/productos",  limitAPI,  prodottiRoutes);
app.use("/api/categorias", limitAPI,  categorieRoutes);
app.use("/api/ordenes",    limitAPI,  ordiniRoutes);
app.use("/api/resenas",    limitAPI,  recensioniRoutes);
app.use("/api/articoli",   limitAPI,  articoliRoutes);
app.use("/api/pagos",      limitAPI,  pagamentiRoutes);
app.use("/api/analytics",  limitAPI,  analiticheRoutes);
app.use("/api/tickets",    limitAPI,  ticketsRoutes);
app.use("/api/spedizione", limitAPI,  spedizioneRoutes);

// ── SPA catch-all — serve index.html per le route prodotto ───────────────
app.get("/producto/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Gestore errori globale ────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Errore:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Errore interno del server" });
});

// ── DB + Server ───────────────────────────────────────────
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("✅ Database sincronizzato");
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server avviato su http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => console.error("❌ Errore DB:", err));
