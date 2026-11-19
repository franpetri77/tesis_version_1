// =============================================
// PREGUNTAS FRECUENTES DEL ASISTENTE (T10)
// Respuestas automáticas del chat de la tienda, al estilo de los menús de
// WhatsApp: el visitante elige una pregunta y recibe la respuesta al
// instante, sin esperar a una persona. Si no le alcanza, "Hablar con una
// persona" lo lleva a la mensajería (T9), que requiere sesión.
//
// Los textos usan datos que publica el sitio o que confirmó la empresa
// (dirección del local, garantía de 6 meses) (envíos, retiro,
// horario, garantía oficial, facturación A por presupuesto, correo de
// ventas) y sólo prometen lo que el sistema hace hoy: el costo del envío se
// ve en el checkout y los cambios de estado se avisan en la campana (no por
// correo al cliente). Para cambiarlos alcanza con editar este archivo.
// =============================================

export interface FaqLink { label: string; href: string }

export interface FaqItem {
  id: string;
  /** Texto del botón (la pregunta del cliente). */
  question: string;
  /** Respuesta en párrafos cortos. */
  answer: string[];
  /** Accesos directos dentro del sitio. */
  links?: FaqLink[];
}

export const BOT_NAME = "Asistente de Tele Import";

export const BOT_GREETING = [
  "¡Hola! Soy el asistente de Tele Import.",
  "Elegí una consulta y te respondo al instante. Si necesitás algo más, te paso con una persona del equipo.",
];

export const STORE_HOURS = "lunes a viernes de 9 a 18 h";
export const STORE_EMAIL = "ventas@teleimport.com.ar";
export const STORE_ADDRESS = "Hipermercado Libertad Rodríguez del Busto (Córdoba)";

export const FAQ: FaqItem[] = [
  {
    id: "envios",
    question: "¿Cuánto cuesta el envío?",
    answer: [
      "Enviamos a todo el país. El costo del envío se muestra en el checkout, antes de pagar.",
      `Si estás en Córdoba, también podés retirar tu pedido sin costo en el local del ${STORE_ADDRESS}.`,
    ],
    links: [{ label: "Ir al carrito", href: "/carrito" }],
  },
  {
    id: "retiro",
    question: "¿Puedo retirar en el local?",
    answer: [
      `Sí. Estamos en el ${STORE_ADDRESS}. En el checkout elegí "Retiro en sucursal" y no pagás envío.`,
      `Cuando el pedido está listo te avisamos en la campana de tu cuenta. Atendemos de ${STORE_HOURS}.`,
    ],
  },
  {
    id: "pagos",
    question: "¿Qué medios de pago aceptan?",
    answer: [
      "Pagás con Mercado Pago: tarjetas de crédito y débito, o dinero en tu cuenta de Mercado Pago.",
      "Las cuotas disponibles dependen de las promociones vigentes de cada tarjeta; las ves al momento de pagar.",
    ],
  },
  {
    id: "seguimiento",
    question: "¿Cómo sigo mi pedido?",
    answer: [
      "En \"Mis pedidos\" ves el estado de cada compra: pago confirmado, en preparación, listo, enviado y entregado.",
      "Además te avisamos en la campana de tu cuenta cada vez que cambia.",
    ],
    links: [{ label: "Ver mis pedidos", href: "/perfil/pedidos" }],
  },
  {
    id: "garantia",
    question: "¿Los productos tienen garantía?",
    answer: [
      "Sí, todos los productos tienen garantía oficial de 6 meses.",
      "Si tenés un problema con una compra, escribinos con el número de pedido y lo resolvemos.",
    ],
  },
  {
    id: "devoluciones",
    question: "¿Puedo cambiar o devolver un producto?",
    answer: [
      "Por la Ley de Defensa del Consumidor (24.240), en las compras a distancia tenés 10 días corridos desde que recibís el producto para arrepentirte de la compra.",
      "Escribinos con el número de pedido y te indicamos cómo seguir.",
    ],
  },
  {
    id: "empresas",
    question: "¿Hacen factura A o ventas por mayor?",
    answer: [
      "Sí. Para empresas y revendedores armamos presupuestos con facturación A y precios por cantidad.",
    ],
    links: [{ label: "Pedir un presupuesto", href: "/presupuesto" }],
  },
  {
    id: "horario",
    question: "¿Cuál es el horario de atención?",
    answer: [
      `Atendemos de ${STORE_HOURS}. Fuera de ese horario podés dejar tu consulta y te respondemos apenas volvamos.`,
      `También podés escribirnos a ${STORE_EMAIL}.`,
    ],
  },
];

export function faqById(id: string): FaqItem | undefined {
  return FAQ.find((f) => f.id === id);
}
