const nodemailer = require("nodemailer");
require("dotenv").config();

const trasportatore = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const emailConfirmacionPedido = async (ordine, dettagli) => {
  const righe = dettagli.map(d => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1a1a1a;color:#ccc">
        ${d.Prodotto?.nombre || "Prodotto"}
        ${d.variante ? `<div style="font-size:10px;color:#666;margin-top:3px;letter-spacing:1px">${d.variante}</div>` : ""}
        ${d.data_consegna ? `<div style="font-size:10px;color:#888;margin-top:3px;letter-spacing:1px">📅 Consegna: ${new Date(d.data_consegna).toLocaleDateString('it-IT')}${parseFloat(d.supplemento_express||0)>0?` (+€${parseFloat(d.supplemento_express).toFixed(2)} express)`:''}</div>` : ""}
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #1a1a1a;color:#ccc;text-align:center">${d.cantidad}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #1a1a1a;color:#ff3c00;text-align:right;font-weight:bold">€${parseFloat(d.subtotal).toFixed(2)}</td>
    </tr>`).join("");

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
      <tr><td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222">

          <!-- INTESTAZIONE -->
          <tr>
            <td style="padding:32px 40px;border-bottom:1px solid #222">
              <span style="font-size:26px;font-weight:900;letter-spacing:4px;color:#f0ece4">
                ROLE<span style="color:#ff3c00">FIGZ</span>
              </span>
            </td>
          </tr>

          <!-- HERO -->
          <tr>
            <td style="padding:40px 40px 24px;background:#0f0f0f">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#ff3c00;text-transform:uppercase">// Conferma ordine</p>
              <h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:2px;color:#f0ece4">ORDINE<br>CONFERMATO!</h1>
            </td>
          </tr>

          <!-- INFO -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0">
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Ordine</span><br>
                    <span style="font-size:20px;font-weight:bold;color:#ff3c00">#${ordine.id}</span>
                  </td>
                  <td style="padding:8px 0">
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Cliente</span><br>
                    <span style="font-size:15px;color:#f0ece4">${ordine.nombre_cliente}</span>
                  </td>
                  <td style="padding:8px 0">
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Stato</span><br>
                    <span style="font-size:13px;color:#22c55e;text-transform:uppercase;font-weight:bold">${ordine.estado}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PRODOTTI -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222">
              <p style="margin:0 0 16px;font-size:10px;letter-spacing:3px;color:#666;text-transform:uppercase">// Prodotti</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a1a1a">
                <thead>
                  <tr style="background:#0a0a0a">
                    <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#666;text-align:left;font-weight:normal">PRODOTTO</th>
                    <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#666;text-align:center;font-weight:normal">QTÀ</th>
                    <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#666;text-align:right;font-weight:normal">SUBTOTALE</th>
                  </tr>
                </thead>
                <tbody>${righe}</tbody>
              </table>
            </td>
          </tr>

          <!-- TOTALE -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222;background:#0f0f0f">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;letter-spacing:3px;color:#666;text-transform:uppercase">TOTALE ORDINE</td>
                  <td style="text-align:right;font-size:32px;font-weight:900;color:#ff3c00">€${parseFloat(ordine.total).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SPEDIZIONE -->
          ${ordine.direccion ? `
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222">
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;color:#666;text-transform:uppercase">// Indirizzo di spedizione</p>
              <p style="margin:0;font-size:14px;color:#ccc;line-height:1.6">${ordine.direccion}</p>
            </td>
          </tr>` : ""}

          <!-- FOOTER -->
          <tr>
            <td style="padding:28px 40px;background:#0a0a0a">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.7">
                Ti contatteremo presto per confermare i dettagli della spedizione.<br>
                Hai domande? Rispondi a questa email.
              </p>
              <p style="margin:16px 0 0;font-size:10px;letter-spacing:2px;color:#333">ROLEFIGZ — STAMPA 3D</p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  await trasportatore.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      ordine.email_cliente,
    subject: `✅ Ordine #${ordine.id} confermato — RoleFigz`,
    html,
  });
};

// Email interno per l'admin
const emailNuevoPedidoAdmin = async (ordine) => {
  await trasportatore.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      process.env.EMAIL_USER,
    subject: `🛒 Nuovo ordine #${ordine.id} — €${parseFloat(ordine.total).toFixed(2)}`,
    html: `
      <div style="font-family:monospace;background:#111;color:#f0ece4;padding:32px;border:1px solid #222">
        <h2 style="color:#ff3c00;letter-spacing:3px">NUOVO ORDINE #${ordine.id}</h2>
        <p><strong>Cliente:</strong> ${ordine.nombre_cliente}</p>
        <p><strong>Email:</strong> ${ordine.email_cliente}</p>
        <p><strong>Telefono:</strong> ${ordine.telefono || "—"}</p>
        <p><strong>Totale:</strong> <span style="color:#ff3c00;font-size:20px">€${parseFloat(ordine.total).toFixed(2)}</span></p>
        <p><strong>Indirizzo:</strong> ${ordine.direccion || "—"}</p>
        <p><strong>Note:</strong> ${ordine.notas || "—"}</p>
      </div>`
  });
};

const emailVerificacion = async (email, codice, nome) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
      <tr><td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222">

          <!-- INTESTAZIONE -->
          <tr>
            <td style="padding:32px 40px;border-bottom:1px solid #222">
              <span style="font-size:26px;font-weight:900;letter-spacing:4px;color:#f0ece4">
                ROLE<span style="color:#C17F3A">FIGZ</span>
              </span>
            </td>
          </tr>

          <!-- HERO -->
          <tr>
            <td style="padding:40px 40px 24px;background:#0f0f0f">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#C17F3A;text-transform:uppercase">// Verifica account</p>
              <h1 style="margin:0;font-size:32px;font-weight:900;letter-spacing:2px;color:#f0ece4">CIAO, ${nome}!</h1>
            </td>
          </tr>

          <!-- CODICE -->
          <tr>
            <td style="padding:40px;text-align:center;border-bottom:1px solid #222">
              <p style="margin:0 0 16px;font-size:11px;letter-spacing:3px;color:#666;text-transform:uppercase">Il tuo codice di verifica</p>
              <div style="font-size:48px;font-weight:900;letter-spacing:12px;color:#C17F3A;background:#0a0a0a;padding:24px;border:1px solid #222;display:inline-block">${codice}</div>
              <p style="margin:16px 0 0;font-size:11px;letter-spacing:2px;color:#666">Il codice scade in 15 minuti</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:28px 40px;background:#0a0a0a">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.7">
                Se non hai richiesto questo codice, ignora questa email.<br>
                Il tuo account non sarà attivato senza verifica.
              </p>
              <p style="margin:16px 0 0;font-size:10px;letter-spacing:2px;color:#333">ROLEFIGZ — STAMPA 3D</p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  await trasportatore.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: `Codice di verifica RoleFigz — ${codice}`,
    html,
  });
};

const emailSpedizione = async (ordine) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
      <tr><td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222">

          <tr>
            <td style="padding:32px 40px;border-bottom:1px solid #222">
              <span style="font-size:26px;font-weight:900;letter-spacing:4px;color:#f0ece4">
                ROLE<span style="color:#ff3c00">FIGZ</span>
              </span>
            </td>
          </tr>

          <tr>
            <td style="padding:40px 40px 24px;background:#0f0f0f">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#ff3c00;text-transform:uppercase">// Il tuo ordine è in viaggio</p>
              <h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:2px;color:#f0ece4">ORDINE<br>SPEDITO! 📦</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0">
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Ordine</span><br>
                    <span style="font-size:20px;font-weight:bold;color:#ff3c00">#${ordine.id}</span>
                  </td>
                  <td style="padding:8px 0">
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Destinatario</span><br>
                    <span style="font-size:15px;color:#f0ece4">${ordine.nombre_cliente}</span>
                  </td>
                  ${ordine.carrier ? `
                  <td style="padding:8px 0">
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Corriere</span><br>
                    <span style="font-size:15px;color:#f0ece4">${ordine.carrier}</span>
                  </td>` : ""}
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px;border-bottom:1px solid #222;text-align:center;background:#0f0f0f">
              <p style="margin:0 0 12px;font-size:10px;letter-spacing:3px;color:#666;text-transform:uppercase">Numero di tracking</p>
              <div style="font-size:24px;font-weight:900;letter-spacing:4px;color:#22c55e;background:#0a0a0a;padding:20px 28px;border:1px solid #1a1a1a;display:inline-block;font-family:'Courier New',monospace">
                ${ordine.tracking_number}
              </div>
              ${ordine.costo_spedizione ? `<p style="margin:12px 0 0;font-size:11px;color:#666">Spedizione: €${parseFloat(ordine.costo_spedizione).toFixed(2)}</p>` : ""}
            </td>
          </tr>

          ${ordine.direccion ? `
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222">
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;color:#666;text-transform:uppercase">// Indirizzo di consegna</p>
              <p style="margin:0;font-size:14px;color:#ccc;line-height:1.6">${ordine.direccion}</p>
            </td>
          </tr>` : ""}

          <tr>
            <td style="padding:28px 40px;background:#0a0a0a">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.7">
                Usa il numero di tracking per seguire il tuo pacco sul sito del corriere.<br>
                Hai domande? Rispondi a questa email.
              </p>
              <p style="margin:16px 0 0;font-size:10px;letter-spacing:2px;color:#333">ROLEFIGZ — STAMPA 3D</p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  await trasportatore.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      ordine.email_cliente,
    subject: `📦 Ordine #${ordine.id} spedito — Tracking: ${ordine.tracking_number}`,
    html,
  });
};

const emailGadget3D = async ({ id, nome, email, gadget, azienda }) => {
  await trasportatore.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: `✅ Richiesta gadget 3D ricevuta — RoleFigz #${id}`,
    html: `
    <!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
        <tr><td align="center">
          <table width="580" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222">
            <tr>
              <td style="padding:32px 40px;border-bottom:1px solid #222">
                <span style="font-size:26px;font-weight:900;letter-spacing:4px;color:#f0ece4">ROLE<span style="color:#C17F3A">FIGZ</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 40px 24px;background:#0f0f0f">
                <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#C17F3A;text-transform:uppercase">// Career Day 2026</p>
                <h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:2px;color:#f0ece4">RICHIESTA<br>RICEVUTA!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px;border-bottom:1px solid #222">
                <p style="margin:0 0 16px;font-size:13px;color:#ccc;line-height:1.8">Ciao <strong style="color:#f0ece4">${nome}</strong>,</p>
                <p style="margin:0 0 16px;font-size:13px;color:#ccc;line-height:1.8">Abbiamo ricevuto la tua richiesta di gadget 3D personalizzato per <strong style="color:#f0ece4">${azienda}</strong>.</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #222;margin:20px 0">
                  <tr style="background:#0a0a0a">
                    <td style="padding:12px 20px;font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Ordine</td>
                    <td style="padding:12px 20px;font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Gadget</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 20px;font-size:20px;font-weight:bold;color:#C17F3A">#${id}</td>
                    <td style="padding:14px 20px;font-size:15px;color:#f0ece4">${gadget}</td>
                  </tr>
                </table>
                <p style="margin:0;font-size:13px;color:#ccc;line-height:1.8">Ti contatteremo entro <strong style="color:#f0ece4">24 ore</strong> per confermare i dettagli e organizzare la consegna.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px;background:#0a0a0a">
                <p style="margin:0;font-size:12px;color:#444;line-height:1.7">Hai domande? Rispondi a questa email.<br>Il campione è completamente gratuito — nessun costo nascosto.</p>
                <p style="margin:16px 0 0;font-size:10px;letter-spacing:2px;color:#333">ROLEFIGZ — STAMPA 3D PERSONALIZZATA</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body></html>`,
  });
};

const emailGadget3DAdmin = async ({ id, nome, email, gadget, azienda, settore, dimensione, utilizzo, note, logo_url }) => {
  await trasportatore.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      process.env.EMAIL_USER,
    subject: `🖨️ Nuovo gadget 3D #${id} — ${azienda}`,
    html: `
    <div style="font-family:monospace;background:#111;color:#f0ece4;padding:32px;border:1px solid #222">
      <h2 style="color:#C17F3A;letter-spacing:3px;margin:0 0 24px">NUOVO GADGET 3D #${id}</h2>
      <p><strong>Nome:</strong> ${nome}</p>
      <p><strong>Azienda:</strong> ${azienda}</p>
      <p><strong>Email:</strong> <a href="mailto:${email}" style="color:#C17F3A">${email}</a></p>
      <hr style="border-color:#222;margin:16px 0"/>
      <p><strong>Gadget:</strong> <span style="color:#C17F3A;font-size:18px">${gadget}</span></p>
      <p><strong>Settore:</strong> ${settore}</p>
      <p><strong>Dimensione:</strong> ${dimensione}</p>
      <p><strong>Utilizzo:</strong> ${utilizzo}</p>
      ${note ? `<p><strong>Note:</strong> ${note}</p>` : ""}
      ${logo_url ? `<p><strong>Logo:</strong> <a href="${logo_url}" style="color:#C17F3A">Visualizza logo</a></p>` : "<p><strong>Logo:</strong> non caricato</p>"}
    </div>`,
  });
};

module.exports = { emailConfirmacionPedido, emailNuevoPedidoAdmin, emailVerificacion, emailSpedizione, emailGadget3D, emailGadget3DAdmin };
