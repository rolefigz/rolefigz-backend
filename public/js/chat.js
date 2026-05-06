let chatTicketCorrente = null;
let chatPollingInterval = null;
let chatFabInterval    = null;

// ── FAB & Pannello ───────────────────────────────────────────────────────────

function alternaChat() {
  const panel = document.getElementById('chatPanel');
  if (panel.classList.contains('on')) chiudiChat();
  else apriChat();
}

function apriChat() {
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
  setTimeout(() => document.getElementById('chatAsunto').focus(), 50);
}

function chatMostraConversazione() {
  document.getElementById('chatListView').style.display  = 'none';
  document.getElementById('chatNewForm').classList.remove('on');
  document.getElementById('chatConvView').classList.add('on');
}

// ── Lista ticket ─────────────────────────────────────────────────────────────

async function caricaMieiTicket() {
  const el = document.getElementById('chatTicketsList');
  if (!token) return;
  try {
    const r = await fetch(`${API}/tickets/mis`, { headers: { Authorization: `Bearer ${token}` } });
    const lista = await r.json();

    if (!lista.length) {
      el.innerHTML = '<div class="chat-empty">NESSUN TICKET<br><small style="font-size:8px;letter-spacing:1px;margin-top:6px;display:block">Crea il tuo primo ticket</small></div>';
      return;
    }

    el.innerHTML = lista.map(t => `
      <div class="chat-ticket-item${t.no_leidos > 0 ? ' unread' : ''}" onclick="apriTicket(${t.id})">
        <span class="chat-ticket-asunto">${t.asunto}</span>
        <div class="chat-ticket-preview">${t.ultimo_mensaje || '—'}</div>
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
  if (!token) return;
  try {
    const r = await fetch(`${API}/tickets/${id}/mensajes`, { headers: { Authorization: `Bearer ${token}` } });
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
    const r = await fetch(`${API}/tickets/${chatTicketCorrente}/mensajes`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
  if (!asunto || !testo) return;

  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/tickets`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ asunto, texto: testo })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    apriTicket(data.ticket.id);
  } catch {}
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
  if (!token) return;
  try {
    const r = await fetch(`${API}/tickets/unread`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
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
  if (eOggi) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
