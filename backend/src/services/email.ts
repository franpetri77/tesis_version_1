// =============================================
// SERVICIO: EMAIL
// Notificaciones por email a la sucursal/encargado.
//
// Usa nodemailer si está instalado y hay SMTP configurado (SMTP_HOST...).
// Si no, cae a "modo consola": registra el email que se habría enviado.
// Esto permite desarrollar/demostrar el flujo sin un servidor SMTP real,
// y enviar de verdad simplemente configurando las variables de entorno.
//
// Variables de entorno:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, MANAGER_EMAIL
// =============================================

// -- Tipos mínimos para no depender de @types/nodemailer --
interface MailTransporter {
  sendMail(opts: Record<string, unknown>): Promise<unknown>;
}
interface NodemailerModule {
  createTransport(opts: Record<string, unknown>): MailTransporter;
}

// Carga perezosa y OPCIONAL de nodemailer. Como es un require() en runtime,
// el proyecto compila y arranca aunque el paquete no esté instalado todavía.
function loadNodemailer(): NodemailerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("nodemailer") as NodemailerModule;
  } catch {
    return null;
  }
}

const SMTP_HOST     = process.env.SMTP_HOST;
const SMTP_PORT     = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER     = process.env.SMTP_USER;
const SMTP_PASS     = process.env.SMTP_PASS;
const SMTP_FROM     = process.env.SMTP_FROM ?? '"Tele Import S.A." <no-reply@teleimport.com.ar>';
const MANAGER_EMAIL = process.env.MANAGER_EMAIL ?? "encargado@teleimport.com.ar";

let cachedTransporter: MailTransporter | null = null;

function getTransporter(): MailTransporter | null {
  if (!SMTP_HOST) return null;
  if (cachedTransporter) return cachedTransporter;

  const nodemailer = loadNodemailer();
  if (!nodemailer) {
    console.warn("[Email] SMTP configurado pero nodemailer no está instalado. Ejecutá: npm install");
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true para 465, false para 587/STARTTLS
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return cachedTransporter;
}

// -----------------------------------------------
// Datos del email de notificación de pedido
// -----------------------------------------------
export interface ManagerOrderEmail {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  deliveryMethod: "pickup" | "shipping";
  shippingAddress: {
    street: string;
    number: string;
    city: string;
    province: string;
    postal_code: string;
  } | null;
  items: Array<{ name: string; quantity: number }>;
  total: number;
  notes?: string;
}

/**
 * Notifica al encargado de la sucursal por email que llegó un nuevo pedido,
 * con los datos necesarios para preparar el despacho de la mercadería.
 *
 * Nunca lanza: si el envío falla, lo registra y sigue (no debe romper la compra).
 */
export async function sendOrderNotificationToManager(order: ManagerOrderEmail): Promise<void> {
  const entrega =
    order.deliveryMethod === "shipping"
      ? `Envío a domicilio${
          order.shippingAddress
            ? ` — ${order.shippingAddress.street} ${order.shippingAddress.number}, ` +
              `${order.shippingAddress.city}, ${order.shippingAddress.province} (CP ${order.shippingAddress.postal_code})`
            : ""
        }`
      : "Retiro en sucursal";

  const totalFmt = order.total.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  const itemsText = order.items.map((i) => `  • ${i.quantity}× ${i.name}`).join("\n");
  const itemsHtml = order.items.map((i) => `<li>${i.quantity}× ${i.name}</li>`).join("");

  const subject = `🆕 Nuevo pedido ${order.orderNumber} — preparar despacho`;

  const text = [
    `Se registró un nuevo pedido: ${order.orderNumber}`,
    ``,
    `Cliente: ${order.customerName} (${order.customerEmail})`,
    `Entrega: ${entrega}`,
    `Total: ${totalFmt}`,
    ``,
    `Productos:`,
    itemsText,
    order.notes ? `\nNotas del cliente: ${order.notes}` : ``,
    ``,
    `Por favor, preparar la mercadería para su despacho.`,
    `— Tele Import S.A.`,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1e293b">
      <h2 style="color:#2563eb;margin-bottom:4px">Nuevo pedido ${order.orderNumber}</h2>
      <p style="color:#64748b;margin-top:0">Preparar la mercadería para su despacho.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:6px 0;color:#64748b">Cliente</td><td style="padding:6px 0;font-weight:600">${order.customerName}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0">${order.customerEmail}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Entrega</td><td style="padding:6px 0">${entrega}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Total</td><td style="padding:6px 0;font-weight:700">${totalFmt}</td></tr>
      </table>
      <p style="font-weight:600;margin-bottom:4px">Productos</p>
      <ul style="margin-top:0">${itemsHtml}</ul>
      ${order.notes ? `<p style="color:#64748b"><strong>Notas:</strong> ${order.notes}</p>` : ""}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
      <p style="font-size:12px;color:#94a3b8">Tele Import S.A. — Notificación automática</p>
    </div>`;

  const transporter = getTransporter();

  // Modo dev / sin SMTP: dejamos evidencia en consola y no bloqueamos el flujo.
  if (!transporter) {
    console.log(
      `\n[Email] 📧 (modo dev — sin SMTP) Se notificaría al encargado <${MANAGER_EMAIL}>\n` +
        `Asunto: ${subject}\n${text}\n`
    );
    return;
  }

  try {
    await transporter.sendMail({ from: SMTP_FROM, to: MANAGER_EMAIL, subject, text, html });
    console.log(`[Email] Notificación del pedido ${order.orderNumber} enviada al encargado <${MANAGER_EMAIL}>`);
  } catch (err) {
    console.error(`[Email] Error enviando la notificación del pedido ${order.orderNumber}:`, err);
  }
}
