const router = require("express").Router();
const { verifyToken, soloAdmin } = require("../middleware/auth");
const { webhook, setup } = require("../controllers/telegramController");

router.post("/webhook", webhook);
router.post("/setup",   verifyToken, soloAdmin, setup);

module.exports = router;
