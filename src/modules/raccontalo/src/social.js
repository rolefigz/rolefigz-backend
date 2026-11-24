// Pubblicazione e risultati su Facebook, Instagram e LinkedIn.
// Ogni social si attiva solo se nel .env ci sono le sue credenziali;
// altrimenti il post si pubblica "a mano" (copia e incolla) e l'app lo registra.
import fs from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "./store.js";

const GRAPH = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || "v23.0"}`;
const LI_VERSION = process.env.LINKEDIN_VERSION || "202510";

export function socialStatus() {
  return {
    facebook: Boolean(process.env.FB_PAGE_ID && process.env.FB_PAGE_TOKEN),
    // Instagram vuole immagini raggiungibili da internet: serve PUBLIC_BASE_URL
    instagram: Boolean(process.env.IG_USER_ID && process.env.FB_PAGE_TOKEN && process.env.PUBLIC_BASE_URL),
    linkedin: Boolean(process.env.LINKEDIN_TOKEN && process.env.LINKEDIN_AUTHOR_URN),
  };
}

const fullText = (v) => `${v.text}${v.hashtags?.length ? "\n\n" + v.hashtags.map((h) => "#" + h.replace(/^#/, "")).join(" ") : ""}`;

async function graph(pathname, params, method = "POST") {
  const body = new URLSearchParams({ ...params, access_token: process.env.FB_PAGE_TOKEN });
  const url = method === "GET" ? `${GRAPH}/${pathname}?${body}` : `${GRAPH}/${pathname}`;
  const res = await fetch(url, method === "GET" ? {} : { method, body });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || `Meta HTTP ${res.status}`);
  return json;
}

async function publishFacebook(variant, photos) {
  const page = process.env.FB_PAGE_ID;
  if (photos.length) {
    // Prima foto con didascalia: post semplice e affidabile
    const form = new FormData();
    const p = photos[0];
    form.append("source", new Blob([fs.readFileSync(path.join(UPLOAD_DIR, p.file))], { type: p.mediaType }), p.file);
    form.append("caption", fullText(variant));
    form.append("access_token", process.env.FB_PAGE_TOKEN);
    const res = await fetch(`${GRAPH}/${page}/photos`, { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error?.message || `Meta HTTP ${res.status}`);
    const id = json.post_id || json.id;
    return { id, url: `https://www.facebook.com/${id}` };
  }
  const json = await graph(`${page}/feed`, { message: fullText(variant) });
  return { id: json.id, url: `https://www.facebook.com/${json.id}` };
}

async function publishInstagram(variant, photos) {
  if (!photos.length) throw new Error("Instagram richiede almeno una foto");
  const ig = process.env.IG_USER_ID;
  const base = process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const caption = fullText(variant);
  let creationId;
  if (photos.length === 1) {
    creationId = (await graph(`${ig}/media`, { image_url: `${base}/uploads/${photos[0].file}`, caption })).id;
  } else {
    const children = [];
    for (const p of photos.slice(0, 10)) {
      children.push((await graph(`${ig}/media`, { image_url: `${base}/uploads/${p.file}`, is_carousel_item: "true" })).id);
    }
    creationId = (await graph(`${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption })).id;
  }
  const pub = await graph(`${ig}/media_publish`, { creation_id: creationId });
  const info = await graph(pub.id, { fields: "permalink" }, "GET").catch(() => ({}));
  return { id: pub.id, url: info.permalink || null };
}

async function publishLinkedin(variant) {
  // Solo testo nell'MVP; le immagini su LinkedIn richiedono un upload a parte.
  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_TOKEN}`,
      "LinkedIn-Version": LI_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      author: process.env.LINKEDIN_AUTHOR_URN,
      commentary: fullText(variant),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!res.ok) throw new Error(`LinkedIn HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const id = res.headers.get("x-restli-id");
  return { id, url: id ? `https://www.linkedin.com/feed/update/${id}` : null };
}

const PUBLISHERS = { facebook: publishFacebook, instagram: publishInstagram, linkedin: publishLinkedin };

/** Pubblica su un social. Se non è collegato, registra la pubblicazione manuale. */
export async function publish(platform, variant, photos) {
  const at = new Date().toISOString();
  if (!socialStatus()[platform]) return { mode: "manuale", at };
  const out = await PUBLISHERS[platform](variant, photos);
  return { mode: "automatica", at, ...out };
}

/** Pochi numeri essenziali per post pubblicati in automatico. */
export async function fetchMetrics(platform, pub) {
  if (!pub?.id || pub.mode !== "automatica") return null;
  if (platform === "facebook") {
    const j = await graph(pub.id, { fields: "reactions.summary(true),comments.summary(true),shares" }, "GET");
    return { reazioni: j.reactions?.summary?.total_count ?? 0, commenti: j.comments?.summary?.total_count ?? 0, condivisioni: j.shares?.count ?? 0 };
  }
  if (platform === "instagram") {
    const j = await graph(pub.id, { fields: "like_count,comments_count" }, "GET");
    return { like: j.like_count ?? 0, commenti: j.comments_count ?? 0 };
  }
  return null; // LinkedIn: le statistiche delle pagine richiedono permessi extra
}
