const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const emailConfirmacionPedido = async (orden, detalles) => {
  const lineas = detalles.map(d => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #1a1a1a;color:#ccc">${d.Producto?.nombre || "Producto"}</td>
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

          <!-- HEADER -->
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
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#ff3c00;text-transform:uppercase">// Confirmación de pedido</p>
              <h1 style="margin:0;font-size:36px;font-weight:900;letter-spacing:2px;color:#f0ece4">¡PEDIDO<br>CONFIRMADO!</h1>
            </td>
          </tr>

          <!-- INFO -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0">
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Orden</span><br>
                    <span style="font-size:20px;font-weight:bold;color:#ff3c00">#${orden.id}</span>
                  </td>
                  <td style="padding:8px 0">
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Cliente</span><br>
                    <span style="font-size:15px;color:#f0ece4">${orden.nombre_cliente}</span>
                  </td>
                  <td style="padding:8px 0">
                    <span style="font-size:10px;letter-spacing:2px;color:#666;text-transform:uppercase">Estado</span><br>
                    <span style="font-size:13px;color:#22c55e;text-transform:uppercase;font-weight:bold">${orden.estado}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PRODUCTOS -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222">
              <p style="margin:0 0 16px;font-size:10px;letter-spacing:3px;color:#666;text-transform:uppercase">// Productos</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a1a1a">
                <thead>
                  <tr style="background:#0a0a0a">
                    <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#666;text-align:left;font-weight:normal">PRODUCTO</th>
                    <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#666;text-align:center;font-weight:normal">CANT.</th>
                    <th style="padding:10px 16px;font-size:10px;letter-spacing:2px;color:#666;text-align:right;font-weight:normal">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody>${lineas}</tbody>
              </table>
            </td>
          </tr>

          <!-- TOTAL -->
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222;background:#0f0f0f">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;letter-spacing:3px;color:#666;text-transform:uppercase">TOTAL DEL PEDIDO</td>
                  <td style="text-align:right;font-size:32px;font-weight:900;color:#ff3c00">€${parseFloat(orden.total).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ENVÍO -->
          ${orden.direccion ? `
          <tr>
            <td style="padding:24px 40px;border-bottom:1px solid #222">
              <p style="margin:0 0 8px;font-size:10px;letter-spacing:3px;color:#666;text-transform:uppercase">// Dirección de envío</p>
              <p style="margin:0;font-size:14px;color:#ccc;line-height:1.6">${orden.direccion}</p>
            </td>
          </tr>` : ""}

          <!-- FOOTER -->
          <tr>
            <td style="padding:28px 40px;background:#0a0a0a">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.7">
                Nos pondremos en contacto contigo pronto para confirmar los detalles del envío.<br>
                ¿Tienes alguna pregunta? Responde a este email.
              </p>
              <p style="margin:16px 0 0;font-size:10px;letter-spacing:2px;color:#333">ROLEFIGZ — IMPRESIÓN 3D</p>
            </td>
          </tr>

        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to:   orden.email_cliente,
    subject: `✅ Pedido #${orden.id} confirmado — RoleFigz`,
    html,
  });
};

// Email interno para el admin
const emailNuevoPedidoAdmin = async (orden) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      process.env.EMAIL_USER,
    subject: `🛒 Nuevo pedido #${orden.id} — €${parseFloat(orden.total).toFixed(2)}`,
    html: `
      <div style="font-family:monospace;background:#111;color:#f0ece4;padding:32px;border:1px solid #222">
        <h2 style="color:#ff3c00;letter-spacing:3px">NUEVO PEDIDO #${orden.id}</h2>
        <p><strong>Cliente:</strong> ${orden.nombre_cliente}</p>
        <p><strong>Email:</strong> ${orden.email_cliente}</p>
        <p><strong>Teléfono:</strong> ${orden.telefono || "—"}</p>
        <p><strong>Total:</strong> <span style="color:#ff3c00;font-size:20px">€${parseFloat(orden.total).toFixed(2)}</span></p>
        <p><strong>Dirección:</strong> ${orden.direccion || "—"}</p>
        <p><strong>Notas:</strong> ${orden.notas || "—"}</p>
      </div>`
  });
};

module.exports = { emailConfirmacionPedido, emailNuevoPedidoAdmin };