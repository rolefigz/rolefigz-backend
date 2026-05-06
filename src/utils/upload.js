const multer = require("multer");
const path   = require("path");

const archiviazione = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // cartella radice del progetto
  },
  filename: (req, file, cb) => {
    const unico = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unico + path.extname(file.originalname)); // es: 1714000000000-123456789.jpg
  }
});

const filtroFile = (req, file, cb) => {
  const consentiti = ["image/jpeg", "image/png", "image/webp"];
  if (consentiti.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Sono consentite solo immagini JPG, PNG o WEBP"), false);
  }
};

const upload = multer({
  storage: archiviazione,
  fileFilter: filtroFile,
  limits: { fileSize: 5 * 1024 * 1024 } // massimo 5MB
});

module.exports = upload;
