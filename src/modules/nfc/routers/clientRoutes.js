const express = require("express");
const router  = express.Router();
const { verifyToken } = require("../../../middleware/auth");
const { conAzienda } = require("../middleware/ownership");
const upload = require("../../../utils/upload");
const pagina = require("../controllers/paginaController");
const tagClient = require("../controllers/tagClientController");
const merch = require("../controllers/merchClientController");
const stats = require("../controllers/statsClientController");
const aziendaClient = require("../controllers/aziendaClientController");
const { validaPaginaContenuto, validaCreaOrdineMerch, validaAggiornaAziendaCliente } = require("../middleware/validazioniNfc");

router.use(verifyToken, conAzienda);

router.get("/home", pagina.home);

router.get("/azienda", aziendaClient.ottieniAzienda);
router.put("/azienda", validaAggiornaAziendaCliente, aziendaClient.aggiornaAzienda);

router.get("/pagina",            pagina.ottieniPagina);
router.put("/pagina",            validaPaginaContenuto, pagina.salvaPagina);
router.put("/pagina/link",       pagina.salvaLinks);
router.post("/pagina/pubblica",  pagina.pubblicaPagina);
router.post("/pagina/nascondi",  pagina.nascondiPagina);
router.get("/pagina/anteprima",  pagina.anteprimaPagina);
router.post("/pagina/logo",      upload.single("logo"), pagina.caricaLogo);
router.post("/pagina/sfondo",    upload.single("background"), pagina.caricaSfondo);
router.delete("/pagina/sfondo",  pagina.rimuoviSfondo);

router.get("/tags",              tagClient.listaMieiTag);
router.get("/tags/:id/qr.png",   tagClient.scaricaQrPng);
router.get("/tags/:id/qr.svg",   tagClient.scaricaQrSvg);

router.get("/prodotti",  merch.listaProdottiCatalogo);
router.post("/ordini",   validaCreaOrdineMerch, merch.creaOrdineCliente);
router.get("/ordini",    merch.listaMieiOrdini);

router.get("/statistiche", stats.statistiche);

module.exports = router;
