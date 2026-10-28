const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ error: "Token richiesto" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token non valido o scaduto" });
  }
};

const soloAdmin = (req, res, next) => {
  if (req.usuario.rol !== "admin")
    return res.status(403).json({ error: "Accesso riservato agli amministratori" });
  next();
};

// Per le sole rotte della sezione "Circuiti 3D": admin pieno, oppure un
// account con accesso limitato a quella sola sezione (rol "circuiti").
const soloAdminOCircuiti = (req, res, next) => {
  if (req.usuario.rol !== "admin" && req.usuario.rol !== "circuiti")
    return res.status(403).json({ error: "Accesso riservato" });
  next();
};

module.exports = { verifyToken, soloAdmin, soloAdminOCircuiti };
