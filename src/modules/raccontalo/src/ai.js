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
  image_idea: z.object({
    layout: z.enum(["foto", "testo", "citazione"]).describe("foto = foto con fascia del brand; testo = grafica con solo testo sui colori del brand; citazione = frase di una persona"),
    headline: z.string().describe("Titolo dell'immagine, massimo 6 parole, nessun hashtag"),
    subline: z.string().describe("Riga sotto il titolo, massimo 10 parole (può essere vuota)"),
    concept: z.string().describe("In una frase: che immagine fare e perché funziona"),
  }),
});

const IdeasSchema = z.object({
  ideas: z.array(
    z.object({
      title: z.string().describe("Titolo breve dell'idea di post"),
      angle: z.string().describe("In una frase: cosa raccontare e perché interessa a clienti o candidati"),
      ask: z.string().describe("Cosa chiedere al titolare per scriverlo (es. 'due foto del reparto e un aneddoto')"),
    })
  ),
});

const RepliesSchema = z.object({
  replies: z.array(
    z.object({
      tone: z.string().describe("Tono in 1-2 parole (es. 'cordiale', 'esperto', 'breve')"),
      text: z.string().describe("Testo del commento, pronto da incollare"),
    })
  ),
});

const CommentRepliesSchema = z.object({
  replies: z.array(z.object({ id: z.string(), reply: z.string().describe("Risposta al commento, breve e umana") })),
});

const StrategySchema = z.object({
  summary: z.string().describe("La strategia in 2-3 frasi semplici"),
  pillars: z.array(
    z.object({
      name: z.string().describe("Nome breve del filone di contenuti"),
      description: z.string().describe("Cosa ci va dentro, in una frase"),
      share: z.number().describe("Percentuale dei post dedicata a questo filone"),
    })
  ),
  cadence: z.string().describe("Quanti post e dove, in una frase"),
  plan: z.array(
    z.object({
      date: z.string().describe("Data proposta YYYY-MM-DD"),
      title: z.string(),
      angle: z.string().describe("Cosa raccontare, in una frase"),
      pillar: z.string().describe("Nome del filone"),
      platform: z.string().describe("Social principale: LinkedIn, Instagram o Facebook"),
    })
  ),
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

function strategyContext(strategy) {
  if (!strategy?.pillars?.length) return "";
  return `\nStrategia editoriale: ${strategy.summary}\nFiloni: ${strategy.pillars.map((p) => p.name).join(", ")}`;
}

function companyContext(company) {
  if (!company?.name) return "Azienda: una PMI italiana (dati non ancora compilati).";
  return [
    `Azienda: ${company.name}`,
    company.sector && `Settore: ${company.sector}`,
    company.city && `Città: ${company.city}`,
    company.tone && `Tono di voce desiderato: ${company.tone}`,
    company.about && `Chi siamo: ${company.about}`,
    company.brand?.values && `Valori e parole chiave del brand: ${company.brand.values}`,
    company.brand?.avoid && `Da evitare: ${company.brand.avoid}`,
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
    image_idea: {
      layout: "foto",
      headline: event.title.split(/[–:]/)[0].trim().split(/\s+/).slice(0, 6).join(" "),
      subline: quando.charAt(0).toUpperCase() + quando.slice(1),
      concept: "La foto più viva come sfondo, con la fascia nei colori del brand e il logo: si riconosce subito chi parla.",
    },
    demo: true,
  };
}

export async function generatePosts({ event, notes, photos = [], company, strategy, instruction }) {
  if (!aiEnabled()) return demoPosts({ event, notes, company });

  const content = [];
  for (const p of photos.slice(0, 6)) {
    content.push({ type: "image", source: { type: "base64", media_type: p.mediaType, data: readPhotoBase64(p.file) } });
  }
  content.push({
    type: "text",
    text: `${companyContext(company)}${strategyContext(strategy)}

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
Poi dai i suggerimenti su foto/video, tag, struttura e orario.
Infine proponi l'idea per l'immagine del post (verrà composta con logo e colori del brand): scegli "foto" se ci sono foto adatte, altrimenti "testo" o "citazione".`,
  });
  try {
    return await callClaude({ content, schema: PostsSchema, maxTokens: 12000 });
  } catch (err) {
    console.error("Claude non disponibile, uso la modalità demo:", err.message);
    return demoPosts({ event, notes, company });
  }
}

// ---------- 3. post su un tema proposto dal titolare ----------

function demoIdeas(theme) {
  const t = theme.trim().replace(/\.$/, "");
  const low = t.charAt(0).toLowerCase() + t.slice(1);
  return [
    { title: `${t}: come lo facciamo noi`, angle: `Mostrare il nostro modo di affrontare "${low}", con un esempio concreto dal lavoro di tutti i giorni.`, ask: "Due foto e un esempio reale" },
    { title: `3 domande che i clienti ci fanno su ${low}`, angle: "Rispondere alle domande più frequenti: utile per chi legge e mostra competenza.", ask: "Le 3 domande che vi fanno più spesso" },
    { title: `Chi se ne occupa da noi`, angle: `Dare un volto alla persona che segue "${low}" in azienda.`, ask: "Una foto della persona e due righe su di lei" },
  ];
}

export async function ideasFromTheme({ theme, company, strategy, count = 3 }) {
  if (!theme?.trim()) throw new Error("Scrivi un tema");
  if (!aiEnabled()) return demoIdeas(theme).slice(0, count);
  try {
    const out = await callClaude({
      schema: IdeasSchema,
      content: `${companyContext(company)}${strategyContext(strategy)}

Il titolare vuole pubblicare qualcosa su questo tema: "${theme}".
Proponi ${count} idee di post diverse tra loro (punti di vista diversi), concrete e fattibili per questa azienda, senza inventare fatti: dove serve un dettaglio, indicalo in "ask".`,
    });
    return out.ideas.slice(0, count);
  } catch (err) {
    console.error("Claude non disponibile, uso la modalità demo:", err.message);
    return demoIdeas(theme).slice(0, count);
  }
}

// ---------- 4. commenti: profili influenti e commenti ricevuti ----------

function demoReplies(kind) {
  if (kind === "risposta") {
    return [
      { tone: "cordiale", text: "Grazie davvero! Ci fa piacere che ti sia piaciuto. Se passi da queste parti, la porta è aperta." },
      { tone: "breve", text: "Grazie mille! 🙌" },
      { tone: "esperto", text: "Grazie! Su questo abbiamo parecchia esperienza: se vuoi ti raccontiamo come lavoriamo, scrivici pure." },
    ];
  }
  return [
    { tone: "esperto", text: "Spunto molto utile. Nella nostra esperienza vale lo stesso: la differenza la fa la cura dei dettagli, prima ancora della macchina." },
    { tone: "cordiale", text: "Grazie per averlo condiviso: ci ritroviamo parecchio in quello che scrivi, soprattutto sul rapporto con i clienti." },
    { tone: "domanda", text: "Interessante! Secondo te vale anche per le aziende più piccole, sotto i 20 dipendenti?" },
  ];
}

export async function suggestReplies({ text, kind = "commento", platform, author, company }) {
  if (!text?.trim()) throw new Error("Incolla il testo del post o del commento");
  if (!aiEnabled()) return demoReplies(kind);
  const task =
    kind === "risposta"
      ? `Qualcuno ha commentato un post dell'azienda${author ? ` (${author})` : ""}. Proponi 3 risposte dell'azienda, diverse per tono.`
      : `Questo è un post di un profilo influente${author ? ` (${author})` : ""} che l'azienda segue. Proponi 3 commenti che l'azienda potrebbe lasciare per farsi notare in modo utile e non promozionale: un punto di vista, un'esperienza o una domanda. Niente complimenti vuoti, niente autopromozione.`;
  try {
    const out = await callClaude({
      schema: RepliesSchema,
      content: `${companyContext(company)}

${task}${platform ? `\nSocial: ${platform}` : ""}

Testo:
"""${text.slice(0, 4000)}"""`,
    });
    return out.replies.slice(0, 3);
  } catch (err) {
    console.error("Claude non disponibile, uso la modalità demo:", err.message);
    return demoReplies(kind);
  }
}

export async function replyToComments({ comments, post, company }) {
  if (!comments.length) return [];
  const demo = () => comments.map((c) => ({ id: c.id, reply: `Grazie${c.author ? " " + c.author.split(" ")[0] : ""}! Ci fa piacere 🙂` }));
  if (!aiEnabled()) return demo();
  try {
    const out = await callClaude({
      schema: CommentRepliesSchema,
      content: `${companyContext(company)}

Post dell'azienda: "${post.title}".
Per ogni commento proponi una risposta dell'azienda, breve, umana e diversa dalle altre. Se è una domanda, rispondi o invita a scrivere in privato.

${comments.map((c) => `- id=${c.id} | ${c.author || "utente"}: ${c.text}`).join("\n")}`,
    });
    return out.replies;
  } catch (err) {
    console.error("Claude non disponibile, uso la modalità demo:", err.message);
    return demo();
  }
}

// ---------- 5. fase 2: strategia editoriale ----------

/** Date di pubblicazione nelle prossime settimane: martedì, giovedì, poi venerdì, lunedì, mercoledì. */
export function planDates(weeks, perWeek) {
  const days = [2, 4, 5, 1, 3].slice(0, Math.max(1, Math.min(5, perWeek))).sort();
  const out = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() + ((8 - start.getDay()) % 7 || 7)); // lunedì prossimo
  for (let w = 0; w < weeks; w++) {
    for (const d of days) {
      const x = new Date(start);
      x.setDate(start.getDate() + w * 7 + (d - 1));
      out.push(x.toISOString().slice(0, 10));
    }
  }
  return out;
}

function demoStrategy({ goals, weeks, perWeek, company }) {
  const pillars = [
    { name: "Lavori consegnati", description: "Progetti finiti, collaudi, consegne: la prova che lavoriamo bene.", share: 40 },
    { name: "Le persone", description: "Chi lavora da noi, nuovi arrivi, competenze: per clienti e candidati.", share: 30 },
    { name: "Dietro le quinte", description: "Macchine, processi, piccoli trucchi del mestiere.", share: 20 },
    { name: "Eventi e territorio", description: "Fiere, visite, scuole e associazioni locali.", share: 10 },
  ];
  const ideas = [
    ["Il pezzo più difficile del mese", "Lavori consegnati", "LinkedIn"],
    ["Una giornata con il capo reparto", "Le persone", "Instagram"],
    ["Come controlliamo un pezzo prima della consegna", "Dietro le quinte", "LinkedIn"],
    ["Grazie a chi è passato in fiera", "Eventi e territorio", "Facebook"],
    ["Prima e dopo: dal grezzo al finito", "Lavori consegnati", "Instagram"],
    ["Com'è lavorare qui: cerchiamo un operatore CNC", "Le persone", "LinkedIn"],
  ];
  return {
    summary: `Raccontare con costanza il lavoro concreto di ${company?.name || "azienda"}${goals ? ` per ${goals.charAt(0).toLowerCase() + goals.slice(1)}` : ""}: pochi post, sempre veri, con foto fatte in reparto.`,
    pillars,
    cadence: `${perWeek} post a settimana: LinkedIn come canale principale, Instagram per le foto, Facebook per il territorio.`,
    plan: planDates(weeks, perWeek).map((date, i) => {
      const [title, pillar, platform] = ideas[i % ideas.length];
      return { date, title, angle: `Filone "${pillar}": un esempio reale, raccontato in modo semplice.`, pillar, platform };
    }),
    demo: true,
  };
}

export async function buildStrategy({ goals, audience, perWeek = 2, weeks = 4, company, events = [] }) {
  perWeek = Math.max(1, Math.min(5, Number(perWeek) || 2));
  weeks = Math.max(1, Math.min(8, Number(weeks) || 4));
  if (!aiEnabled()) return demoStrategy({ goals, weeks, perWeek, company });
  const agenda = events
    .filter((e) => Date.parse(e.date) > Date.now())
    .slice(0, 20)
    .map((e) => `- ${e.date.slice(0, 10)} ${e.title}`)
    .join("\n");
  try {
    return await callClaude({
      schema: StrategySchema,
      maxTokens: 12000,
      content: `${companyContext(company)}

Prepara una strategia editoriale semplice per i social di questa PMI, che non ha un ufficio marketing.
Obiettivi: ${goals || "farsi conoscere da clienti e candidati"}
Pubblico: ${audience || "clienti B2B e persone del territorio"}
Ritmo sostenibile: ${perWeek} post a settimana, per ${weeks} settimane. Usa esattamente queste date: ${planDates(weeks, perWeek).join(", ")}.
Proponi 3-5 filoni (pillars) con le percentuali, il ritmo e un piano di ${weeks * perWeek} post con data, filone e social principale.
Le idee devono essere fattibili con le foto del telefono e un vocale; non inventare fatti specifici (clienti, numeri).
${agenda ? `\nGià in agenda (usali come occasioni quando c'entrano):\n${agenda}` : ""}`,
    });
  } catch (err) {
    console.error("Claude non disponibile, uso la modalità demo:", err.message);
    return demoStrategy({ goals, weeks, perWeek, company });
  }
}
