class ErroreAzienda extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

module.exports = ErroreAzienda;
