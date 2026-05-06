const sequelize        = require("../config/db");
const Utente           = require("./Utente");
const Categoria        = require("./Categoria");
const Prodotto         = require("./Prodotto");
const Ordine           = require("./Ordine");
const DettaglioOrdine  = require("./DettaglioOrdine");
const VarianteProdotto = require("./VarianteProdotto");
const ImmagineProdotto = require("./ImmagineProdotto");
const Recensione       = require("./Recensione");
const Articolo         = require("./Articolo");
const Visita           = require("./Visita");
const Ticket              = require("./Ticket");
const Messaggio           = require("./Messaggio");
const OpzioneSpedizione   = require("./OpzioneSpedizione");

module.exports = {
  sequelize,
  Utente, Categoria, Prodotto, Ordine, DettaglioOrdine,
  VarianteProdotto, ImmagineProdotto, Recensione,
  Articolo, Visita, Ticket, Messaggio, OpzioneSpedizione
};
