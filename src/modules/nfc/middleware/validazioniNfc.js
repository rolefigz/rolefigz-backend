const { body, validationResult } = require("express-validator");
const { realeAUnita } = require("../utils/crediti");

const valida = (req, res, next) => {
  const errori = validationResult(req);
  if (!errori.isEmpty()) {
    return res.status(400).json({
      error:    "Dati non validi",
      dettagli: errori.array().map(e => ({ campo: e.path, messaggio: e.msg })),
    });
  }
  next();
};

const validaCreaAzienda = [
  body("name").trim().notEmpty().withMessage("Il nome dell'azienda e' obbligatorio"),
  body("slug").trim().toLowerCase().matches(/^[a-z0-9-]{3,50}$/)
    .withMessage("Slug non valido: minuscole, numeri e trattini, 3-50 caratteri"),
  body("plan_id").isInt({ min: 1 }).withMessage("Piano non valido"),
  body("owner_user_id").optional({ checkFalsy: true }).isInt({ min: 1 }),
  body("owner_email").optional({ checkFalsy: true }).isEmail().withMessage("Email proprietario non valida").normalizeEmail(),
  body("owner_nombre").optional({ checkFalsy: true }).trim().notEmpty(),
  valida,
];

const validaAggiornaAzienda = [
  body("name").optional().trim().notEmpty().withMessage("Il nome non puo' essere vuoto"),
  body("plan_id").optional().isInt({ min: 1 }).withMessage("Piano non valido"),
  valida,
];

const validaPagamento = [
  body("amount_cents").isInt({ min: 1 }).withMessage("L'importo deve essere maggiore di 0"),
  body("months_covered").isInt({ min: 1 }).withMessage("I mesi coperti devono essere almeno 1"),
  body("received_at").optional({ checkFalsy: true }).isISO8601().withMessage("Data non valida"),
  valida,
];

const validaAggiustaCrediti = [
  body("delta")
    .isFloat().withMessage("Delta crediti non valido")
    .toFloat()
    .custom(v => {
      if (v === 0) throw new Error("Il delta non puo' essere zero");
      if (Math.round(v * 2) !== v * 2) throw new Error("Il delta deve essere multiplo di 0,5");
      return true;
    })
    .customSanitizer(v => realeAUnita(v)),
  body("motivo").trim().notEmpty().withMessage("Il motivo e' obbligatorio"),
  valida,
];

const validaPaginaContenuto = [
  body("description").optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage("Descrizione troppo lunga"),
  body("hours").optional({ checkFalsy: true }).isLength({ max: 160 }).withMessage("Orario troppo lungo"),
  body("seo_title").optional({ checkFalsy: true }).isLength({ max: 160 }).withMessage("Titolo SEO troppo lungo"),
  body("seo_description").optional({ checkFalsy: true }).isLength({ max: 300 }).withMessage("Descrizione SEO troppo lunga"),
  body("map_embed_url").optional({ checkFalsy: true, nullable: true }).isLength({ max: 4000 }).withMessage("Link mappa troppo lungo"),
  valida,
];

const validaCreaProdottoMerch = [
  body("name").trim().notEmpty().withMessage("Il nome e' obbligatorio"),
  body("credit_cost")
    .isFloat({ min: 0 }).withMessage("Crediti non validi")
    .toFloat()
    .custom(v => {
      if (Math.round(v * 2) !== v * 2) throw new Error("I crediti devono essere multipli di 0,5");
      return true;
    })
    .customSanitizer(v => realeAUnita(v)),
  body("extra_price_cents").optional().isInt({ min: 0 }).withMessage("Prezzo extra non valido").toInt(),
  body("internal_cost_cents").optional({ checkFalsy: true }).isInt({ min: 0 }).toInt(),
  body("production_days").optional({ checkFalsy: true }).isInt({ min: 0 }).toInt(),
  valida,
];

const validaCreaOrdineMerch = [
  body("items").isArray({ min: 1 }).withMessage("Il carrello e' vuoto"),
  body("items.*.product_id").isInt({ min: 1 }).withMessage("Prodotto non valido"),
  body("items.*.quantity").isInt({ min: 1 }).withMessage("Quantita' non valida"),
  body("delivery_method").optional().isIn(["hand", "shipping"]).withMessage("Metodo di consegna non valido"),
  valida,
];

const validaCambiaStatoOrdineMerch = [
  body("status").notEmpty().withMessage("Stato obbligatorio"),
  valida,
];

const validaCreaTag = [
  body("type").optional().isIn(["qr", "nfc"]).withMessage("Tipo tag non valido"),
  body("quantity").optional().isInt({ min: 1, max: 100 }).withMessage("Quantita' non valida (1-100)"),
  body("company_id").optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage("Azienda non valida"),
  valida,
];

const validaAggiornaTag = [
  body("company_id").optional({ checkFalsy: true, nullable: true }).isInt({ min: 1 }).withMessage("Azienda non valida"),
  body("is_active").optional().isBoolean().withMessage("Stato non valido"),
  valida,
];

const validaPiano = [
  body("name").trim().notEmpty().withMessage("Il nome del piano e' obbligatorio"),
  body("monthly_price_cents").isInt({ min: 0 }).withMessage("Prezzo non valido"),
  body("monthly_credits").isInt({ min: 0 }).withMessage("Crediti non validi"),
  valida,
];

const validaAggiornaAziendaCliente = [
  body("name").optional().trim().notEmpty().withMessage("Il nome non puo' essere vuoto").isLength({ max: 160 }),
  body("sector").optional({ checkFalsy: true }).trim().isLength({ max: 120 }),
  body("piva").optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body("codice_fiscale").optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body("codice_sdi").optional({ checkFalsy: true }).trim().isLength({ max: 10 }),
  body("pec").optional({ checkFalsy: true }).trim().isEmail().withMessage("PEC non valida"),
  valida,
];

const validaCreaLead = [
  body("company_name").trim().notEmpty().withMessage("Il nome dell'azienda e' obbligatorio").isLength({ max: 160 }),
  body("contact_name").trim().notEmpty().withMessage("Il nome del referente e' obbligatorio").isLength({ max: 160 }),
  body("email").trim().isEmail().withMessage("Email non valida").normalizeEmail(),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body("message").optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
  valida,
];

const validaCambiaStatoLead = [
  body("status").isIn(["nuova", "contattata", "convertita", "scartata"]).withMessage("Stato non valido"),
  valida,
];

module.exports = {
  validaCreaAzienda, validaAggiornaAzienda, validaPagamento, validaAggiustaCrediti,
  validaPaginaContenuto, validaPiano, validaCreaTag, validaAggiornaTag,
  validaCreaProdottoMerch, validaCreaOrdineMerch, validaCambiaStatoOrdineMerch,
  validaAggiornaAziendaCliente, validaCreaLead, validaCambiaStatoLead,
};
