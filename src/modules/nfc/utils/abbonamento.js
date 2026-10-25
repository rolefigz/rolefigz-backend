// Un solo abbonamento per tutti: 5 € al mese con un impegno minimo di 12 mesi,
// pagato in contanti. Il merchandising si ordina a parte, ai prezzi del listino.
const NOME_PIANO = "RoleFigz NFC";
const PREZZO_MENSILE_CENTS = 500;
const MESI_MINIMI = 12;

// Il piano unico nella tabella plans (gli abbonamenti hanno sempre un plan_id):
// lo crea se manca, spegne i vecchi piani e ci sposta sopra
// tutti gli abbonamenti. Idempotente: si puo' chiamare a ogni avvio.
async function assicuraPianoUnico() {
  const { Plan, Subscription } = require("../../../models");
  const { Op } = require("sequelize");

  // si riusa il piano da 5 € gia' creato a mano dall'admin («1 Anno Incluso»), se c'e'
  let piano = await Plan.findOne({ where: { name: NOME_PIANO } })
    || await Plan.findOne({ where: { monthly_price_cents: PREZZO_MENSILE_CENTS }, order: [["id", "ASC"]] });
  if (!piano) piano = await Plan.create({ name: NOME_PIANO, monthly_price_cents: PREZZO_MENSILE_CENTS, monthly_credits: 0 });
  if (piano.name !== NOME_PIANO || piano.monthly_price_cents !== PREZZO_MENSILE_CENTS || !piano.active || piano.monthly_credits) {
    await piano.update({ name: NOME_PIANO, monthly_price_cents: PREZZO_MENSILE_CENTS, monthly_credits: 0, active: true });
  }
  await Plan.update({ active: false }, { where: { id: { [Op.ne]: piano.id }, active: true } });
  await Subscription.update({ plan_id: piano.id }, { where: { plan_id: { [Op.ne]: piano.id } } });
  return piano;
}

async function pianoUnico(transaction = null) {
  const { Plan } = require("../../../models");
  const piano = await Plan.findOne({ where: { name: NOME_PIANO }, ...(transaction ? { transaction } : {}) });
  return piano || assicuraPianoUnico();
}

module.exports = { NOME_PIANO, PREZZO_MENSILE_CENTS, MESI_MINIMI, assicuraPianoUnico, pianoUnico };
