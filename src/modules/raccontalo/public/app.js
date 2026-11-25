const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const PLAT = { linkedin: "LinkedIn", instagram: "Instagram", facebook: "Facebook" };
const COLORS = { linkedin: "var(--li)", instagram: "var(--ig)", facebook: "var(--fb)" };
const DEFAULT_BRAND = ["#111111", "#ff4f1a", "#ffffff"];
let state = { events: [], posts: [], watch: [], strategy: null, config: { social: {} } };
const activeTab = {}; // postId -> platform
let view = "board";

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
const localInput = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const brandColors = () => { const c = state.company?.brand?.colors; return c?.length === 3 ? c : DEFAULT_BRAND; };

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
    Object.keys(PLAT).map((p) => `<span class="chip ${config.social[p] ? "on" : ""}"><i></i>${PLAT[p]}</span>`).join("") +
    `<span class="chip ${config.devices ? "on" : ""}"><i></i>${config.devices ? `Notifiche (${config.devices})` : "Notifiche"}</span>`;

  const open = events.filter((e) => e.status === "occasione" || e.status === "new");
  // In bacheca solo le prossime 2 settimane; il resto del piano sta nel calendario
  const horizon = Date.now() + 14 * 864e5;
  const occ = open.filter((e) => Date.parse(e.date) <= horizon);
  const later = open.length - occ.length;
  const disc = events.filter((e) => e.status === "scartato");
  const drafts = posts.filter((p) => p.status === "da_approvare");
  const sched = posts.filter((p) => p.status === "programmato").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const pubs = posts.filter((p) => p.status === "pubblicato");

  $("#n-occ").textContent = occ.length || "";
  $("#n-disc").textContent = disc.length ? `(${disc.length})` : "";
  $("#n-draft").textContent = drafts.length || "";
  $("#n-pub").textContent = pubs.length + sched.length || "";

  $("#col-occ").innerHTML =
    (occ.length ? occ.map(eventCard).join("") : `<div class="empty">Nessuna occasione. Collega l'agenda, proponi un tema o premi “Cerca occasioni”.</div>`) +
    (later ? `<button class="link small later" data-goto="cal">+ ${later} più avanti: vedi il calendario</button>` : "");
  $("#col-disc").innerHTML = disc.map(discCard).join("");
  $("#col-draft").innerHTML = drafts.length ? drafts.map(draftCard).join("") : `<div class="empty">Scegli un'occasione e lascia un vocale: i post arrivano qui.</div>`;
  $("#sched-wrap").hidden = !sched.length;
  $("#col-sched").innerHTML = sched.map(schedCard).join("");
  $("#col-pub").innerHTML = pubs.length ? pubs.map(pubCard).join("") : `<div class="empty">Ancora niente di pubblicato.</div>`;

  // Promemoria: occasioni tra ieri e i prossimi 2 giorni
  const now = Date.now();
  const soon = events.filter((e) => e.status === "occasione" && e.source !== "tema" && e.source !== "strategia" && Date.parse(e.date) > now - 1.5 * 864e5 && Date.parse(e.date) < now + 2.5 * 864e5);
  const box = $("#reminders");
  box.hidden = !soon.length;
  box.innerHTML = soon
    .map((e) => {
      const past = Date.parse(e.date) < now;
      return `<div class="reminder"><span class="r-label">${past ? "Appena successo" : "In arrivo"}</span><span class="r-text"><b>${esc(e.title)}</b><span class="r-when">${fmt(e.date)} · ${past ? "lo raccontiamo?" : "ricordati qualche foto"}</span></span>
        <button class="small" data-collect="${e.id}">Raccontalo</button></div>`;
    })
    .join("");

  renderCalendar();
  renderListen();
  renderStrategy();
}

const SOURCE = { tema: "dal tema", strategia: "dalla strategia" };

function eventCard(e) {
  const pending = e.status === "new";
  return `<article class="card">
    <h4>${esc(e.title)}</h4>
    <div class="when">${fmt(e.date)}${e.location ? " · " + esc(e.location) : ""} · <span class="tag ${SOURCE[e.source] ? "src" : ""}">${esc(SOURCE[e.source] || e.source)}</span></div>
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
  return p.photos?.length ? `<div class="thumbs">${p.photos.map((f) => `<img src="uploads/${f.file}" alt="" class="${f.generated ? "gen" : ""}">`).join("")}</div>` : "";
}

function draftCard(p) {
  const tab = activeTab[p.id] || "linkedin";
  const v = p.variants[tab];
  const t = p.tips || {};
  const hasGen = p.photos?.some((f) => f.generated);
  return `<article class="card" data-post="${p.id}">
    <h4>${esc(p.title)}</h4>
    <div class="when">${fmt(p.date)} ${p.demo ? `<span class="tag demo">testo demo</span>` : ""}</div>
    ${thumbs(p)}
    <div class="img-cta">
      <button class="small ghost" data-image>${hasGen ? "Modifica immagine" : "Crea immagine"}</button>
      ${p.image?.concept ? `<span class="muted">${esc(p.image.concept)}</span>` : ""}
    </div>
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
    </div>
    <div class="schedule-row">
      <span class="muted">oppure programma per</span>
      <input type="datetime-local" data-when value="${localInput(defaultSlot())}">
      <button class="small ghost" data-schedule>Programma</button>
      <button class="small ghost" data-delete title="Scarta" style="margin-left:auto">Scarta</button>
    </div>
  </article>`;
}

/** Prossimo slot sensato: domani alle 12:30. */
function defaultSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 30, 0, 0);
  return d;
}

function schedCard(p) {
  return `<article class="card sched" data-post="${p.id}">
    <h4>${esc(p.title)}</h4>
    <div class="when">Esce ${fmt(p.scheduledAt)}</div>
    ${thumbs(p)}
    <div class="plats">${(p.scheduledPlatforms || []).map((k) => `<span><i class="dot" style="background:${COLORS[k]}"></i>${PLAT[k]}</span>`).join("")}</div>
    <div class="row" style="margin-top:.6rem">
      <button class="small" data-publish-now>Pubblica ora</button>
      <button class="small ghost" data-unschedule>Annulla programmazione</button>
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
  const comments = p.comments?.length
    ? `<div class="comments">${p.comments.map((c) => `<div class="cmt"><div><b>${esc(c.author || "utente")}</b> <span class="muted">${esc(c.text)}</span></div>
        ${c.suggestion ? `<div class="sugg">↳ ${esc(c.suggestion)} <button class="link small" data-copy-text="${esc(c.suggestion)}">Copia</button></div>` : ""}</div>`).join("")}</div>`
    : "";
  return `<article class="card" data-post="${p.id}">
    <h4>${esc(p.title)}</h4>
    <div class="when">Pubblicato ${fmt(Object.values(p.published)[0]?.at || p.createdAt)}</div>
    ${thumbs(p)}
    <div class="pubs">${rows}</div>
    ${auto ? `<div class="row" style="margin-top:.6rem"><button class="small ghost" data-metrics>Aggiorna risultati</button><button class="small ghost" data-comments>Commenti e risposte</button></div>` : ""}
    ${comments}
  </article>`;
}

// ---------- viste ----------
function showView(v) {
  view = v;
  for (const b of $$(".view-tab")) b.classList.toggle("active", b.dataset.view === v);
  for (const el of $$(".view")) el.hidden = el.id !== "view-" + v;
  window.scrollTo({ top: 0 });
}

// Calendario mensile: occasioni, post programmati e pubblicati
let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
function renderCalendar() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  $("#cal-title").textContent = calMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7)); // lunedì
  const key = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const items = {};
  const add = (iso, html) => ((items[key(new Date(iso))] ||= []).push(html));
  for (const e of state.events) {
    if (e.status !== "occasione" && e.status !== "new") continue;
    add(e.date, `<button class="ci occ" data-collect="${e.id}" title="${esc(e.title)}">${esc(e.title)}</button>`);
  }
  for (const p of state.posts) {
    if (p.status === "programmato") add(p.scheduledAt, `<button class="ci sched" data-goto="board" title="${esc(p.title)}">${new Date(p.scheduledAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} ${esc(p.title)}</button>`);
    if (p.status === "pubblicato") add(Object.values(p.published)[0]?.at || p.createdAt, `<button class="ci pub" data-goto="board" title="${esc(p.title)}">${esc(p.title)}</button>`);
    if (p.status === "da_approvare") add(p.date, `<button class="ci draft" data-goto="board" title="${esc(p.title)}">✎ ${esc(p.title)}</button>`);
  }
  const today = key(new Date());
  let html = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"].map((d) => `<div class="cal-dow">${d}</div>`).join("");
  const cells = Math.ceil((((first.getDay() + 6) % 7) + new Date(y, m + 1, 0).getDate()) / 7) * 7;
  for (let i = 0; i < cells; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const k = key(d);
    html += `<div class="cal-day ${d.getMonth() !== m ? "out" : ""} ${k === today ? "today" : ""}"><span class="cal-n">${d.getDate()}</span>${(items[k] || []).join("")}</div>`;
  }
  $("#cal-grid").innerHTML = html;
}
$("#cal-prev").onclick = () => { calMonth.setMonth(calMonth.getMonth() - 1); renderCalendar(); };
$("#cal-next").onclick = () => { calMonth.setMonth(calMonth.getMonth() + 1); renderCalendar(); };
$("#cal-today").onclick = () => { calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); renderCalendar(); };

// Ascolto
let replyKind = "commento";
function renderListen() {
  const w = state.watch || [];
  $("#watch-list").innerHTML = w.length
    ? w.map((x) => `<div class="watch"><span class="dot" style="background:${COLORS[x.platform.toLowerCase()] || "var(--muted)"}"></span>
        <div class="w-main"><b>${esc(x.name)}</b><span class="muted">${esc(x.platform)}${x.note ? " · " + esc(x.note) : ""}</span></div>
        ${x.url ? `<a class="small-a" href="${esc(x.url)}" target="_blank" rel="noopener">apri</a>` : ""}
        <button class="small ghost" data-reply-to="${x.id}">Commenta</button>
        <button class="link small" data-unwatch="${x.id}" aria-label="Togli">×</button></div>`).join("")
    : `<div class="empty">Nessun profilo. Aggiungi clienti, fiere o persone del settore.</div>`;
  const sel = $("#reply-author");
  const cur = sel.value;
  sel.innerHTML = `<option value="">— nessuno in particolare —</option>` + w.map((x) => `<option value="${esc(x.name)}|${esc(x.platform)}">${esc(x.name)} (${esc(x.platform)})</option>`).join("");
  sel.value = cur;
}
$("#reply-kind").onclick = (e) => {
  const b = e.target.closest("[data-kind]");
  if (!b) return;
  replyKind = b.dataset.kind;
  for (const x of $$("#reply-kind .seg-b")) x.classList.toggle("active", x === b);
  $("#reply-text").placeholder = replyKind === "risposta" ? "Incolla il commento che avete ricevuto" : "Incolla qui il testo del post";
};
$("#btn-watch-add").onclick = async () => {
  const name = $("#w-name").value.trim();
  if (!name) return toast("Scrivi il nome del profilo");
  await api("api/watch", { name, platform: $("#w-platform").value, url: $("#w-url").value.trim() });
  $("#w-name").value = $("#w-url").value = "";
  await load();
};
$("#btn-replies").onclick = (e) =>
  busy(e.currentTarget, "Penso…", async () => {
    const [author, platform] = ($("#reply-author").value || "|").split("|");
    const { replies } = await api("api/replies", { text: $("#reply-text").value, kind: replyKind, author, platform });
    $("#reply-out").innerHTML = replies.map((r) => `<div class="reply"><span class="tag">${esc(r.tone)}</span><p>${esc(r.text)}</p><button class="link small" data-copy-text="${esc(r.text)}">Copia</button></div>`).join("");
  });

// Strategia
function renderStrategy() {
  const s = state.strategy;
  const out = $("#strategy-out");
  if (!s) {
    out.innerHTML = `<div class="empty tall">Scrivi gli obiettivi e premi “Crea la strategia”: arrivano i filoni, il ritmo e un piano di post da mettere in calendario.</div>`;
    return;
  }
  if (s.goals && !$("#st-goals").value) $("#st-goals").value = s.goals;
  if (s.audience && !$("#st-audience").value) $("#st-audience").value = s.audience;
  const day = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  out.innerHTML = `
    <div class="st-head"><h2>La vostra strategia</h2>${s.demo ? `<span class="tag demo">demo</span>` : ""}</div>
    <p class="st-sum">${esc(s.summary)}</p>
    <p class="muted">${esc(s.cadence)}</p>
    <div class="pillars">${s.pillars.map((p) => `<div class="pillar"><div class="p-top"><b>${esc(p.name)}</b><span class="mono">${Math.round(p.share)}%</span></div>
      <div class="bar"><i style="width:${Math.max(4, Math.min(100, p.share))}%"></i></div><span class="muted">${esc(p.description)}</span></div>`).join("")}</div>
    <div class="sub-h">Piano dei post</div>
    <table class="plan"><tbody>${s.plan.map((it) => `<tr><td class="mono">${esc(day(it.date))}</td><td><b>${esc(it.title)}</b><br><span class="muted">${esc(it.angle)}</span></td><td><span class="tag">${esc(it.pillar)}</span></td><td>${esc(it.platform)}</td></tr>`).join("")}</tbody></table>
    <menu class="end"><button id="btn-apply" ${s.applied ? "class='ghost'" : ""}>${s.applied ? "Già in calendario · aggiungi di nuovo" : "Metti il piano in calendario"}</button></menu>`;
  $("#btn-apply").onclick = (e) =>
    busy(e.currentTarget, "Aggiungo…", async () => {
      const r = await api("api/strategy/apply", {});
      await load();
      toast(r.added ? `${r.added} idee aggiunte alle occasioni e al calendario` : "Erano già tutte in calendario");
    });
}
$("#btn-strategy").onclick = (e) =>
  busy(e.currentTarget, "Preparo la strategia…", async () => {
    await api("api/strategy", { goals: $("#st-goals").value, audience: $("#st-audience").value, perWeek: $("#st-per").value, weeks: $("#st-weeks").value });
    await load();
  });

// ---------- azioni sulle card ----------
document.addEventListener("click", async (ev) => {
  const b = ev.target.closest("button");
  if (!b) return;
  const card = b.closest("[data-post]");
  const postId = card?.dataset.post;

  if (b.dataset.view) return showView(b.dataset.view);
  if (b.dataset.goto) return showView(b.dataset.goto);
  if (b.dataset.open) return $("#" + b.dataset.open).showModal(), b.dataset.open === "dlg-company" && fillCompany();
  if (b.dataset.collect) return openCollect(b.dataset.collect);
  if (b.dataset.copyText) { await navigator.clipboard.writeText(b.dataset.copyText); return toast("Copiato"); }
  if (b.dataset.unwatch) { await api(`api/watch/${b.dataset.unwatch}`, null, "DELETE"); return load(); }
  if (b.dataset.replyTo) {
    const w = state.watch.find((x) => x.id === b.dataset.replyTo);
    $("#reply-author").value = `${w.name}|${w.platform}`;
    $("#reply-kind [data-kind=commento]").click();
    $("#reply-text").focus();
    return;
  }
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
  if ("image" in b.dataset) { await saveDraft(card); return openImage(postId); }
  if ("regen" in b.dataset) {
    const instruction = $("[data-instruction]", card).value;
    return busy(b, "Riscrivo…", async () => {
      await api(`api/posts/${postId}/regenerate`, { instruction });
      await load();
      toast("Post riscritti");
    });
  }
  if ("publish" in b.dataset || "publishNow" in b.dataset) {
    await saveDraft(card);
    const p = state.posts.find((x) => x.id === postId);
    const platforms = "publishNow" in b.dataset ? p.scheduledPlatforms : $$("[data-plat]:checked", card).map((x) => x.dataset.plat);
    if (!platforms?.length) return toast("Scegli almeno un social");
    return busy(b, "Pubblico…", async () => {
      const { errors } = await api(`api/posts/${postId}/publish`, { platforms });
      await load();
      const manual = platforms.filter((k) => !state.config.social[k] && !errors[k]);
      const errs = Object.entries(errors).map(([k, e]) => `${PLAT[k]}: ${e}`);
      toast(errs.length ? `Problemi → ${errs.join(" · ")}` : manual.length ? `Fatto. ${manual.map((k) => PLAT[k]).join(", ")}: incolla il testo copiato sul social.` : "Pubblicato!", 6000);
    });
  }
  if ("schedule" in b.dataset) {
    await saveDraft(card);
    const platforms = $$("[data-plat]:checked", card).map((x) => x.dataset.plat);
    const at = $("[data-when]", card).value;
    if (!at) return toast("Scegli giorno e ora");
    return busy(b, "Programmo…", async () => {
      await api(`api/posts/${postId}/schedule`, { at: new Date(at).toISOString(), platforms });
      await load();
      toast(`Programmato per ${fmt(at)}`);
    });
  }
  if ("unschedule" in b.dataset) { await api(`api/posts/${postId}/schedule`, null, "DELETE"); return load(); }
  if ("delete" in b.dataset) {
    if (!confirm("Scartare questi post?")) return;
    await api(`api/posts/${postId}`, null, "DELETE");
    return load();
  }
  if ("metrics" in b.dataset) return busy(b, "Aggiorno…", async () => { await api(`api/posts/${postId}/metrics`, {}); await load(); });
  if ("comments" in b.dataset) return busy(b, "Leggo i commenti…", async () => {
    const p = await api(`api/posts/${postId}/comments`, {});
    await load();
    toast(p.comments?.length ? `${p.comments.length} commenti, risposte proposte` : "Ancora nessun commento");
  });
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
  $("#st-goals").value = $("#st-audience").value = "";
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

$("#btn-theme").onclick = (e) =>
  busy(e.currentTarget, "Cerco idee…", async () => {
    const theme = $("#th-theme").value.trim();
    if (!theme) throw new Error("Scrivi un tema");
    const date = $("#th-date").value ? new Date(`${$("#th-date").value}T10:00:00`).toISOString() : undefined;
    const r = await api("api/themes", { theme, count: $("#th-count").value, date });
    $("#dlg-theme").close();
    $("#th-theme").value = "";
    showView("board");
    await load();
    toast(`${r.added} idee aggiunte alle occasioni`);
  });

// ---------- profilo e brand ----------
let logoData; // undefined = invariato, null = togli, stringa = nuovo
function fillCompany() {
  const c = state.company || {};
  for (const k of ["name", "sector", "city", "tone", "about"]) $("#co-" + k).value = c[k] || "";
  const b = c.brand || {};
  brandColors().forEach((col, i) => ($("#co-c" + i).value = col));
  $("#co-values").value = b.values || "";
  $("#co-avoid").value = b.avoid || "";
  logoData = undefined;
  $("#co-logo").value = "";
  showLogo(b.logo ? `uploads/${b.logo}` : null);
  showHex();
}
function showLogo(src) {
  $("#co-logo-prev").innerHTML = src ? `<img src="${src}" alt="Logo">` : `<span class="muted">nessun logo</span>`;
}
const showHex = () => ($("#co-c-hex").textContent = [0, 1, 2].map((i) => $("#co-c" + i).value).join("  "));
for (const i of [0, 1, 2]) $("#co-c" + i).oninput = showHex;
$("#co-logo").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  logoData = await resize(f, 600, "image/png");
  showLogo(logoData);
};
$("#co-logo-del").onclick = () => { logoData = null; $("#co-logo").value = ""; showLogo(null); };
$("#btn-save-company").onclick = async () => {
  const body = { brand: { colors: [0, 1, 2].map((i) => $("#co-c" + i).value), values: $("#co-values").value, avoid: $("#co-avoid").value } };
  for (const k of ["name", "sector", "city", "tone", "about"]) body[k] = $("#co-" + k).value;
  await api("api/company", body, "PUT");
  if (logoData !== undefined) await api("api/company/logo", { dataUrl: logoData });
  $("#dlg-company").close();
  await load();
  toast("Profilo e brand salvati");
};

// ---------- immagine del post (composta nel browser con il brand) ----------
const img = { post: null, layout: "foto", format: "1:1", photo: null };
const loadImg = (src) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });

function openImage(postId) {
  const p = state.posts.find((x) => x.id === postId);
  const idea = p.image || {};
  const photos = p.photos.filter((f) => !f.generated);
  Object.assign(img, { post: p, layout: idea.layout && (idea.layout !== "foto" || photos.length) ? idea.layout : photos.length ? "foto" : "testo", photo: photos[0]?.file || null });
  $("#img-concept").textContent = idea.concept || "Scegli un modello: logo e colori arrivano dal profilo.";
  $("#img-headline").value = idea.headline || p.title;
  $("#img-subline").value = idea.subline || "";
  $("#img-photos").innerHTML = photos.length
    ? photos.map((f) => `<img src="uploads/${f.file}" data-photo="${f.file}" class="${f.file === img.photo ? "sel" : ""}" alt="">`).join("")
    : `<span class="muted">Nessuna foto nel post: usa “Solo testo” o “Citazione”.</span>`;
  syncSeg();
  $("#dlg-image").showModal();
  drawPost();
}
function syncSeg() {
  for (const b of $$("#img-layout .seg-b")) b.classList.toggle("active", b.dataset.layout === img.layout);
  for (const b of $$("#img-format .seg-b")) b.classList.toggle("active", b.dataset.format === img.format);
}
$("#img-layout").onclick = (e) => { const b = e.target.closest("[data-layout]"); if (!b) return; img.layout = b.dataset.layout; syncSeg(); drawPost(); };
$("#img-format").onclick = (e) => { const b = e.target.closest("[data-format]"); if (!b) return; img.format = b.dataset.format; syncSeg(); drawPost(); };
$("#img-photos").onclick = (e) => {
  const t = e.target.closest("[data-photo]");
  if (!t) return;
  img.photo = t.dataset.photo;
  for (const x of $$("#img-photos img")) x.classList.toggle("sel", x === t);
  if (img.layout !== "foto") img.layout = "foto", syncSeg();
  drawPost();
};
$("#img-headline").oninput = $("#img-subline").oninput = () => drawPost();

function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
/** Testo chiaro o scuro a seconda dello sfondo. */
function onColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? "#111111" : "#ffffff";
}
function fitText(ctx, text, maxW, maxLines, size, weight = 800) {
  let lines;
  do {
    ctx.font = `${weight} ${size}px Geist, "Segoe UI", sans-serif`;
    lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines) break;
    size -= 4;
  } while (size > 28);
  return { lines, size };
}

let drawSeq = 0;
async function drawPost() {
  const seq = ++drawSeq;
  const cv = $("#img-canvas");
  const W = 1080, H = img.format === "4:5" ? 1350 : 1080;
  const [primary, accent, light] = brandColors();
  const headline = $("#img-headline").value.trim() || " ";
  const subline = $("#img-subline").value.trim();
  await document.fonts.load('800 80px Geist').catch(() => {});
  const logoSrc = state.company?.brand?.logo ? `uploads/${state.company.brand.logo}` : null;
  const [logo, photo] = await Promise.all([
    logoSrc ? loadImg(logoSrc).catch(() => null) : null,
    img.layout === "foto" && img.photo ? loadImg(`uploads/${img.photo}`).catch(() => null) : null,
  ]);
  if (seq !== drawSeq) return;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  const pad = 72;
  const name = state.company?.name || "";

  const drawLogo = (x, y, maxH, maxW, align = "left") => {
    if (logo) {
      const s = Math.min(maxH / logo.height, maxW / logo.width);
      const w = logo.width * s, h = logo.height * s;
      ctx.drawImage(logo, align === "right" ? x - w : x, y + (maxH - h) / 2, w, h);
    } else if (name) {
      ctx.font = `700 34px Geist, sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = align;
      ctx.fillText(name, x, y + maxH / 2);
      ctx.textAlign = "left";
    }
  };

  if (img.layout === "foto") {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, W, H);
    const bandH = Math.round(H * 0.3);
    if (photo) {
      const areaH = H - bandH;
      const s = Math.max(W / photo.width, areaH / photo.height);
      ctx.drawImage(photo, (W - photo.width * s) / 2, (areaH - photo.height * s) / 2, photo.width * s, photo.height * s);
    }
    // fascia del brand
    ctx.fillStyle = primary;
    ctx.fillRect(0, H - bandH, W, bandH);
    ctx.fillStyle = accent;
    ctx.fillRect(0, H - bandH, W, 12);
    const ink = onColor(primary);
    ctx.fillStyle = ink;
    const logoW = 220;
    const { lines, size } = fitText(ctx, headline, W - pad * 2 - logoW - 30, 2, 76);
    ctx.textBaseline = "alphabetic";
    let y = H - bandH + 60 + size;
    for (const l of lines) { ctx.fillText(l, pad, y); y += size * 1.08; }
    if (subline) {
      ctx.font = `500 34px Geist, sans-serif`;
      ctx.globalAlpha = 0.8;
      ctx.fillText(wrap(ctx, subline, W - pad * 2 - logoW - 30)[0] || "", pad, y + 14);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = ink;
    drawLogo(W - pad, H - bandH + (bandH - 120) / 2 + 6, 120, logoW, "right");
  } else if (img.layout === "testo") {
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(W - 120, 140, 260, 0, Math.PI * 2);
    ctx.fill();
    const ink = onColor(primary);
    const logoH = 120;
    ctx.font = `500 40px Geist, sans-serif`;
    const subLines = subline ? wrap(ctx, subline, W - pad * 2).slice(0, 2) : [];
    const { lines, size } = fitText(ctx, headline, W - pad * 2, 4, 112);
    // Il blocco di testo sta sempre sopra il logo
    const blockH = 60 + lines.length * size * 1.05 + (subLines.length ? 20 + subLines.length * 52 : 0);
    const top = Math.min(H * 0.36, H - pad - logoH - 50 - blockH);
    ctx.fillStyle = accent;
    ctx.fillRect(pad, top, 120, 14);
    ctx.fillStyle = ink;
    ctx.font = `800 ${size}px Geist, "Segoe UI", sans-serif`;
    let y = top + 60 + size * 0.8;
    ctx.textBaseline = "alphabetic";
    for (const l of lines) { ctx.fillText(l, pad, y); y += size * 1.05; }
    if (subLines.length) {
      ctx.font = `500 40px Geist, sans-serif`;
      ctx.globalAlpha = 0.8;
      y += 10;
      for (const l of subLines) { ctx.fillText(l, pad, y); y += 52; }
      ctx.globalAlpha = 1;
    }
    drawLogo(pad, H - pad - logoH, logoH, 360);
  } else {
    // citazione
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, 28, H);
    ctx.fillStyle = accent;
    ctx.font = `800 300px Georgia, serif`;
    ctx.textBaseline = "top";
    ctx.fillText("“", pad + 10, 40);
    ctx.fillStyle = onColor(light) === "#111111" ? primary : "#ffffff";
    const logoH = 100;
    const { lines, size } = fitText(ctx, headline, W - pad * 2 - 20, 5, 84, 700);
    const blockH = lines.length * size * 1.15 + (subline ? 60 : 0);
    let y = Math.min(H * 0.38, H - pad - logoH - 50 - blockH) + size;
    ctx.textBaseline = "alphabetic";
    for (const l of lines) { ctx.fillText(l, pad + 20, y); y += size * 1.15; }
    if (subline) {
      ctx.font = `600 36px Geist, sans-serif`;
      ctx.fillStyle = accent;
      ctx.fillRect(pad + 20, y - 4, 60, 6);
      ctx.fillStyle = onColor(light) === "#111111" ? "#333333" : "#ffffff";
      ctx.fillText(subline, pad + 100, y + 10);
    }
    ctx.fillStyle = primary;
    drawLogo(W - pad, H - pad - logoH, logoH, 300, "right");
  }
}

$("#btn-img-save").onclick = (e) =>
  busy(e.currentTarget, "Salvo…", async () => {
    await drawPost();
    const dataUrl = $("#img-canvas").toDataURL("image/jpeg", 0.9);
    await api(`api/posts/${img.post.id}/image`, { dataUrl });
    $("#dlg-image").close();
    await load();
    toast("Immagine aggiunta al post: sarà la prima foto");
  });

// ---------- raccolta: vocale + foto ----------
let collectEvent = null;
let photos = [];

function openCollect(id) {
  collectEvent = state.events.find((e) => e.id === id);
  if (!collectEvent) return;
  photos = [];
  $("#collect-title").textContent = collectEvent.title;
  $("#collect-angle").textContent = collectEvent.angle || fmt(collectEvent.date);
  $("#collect-notes").value = collectEvent.description || "";
  $("#collect-photos").value = "";
  $("#collect-thumbs").innerHTML = "";
  $("#dlg-collect").showModal();
}

async function resize(file, max = 1280, type = "image/jpeg") {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL(type, 0.85);
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
    showView("board");
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

// ---------- app installabile e notifiche ----------
const swReady = "serviceWorker" in navigator ? navigator.serviceWorker.register("sw.js").catch(() => null) : Promise.resolve(null);

function b64ToBytes(b64) {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}
$("#btn-push").onclick = (e) =>
  busy(e.currentTarget, "Attivo…", async () => {
    const reg = await swReady;
    if (!reg || !("PushManager" in window)) throw new Error("Questo browser non supporta le notifiche. Su iPhone: aggiungi l'app alla schermata Home e aprila da lì.");
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Notifiche non autorizzate nel browser");
    const { key } = await api("api/push/key");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
    await api("api/push/subscribe", sub.toJSON());
    await api("api/push/test", {});
    await load();
    toast("Notifiche attive: ti avviso il giorno prima e subito dopo ogni occasione", 6000);
  });

// ---------- avvio ----------
load()
  .then(() => {
    // Da una notifica: ?collect=<id> apre subito la raccolta
    const id = new URLSearchParams(location.search).get("collect");
    if (id) {
      history.replaceState(null, "", location.pathname);
      openCollect(id);
    }
  })
  .catch((e) => toast(e.message, 6000));
