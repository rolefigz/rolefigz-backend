let chatTicketCorrente = null;
let chatPollingInterval = null;
let chatFabInterval    = null;

// ── FAB guest ────────────────────────────────────────────────────────────────

function mostrarFabGuest() {
  const fab = document.getElementById('chatFab');
  if (fab) fab.classList.add('visible');
  fermaPollingFab();
  avviaPollingFabGuest();
}

async function avviaPollingFabGuest() {
  fermaPollingFab();
  await aggiornaBadgeFabGuest();
  chatFabInterval = setInterval(aggiornaBadgeFabGuest, 30000);
}

async function aggiornaBadgeFabGuest() {
  const guestToken = localStorage.getItem('rfGuestToken');
  if (!guestToken) return;
  try {
    const r = await fetch(`${API}/tickets/guest/${guestToken}/unread`);
    const data = await r.json();
    const badge = document.getElementById('chatFabBadge');
    if (badge) {
      badge.textContent = data.count || '';
      badge.classList.toggle('on', data.count > 0);
    }
  } catch {}
}

// ── FAB & Pannello ───────────────────────────────────────────────────────────

function alternaChat() {
  const panel = document.getElementById('chatPanel');
  if (panel.classList.contains('on')) chiudiChat();
  else apriChat();
}

function apriChat() {
  document.getElementById('chatPanel').classList.add('on');
  if (token) {
    chatMostraLista();
    caricaMieiTicket();
    avviaPollingFab();
  } else {
    const guestToken = localStorage.getItem('rfGuestToken');
    if (guestToken) {
      chatTicketCorrente = guestToken;
      chatMostraConversazione();
      caricaMessaggiGuest(guestToken);
      avviaPollingChatGuest(guestToken);
    } else {
      chatMostraNuovoForm();
    }
  }
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
  const guestFields = document.getElementById('chatGuestFields');
  if (guestFields) guestFields.style.display = token ? 'none' : '';
  const backBtn = document.getElementById('chatNewBackBtn');
  if (backBtn) backBtn.style.display = token ? '' : 'none';
  setTimeout(() => {
    const first = token
      ? document.getElementById('chatAsunto')
      : document.getElementById('chatGuestNombre');
    if (first) first.focus();
  }, 50);
}

function chatMostraConversazione() {
  document.getElementById('chatListView').style.display  = 'none';
  document.getElementById('chatNewForm').classList.remove('on');
  document.getElementById('chatConvView').classList.add('on');
}

// ── Lista ticket (solo utenti autenticati) ───────────────────────────────────

async function caricaMieiTicket() {
  const el = document.getElementById('chatTicketsList');
  if (!token) return;
  try {
    const r = await fetch(`${API}/tickets/mis`, { headers: { Authorization: `Bearer ${token}` } });
    const lista = await r.json();

    if (!lista.length) {
      el.innerHTML = '<div class="chat-empty">SIN TICKETS<br><small style="font-size:8px;letter-spacing:1px;margin-top:6px;display:block">Crea tu primer ticket</small></div>';
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

// ── Conversazione (utenti autenticati) ───────────────────────────────────────

async function apriTicket(id) {
  chatTicketCorrente = id;
  chatMostraConversazione();
  await caricaMessaggi(id);
  avviaPollingChat(id);
}

function tornaListaChat() {
  chatTicketCorrente = null;
  fermaPollingChat();
  if (token) {
    chatMostraLista();
    caricaMieiTicket();
  } else {
    chiudiChat();
  }
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

// ── Conversazione (guest) ────────────────────────────────────────────────────

async function caricaMessaggiGuest(guestToken) {
  try {
    const r = await fetch(`${API}/tickets/guest/${guestToken}`);
    if (!r.ok) { localStorage.removeItem('rfGuestToken'); chiudiChat(); return; }
    const data = await r.json();
    renderMessaggi(data.mensajes, data.ticket);
    aggiornaBadgeFabGuest();
  } catch {}
}

function avviaPollingChatGuest(guestToken) {
  fermaPollingChat();
  chatPollingInterval = setInterval(() => caricaMessaggiGuest(guestToken), 4000);
}

// ── Render messaggi (condiviso) ───────────────────────────────────────────────

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
    el.innerHTML = '<div class="chat-empty">Sin mensajes</div>';
    return;
  }

  el.innerHTML = messaggi.map(m => `
    <div class="chat-msg ${m.remitente === 'cliente' ? 'mine' : 'theirs'}">
      ${m.remitente === 'admin' ? `<div class="chat-msg-sender">SOPORTE ROLEFIGZ</div>` : ''}
      <div class="chat-msg-bubble">${escapeHtml(m.texto)}</div>
      <div class="chat-msg-time">${formattaOrarioChat(m.createdAt)}</div>
    </div>`).join('');

  el.scrollTop = el.scrollHeight;
}

// ── Invia messaggio ───────────────────────────────────────────────────────────

async function inviaMessaggio() {
  const input = document.getElementById('chatMsgInput');
  const testo = input?.value.trim();
  if (!testo || !chatTicketCorrente) return;

  const btn = document.getElementById('chatSendBtn');
  if (btn) btn.disabled = true;
  try {
    if (token) {
      const r = await fetch(`${API}/tickets/${chatTicketCorrente}/mensajes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ texto: testo })
      });
      if (!r.ok) throw new Error();
      input.value = '';
      await caricaMessaggi(chatTicketCorrente);
    } else {
      const r = await fetch(`${API}/tickets/guest/${chatTicketCorrente}/mensajes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ texto: testo })
      });
      if (!r.ok) throw new Error();
      input.value = '';
      await caricaMessaggiGuest(chatTicketCorrente);
    }
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
    if (token) {
      const r = await fetch(`${API}/tickets`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ asunto, texto: testo })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      apriTicket(data.ticket.id);
    } else {
      const nombre = document.getElementById('chatGuestNombre').value.trim();
      const email  = document.getElementById('chatGuestEmail').value.trim();
      if (!nombre || !email) { btn.disabled = false; btn.textContent = 'INVIA'; return; }
      const r = await fetch(`${API}/tickets/guest`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre, email, asunto, texto: testo })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      localStorage.setItem('rfGuestToken', data.token);
      chatTicketCorrente = data.token;
      chatMostraConversazione();
      await caricaMessaggiGuest(data.token);
      avviaPollingChatGuest(data.token);
    }
  } catch {}
  btn.disabled = false; btn.textContent = 'INVIA';
}

// ── Polling & badge (utenti autenticati) ──────────────────────────────────────

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
