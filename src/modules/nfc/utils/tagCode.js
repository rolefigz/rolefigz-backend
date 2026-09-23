const crypto = require("crypto");
const { Tag } = require("../models");

// Esclude 0, O, 1, l, I: caratteri facilmente confondibili su un'etichetta stampata.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generaCodice() {
  let codice = "";
  for (let i = 0; i < 7; i++) codice += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return codice;
}

async function generaCodiceUnivoco() {
  for (let tentativo = 0; tentativo < 10; tentativo++) {
    const codice = generaCodice();
    const esiste = await Tag.findOne({ where: { code: codice } });
    if (!esiste) return codice;
  }
  throw new Error("Impossibile generare un codice tag univoco, riprova");
}

module.exports = { generaCodiceUnivoco };
