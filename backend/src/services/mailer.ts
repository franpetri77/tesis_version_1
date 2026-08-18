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
