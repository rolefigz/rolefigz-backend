const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Utente } = require("../../../models");
const ErroreAzienda = require("../utils/erroreAzienda");

// Risolve il proprietario di un'azienda: riusa un utente esistente (per id o
// per email) oppure ne crea uno nuovo gia' verificato, dato che la vendita
// e' fatta di persona dall'admin e non serve la conferma via email.
async function risolviProprietario({ owner_user_id, owner_nombre, owner_email }, transaction) {
  if (owner_user_id) {
    const utente = await Utente.findByPk(owner_user_id, { transaction });
    if (!utente) throw new ErroreAzienda("Utente proprietario non trovato", 400);
    return { utente, passwordGenerata: null };
  }

  if (!owner_email) throw new ErroreAzienda("Specificare owner_user_id oppure owner_email", 400);

  const esistente = await Utente.findOne({ where: { email: owner_email }, transaction });
  if (esistente) return { utente: esistente, passwordGenerata: null };

  if (!owner_nombre) throw new ErroreAzienda("owner_nombre e' obbligatorio per creare un nuovo utente", 400);

  const passwordGenerata = crypto.randomBytes(9).toString("base64url");
  const hash = await bcrypt.hash(passwordGenerata, 10);
  const utente = await Utente.create({
    nombre: owner_nombre, email: owner_email, password: hash,
    rol: "user", activo: true, verificado: true,
  }, { transaction });

  return { utente, passwordGenerata };
}

// Genera una nuova password per il proprietario di un'azienda (es. l'ha persa
// e l'admin gliela rigenera di persona). Restituita in chiaro una sola volta.
async function reimpostaPassword(utenteId) {
  const utente = await Utente.findByPk(utenteId);
  if (!utente) throw new ErroreAzienda("Utente non trovato", 404);

  const passwordGenerata = crypto.randomBytes(9).toString("base64url");
  await utente.update({ password: await bcrypt.hash(passwordGenerata, 10) });
  return { utente, passwordGenerata };
}

module.exports = { risolviProprietario, reimpostaPassword };
