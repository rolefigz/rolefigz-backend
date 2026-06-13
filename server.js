const express         = require("express");
const path            = require("path");
const cors            = require("cors");
const helmet          = require("helmet");
const { sequelize, PuntiTransazione, CodicePromo, Ordine } = require("./src/models");
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
const gadget3dRoutes     = require("./src/routers/gadget3dRoutes");
const puntiRoutes        = require("./src/routers/puntiRoutes");
const promoRoutes        = require("./src/routers/promoRoutes");
const telegramRoutes     = require("./src/routers/telegramRoutes");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));

// il webhook stripe deve stare prima del json parser, altrimenti non legge il body correttamente
app.post("/api/pagos/webhook", express.raw({ type: "application/json" }), webhook);

app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname)));

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
app.use("/api",           limitAPI,  gadget3dRoutes);
app.use("/api/punti",     limitAPI,  puntiRoutes);
app.use("/api/promo",     limitAPI,  promoRoutes);
app.use("/api/telegram", limitAPI,  telegramRoutes);

const serveApp = (req, res) => res.sendFile(path.join(__dirname, "public", "index.html"));
app.get("/blog/:slug", serveApp);
app.get("/checkout",   serveApp);

app.get("/producto/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  console.error("Errore:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Errore interno del server" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
  sequelize
    .sync({ alter: true })
    .then(() => console.log("db sincronizzato"))
    .catch(err => console.error("errore db sync:", err.message));

  // questi li metto esplicitamente perché il sync generale a volte non aggiunge le colonne nuove
  PuntiTransazione.sync({ alter: true }).catch(err => console.error("punti_transazioni:", err.message));
  CodicePromo.sync({ alter: true }).catch(err => console.error("codici_promo:", err.message));
  Ordine.sync({ alter: true }).catch(err => console.error("ordenes:", err.message));
});
