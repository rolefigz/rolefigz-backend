const express = require("express");
const router  = express.Router();
const { verifyToken, soloAdmin } = require("../../../middleware/auth");
const aziende      = require("../controllers/aziendeController");
const piani        = require("../controllers/planiController");
const tags         = require("../controllers/tagController");
const merchProdotti = require("../controllers/merchProductController");
const merchOrdini   = require("../controllers/merchOrderAdminController");
const upload = require("../../../utils/upload");
const {
  validaCreaAzienda, validaAggiornaAzienda, validaPagamento, validaAggiustaCrediti, validaPiano,
  validaCreaTag, validaAggiornaTag, validaCreaProdottoMerch, validaCambiaStatoOrdineMerch,
} = require("../middleware/validazioniNfc");

router.get("/piani",     verifyToken, soloAdmin, piani.listaPiani);
router.post("/piani",    verifyToken, soloAdmin, validaPiano, piani.creaPiano);
router.put("/piani/:id", verifyToken, soloAdmin, piani.aggiornaPiano);

router.get("/aziende",             verifyToken, soloAdmin, aziende.listaAziende);
router.post("/aziende",            verifyToken, soloAdmin, validaCreaAzienda, aziende.creaAzienda);
router.get("/aziende/:id",         verifyToken, soloAdmin, aziende.ottieniAzienda);
router.put("/aziende/:id",         verifyToken, soloAdmin, validaAggiornaAzienda, aziende.aggiornaAzienda);
router.patch("/aziende/:id/stato", verifyToken, soloAdmin, aziende.cambiaStato);
router.delete("/aziende/:id",      verifyToken, soloAdmin, aziende.eliminaAzienda);

router.post("/aziende/:id/pagamenti",        verifyToken, soloAdmin, validaPagamento, aziende.registraPagamento);
router.post("/aziende/:id/prova",            verifyToken, soloAdmin, aziende.attivaProvaController);
router.post("/aziende/:id/crediti/aggiusta", verifyToken, soloAdmin, validaAggiustaCrediti, aziende.aggiustaCreditiController);

router.get("/tags",     verifyToken, soloAdmin, tags.listaTag);
router.post("/tags",    verifyToken, soloAdmin, validaCreaTag, tags.creaTag);
router.put("/tags/:id", verifyToken, soloAdmin, validaAggiornaTag, tags.aggiornaTag);

router.get("/prodotti",     verifyToken, soloAdmin, merchProdotti.listaProdotti);
router.post("/prodotti",    verifyToken, soloAdmin, upload.single("image"), validaCreaProdottoMerch, merchProdotti.creaProdotto);
router.put("/prodotti/:id", verifyToken, soloAdmin, upload.single("image"), merchProdotti.aggiornaProdotto);

router.get("/ordini",              verifyToken, soloAdmin, merchOrdini.listaOrdini);
router.patch("/ordini/:id/stato",  verifyToken, soloAdmin, validaCambiaStatoOrdineMerch, merchOrdini.cambiaStato);
router.get("/produzione",          verifyToken, soloAdmin, merchOrdini.riepilogoProduzione);

module.exports = router;
