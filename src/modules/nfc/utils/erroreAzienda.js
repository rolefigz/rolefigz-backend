class ErroreAzienda extends Error {
  constructor(message, status = 400, dettagli = null) {
    super(message);
    this.status = status;
    if (dettagli) this.dettagli = dettagli;
  }
}

module.exports = ErroreAzienda;
