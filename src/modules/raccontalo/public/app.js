const $ = (s, el = document) => el.querySelector(s);
const PLAT = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" };
const COLORS = { linkedin: "var(--li)", instagram: "var(--ig)", facebook: "var(--fb)" };
let state = { events: [], posts: [], config: { social: {} } };
const activeTab = {}; // postId -> platform

// ---------- utilità ----------
async function api(url, body, method) {
  const res = await fetch(url, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Errore ${res.status}`);
  return json;
}
function toast(msg, ms = 3200) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.hidden = true), ms);
}
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (iso) => new Date(iso).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
async function busy(btn, label, fn) {
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>${label}`;
  try { return await fn(); } catch (e) { toast(e.message, 5000); } finally { btn.disabled = false; btn.innerHTML = old; }
}
const fullText = (v) => `${v.text}${v.hashtags?.length ? "\n\n" + v.hashtags.map((h) => "#" + h.replace(/^#/, "")).join(" ") : ""}`;

// ---------- render ----------
async function load() {
  state = await api("api/state");
  render();
}

function render() {
  const { events, posts, config, company } = state;
  $("#company-line").textContent = company?.name ? `${company.name} · ${company.city || ""}` : "L'assistente che racconta la tua azienda";

  $("#chips").innerHTML =
    `<span class="chip ${config.ai ? "on" : ""}"><i></i>${config.ai ? "AI attiva" : "AI in demo"}</span>` +
    Object.keys(PLAT).map((p) => `<span class="chip ${config.social[p] ? "on" : ""}"><i></i>${PLAT[p]}</span>`).join("");

  const occ = events.filter((e) => e.status === "occasione" || e.status === "new");
  const disc = events.filter((e) => e.status === "scartato");
  const drafts = posts.filter((p) => p.status === "da_approvare");
  const pubs = posts.filter((p) => p.status === "pubblicato");

  $("#n-occ").textContent = occ.length || "";
  $("#n-disc").textContent = disc.length ? `(${disc.length})` : "";
  $("#n-draft").textContent = drafts.length || "";
  $("#n-pub").textContent = pubs.length || "";

  $("#col-occ").innerHTML = occ.length ? occ.map(eventCard).join("") : `<div class="empty">Nessuna occasione. Collega l'agenda o premi “Cerca occasioni”.</div>`;
  $("#col-disc").innerHTML = disc.map(discCard).join("");
  $("#col-draft").innerHTML = drafts.length ? drafts.map(draftCard).join("") : `<div class="empty">Scegli un'occasione e lascia un vocale: i post arrivano qui.</div>`;
  $("#col-pub").innerHTML = pubs.length ? pubs.map(pubCard).join("") : `<div class="empty">Ancora niente di pubblicato.</div>`;

  // Promemoria: occasioni tra ieri e i prossimi 2 giorni
  const now = Date.now();
  const soon = events.filter((e) => e.status === "occasione" && Date.parse(e.date) > now - 1.5 * 864e5 && Date.parse(e.date) < now + 2.5 * 864e5);
  const box = $("#reminders");
  box.hidden = !soon.length;
  box.innerHTML = soon
    .map((e) => {
      const past = Date.parse(e.date) < now;
      return `<div class="reminder"><span class="r-label">${past ? "Appena successo" : "In arrivo"}</span><span class="r-text"><b>${esc(e.title)}</b><span class="r-when">${fmt(e.date)} · ${past ? "lo raccontiamo?" : "ricordati qualche foto"}</span></span>
        <button class="small" data-collect="${e.id}">Raccontalo</button></div>`;
    })
    .join("");
}

function eventCard(e) {
  const pending = e.status === "new";
  return `<article class="card">
    <h4>${esc(e.title)}</h4>
    <div class="when">${fmt(e.date)}${e.location ? " · " + esc(e.location) : ""} · <span class="tag">${esc(e.source)}</span></div>
    ${e.angle ? `<p class="angle">${esc(e.angle)}</p>` : pending ? `<p class="angle muted">Da analizzare: premi “Cerca occasioni”.</p>` : ""}
    <div class="row">
      <button class="small" data-collect="${e.id}">Raccontalo</button>
      <button class="small ghost" data-status="${e.id}" data-to="scartato">Non ora</button>
    </div>
  </article>`;
}

function discCard(e) {
  return `<article class="card">
    <h4>${esc(e.title)}</h4>
    <div class="when">${fmt(e.date)}${e.reason ? " · " + esc(e.reason) : ""}</div>
    <div class="row" style="margin-top:.5rem"><button class="small ghost" data-status="${e.id}" data-to="occasione">Raccontalo comunque</button></div>
  </article>`;
}

function thumbs(p) {
  return p.photos?.length ? `<div class="thumbs">${p.photos.map((f) => `<img src="uploads/${f.file}" alt="">`).join("")}</div>` : "";
}

function draftCard(p) {
  const tab = activeTab[p.id] || "linkedin";
  const v = p.variants[tab];
  const t = p.tips || {};
  return `<article class="card" data-post="${p.id}">
    <h4>${esc(p.title)}</h4>
    <div class="when">${fmt(p.date)} ${p.demo ? `<span class="tag demo">testo demo</span>` : ""}</div>
    ${thumbs(p)}
    <div class="tabs">${Object.keys(PLAT).map((k) => `<button class="tab ${k === tab ? "active" : ""}" data-tab="${k}" data-p="${k}">${PLAT[k]}</button>`).join("")}</div>
    <div class="variant">
      <textarea data-field="text">${esc(v.text)}</textarea>
      <input data-field="hashtags" value="${esc((v.hashtags || []).map((h) => "#" + h.replace(/^#/, "")).join(" "))}" placeholder="#hashtag" style="margin-top:.4rem">
      <div class="meta-line"><span>${v.text.length} caratteri</span><button class="link small" data-copy>Copia testo</button></div>
    </div>
    <details class="tips"><summary>Consigli dell'assistente</summary>
      ${t.media?.length ? `<b>Foto e video</b><ul>${t.media.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${t.tags?.length ? `<b>Chi taggare</b><ul>${t.tags.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${t.structure ? `<b>Struttura:</b> ${esc(t.structure)}<br>` : ""}
      ${t.time ? `<b>Quando:</b> ${esc(t.time)}` : ""}
    </details>
    <div class="row">
      <input data-instruction placeholder="Es. più corto, cita il cliente, meno emoji…" style="flex:1;min-width:160px">
      <button class="small ghost" data-regen>Riscrivi</button>
    </div>
    <div class="publish-row">
      ${Object.keys(PLAT).map((k) => `<label><input type="checkbox" data-plat="${k}" checked> ${PLAT[k]}</label>`).join("")}
      <button class="small" data-publish style="margin-left:auto">Approva e pubblica</button>
      <button class="small ghost" data-delete title="Scarta">Scarta</button>
    </div>
  </article>`;
}

function pubCard(p) {
  const rows = Object.entries(p.published)
    .map(([k, pub]) => {
      const m = p.metrics?.[k];
      const numbers = m && !m.errore ? Object.entries(m).filter(([x]) => x !== "at").map(([x, n]) => `${n} ${x}`).join(" · ") : m?.errore ? `⚠️ ${esc(m.errore)}` : pub.mode === "manuale" ? "pubblicato a mano" : "";
      return `<div class="pub"><span class="dot" style="background:${COLORS[k]}"></span><b>${PLAT[k]}</b>
        ${pub.url ? `<a href="${esc(pub.url)}" target="_blank" rel="noopener">apri</a>` : ""}<span class="muted">${numbers}</span></div>`;
    })
    .join("");
  const auto = Object.values(p.published).some((x) => x.mode === "automatica");
  return `<article class="card" data-post="${p.id}">
    <h4>${esc(p.title)}</h4>
    <div class="when">Pubblicato ${fmt(Object.values(p.published)[0]?.at || p.createdAt)}</div>
    ${thumbs(p)}
    <div class="pubs">${rows}</div>
    ${auto ? `<div class="row" style="margin-top:.6rem"><button class="small ghost" data-metrics>Aggiorna risultati</button></div>` : ""}
  </article>`;
}

// ---------- azioni sulle card ----------
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  const card = b.closest("[data-post]");
  const postId = card?.dataset.post;

  if (b.dataset.open) return $("#" + b.dataset.open).showModal(), b.dataset.open === "dlg-company" && fillCompany();
  if (b.dataset.collect) return openCollect(b.dataset.collect);
  if (b.dataset.status) {
    await api(`api/events/${b.dataset.status}/status`, { status: b.dataset.to });
    return load();
  }
  if (b.dataset.tab) {
    await saveDraft(card);
    activeTab[postId] = b.dataset.tab;
    return render();
  }
  if ("copy" in b.dataset) {
    const tab = activeTab[postId] || "linkedin";
    await saveDraft(card);
    const p = state.posts.find((x) => x.id === postId);
    await navigator.clipboard.writeText(fullText(p.variants[tab]));
    return toast(`Testo ${PLAT[tab]} copiato`);
  }
  if ("regen" in b.dataset) {
    const instruction = $("[data-instruction]", card).value;
    return busy(b, "Riscrivo…", async () => {
      await api(`api/posts/${postId}/regenerate`, { instruction });
      await load();
      toast("Post riscritti");
    });
  }
  if ("publish" in b.dataset) {
    await saveDraft(card);
    const platforms = [...card.querySelectorAll("[data-plat]:checked")].map((x) => x.dataset.plat);
    if (!platforms.length) return toast("Scegli almeno un social");
    return busy(b, "Pubblico…", async () => {
      const { errors } = await api(`api/posts/${postId}/publish`, { platforms });
      await load();
      const manual = platforms.filter((k) => !state.config.social[k] && !errors[k]);
      const errs = Object.entries(errors).map(([k, e]) => `${PLAT[k]}: ${e}`);
      toast(errs.length ? `Problemi → ${errs.join(" · ")}` : manual.length ? `Fatto. ${manual.map((k) => PLAT[k]).join(", ")}: incolla il testo copiato sul social.` : "Pubblicato!", 6000);
    });
  }
  if ("delete" in b.dataset) {
    if (!confirm("Scartare questi post?")) return;
    await api(`api/posts/${postId}`, null, "DELETE");
    return load();
  }
  if ("metrics" in b.dataset) return busy(b, "Aggiorno…", async () => { await api(`api/posts/${postId}/metrics`, {}); await load(); });
});

async function saveDraft(card) {
  if (!card || !$("[data-field=text]", card)) return;
  const id = card.dataset.post;
  const tab = activeTab[id] || "linkedin";
  const text = $("[data-field=text]", card).value;
  const hashtags = $("[data-field=hashtags]", card).value.split(/[\s,]+/).map((h) => h.replace(/^#/, "")).filter(Boolean);
  const p = state.posts.find((x) => x.id === id);
  p.variants[tab] = { ...p.variants[tab], text, hashtags };
  await api(`api/posts/${id}`, { variants: { [tab]: { text, hashtags } } }, "PUT");
}

// ---------- toolbar ----------
$("#btn-analyze").onclick = (e) =>
  busy(e.currentTarget, "Leggo l'agenda…", async () => {
    const r = await api("api/events/analyze", {});
    await load();
    toast(r.analyzed ? `Analizzati ${r.analyzed} appuntamenti` : "Niente di nuovo in agenda");
  });

$("#btn-reset").onclick = async () => {
  if (!confirm("Ricaricare i dati demo? Si perde quello che c'è ora.")) return;
  await api("api/demo/reset", {});
  await load();
};

$("#btn-import").onclick = (e) =>
  busy(e.currentTarget, "Importo…", async () => {
    const url = $("#import-url").value.trim();
    const file = $("#import-file").files[0];
    if (!url && !file) throw new Error("Incolla un link o scegli un file");
    const r = await api("api/events/import", url ? { url } : { ics: await file.text() });
    $("#dlg-import").close();
    await api("api/events/analyze", {});
    await load();
    toast(`${r.found} eventi nel calendario, ${r.added} aggiunti (ultimi 7 giorni e prossimi 30)`);
  });

$("#btn-add-event").onclick = async () => {
  const title = $("#ev-title").value.trim();
  const date = $("#ev-date").value;
  if (!title || !date) return toast("Servono cosa e quando");
  await api("api/events", { title, date, description: $("#ev-desc").value });
  $("#dlg-event").close();
  $("#ev-title").value = $("#ev-desc").value = "";
  await api("api/events/analyze", {});
  await load();
};

function fillCompany() {
  const c = state.company || {};
  for (const k of ["name", "sector", "city", "tone", "about"]) $("#co-" + k).value = c[k] || "";
}
$("#btn-save-company").onclick = async () => {
  const body = {};
  for (const k of ["name", "sector", "city", "tone", "about"]) body[k] = $("#co-" + k).value;
  await api("api/company", body, "PUT");
  $("#dlg-company").close();
  await load();
  toast("Profilo salvato");
};

// ---------- raccolta: vocale + foto ----------
let collectEvent = null;
let photos = [];

function openCollect(id) {
  collectEvent = state.events.find((e) => e.id === id);
  photos = [];
  $("#collect-title").textContent = collectEvent.title;
  $("#collect-angle").textContent = collectEvent.angle || fmt(collectEvent.date);
  $("#collect-notes").value = collectEvent.description || "";
  $("#collect-photos").value = "";
  $("#collect-thumbs").innerHTML = "";
  $("#dlg-collect").showModal();
}

async function resize(file, max = 1280) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = Object.assign(document.createElement("canvas"), { width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

$("#collect-photos").onchange = async (e) => {
  photos = [];
  for (const f of [...e.target.files].slice(0, 6)) photos.push(await resize(f));
  $("#collect-thumbs").innerHTML = photos.map((src) => `<img src="${src}" alt="">`).join("");
};

$("#btn-generate").onclick = (e) =>
  busy(e.currentTarget, "Scrivo i post…", async () => {
    const post = await api("api/posts", { eventId: collectEvent.id, notes: $("#collect-notes").value, photos });
    $("#dlg-collect").close();
    activeTab[post.id] = "linkedin";
    await load();
    toast("Post pronti in “Da approvare”");
  });

// Dettatura con il riconoscimento vocale del browser (Chrome/Edge)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = $("#btn-mic");
if (!SR) {
  mic.disabled = true;
  mic.textContent = "Dettatura non disponibile in questo browser";
} else {
  let rec = null;
  mic.textContent = "Registra";
  mic.onclick = () => {
    if (rec) return rec.stop();
    rec = new SR();
    rec.lang = "it-IT";
    rec.continuous = true;
    rec.interimResults = true;
    const base = $("#collect-notes").value;
    rec.onresult = (ev) => {
      const said = [...ev.results].map((r) => r[0].transcript).join(" ");
      $("#collect-notes").value = (base ? base + " " : "") + said;
    };
    rec.onend = () => { rec = null; mic.classList.remove("rec"); mic.textContent = "Registra"; $("#mic-status").textContent = ""; };
    rec.onerror = (ev) => { $("#mic-status").textContent = "Microfono: " + ev.error; };
    rec.start();
    mic.classList.add("rec");
    mic.textContent = "Ferma";
    $("#mic-status").textContent = "Ti ascolto…";
  };
}

load().catch((e) => toast(e.message, 6000));
