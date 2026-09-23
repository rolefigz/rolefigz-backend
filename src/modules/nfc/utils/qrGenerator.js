const QRCode = require("qrcode");

async function generaPng(url) {
  return QRCode.toBuffer(url, { type: "png", width: 600, margin: 2, errorCorrectionLevel: "M" });
}

async function generaSvg(url) {
  return QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
}

module.exports = { generaPng, generaSvg };
