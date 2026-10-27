/**
 * Carica nel catalogo merchandising NFC (merch_products) i prezzi del listino
 * dei preventivi, cosi' i clienti ordinano dal pannello a quei prezzi.
 *
 *   node scripts/listino-nfc.js            → mostra solo cosa cambierebbe
 *   node scripts/listino-nfc.js --applica  → scrive nel database
 *
 * I prodotti si riconoscono dal nome: se esiste gia' se ne aggiornano prezzo
 * e minimo (immagine e descrizione restano), altrimenti si crea. I prodotti
 * attivi che non sono nel listino si disattivano (non si cancellano: gli
 * ordini vecchi li citano ancora).
 */

require("dotenv").config();
const sequelize = require("../src/config/db");
const { MerchProduct } = require("../src/models");
const { TAGLIE } = require("../public/js/prezzi-segnaposti.js");

const MINIMO_LINEA_NFC = 25;

// `era`: nome con cui il prodotto esiste gia' nel catalogo (si rinomina, tenendo foto e ordini).
// Il catalogo merch mostra solo merchandising: i segnaposti (S/M/L/LH) si
// ordinano dalla pagina /kit/segnaposti, non da qui. Lo stand da banco (XL)
// resta, perche' e' merchandising a tutti gli effetti.
const STAND_XL = TAGLIE.find(t => t.chiave === "XL");
const LISTINO = [
  {
    name: `Stand NFC con QR — pack da ${STAND_XL.pezzi}`,
    description: "Da banco, base zavorrata, QR + NFC",
    price_cents: STAND_XL.prezzo * 100, min_quantity: 1,
  },
  { name: "Portachiavi NFC",            price_cents: 250, min_quantity: MINIMO_LINEA_NFC },
  { name: "Portachiavi NFC con resina", price_cents: 350, min_quantity: MINIMO_LINEA_NFC },
  { name: "Calamita con logo",          price_cents: 250, min_quantity: MINIMO_LINEA_NFC },
  { name: "Biglietto da visita NFC",    price_cents: 790, min_quantity: MINIMO_LINEA_NFC },
  { name: "Badge magnetico",            price_cents: 850, min_quantity: MINIMO_LINEA_NFC },
];

function euro(c) { return `€${(c / 100).toFixed(2)}`; }

async function main() {
  const applica = process.argv.includes("--applica");
  await sequelize.authenticate();
  // in prova non si tocca nemmeno lo schema: se min_quantity manca ancora, la si salta in lettura
  const colonne = await sequelize.getQueryInterface().describeTable("merch_products");
  if (applica) await MerchProduct.assicuraColonne();
  const senzaMinimo = !applica && !colonne.min_quantity;

  const esistenti = await MerchProduct.findAll(senzaMinimo ? { attributes: { exclude: ["min_quantity", "credit_cost"] } } : {});
  const perNome = new Map(esistenti.map(p => [p.name.trim().toLowerCase(), p]));
  const nomiListino = new Set(LISTINO.flatMap(l => [l.name, l.era].filter(Boolean).map(n => n.toLowerCase())));

  for (const [i, voce] of LISTINO.entries()) {
    const p = perNome.get(voce.name.toLowerCase()) || (voce.era && perNome.get(voce.era.toLowerCase()));
    const valori = { price_cents: voce.price_cents, min_quantity: voce.min_quantity, active: true, position: i };
    if (!p) {
      console.log(`+ crea      ${voce.name} — ${euro(voce.price_cents)}, minimo ${voce.min_quantity}`);
      if (applica) await MerchProduct.create({ name: voce.name, description: voce.description || null, ...valori });
    } else {
      const rinomina = p.name !== voce.name ? { name: voce.name, description: voce.description } : {};
      console.log(`~ aggiorna  ${p.name}${rinomina.name ? ` → «${voce.name}»` : ""} — ${euro(p.price_cents)} → ${euro(voce.price_cents)}, minimo ${voce.min_quantity}`);
      if (applica) await p.update({ ...valori, ...rinomina });
    }
  }

  for (const p of esistenti) {
    if (p.active && !nomiListino.has(p.name.trim().toLowerCase())) {
      console.log(`- disattiva ${p.name} (non e' nel listino)`);
      if (applica) await p.update({ active: false });
    }
  }

  console.log(applica ? "\nListino applicato." : "\nNessuna modifica scritta: rilancia con --applica per salvare.");
  await sequelize.close();
}

main().catch(err => { console.error(err); process.exit(1); });
