const express          = require("express");
const path             = require("path");
const cors             = require("cors");
const helmet           = require("helmet");
const { sequelize }    = require("./src/models");
const { corsOptions, limitGeneral, limitAuth, limitAPI } = require("./src/middleware/seguridad");
const authRoutes        = require("./src/routers/authRoutes");
const productosRoutes   = require("./src/routers/productosRoutes");
const categoriasRoutes  = require("./src/routers/categoriasRoutes");
const ordenesRoutes     = require("./src/routers/ordenesRoutes");
const resenasRoutes     = require("./src/routers/resenasRoutes");
const articoliRoutes    = require("./src/routers/articoliRoutes");
const pagosRoutes       = require("./src/routers/pagosRoutes");
const { webhook }       = require("./src/controllers/pagosController");
const analyticsRoutes   = require("./src/routers/analyticsRoutes");
const ticketsRoutes     = require("./src/routers/ticketsRoutes");
require("dotenv").config();

const app = express();

// ── Seguridad global ──────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));

// ── Webhook Stripe (ANTES de express.json — necesita raw body) ────────────
app.post("/api/pagos/webhook", express.raw({ type: "application/json" }), webhook);

// ── Body & static ─────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname)));

// ── Rutas ─────────────────────────────────────────────────
app.use(limitGeneral);
app.get("/", (req, res) => res.send("API RoleFigz funcionando ✅"));
app.use("/api/auth",       limitAuth, authRoutes);
app.use("/api/productos",  limitAPI,  productosRoutes);
app.use("/api/categorias", limitAPI,  categoriasRoutes);
app.use("/api/ordenes",    limitAPI,  ordenesRoutes);
app.use("/api/resenas",    limitAPI,  resenasRoutes);
app.use("/api/articoli",   limitAPI,  articoliRoutes);
app.use("/api/pagos",      limitAPI,  pagosRoutes);
app.use("/api/analytics",  limitAPI,  analyticsRoutes);
app.use("/api/tickets",    limitAPI,  ticketsRoutes);

// ── SPA catch-all — sirve index.html para rutas de producto ──────────────────
app.get("/producto/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Error handler global ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({ error: err.message || "Error interno del servidor" });
});

// ── DB + Server ───────────────────────────────────────────
sequelize
  .sync({ alter: true })
  .then(() => {
    console.log("✅ Base de datos sincronizada");
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Servidor en http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => console.error("❌ Error DB:", err));