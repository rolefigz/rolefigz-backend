const { Company, CompanyPage, Locandina, IscrizioneLocandina } = require("../../../models");
const { eVisibile, fileIcs } = require("../services/locandinaService");

// Rotte pubbliche del pop-up della locandina: file .ics per il calendario e
// iscrizione con email. Funzionano solo se la locandina e' visibile e la
// pagina dell'azienda e' attiva e pubblicata.
async function caricaLocandinaPubblica(idGrezzo) {
  const id = parseInt(idGrezzo, 10);
  if (!Number.isInteger(id) || id < 1) return null;
  const l = await Locandina.findByPk(id);
  if (!l || !eVisibile(l)) return null;
  const azienda = await Company.findOne({ where: { id: l.company_id, status: "active" } });
  if (!azienda) return null;
  const pagina = await CompanyPage.findOne({ where: { company_id: azienda.id, is_published: true }, attributes: ["id"] });
  if (!pagina) return null;
  return { l, azienda };
}

const scaricaIcs = async (req, res) => {
  try {
    const trovata = await caricaLocandinaPubblica(req.params.id);
    if (!trovata || !trovata.l.inizio_evento) return res.status(404).send("Evento non trovato");
    const { l, azienda } = trovata;
    const base = (process.env.NFC_PUBLIC_BASE_URL || "https://www.rolefigz.com/nfc").replace(/\/$/, "");
    res.set("Content-Type", "text/calendar; charset=utf-8");
    res.set("Content-Disposition", `attachment; filename="evento-${l.id}.ics"`);
    res.set("X-Robots-Tag", "noindex");
    res.send(fileIcs(l, azienda.name, `${base}/${azienda.slug}`));
  } catch (err) {
    console.error("ics locandina:", err.message);
    res.status(500).send("Errore");
  }
};

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,180}\.[^\s@]{2,}$/;

const iscriviti = async (req, res) => {
  try {
    const { email, nome, consenso, sito } = req.body || {};
    // campo trappola invisibile: i bot lo compilano, le persone no
    if (sito) return res.status(201).json({ ok: true });
    const emailPulita = String(email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(emailPulita) || emailPulita.length > 190) return res.status(400).json({ error: "Email non valida" });
    if (consenso !== true && consenso !== "true" && consenso !== "on") {
      return res.status(400).json({ error: "Serve il consenso per lasciare l'email" });
    }

    const trovata = await caricaLocandinaPubblica(req.params.id);
    if (!trovata || !trovata.l.raccogli_email) return res.status(404).json({ error: "Iscrizione non disponibile" });
    const { l } = trovata;

    const esistente = await IscrizioneLocandina.findOne({ where: { locandina_id: l.id, email: emailPulita } });
    if (!esistente) {
      await IscrizioneLocandina.create({
        locandina_id: l.id, company_id: l.company_id, email: emailPulita,
        nome: String(nome || "").trim().slice(0, 80) || null, consenso_at: new Date(),
      });
    }
    res.status(201).json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { scaricaIcs, iscriviti };
