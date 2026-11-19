// =============================================
// SERVICIO DE ENVÍO DE EMAILS (nodemailer)
// Envía correos transaccionales: verificación de cuenta
// y recuperación de contraseña.
//
// Configuración por variables de entorno (.env):
//   SMTP_HOST      - host del servidor SMTP (ej: smtp.gmail.com)
//   SMTP_PORT      - puerto (587 STARTTLS, 465 SSL)
//   SMTP_USER      - usuario / dirección de la casilla
//   SMTP_PASS      - contraseña o "app password" (Gmail)
//   SMTP_FROM      - remitente visible (ej: "Tele Import <no-reply@teleimport.com>")
//   FRONTEND_URL   - base para construir los links de los correos
//
// Si SMTP no está configurado, NO se rompe: se registra el link en
// consola (modo desarrollo) para poder continuar el flujo igual.
// =============================================

import nodemailer, { type Transporter } from "nodemailer";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";
const SMTP_FROM = process.env.SMTP_FROM ?? "Tele Import <no-reply@teleimport.com>";

let cachedTransporter: Transporter | null = null;

/** Indica si hay configuración SMTP suficiente para enviar correos reales. */
export function isMailerConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Crea (y cachea) el transporter de nodemailer a partir del entorno. */
function getTransporter(): Transporter | null {
  if (!isMailerConfigured()) return null;
  if (cachedTransporter) return cachedTransporter;

  const port = Number(process.env.SMTP_PORT ?? 587);
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL; 587 = STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransporter;
}

/**
 * Envía un correo. Si SMTP no está configurado, registra el contenido en
 * consola y devuelve false (para que el caller decida cómo seguir).
 */
async function sendMail(opts: { to: string; subject: string; html: string; text: string }): Promise<boolean> {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn(
      `[Mailer] SMTP no configurado — no se envió el correo a ${opts.to}.\n` +
      `[Mailer] Asunto: ${opts.subject}\n` +
      `[Mailer] Contenido (texto):\n${opts.text}`
    );
    return false;
  }

  await transporter.sendMail({
    from: SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
  return true;
}

// -----------------------------------------------
// Plantilla base HTML (simple, sin dependencias externas)
// -----------------------------------------------
function baseTemplate(title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a;">
    <h1 style="font-size:20px;font-weight:700;margin:0 0 12px;">${title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#475569;">${body}</div>
    <a href="${ctaUrl}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;">${ctaLabel}</a>
    <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin-top:8px;">
      Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
      <span style="word-break:break-all;color:#64748b;">${ctaUrl}</span>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:12px;color:#94a3b8;">Tele Import S.A. — Este es un correo automático, no respondas a esta dirección.</p>
  </div>`;
}

// -----------------------------------------------
// Correo: verificación de cuenta (registro)
// -----------------------------------------------
export async function sendVerificationEmail(to: string, token: string, firstName?: string): Promise<boolean> {
  const url = `${FRONTEND_URL.replace(/\/$/, "")}/verificar-email?token=${encodeURIComponent(token)}`;
  const hola = firstName ? `Hola ${firstName}, ` : "";
  const body = `${hola}gracias por registrarte en Tele Import. Para activar todas las funciones de tu cuenta, confirmá tu dirección de correo haciendo clic en el botón. El enlace vence en 24 horas.`;
  return sendMail({
    to,
    subject: "Verificá tu cuenta — Tele Import",
    html: baseTemplate("Verificá tu correo", body, "Verificar mi cuenta", url),
    text: `${hola}confirmá tu correo entrando a: ${url} (vence en 24 horas).`,
  });
}

// -----------------------------------------------
// Correo: recuperación de contraseña
// -----------------------------------------------
export async function sendPasswordResetEmail(to: string, token: string, firstName?: string): Promise<boolean> {
  const url = `${FRONTEND_URL.replace(/\/$/, "")}/restablecer?token=${encodeURIComponent(token)}`;
  const hola = firstName ? `Hola ${firstName}, ` : "";
  const body = `${hola}recibimos una solicitud para restablecer la contraseña de tu cuenta. Hacé clic en el botón para crear una nueva. El enlace vence en 1 hora. Si no fuiste vos, ignorá este correo.`;
  return sendMail({
    to,
    subject: "Restablecé tu contraseña — Tele Import",
    html: baseTemplate("Restablecer contraseña", body, "Crear nueva contraseña", url),
    text: `${hola}restablecé tu contraseña entrando a: ${url} (vence en 1 hora). Si no fuiste vos, ignorá este correo.`,
  });
}


// -----------------------------------------------
// T5: email al encargado por pedido nuevo (pagado)
// Destinatario: MANAGER_EMAIL. Sin SMTP o sin destinatario se registra en
// el log y no se interrumpe el flujo del pedido.
// -----------------------------------------------
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const money = (n: number) => `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function sendNewOrderEmail(order: {
  orderId: string;
  orderNumber: string;
  total: number;
  deliveryMethod: string;
  customer: string;
  email: string;
  phone: string | null;
  address: Record<string, string> | null;
  items: Array<{ name: string; sku: string | null; quantity: number; total: number }>;
}): Promise<boolean> {
  const to = process.env.MANAGER_EMAIL;
  if (!to) {
    console.warn(`[Mailer] MANAGER_EMAIL no configurado: no se avisó al encargado del pedido ${order.orderNumber}.`);
    return false;
  }
  const pickup = order.deliveryMethod === "pickup";
  const addr = order.address
    ? `${order.address.street ?? ""} ${order.address.number ?? ""}, ${order.address.city ?? ""} (${order.address.postal_code ?? ""})`.trim()
    : "";
  const lines = order.items.map((i) => `- ${i.quantity} × ${i.name}${i.sku ? ` (${i.sku})` : ""}: ${money(i.total)}`);
  const text = [
    `Nuevo pedido ${order.orderNumber} pagado.`,
    `Cliente: ${order.customer} · ${order.email}${order.phone ? ` · ${order.phone}` : ""}`,
    `Entrega: ${pickup ? "retiro en el local" : `envío a ${addr}`}`,
    "", ...lines, "", `Total: ${money(order.total)}`,
    `Ver en el panel: ${FRONTEND_URL}/admin/pedidos/${order.orderId}`,
  ].join("\n");
  const rows = order.items.map((i) => `<tr><td style="padding:4px 0;">${i.quantity} × ${esc(i.name)}${i.sku ? ` <span style="color:#64748b;">${esc(i.sku)}</span>` : ""}</td><td style="padding:4px 0;text-align:right;">${money(i.total)}</td></tr>`).join("");
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a;">
    <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#64748b;margin:0;">Pedido pagado</p>
    <h1 style="font-size:20px;margin:4px 0 16px;">${esc(order.orderNumber)}</h1>
    <p style="margin:0 0 4px;">${esc(order.customer)} · ${esc(order.email)}${order.phone ? ` · ${esc(order.phone)}` : ""}</p>
    <p style="margin:0 0 16px;color:#334155;">${pickup ? "Retiro en el local" : `Envío a ${esc(addr)}`}</p>
    <table style="width:100%;border-top:1px solid #e6e3dc;border-bottom:1px solid #e6e3dc;font-size:14px;">${rows}</table>
    <p style="text-align:right;font-weight:600;margin:8px 0 20px;">Total ${money(order.total)}</p>
    <a href="${FRONTEND_URL}/admin/pedidos/${encodeURIComponent(order.orderId)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Ver el pedido</a>
  </div>`;
  try {
    return await sendMail({ to, subject: `Nuevo pedido ${order.orderNumber}`, html, text });
  } catch (error) {
    console.error(`[Mailer] No se pudo enviar el aviso del pedido ${order.orderNumber}:`, error);
    return false;
  }
}

// -----------------------------------------------
// T9: aviso de mensaje nuevo en la mensajería de la tienda.
//   staff:    al encargado (MANAGER_EMAIL), con el nombre del cliente.
//   customer: al cliente, cuando el personal le responde.
// El texto se escapa: lo escribió un usuario.
// -----------------------------------------------
export async function sendChatEmail(opts: {
  to: string; kind: "staff" | "customer"; name: string; staffName?: string | null; body: string; path: string;
}): Promise<boolean> {
  const url = `${FRONTEND_URL.replace(/\/$/, "")}${opts.path}`;
  const excerpt = opts.body.length > 600 ? `${opts.body.slice(0, 597)}...` : opts.body;
  const staff = opts.kind === "staff";
  const subject = staff ? `Mensaje nuevo de ${opts.name}` : "Te respondimos — Tele Import";
  const intro = staff
    ? `${esc(opts.name)} escribió por la mensajería de la tienda:`
    : `${opts.name ? `Hola ${esc(opts.name)}, ` : ""}${opts.staffName ? esc(opts.staffName) : "el equipo"} de Tele Import respondió tu consulta:`;
  const quote = `<blockquote style="margin:12px 0 0;padding:10px 14px;border-left:3px solid #e2e8f0;color:#0f172a;white-space:pre-wrap;">${esc(excerpt)}</blockquote>`;
  try {
    return await sendMail({
      to: opts.to,
      subject,
      html: baseTemplate(staff ? "Mensaje nuevo" : "Tenés una respuesta", `${intro}${quote}`, staff ? "Responder en el panel" : "Ver la conversación", url),
      text: `${staff ? `${opts.name} escribió` : "Te respondimos"}:\n\n${excerpt}\n\n${staff ? "Responder" : "Ver la conversación"}: ${url}`,
    });
  } catch (error) {
    console.error("[Mailer] No se pudo enviar el aviso de mensaje nuevo:", error);
    return false;
  }
}
