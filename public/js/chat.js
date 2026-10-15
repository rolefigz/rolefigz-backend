let chatTicketCorrente = null;
let chatPollingInterval = null;
let chatFabInterval    = null;

// ── Ticket da /kit («Voglio qualcosa di più personalizzato») ────────────────
// /?ticket=kit&azienda=…&kit=… apre il chat con un ticket nuovo già compilato (anche senza account).
(function () {
  const q = new URLSearchParams(window.location.search);
  if (q.get('ticket') !== 'kit') return;
  try {
    sessionStorage.setItem('rfTicketKit', JSON.stringify({
      azienda: (q.get('azienda') || '').slice(0, 80), kit: (q.get('kit') || '').slice(0, 20),
      logo: (q.get('logo') || '').slice(0, 40),
    }));
  } catch (e) {}
  history.replaceState(null, '', window.location.pathname);
  document.addEventListener('DOMContentLoaded', () => setTimeout(apriTicketKitInSospeso, 400));
})();

function apriTicketKitInSospeso() {
  let dati = null;
  try { dati = JSON.parse(sessionStorage.getItem('rfTicketKit') || 'null'); } catch (e) {}
  if (!dati) return;
  try { sessionStorage.removeItem('rfTicketKit'); } catch (e) {}
  apriChat();
  chatMostraNuovoForm();
  document.getElementById('chatAsunto').value = 'Kit personalizzato' + (dati.azienda ? ' — ' + dati.azienda : '');
  document.getElementById('chatPrimerMsg').value =
    'Ciao! Ho provato il kit merch' + (dati.kit ? ' (' + dati.kit + ')' : '') + ' su rolefigz.com/kit' +
    (dati.logo ? ' (logo ' + dati.logo + ')' : '') + ' e vorrei qualcosa di più personalizzato:\n\n';
  setTimeout(() => {
    const t = document.getElementById('chatPrimerMsg');
    t.focus(); t.setSelectionRange(t.value.length, t.value.length);
  }, 120);
}

// ── Senza account (ospite) ────────────────────────────────────────────────────
// Senza login i ticket si aprono con nome ed email; il browser ricorda i loro token (anche dal link dell'email
// /?ticket_ospite=…). Con login funziona tutto come prima.
const ospite = () => !token;

function tokenOspiti() {
  try { return JSON.parse(localStorage.getItem('rfTicketOspiti') || '[]'); } catch (e) { return []; }
}
function salvaTokenOspite(t) {
  try { localStorage.setItem('rfTicketOspiti', JSON.stringify([t, ...tokenOspiti().filter(x => x !== t)].slice(0, 30))); } catch (e) {}
}
function urlMessaggi(id) {
  return ospite() ? `${API}/tickets/ospite/${encodeURIComponent(id)}/mensajes` : `${API}/tickets/${id}/mensajes`;
}
function headersChat(json) {
  const h = json ? { 'Content-Type': 'application/json' } : {};
  if (!ospite()) h.Authorization = `Bearer ${token}`;
  return h;
}

// link dell'email: apre direttamente la conversazione
(function () {
  const t = new URLSearchParams(window.location.search).get('ticket_ospite');
  if (!t || !/^\d{1,10}\.[a-f0-9]{32}$/.test(t)) return;
  salvaTokenOspite(t);
  history.replaceState(null, '', window.location.pathname);
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
    if (!token) { apriChat(); apriTicket(t); }
  }, 400));
})();

// invito a scrivere (una volta per sessione, dopo un po' sulla pagina)
function chiudiInvitoChat() {
  const el = document.getElementById('chatInvito');
  if (el) el.hidden = true;
  try { sessionStorage.setItem('rfInvitoChat', '1'); } catch (e) {}
}
document.addEventListener('DOMContentLoaded', () => setTimeout(() => {
  let visto = false;
  try { visto = !!sessionStorage.getItem('rfInvitoChat'); } catch (e) {}
  const el = document.getElementById('chatInvito');
  const pannello = document.getElementById('chatPanel');
  if (el && !visto && !(pannello && pannello.classList.contains('on'))) el.hidden = false;
}, 12000));

// ── FAB & Pannello ───────────────────────────────────────────────────────────

function alternaChat() {
  const panel = document.getElementById('chatPanel');
  if (panel.classList.contains('on')) chiudiChat();
  else apriChat();
}

function apriChat() {
  chiudiInvitoChat();
  document.getElementById('chatPanel').classList.add('on');
  chatMostraLista();
  caricaMieiTicket();
  avviaPollingFab();
}

function chiudiChat() {
  document.getElementById('chatPanel').classList.remove('on');
  chatTicketCorrente = null;
  fermaPollingChat();
}

// ── Viste ────────────────────────────────────────────────────────────────────

function chatMostraLista() {
  document.getElementById('chatListView').style.display  = '';
  document.getElementById('chatNewForm').classList.remove('on');
  document.getElementById('chatConvView').classList.remove('on');
}

function chatMostraNuovoForm() {
  document.getElementById('chatListView').style.display  = 'none';
  document.getElementById('chatNewForm').classList.add('on');
  document.getElementById('chatConvView').classList.remove('on');
  document.getElementById('chatAsunto').value    = '';
  document.getElementById('chatPrimerMsg').value = '';
  document.getElementById('chatOspite').style.display = ospite() ? '' : 'none';
  document.getElementById('chatConsensoBox').style.display = ospite() ? 'flex' : 'none';
  document.getElementById('chatErrore').style.display = 'none';
  if (ospite()) {
    try {
      const io = JSON.parse(localStorage.getItem('rfOspite') || '{}');
      if (io.nome) document.getElementById('chatNome').value = io.nome;
      if (io.email) document.getElementById('chatEmail').value = io.email;
    } catch (e) {}
  }
  setTimeout(() => document.getElementById(ospite() && !document.getElementById('chatNome').value ? 'chatNome' : 'chatAsunto').focus(), 50);
}

function chatMostraConversazione() {
  document.getElementById('chatListView').style.display  = 'none';
  document.getElementById('chatNewForm').classList.remove('on');
  document.getElementById('chatConvView').classList.add('on');
}

// ── Lista ticket ─────────────────────────────────────────────────────────────

async function caricaMieiTicket() {
  const el = document.getElementById('chatTicketsList');
  try {
    const r = ospite()
      ? await fetch(`${API}/tickets/ospite/elenco`, { method: 'POST', headers: headersChat(true), body: JSON.stringify({ tokens: tokenOspiti() }) })
      : await fetch(`${API}/tickets/mis`, { headers: headersChat() });
    const lista = await r.json();

    if (!lista.length) {
      el.innerHTML = '<div class="chat-empty">NESSUN TICKET<br><small style="font-size:8px;letter-spacing:1px;margin-top:6px;display:block">Crea il tuo primo ticket</small></div>';
      return;
    }

    el.innerHTML = lista.map(t => `
      <div class="chat-ticket-item${t.no_leidos > 0 ? ' unread' : ''}" onclick="apriTicket('${t.token || t.id}')">
        <span class="chat-ticket-asunto">${escapeHtml(t.asunto)}</span>
        <div class="chat-ticket-preview">${escapeHtml(t.ultimo_mensaje || (t.token ? 'Senza account' : '—'))}</div>
        <div class="chat-ticket-foot">
          <span class="pill ${t.estado === 'abierto' ? 'green' : ''}" style="font-size:7px">${t.estado.toUpperCase()}</span>
          ${t.no_leidos > 0 ? `<span class="chat-unread-count">${t.no_leidos}</span>` : ''}
        </div>
      </div>`).join('');
  } catch {}
}

// ── Conversazione ─────────────────────────────────────────────────────────────

async function apriTicket(id) {
  chatTicketCorrente = id;
  chatMostraConversazione();
  await caricaMessaggi(id);
  avviaPollingChat(id);
}

function tornaListaChat() {
  chatTicketCorrente = null;
  fermaPollingChat();
  chatMostraLista();
  caricaMieiTicket();
}

async function caricaMessaggi(id) {
  try {
    const r = await fetch(urlMessaggi(id), { headers: headersChat() });
    if (!r.ok) return;
    const data = await r.json();
    renderMessaggi(data.mensajes, data.ticket);
    aggiornaBadgeFab();
  } catch {}
}

function renderMessaggi(messaggi, ticket) {
  const titleEl = document.getElementById('chatConvTitle');
  if (titleEl) titleEl.textContent = ticket.asunto;

  const chiuso = ticket.estado === 'cerrado';
  const noticeEl = document.getElementById('chatClosedNotice');
  if (noticeEl) noticeEl.style.display = chiuso ? 'block' : 'none';
  const inputEl = document.getElementById('chatConvInput');
  if (inputEl) inputEl.style.display = chiuso ? 'none' : '';

  const el = document.getElementById('chatMensajes');
  if (!messaggi.length) {
    el.innerHTML = '<div class="chat-empty">Nessun messaggio</div>';
    return;
  }

  el.innerHTML = messaggi.map(m => `
    <div class="chat-msg ${m.remitente === 'cliente' ? 'mine' : 'theirs'}">
      ${m.remitente === 'admin' ? `<div class="chat-msg-sender">SUPPORTO ROLEFIGZ</div>` : ''}
      <div class="chat-msg-bubble">${escapeHtml(m.texto)}</div>
      <div class="chat-msg-time">${formattaOrarioChat(m.createdAt)}</div>
    </div>`).join('');

  el.scrollTop = el.scrollHeight;
}

async function inviaMessaggio() {
  const input = document.getElementById('chatMsgInput');
  const testo = input?.value.trim();
  if (!testo || !chatTicketCorrente) return;

  const btn = document.getElementById('chatSendBtn');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch(urlMessaggi(chatTicketCorrente), {
      method:  'POST',
      headers: headersChat(true),
      body:    JSON.stringify({ texto: testo })
    });
    if (!r.ok) throw new Error();
    input.value = '';
    await caricaMessaggi(chatTicketCorrente);
  } catch {}
  if (btn) btn.disabled = false;
}

// ── Crea ticket ───────────────────────────────────────────────────────────────

async function creaTicket() {
  const asunto = document.getElementById('chatAsunto').value.trim();
  const testo  = document.getElementById('chatPrimerMsg').value.trim();
  const btn    = document.getElementById('chatCreateBtn');
  const err = document.getElementById('chatErrore');
  const mostraErrore = m => { err.textContent = m; err.style.display = 'block'; };
  err.style.display = 'none';
  if (!asunto || !testo) return mostraErrore('Scrivi oggetto e messaggio.');
  let extra = {};
  if (ospite()) {
    const nome = document.getElementById('chatNome').value.trim();
    const email = document.getElementById('chatEmail').value.trim();
    if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mostraErrore('Scrivi il tuo nome e una email valida: ti rispondiamo lì.');
    if (!document.getElementById('chatConsenso').checked) return mostraErrore('Accetta l\'informativa privacy per inviare.');
    extra = { nome, email, consenso: true };
    try { localStorage.setItem('rfOspite', JSON.stringify({ nome, email })); } catch (e) {}
  }

  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(ospite() ? `${API}/tickets/ospite` : `${API}/tickets`, {
      method:  'POST',
      headers: headersChat(true),
      body:    JSON.stringify({ asunto, texto: testo, ...extra })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    if (data.token) { salvaTokenOspite(data.token); apriTicket(data.token); }
    else apriTicket(data.ticket.id);
  } catch (e) { mostraErrore(e.message || 'Invio non riuscito: riprova.'); }
  btn.disabled = false; btn.textContent = 'INVIA';
}

// ── Polling & badge ───────────────────────────────────────────────────────────

function avviaPollingChat(id) {
  fermaPollingChat();
  chatPollingInterval = setInterval(() => caricaMessaggi(id), 4000);
}

function fermaPollingChat() {
  if (chatPollingInterval) { clearInterval(chatPollingInterval); chatPollingInterval = null; }
}

function avviaPollingFab() {
  fermaPollingFab();
  aggiornaBadgeFab();
  chatFabInterval = setInterval(aggiornaBadgeFab, 30000);
}

function fermaPollingFab() {
  if (chatFabInterval) { clearInterval(chatFabInterval); chatFabInterval = null; }
}

async function aggiornaBadgeFab() {
  try {
    let data;
    if (ospite()) {
      if (!tokenOspiti().length) return;
      const r = await fetch(`${API}/tickets/ospite/elenco`, { method: 'POST', headers: headersChat(true), body: JSON.stringify({ tokens: tokenOspiti() }) });
      const lista = await r.json();
      data = { count: lista.reduce((s, t) => s + (t.no_leidos || 0), 0) };
    } else {
      const r = await fetch(`${API}/tickets/unread`, { headers: headersChat() });
      data = await r.json();
    }
    const badge = document.getElementById('chatFabBadge');
    if (badge) {
      badge.textContent = data.count || '';
      badge.classList.toggle('on', data.count > 0);
    }
  } catch {}
}

// ── Utilità ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formattaOrarioChat(iso) {
  const d = new Date(iso);
  const oggi = new Date();
  const eOggi = d.toDateString() === oggi.toDateString();
  if (eOggi) return d.toLocaleTimeString(localeDate(), { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(localeDate(), { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString(localeDate(), { hour: '2-digit', minute: '2-digit' });
}
