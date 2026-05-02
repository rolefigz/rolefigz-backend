let chatTicketActual   = null;
let chatPollInterval   = null;
let chatFabInterval    = null;

// ── FAB & Panel ─────────────────────────────────────────────────────────────

function toggleChat() {
  const panel = document.getElementById('chatPanel');
  if (panel.classList.contains('on')) closeChat();
  else openChat();
}

function openChat() {
  document.getElementById('chatPanel').classList.add('on');
  chatShowListView();
  loadMisTickets();
  startFabPolling();
}

function closeChat() {
  document.getElementById('chatPanel').classList.remove('on');
  chatTicketActual = null;
  stopChatPoll();
}

// ── Vistas ───────────────────────────────────────────────────────────────────

function chatShowListView() {
  document.getElementById('chatListView').style.display  = '';
  document.getElementById('chatNewForm').classList.remove('on');
  document.getElementById('chatConvView').classList.remove('on');
}

function chatShowNewForm() {
  document.getElementById('chatListView').style.display  = 'none';
  document.getElementById('chatNewForm').classList.add('on');
  document.getElementById('chatConvView').classList.remove('on');
  document.getElementById('chatAsunto').value   = '';
  document.getElementById('chatPrimerMsg').value = '';
  setTimeout(() => document.getElementById('chatAsunto').focus(), 50);
}

function chatShowConvView() {
  document.getElementById('chatListView').style.display  = 'none';
  document.getElementById('chatNewForm').classList.remove('on');
  document.getElementById('chatConvView').classList.add('on');
}

// ── Lista de tickets ─────────────────────────────────────────────────────────

async function loadMisTickets() {
  const el = document.getElementById('chatTicketsList');
  if (!token) return;
  try {
    const r = await fetch(`${API}/tickets/mis`, { headers: { Authorization: `Bearer ${token}` } });
    const list = await r.json();

    if (!list.length) {
      el.innerHTML = '<div class="chat-empty">NESSUN TICKET<br><small style="font-size:8px;letter-spacing:1px;margin-top:6px;display:block">Crea il tuo primo ticket</small></div>';
      return;
    }

    el.innerHTML = list.map(t => `
      <div class="chat-ticket-item${t.no_leidos > 0 ? ' unread' : ''}" onclick="openTicket(${t.id})">
        <span class="chat-ticket-asunto">${t.asunto}</span>
        <div class="chat-ticket-preview">${t.ultimo_mensaje || '—'}</div>
        <div class="chat-ticket-foot">
          <span class="pill ${t.estado === 'abierto' ? 'green' : ''}" style="font-size:7px">${t.estado.toUpperCase()}</span>
          ${t.no_leidos > 0 ? `<span class="chat-unread-count">${t.no_leidos}</span>` : ''}
        </div>
      </div>`).join('');
  } catch {}
}

// ── Conversación ─────────────────────────────────────────────────────────────

async function openTicket(id) {
  chatTicketActual = id;
  chatShowConvView();
  await cargarMensajes(id);
  startChatPoll(id);
}

function chatBack() {
  chatTicketActual = null;
  stopChatPoll();
  chatShowListView();
  loadMisTickets();
}

async function cargarMensajes(id) {
  if (!token) return;
  try {
    const r = await fetch(`${API}/tickets/${id}/mensajes`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return;
    const data = await r.json();
    renderMensajes(data.mensajes, data.ticket);
    actualizarFabBadge();
  } catch {}
}

function renderMensajes(mensajes, ticket) {
  const titleEl = document.getElementById('chatConvTitle');
  if (titleEl) titleEl.textContent = ticket.asunto;

  const cerrado = ticket.estado === 'cerrado';
  const noticeEl = document.getElementById('chatClosedNotice');
  if (noticeEl) noticeEl.style.display = cerrado ? 'block' : 'none';
  const inputEl = document.getElementById('chatConvInput');
  if (inputEl) inputEl.style.display = cerrado ? 'none' : '';

  const el = document.getElementById('chatMensajes');
  if (!mensajes.length) {
    el.innerHTML = '<div class="chat-empty">Nessun messaggio</div>';
    return;
  }

  const prevScroll = el.scrollHeight - el.scrollTop;
  el.innerHTML = mensajes.map(m => `
    <div class="chat-msg ${m.remitente === 'cliente' ? 'mine' : 'theirs'}">
      ${m.remitente === 'admin' ? `<div class="chat-msg-sender">SUPPORTO ROLEFIGZ</div>` : ''}
      <div class="chat-msg-bubble">${escapeHtml(m.texto)}</div>
      <div class="chat-msg-time">${formatChatTime(m.createdAt)}</div>
    </div>`).join('');

  // Scroll al fondo si ya estaba abajo
  if (prevScroll < 80) el.scrollTop = el.scrollHeight;
  else el.scrollTop = el.scrollHeight;
}

async function enviarMensaje() {
  const input = document.getElementById('chatMsgInput');
  const texto = input?.value.trim();
  if (!texto || !chatTicketActual) return;

  const btn = document.getElementById('chatSendBtn');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch(`${API}/tickets/${chatTicketActual}/mensajes`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ texto })
    });
    if (!r.ok) throw new Error();
    input.value = '';
    await cargarMensajes(chatTicketActual);
  } catch {}
  if (btn) btn.disabled = false;
}

// ── Crear ticket ─────────────────────────────────────────────────────────────

async function crearTicket() {
  const asunto = document.getElementById('chatAsunto').value.trim();
  const texto  = document.getElementById('chatPrimerMsg').value.trim();
  const btn    = document.getElementById('chatCreateBtn');
  if (!asunto || !texto) return;

  btn.disabled = true; btn.textContent = '...';
  try {
    const r = await fetch(`${API}/tickets`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ asunto, texto })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    openTicket(data.ticket.id);
  } catch {}
  btn.disabled = false; btn.textContent = 'INVIA';
}

// ── Polling & badge ───────────────────────────────────────────────────────────

function startChatPoll(id) {
  stopChatPoll();
  chatPollInterval = setInterval(() => cargarMensajes(id), 4000);
}

function stopChatPoll() {
  if (chatPollInterval) { clearInterval(chatPollInterval); chatPollInterval = null; }
}

function startFabPolling() {
  stopFabPolling();
  actualizarFabBadge();
  chatFabInterval = setInterval(actualizarFabBadge, 30000);
}

function stopFabPolling() {
  if (chatFabInterval) { clearInterval(chatFabInterval); chatFabInterval = null; }
}

async function actualizarFabBadge() {
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatChatTime(iso) {
  const d = new Date(iso);
  const hoy = new Date();
  const esHoy = d.toDateString() === hoy.toDateString();
  if (esHoy) return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
