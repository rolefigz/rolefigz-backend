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

module.exports = { verifyToken, soloAdmin };
