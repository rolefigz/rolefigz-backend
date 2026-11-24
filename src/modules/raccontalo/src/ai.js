// La parte AI: capire quali eventi raccontare e scrivere i post.
// Con ANTHROPIC_API_KEY usa Claude; senza chiave lavora in "modalità demo"
// con testi di esempio, così l'app si può sempre mostrare.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { readPhotoBase64 } from "./store.js";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client = null;
const getClient = () => (client ??= new Anthropic());

// ---------- schemi ----------

const Variant = z.object({
  text: z.string().describe("Testo completo del post, pronto da pubblicare, senza hashtag in fondo"),
  hashtags: z.array(z.string()).describe("Hashtag senza il simbolo #"),
});

const PostsSchema = z.object({
  linkedin: Variant,
  instagram: Variant,
  facebook: Variant,
  media_suggestions: z.array(z.string()).describe("Quali foto o video usare e come (es. 'carosello di 3 foto: ...')"),
  tag_suggestions: z.array(z.string()).describe("Chi taggare: clienti, partner, fiere, colleghi (nomi, non handle inventati)"),
  structure_tip: z.string().describe("Una frase su come costruire il post (gancio, corpo, invito)"),
  best_time: z.string().describe("Quando pubblicare, in una frase"),
});

const AnalysisSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      worth: z.boolean().describe("true se è un'occasione da raccontare sui social"),
      angle: z.string().describe("Se worth: in una frase, cosa raccontare. Altrimenti stringa vuota"),
      reason: z.string().describe("Perché sì o perché no, in poche parole"),
    })
  ),
});

function companyContext(company) {
  if (!company?.name) return "Azienda: una PMI italiana (dati non ancora compilati).";
  return [
    `Azienda: ${company.name}`,
    company.sector && `Settore: ${company.sector}`,
    company.city && `Città: ${company.city}`,
    company.tone && `Tono di voce desiderato: ${company.tone}`,
    company.about && `Chi siamo: ${company.about}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM = `Sei Raccontalo, l'assistente social di una piccola o media impresa italiana che non ha un ufficio marketing.
Scrivi sempre in italiano, con un tono umano e concreto, mai da agenzia: niente frasi fatte ("siamo orgogliosi di annunciare", "entusiasmanti novità"), niente promesse esagerate, niente dati inventati.
Usa solo i fatti che ti vengono dati. Se manca un dettaglio, scrivi in modo che funzioni lo stesso, senza inventarlo.`;

async function callClaude({ content, schema, maxTokens = 8000 }) {
  const response = await getClient().messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    output_config: { effort: "low", format: zodOutputFormat(schema) },
    system: SYSTEM,
    messages: [{ role: "user", content }],
  });
  if (response.stop_reason === "refusal") throw new Error("Claude ha rifiutato la richiesta");
  if (!response.parsed_output) throw new Error("Risposta AI non leggibile");
  return response.parsed_output;
}

// ---------- 1. quali eventi meritano un post ----------

const BORING = /dentist|medic|commercialist|banca|riunione interna|call interna|1:1|one to one|pranzo|palestra|personale|ferie|privato/i;
const WORTH = /fiera|evento|inaugura|consegna|collaudo|visita|premio|nuov[oa]|lancio|anniversario|corso|workshop|webinar|open day|assunzion|benvenut|cliente|progetto|certificaz|traguardo|ospit/i;

function analyzeEventsDemo(events) {
    return events.map((e) => {
      const txt = `${e.title} ${e.description || ""}`;
      const worth = !BORING.test(txt) && WORTH.test(txt);
      return {
        id: e.id,
        worth,
        angle: worth ? `Raccontare "${e.title}": cosa succede, chi c'è e perché conta per i clienti.` : "",
        reason: worth ? "Evento visibile all'esterno (demo)" : "Sembra un impegno interno o privato (demo)",
      };
    });
}

export async function analyzeEvents(events, company) {
  if (!events.length) return [];
  if (!aiEnabled()) return analyzeEventsDemo(events);
  const list = events
    .map((e) => `- id=${e.id} | ${new Date(e.date).toLocaleString("it-IT")} | ${e.title}${e.location ? ` @ ${e.location}` : ""}${e.description ? ` | ${e.description.slice(0, 300)}` : ""}`)
    .join("\n");
  let out;
  try {
  out = await callClaude({
    schema: AnalysisSchema,
    content: `${companyContext(company)}

Ecco gli appuntamenti in agenda. Per ognuno decidi se è un'occasione da raccontare sui social dell'azienda (fiere, eventi, consegne importanti, visite di clienti, nuovi prodotti, persone nuove, traguardi, formazione...).
Impegni privati, amministrativi o riunioni interne di routine NON vanno raccontati.

${list}`,
  });
  } catch (err) {
    // Se Claude non risponde (chiave sbagliata, credito finito...) la demo continua
    console.error("Claude non disponibile, uso la modalità demo:", err.message);
    return analyzeEventsDemo(events);
  }
  return out.results;
}

// ---------- 2. scrivere i post ----------

function demoPosts({ event, notes, company }) {
  const name = company?.name || "la nostra azienda";
  const fatti = notes?.trim() || event.description || "";
  const quando = new Date(event.date).toLocaleDateString("it-IT", { day: "numeric", month: "long" });
  const tag = (event.title.split(/\s+/)[0] || "pmi").replace(/[^\p{L}\d]/gu, "");
  return {
    linkedin: {
      text: `${event.title}: ${quando}.\n\n${fatti || "Un passo in più nel nostro lavoro di ogni giorno."}\n\nPer ${name} sono momenti come questo a fare la differenza: lavoro concreto, persone vere, clienti che si fidano.\n\nSe vuoi saperne di più, scrivici.`,
      hashtags: [tag.toLowerCase(), "pmi", "madeinitaly"],
    },
    instagram: {
      text: `${event.title} ✨\n\n${fatti ? fatti.split(/[.!?]/)[0] + "." : "Oggi vi portiamo dietro le quinte."}\n\nGuarda le foto 👉`,
      hashtags: [tag.toLowerCase(), "dietrolequinte", "pmi", "madeinitaly", "lavoro"],
    },
    facebook: {
      text: `${event.title} (${quando})\n\n${fatti || "Ve lo raccontiamo con qualche foto."}\n\nGrazie a chi era con noi!`,
      hashtags: [tag.toLowerCase(), "pmi"],
    },
    media_suggestions: ["Carosello di 3 foto: il contesto, le persone al lavoro, il risultato finale.", "Un video verticale di 15 secondi per le storie."],
    tag_suggestions: ["Il cliente o l'organizzatore dell'evento", "I colleghi presenti"],
    structure_tip: "Apri con il fatto, spiega in due righe perché conta, chiudi con un invito a scrivervi.",
    best_time: "Lo stesso giorno o il giorno dopo, tra le 12 e le 14.",
    demo: true,
  };
}

export async function generatePosts({ event, notes, photos = [], company, instruction }) {
  if (!aiEnabled()) return demoPosts({ event, notes, company });

  const content = [];
  for (const p of photos.slice(0, 6)) {
    content.push({ type: "image", source: { type: "base64", media_type: p.mediaType, data: readPhotoBase64(p.file) } });
  }
  content.push({
    type: "text",
    text: `${companyContext(company)}

Occasione da raccontare: ${event.title}
Data: ${new Date(event.date).toLocaleString("it-IT")}${event.location ? `\nLuogo: ${event.location}` : ""}${event.description ? `\nDall'agenda: ${event.description}` : ""}

Cosa ci ha detto il titolare (trascrizione del vocale o appunti):
"""${notes || "(nessun appunto)"}"""
${photos.length ? `\nIn allegato ${photos.length} foto: usale per capire cosa mostrare e suggerisci quali mettere e in che ordine.` : ""}
${instruction ? `\nRichiesta di modifica del titolare: ${instruction}` : ""}

Scrivi tre versioni diverse dello stesso contenuto:
- LinkedIn: professionale ma umano, 600-1200 caratteri, paragrafi brevi, al massimo 3-5 hashtag.
- Instagram: breve e visivo, prima riga che aggancia, emoji con moderazione, 5-10 hashtag.
- Facebook: colloquiale, vicino alla comunità locale, 300-700 caratteri, 1-3 hashtag.
Poi dai i suggerimenti su foto/video, tag, struttura e orario.`,
  });
  try {
    return await callClaude({ content, schema: PostsSchema, maxTokens: 12000 });
  } catch (err) {
    console.error("Claude non disponibile, uso la modalità demo:", err.message);
    return demoPosts({ event, notes, company });
  }
}
