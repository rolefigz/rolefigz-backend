require("dotenv").config();

function token()  { return process.env.TELEGRAM_BOT_TOKEN; }
function chatId() { return process.env.TELEGRAM_CHAT_ID; }

async function sendMessage(text, options = {}) {
  if (!token() || !chatId()) return null;
  const r = await fetch(`https://api.telegram.org/bot${token()}/sendMessage`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ chat_id: chatId(), text, parse_mode: "HTML", ...options }),
  });
  const data = await r.json();
  if (!data.ok) throw new Error(`Telegram: ${data.description}`);
  return data.result;
}

async function registraWebhook(url) {
  if (!token()) throw new Error("TELEGRAM_BOT_TOKEN non configurato");
  const r = await fetch(`https://api.telegram.org/bot${token()}/setWebhook`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token:    process.env.TELEGRAM_WEBHOOK_SECRET || "",
      allowed_updates: ["message"],
    }),
  });
  return r.json();
}

module.exports = { sendMessage, registraWebhook };
