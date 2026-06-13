const { Resend } = require("resend");
require("dotenv").config();

const ADMIN = process.env.EMAIL_USER;

let _resend = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

async function invia(to, subject, html) {
  const { error } = await getResend().emails.send({
    from:    process.env.EMAIL_FROM,
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
}

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

  await invia(ordine.email_cliente, `✅ Ordine #${ordine.id} confermato — RoleFigz`, html);
};

const emailRichiestaRicevuta = async (ordine, dettagli = []) => {
  const righe = dettagli.map(d => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1a1a1a;color:#ccc">
        ${d.Prodotto?.nombre || "Prodotto"}
        ${d.variante ? `<div style="font-size:10px;color:#666;margin-top:3px;letter-spacing:1px">${d.variante}</div>` : ""}
        ${d.data_consegna ? `<div style="font-size:10px;color:#888;margin-top:3px">📅 ${new Date(d.data_consegna).toLocaleDateString('it-IT')}${parseFloat(d.supplemento_express||0)>0?` (+€${parseFloat(d.supplemento_express).toFixed(2)} express)`:''}</div>` : ""}
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
          <tr>
            <td style="padding:32px 40px;border-bottom:1px solid #222">
              <span style="font-size:26px;font-weight:900;letter-spacing:4px;color:#f0ece4">ROLE<span style="color:#ff3c00">FIGZ</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 24px;background:#0f0f0f">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#ff3c00;text-transform:uppercase">// Richiesta ricevuta</p>
              <h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:2px;color:#f0ece4">ORDINE<br>RICEVUTO!</h1>
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
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Cliente</span><br>
                    <span style="font-size:15px;color:#f0ece4">${ordine.nombre_cliente}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
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
          ${ordine.direccion ? `
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222">
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;color:#666;text-transform:uppercase">// Indirizzo di spedizione</p>
              <p style="margin:0;font-size:14px;color:#ccc;line-height:1.6">${ordine.direccion}</p>
            </td>
          </tr>` : ""}
          <tr>
            <td style="padding:28px 40px;background:#0a0a0a">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.7">
                Abbiamo ricevuto il tuo ordine e ti contatteremo presto per organizzare il pagamento e la spedizione.<br>
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

  await invia(ordine.email_cliente, `📋 Richiesta ordine #${ordine.id} ricevuta — RoleFigz`, html);
};

// Email interno per l'admin con tutti i dettagli
const emailNuevoPedidoAdmin = async (ordine, dettagli = []) => {
  const righe = dettagli.map(d => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #222;color:#ccc">
        <strong style="color:#f0ece4">${d.Prodotto?.nombre || "Prodotto"}</strong>
        ${d.variante ? `<div style="font-size:11px;color:#888;margin-top:4px;letter-spacing:1px">↳ ${d.variante}</div>` : ""}
        ${d.data_consegna ? `<div style="font-size:11px;color:#666;margin-top:3px">📅 ${new Date(d.data_consegna).toLocaleDateString('it-IT')}${parseFloat(d.supplemento_express||0)>0?` (+€${parseFloat(d.supplemento_express).toFixed(2)} express)`:''}</div>` : ""}
        ${d.foto_cliente ? `<div style="font-size:11px;margin-top:4px"><a href="${d.foto_cliente}" style="color:#ff3c00">📎 Foto cliente allegata</a></div>` : ""}
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #222;color:#ccc;text-align:center;font-size:16px;font-weight:bold">${d.cantidad}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #222;color:#999;text-align:right">€${parseFloat(d.precio_unidad).toFixed(2)}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #222;color:#ff3c00;text-align:right;font-weight:bold">€${parseFloat(d.subtotal).toFixed(2)}</td>
    </tr>`).join("");

  await invia(
    ADMIN,
    `🛒 Nuovo ordine #${ordine.id} — €${parseFloat(ordine.total).toFixed(2)} — ${ordine.nombre_cliente}`,
    `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
        <tr><td align="center">
          <table width="620" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222">

            <tr>
              <td style="padding:28px 40px;border-bottom:1px solid #222;background:#0a0a0a">
                <span style="font-size:26px;font-weight:900;letter-spacing:4px;color:#f0ece4">ROLE<span style="color:#ff3c00">FIGZ</span></span>
                <span style="float:right;font-family:monospace;font-size:10px;color:#555;letter-spacing:2px;padding-top:10px;text-transform:uppercase">Nuovo Ordine</span>
              </td>
            </tr>

            <tr>
              <td style="padding:32px 40px 16px;background:#0f0f0f">
                <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;color:#ff3c00;text-transform:uppercase">// ordine ricevuto</p>
                <h1 style="margin:0;font-size:40px;font-weight:900;letter-spacing:2px;color:#f0ece4">#${ordine.id}</h1>
                <p style="margin:6px 0 0;font-size:11px;color:#555">${new Date().toLocaleString('it-IT')}</p>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 40px;border-bottom:1px solid #222">
                <p style="margin:0 0 14px;font-size:10px;letter-spacing:2px;color:#555;text-transform:uppercase">Dati cliente</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;width:50%;vertical-align:top">
                      <span style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px">Nome</span><br>
                      <span style="font-size:17px;font-weight:bold;color:#f0ece4">${ordine.nombre_cliente}</span>
                    </td>
                    <td style="padding:6px 0;width:50%;vertical-align:top">
                      <span style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px">Email</span><br>
                      <a href="mailto:${ordine.email_cliente}" style="font-size:14px;color:#ff3c00;text-decoration:none">${ordine.email_cliente}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0 6px;vertical-align:top">
                      <span style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px">Telefono</span><br>
                      <span style="font-size:14px;color:#ccc">${ordine.telefono || "—"}</span>
                    </td>
                    <td style="padding:10px 0 6px;vertical-align:top">
                      <span style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px">Indirizzo spedizione</span><br>
                      <span style="font-size:13px;color:#ccc;line-height:1.5">${ordine.direccion || "—"}</span>
                    </td>
                  </tr>
                  ${ordine.notas ? `
                  <tr>
                    <td colspan="2" style="padding:10px 0 6px;vertical-align:top">
                      <span style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px">Note del cliente</span><br>
                      <span style="font-size:13px;color:#aaa;font-style:italic">${ordine.notas}</span>
                    </td>
                  </tr>` : ""}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 40px;border-bottom:1px solid #222">
                <p style="margin:0 0 14px;font-size:10px;letter-spacing:2px;color:#555;text-transform:uppercase">Prodotti ordinati</p>
                <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a1a1a">
                  <thead>
                    <tr style="background:#0a0a0a">
                      <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#555;text-align:left;font-weight:normal;text-transform:uppercase">Prodotto / Variante</th>
                      <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#555;text-align:center;font-weight:normal;text-transform:uppercase">Qtà</th>
                      <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#555;text-align:right;font-weight:normal;text-transform:uppercase">Prezzo unit.</th>
                      <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#555;text-align:right;font-weight:normal;text-transform:uppercase">Subtotale</th>
                    </tr>
                  </thead>
                  <tbody>${righe}</tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 40px;border-bottom:1px solid #222;background:#0f0f0f">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${ordine.costo_spedizione ? `
                  <tr>
                    <td style="padding:3px 0;font-size:12px;color:#555">Subtotale prodotti</td>
                    <td style="padding:3px 0;text-align:right;font-size:12px;color:#888">€${(parseFloat(ordine.total) - parseFloat(ordine.costo_spedizione)).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding:3px 0;font-size:12px;color:#555">Spedizione (${ordine.carrier || "Standard"})</td>
                    <td style="padding:3px 0;text-align:right;font-size:12px;color:#888">€${parseFloat(ordine.costo_spedizione).toFixed(2)}</td>
                  </tr>
                  <tr><td colspan="2" style="padding:8px 0 0"><hr style="border:none;border-top:1px solid #1a1a1a;margin:0"/></td></tr>` : ""}
                  <tr>
                    <td style="padding:10px 0 0;font-size:11px;letter-spacing:3px;color:#666;text-transform:uppercase">TOTALE</td>
                    <td style="padding:10px 0 0;text-align:right;font-size:32px;font-weight:900;color:#ff3c00">€${parseFloat(ordine.total).toFixed(2)}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 40px;background:#0a0a0a;text-align:center">
                <a href="mailto:${ordine.email_cliente}" style="display:inline-block;padding:14px 32px;background:#ff3c00;color:#fff;font-weight:900;font-size:12px;letter-spacing:3px;text-decoration:none;text-transform:uppercase">✉ RISPONDI AL CLIENTE</a>
                <p style="margin:20px 0 0;font-size:10px;letter-spacing:2px;color:#333">ROLEFIGZ — STAMPA 3D</p>
              </td>
            </tr>

          </table>
        </td></tr>
      </table>
    </body></html>`
  );
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

  await invia(email, `Codice di verifica RoleFigz — ${codice}`, html);
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

  await invia(ordine.email_cliente, `📦 Ordine #${ordine.id} spedito — Tracking: ${ordine.tracking_number}`, html);
};

const emailGadget3D = async ({ id, nome, email, gadget, azienda }) => {
  await invia(email, `✅ Richiesta gadget 3D ricevuta — RoleFigz #${id}`, `
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
    </body></html>`);
};

const emailGadget3DAdmin = async ({ id, nome, email, gadget, azienda, settore, dimensione, utilizzo, note, logo_url }) => {
  await invia(
    ADMIN,
    `🖨️ Nuovo gadget 3D #${id} — ${azienda}`,
    `<div style="font-family:monospace;background:#111;color:#f0ece4;padding:32px;border:1px solid #222">
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
    </div>`
  );
};

const emailNuovoTicketAdmin = async ({ id, asunto, texto, utente }) => {
  await invia(
    ADMIN,
    `🎫 Nuovo ticket #${id} — ${utente.nombre || utente.email}`,
    `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
        <tr><td align="center">
          <table width="580" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222">
            <tr>
              <td style="padding:28px 40px;border-bottom:1px solid #222;background:#0a0a0a">
                <span style="font-size:26px;font-weight:900;letter-spacing:4px;color:#f0ece4">ROLE<span style="color:#ff3c00">FIGZ</span></span>
                <span style="float:right;font-family:monospace;font-size:10px;color:#555;letter-spacing:2px;padding-top:10px">SUPPORT</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 16px;background:#0f0f0f">
                <p style="margin:0 0 4px;font-size:10px;letter-spacing:3px;color:#ff3c00;text-transform:uppercase">// nuovo ticket</p>
                <h1 style="margin:0;font-size:38px;font-weight:900;letter-spacing:2px;color:#f0ece4">#${id}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;border-bottom:1px solid #222">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;width:50%;vertical-align:top">
                      <span style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px">Utente</span><br>
                      <span style="font-size:16px;font-weight:bold;color:#f0ece4">${utente.nombre || "—"}</span>
                    </td>
                    <td style="padding:6px 0;width:50%;vertical-align:top">
                      <span style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px">Email</span><br>
                      <a href="mailto:${utente.email}" style="font-size:14px;color:#ff3c00;text-decoration:none">${utente.email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:14px 0 6px;vertical-align:top">
                      <span style="font-size:10px;color:#444;text-transform:uppercase;letter-spacing:1px">Oggetto</span><br>
                      <span style="font-size:17px;font-weight:bold;color:#f0ece4">${asunto}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px;border-bottom:1px solid #222;background:#0f0f0f">
                <p style="margin:0 0 10px;font-size:10px;letter-spacing:2px;color:#555;text-transform:uppercase">Messaggio</p>
                <p style="margin:0;font-size:14px;color:#ccc;line-height:1.7;white-space:pre-wrap">${texto}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px;background:#0a0a0a;text-align:center">
                <a href="mailto:${utente.email}" style="display:inline-block;padding:14px 32px;background:#ff3c00;color:#fff;font-weight:900;font-size:12px;letter-spacing:3px;text-decoration:none;text-transform:uppercase">✉ RISPONDI</a>
                <p style="margin:20px 0 0;font-size:10px;letter-spacing:2px;color:#333">ROLEFIGZ — STAMPA 3D</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body></html>`
  );
};

async function notificaWhatsApp(testo) {
  const phone  = process.env.WHATSAPP_PHONE;
  const apikey = process.env.WHATSAPP_APIKEY;
  if (!phone || !apikey) return;
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(testo)}&apikey=${apikey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`CallMeBot HTTP ${r.status}`);
}

const emailRispostaTicket = async ({ ticket, texto, emailCliente, nomeCliente }) => {
  const BASE_URL = process.env.BASE_URL || "https://www.rolefigz.com";
  await invia(
    emailCliente,
    `💬 Nuova risposta al tuo ticket #${ticket.id} — RoleFigz`,
    `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px">
        <tr><td align="center">
          <table width="580" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #222">
            <tr>
              <td style="padding:28px 40px;border-bottom:1px solid #222;background:#0a0a0a">
                <span style="font-size:26px;font-weight:900;letter-spacing:4px;color:#f0ece4">ROLE<span style="color:#ff3c00">FIGZ</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 16px;background:#0f0f0f">
                <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#ff3c00;text-transform:uppercase">// supporto</p>
                <h1 style="margin:0;font-size:30px;font-weight:900;letter-spacing:2px;color:#f0ece4">HAI UNA NUOVA<br>RISPOSTA</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;border-bottom:1px solid #222">
                <span style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:1px">Ticket</span><br>
                <span style="font-size:18px;font-weight:bold;color:#ff3c00">#${ticket.id}</span>
                <span style="font-size:14px;color:#888;margin-left:10px">${ticket.asunto}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px;border-bottom:1px solid #222;background:#0f0f0f">
                <p style="margin:0 0 10px;font-size:10px;letter-spacing:2px;color:#555;text-transform:uppercase">Messaggio</p>
                <p style="margin:0;font-size:15px;color:#ccc;line-height:1.7;white-space:pre-wrap">${texto}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 40px;background:#0a0a0a;text-align:center">
                <a href="${BASE_URL}" style="display:inline-block;padding:14px 32px;background:#ff3c00;color:#fff;font-weight:900;font-size:12px;letter-spacing:3px;text-decoration:none;text-transform:uppercase">APRI IL TICKET</a>
                <p style="margin:20px 0 0;font-size:12px;color:#444;line-height:1.7">Accedi al tuo account per rispondere.</p>
                <p style="margin:12px 0 0;font-size:10px;letter-spacing:2px;color:#333">ROLEFIGZ — STAMPA 3D</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body></html>`
  );
};

module.exports = { emailConfirmacionPedido, emailRichiestaRicevuta, emailNuevoPedidoAdmin, emailNuovoTicketAdmin, emailRispostaTicket, notificaWhatsApp, emailVerificacion, emailSpedizione, emailGadget3D, emailGadget3DAdmin };
