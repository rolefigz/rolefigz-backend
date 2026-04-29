const express          = require("express");
const path             = require("path");
const cors             = require("cors");
const helmet           = require("helmet");
const { sequelize }    = require("./src/models");
const { corsOptions, limitGeneral, limitAuth } = require("./src/middleware/seguridad");
const authRoutes        = require("./src/routers/authRoutes");
const productosRoutes   = require("./src/routers/productosRoutes");
const categoriasRoutes  = require("./src/routers/categoriasRoutes");
const ordenesRoutes     = require("./src/routers/ordenesRoutes");
const resenasRoutes     = require("./src/routers/resenasRoutes");
require("dotenv").config();

const app = express();

// ── Seguridad global ──────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // cabeceras de seguridad HTTP
app.use(cors(corsOptions));                         // CORS controlado
app.use(limitGeneral);                              // rate limit general

// ── Body & static ─────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname)));

// ── Rutas ─────────────────────────────────────────────────
app.get("/", (req, res) => res.send("API RoleFigz funcionando ✅"));
app.use("/api/auth",       limitAuth, authRoutes);   // rate limit estricto en auth
app.use("/api/productos",  productosRoutes);
app.use("/api/categorias", categoriasRoutes);
app.use("/api/ordenes",    ordenesRoutes);
app.use("/api/resenas",    resenasRoutes);

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