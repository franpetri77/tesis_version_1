const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign,
} = require("docx");
const fs = require("fs");

// ── Layout A4 con márgenes 3 cm (1701 DXA)
// Ancho útil = 11906 − 3402 = 8504 DXA
const C1 = 2000; // Requisito del alcance
const C2 = 1350; // Módulo del sistema
const C3 =  820; // Estado
const C4 = 2080; // Evidencia funcional
const C5 = 2254; // Observación académica
const TOTAL_W = C1 + C2 + C3 + C4 + C5; // 8504

const COLOR_HEADER = "1F3864";
const COLOR_IMP    = "C6EFCE"; // verde — implementado
const COLOR_PARC   = "FFEB9C"; // amarillo — parcial
const COLOR_FUT    = "FCE4D6"; // salmón — mejora futura
const COLOR_ROW_A  = "FFFFFF";
const COLOR_ROW_B  = "EFF3FB";

// ── helpers de texto ─────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial" })],
  });
}
function p(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 60, after: 100, line: 320 },
    children: [new TextRun({ text, size: 20, font: "Arial" })],
  });
}
function pEmpty() {
  return new Paragraph({ spacing: { before: 40, after: 40 } });
}
function hr() {
  return new Paragraph({
    spacing: { before: 140, after: 140 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
    children: [],
  });
}

// ── helpers de tabla ─────────────────────────────────────────────────────────
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function run(text, bold = false, color = "000000") {
  return new TextRun({ text: String(text ?? ""), size: 17, font: "Arial", bold, color });
}

function mkCell(content, width, fill, center = false) {
  const children = Array.isArray(content) ? content : [
    new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: 36, after: 36 },
      children: Array.isArray(content) ? content : [run(content)],
    }),
  ];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}

function hdrCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    shading: { fill: COLOR_HEADER, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        children: [run(text, true, "FFFFFF")],
      }),
    ],
  });
}

function textCell(text, width, fill, center = false) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    shading: { fill, type: ShadingType.CLEAR },
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    verticalAlign: VerticalAlign.TOP,
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 36, after: 36 },
        children: [run(text)],
      }),
    ],
  });
}

// colorFill según estado
function estadoFill(estado) {
  if (estado === "Implementado") return COLOR_IMP;
  if (estado === "Parcial")      return COLOR_PARC;
  return COLOR_FUT;
}

function mkRow(req, modulo, estado, evidencia, obs, rowFill) {
  const sf = estadoFill(estado);
  return new TableRow({
    children: [
      textCell(req,       C1, rowFill),
      textCell(modulo,    C2, rowFill),
      textCell(estado,    C3, sf, true),
      textCell(evidencia, C4, rowFill),
      textCell(obs,       C5, rowFill),
    ],
  });
}

// ── Datos de la matriz ───────────────────────────────────────────────────────
// [Requisito, Módulo, Estado, Evidencia funcional, Observación académica]
const rows = [

  // ── AUTENTICACIÓN Y ACCESO
  [
    "Registro de usuarios",
    "Módulo 1 – Autenticación",
    "Implementado",
    "POST /auth/register · Página /register",
    "Validación de campos, hash de contraseña con bcrypt y emisión de JWT al registrarse.",
  ],
  [
    "Inicio de sesión",
    "Módulo 1 – Autenticación",
    "Implementado",
    "POST /auth/login · Página /login · authStore (Zustand)",
    "Token JWT con expiración almacenado en estado global. Sesión persistente entre rutas.",
  ],
  [
    "Control de acceso por roles",
    "Módulo 1 – Autenticación",
    "Implementado",
    "Middleware requireAuth / requireAdmin · Roles: admin, customer, readonly",
    "Las rutas protegidas validan el rol tanto en el servidor (middleware) como en el cliente (redirect).",
  ],
  [
    "Gestión de perfil personal",
    "Módulo 1 – Autenticación",
    "Implementado",
    "PUT /auth/profile · Página /perfil",
    "El usuario puede actualizar sus datos personales desde su cuenta.",
  ],

  // ── USUARIOS
  [
    "Gestión de usuarios (admin)",
    "Módulo 6 – Pedidos y Usuarios",
    "Implementado",
    "GET/PUT/DELETE /admin/users · Página /admin/usuarios",
    "Listado de usuarios con paginación, cambio de rol y eliminación desde el panel administrativo.",
  ],

  // ── CATÁLOGO
  [
    "Catálogo público con paginación",
    "Módulo 2 – Catálogo Público",
    "Implementado",
    "GET /catalog/products · Página /catalogo · SSR con revalidate=120",
    "Renderizado en servidor para SEO y rendimiento. Paginación con preservación de filtros activos.",
  ],
  [
    "Filtros del catálogo",
    "Módulo 2 – Catálogo Público",
    "Implementado",
    "Params: categoria, buscar, precio_min, precio_max, orden, pagina · CatalogFilters.tsx",
    "Filtros combinables manejados mediante URL params. El cambio de criterio reinicia la paginación automáticamente.",
  ],
  [
    "Detalle de producto",
    "Módulo 2 – Catálogo Público",
    "Implementado",
    "GET /catalog/products/:slug · Página /catalogo/[slug]",
    "Vista con galería de imágenes, precio, stock disponible, descripción completa y sección de reseñas.",
  ],
  [
    "Zoom en imágenes de producto",
    "Módulo 2 – Catálogo Público",
    "Implementado",
    "Componente ProductImageGallery.tsx · Lightbox con cursor-zoom-in",
    "El click sobre la imagen principal abre una vista ampliada. El ícono ZoomIn indica al usuario la acción disponible.",
  ],
  [
    "Sección de productos destacados",
    "Módulo 2 – Catálogo Público",
    "Implementado",
    "?featured=true en GET /catalog/products · Sección en página de inicio",
    "Los productos marcados con is_featured=1 se muestran en el home. El campo se gestiona desde el panel admin.",
  ],

  // ── CARRITO Y CHECKOUT
  [
    "Carrito de compras persistente",
    "Módulo 3 – Carrito y Compra",
    "Implementado",
    "cartStore (Zustand) · Página /carrito",
    "Estado global persistente entre rutas. Permite agregar, modificar cantidad y eliminar ítems.",
  ],
  [
    "Validación de stock en tiempo real",
    "Módulo 3 – Carrito y Compra",
    "Implementado",
    "Validación al agregar al carrito y al confirmar checkout",
    "Impide avanzar si el stock disponible es insuficiente. Protección adicional en el servidor durante la creación del pedido.",
  ],
  [
    "Proceso de checkout con resumen",
    "Módulo 3 – Carrito y Compra",
    "Implementado",
    "Página /checkout · Resumen de ítems, entrega e importe",
    "Flujo completo: selección de método de entrega, dirección de envío, aplicación de cupón y confirmación del pedido.",
  ],
  [
    "Gestión de múltiples direcciones",
    "Módulo 3 – Carrito y Compra",
    "Implementado",
    "CRUD /auth/addresses · Página /perfil/direcciones",
    "El usuario puede registrar varias direcciones de envío y seleccionar una como predeterminada.",
  ],

  // ── MERCADO PAGO
  [
    "Integración con Mercado Pago",
    "Módulo 4 – Pagos",
    "Implementado",
    "POST /payments/create-preference · Webhook /webhooks/mercadopago · Tabla payments",
    "Generación de preferencia, redirección al portal de Mercado Pago y procesamiento de notificaciones IPN para actualizar el pedido.",
  ],
  [
    "Validación de monto en servidor",
    "Módulo 4 – Pagos",
    "Implementado",
    "Recálculo del total en backend antes de generar la preferencia",
    "Previene la manipulación del precio desde el cliente; el monto cobrado siempre proviene del cálculo del servidor.",
  ],

  // ── CUPONES
  [
    "Aplicación de cupones y descuentos",
    "Módulo 3 / Módulo 7 – Promociones",
    "Implementado",
    "Validación en checkout · POST validate-coupon",
    "Verifica vigencia, límite de usos y monto mínimo antes de aplicar el descuento.",
  ],

  // ── STOCK
  [
    "Gestión de productos (admin)",
    "Módulo 5 – Productos y Stock",
    "Implementado",
    "CRUD /admin/products · Página /admin/productos",
    "Alta, modificación y desactivación de productos con carga de imágenes, asignación de categorías y etiquetas.",
  ],
  [
    "Control y movimientos de stock",
    "Módulo 5 – Productos y Stock",
    "Implementado",
    "Tabla stock_movements · POST /reports/stock-movement · Página /admin/stock",
    "Registra ingresos, egresos, ajustes, ventas y devoluciones con usuario responsable y valores anterior/posterior.",
  ],
  [
    "Protección contra sobreventa (concurrencia)",
    "Complementario",
    "Implementado",
    "Bloqueo de stock durante la creación del pedido en el servidor",
    "Funcionalidad emergente no definida en el relevamiento inicial. Garantiza integridad del inventario ante compras simultáneas.",
  ],

  // ── PEDIDOS
  [
    "Gestión de pedidos (admin)",
    "Módulo 6 – Pedidos y Usuarios",
    "Implementado",
    "GET /reports/orders · PATCH /admin/orders/:id/status · Página /admin/pedidos",
    "Listado con filtro por estado. El administrador puede avanzar el ciclo de vida: pending → paid → processing → ready_to_ship → shipped → delivered.",
  ],
  [
    "Historial de pedidos (cliente)",
    "Módulo 6 – Pedidos y Usuarios",
    "Implementado",
    "GET /orders/my-orders · Página /mis-pedidos",
    "El cliente visualiza sus pedidos con detalle de ítems, importe y estado actual.",
  ],

  // ── PROMOCIONES
  [
    "Creación y gestión de promociones",
    "Módulo 7 – Promociones",
    "Implementado",
    "CRUD /admin/promotions · Tabla promotions · Página /admin/promociones",
    "Soporta tres tipos: descuento porcentual, monto fijo y envío gratuito. Configurable con vigencia, límite de usos y monto mínimo.",
  ],

  // ── RESEÑAS
  [
    "Reseñas y calificaciones",
    "Módulo 8 – Reseñas",
    "Implementado",
    "Tabla product_reviews · Panel /admin/resenas",
    "Sistema de calificación (1–5 estrellas) y comentario. Una reseña por usuario/producto. Requiere aprobación del administrador.",
  ],

  // ── NOTIFICACIONES
  [
    "Notificaciones internas",
    "Módulo 9 – Notificaciones",
    "Implementado",
    "Tabla notifications · GET /auth/notifications · Componente NotificationBell.tsx",
    "Genera eventos de tipo order_new, order_status, stock_low y review_new. Visualización desde el panel mediante el ícono de campana.",
  ],

  // ── REPORTES
  [
    "Reporte de ventas por período",
    "Módulo 10 – Reportes",
    "Implementado",
    "GET /reports/sales · Página /admin/reportes",
    "Filtrables por rango de fechas. Incluye ingresos totales, cantidad de pedidos y ticket promedio.",
  ],
  [
    "Ranking de productos vendidos",
    "Módulo 10 – Reportes",
    "Implementado",
    "GET /reports/top-products · GET /reports/worst-products",
    "Ordenados por volumen de unidades vendidas. Permite identificar productos de mayor y menor rendimiento comercial.",
  ],
  [
    "Reporte de productos más visitados",
    "Módulo 10 – Reportes",
    "Implementado",
    "GET /reports/most-visited-products · Tabla product_views",
    "Funcionalidad complementaria emergente. Registra visitas anónimas y autenticadas al detalle de producto; filtrable por rango de fechas.",
  ],
  [
    "Métricas globales del negocio",
    "Módulo 10 / Complementario",
    "Implementado",
    "GET /reports/metrics · Página /admin (dashboard)",
    "KPIs disponibles al ingresar al panel: total de pedidos, ingresos acumulados, productos activos y usuarios registrados.",
  ],

  // ── AUDITORÍA
  [
    "Auditoría de operaciones",
    "Módulo 11 – Auditoría",
    "Implementado",
    "Tabla audit_logs · Página /admin/auditoria",
    "Registro automático de operaciones críticas con usuario responsable, entidad afectada, valores anterior y posterior, e IP.",
  ],

  // ── MEJORAS FUTURAS
  [
    "Recomendaciones de productos",
    "No definido en el alcance",
    "Mejora futura",
    "Sin endpoint ni componente implementado",
    "Requeriría motor de sugerencias basado en historial de compras o comportamiento de navegación. Fuera del alcance original.",
  ],
  [
    "Chat en vivo con el vendedor",
    "Excluido del alcance",
    "Mejora futura",
    "Sin implementación",
    "Requiere infraestructura de WebSockets y canal de atención en tiempo real. Identificado en el relevamiento como funcionalidad diferida.",
  ],
  [
    "Compartir productos en redes sociales",
    "Excluido del alcance",
    "Mejora futura",
    "Sin implementación",
    "Requiere integración con APIs de terceros (Facebook, WhatsApp, etc.). Excluido por dependencia externa y prioridad no crítica.",
  ],
  [
    "Notificaciones externas por email",
    "Excluido del alcance",
    "Mejora futura",
    "Sin implementación",
    "Requiere proveedor SMTP externo (SendGrid, SES, etc.). Las notificaciones internas del sistema cubren parcialmente esta necesidad.",
  ],
  [
    "Notificaciones push",
    "Excluido del alcance",
    "Mejora futura",
    "Sin implementación",
    "Requiere integración con servicio de mensajería push (Firebase FCM u equivalente). Excluido por complejidad de infraestructura.",
  ],
  [
    "Facturación electrónica",
    "Excluido del alcance",
    "Mejora futura",
    "Sin implementación",
    "Requiere integración con AFIP o herramienta de emisión de comprobantes fiscales. Definido como fuera del alcance del proyecto.",
  ],
  [
    "Gestión logística de entregas",
    "Excluido del alcance",
    "Mejora futura",
    "Sin implementación",
    "El sistema registra el método de entrega elegido, pero no gestiona la coordinación con operadores logísticos externos.",
  ],
];

// ── Construcción del documento ───────────────────────────────────────────────

const headerRow = new TableRow({
  tableHeader: true,
  children: [
    hdrCell("Requisito del alcance",  C1),
    hdrCell("Módulo del sistema",     C2),
    hdrCell("Estado",                 C3),
    hdrCell("Evidencia funcional",    C4),
    hdrCell("Observación académica",  C5),
  ],
});

const dataRows = rows.map((r, i) => mkRow(r[0], r[1], r[2], r[3], r[4], i % 2 === 0 ? COLOR_ROW_A : COLOR_ROW_B));

const matrizTable = new Table({
  width: { size: TOTAL_W, type: WidthType.DXA },
  columnWidths: [C1, C2, C3, C4, C5],
  rows: [headerRow, ...dataRows],
});

const leyenda = [
  { color: COLOR_IMP,  label: "Implementado – funcionalidad completamente desarrollada y operativa en el sistema." },
  { color: COLOR_PARC, label: "Parcial – funcionalidad implementada con alcance reducido respecto a lo especificado." },
  { color: COLOR_FUT,  label: "Mejora futura – funcionalidad identificada pero excluida del presente proyecto." },
];

function leyendaRow(color, label) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 600, type: WidthType.DXA },
        borders: BORDERS,
        shading: { fill: color, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [] })],
      }),
      new TableCell({
        width: { size: TOTAL_W - 600, type: WidthType.DXA },
        borders: BORDERS,
        shading: { fill: COLOR_ROW_A, type: ShadingType.CLEAR },
        margins: { top: 40, bottom: 40, left: 100, right: 100 },
        children: [
          new Paragraph({
            spacing: { before: 30, after: 30 },
            children: [new TextRun({ text: label, size: 17, font: "Arial" })],
          }),
        ],
      }),
    ],
  });
}

const leyendaTable = new Table({
  width: { size: TOTAL_W, type: WidthType.DXA },
  columnWidths: [600, TOTAL_W - 600],
  rows: leyenda.map((l) => leyendaRow(l.color, l.label)),
});

const children = [
  h1("MATRIZ DE VALIDACIÓN DEL ALCANCE"),
  p(
    "La siguiente matriz contrasta los requisitos definidos en el mandato del proyecto con el " +
    "estado de implementación efectiva del sistema desarrollado. Para cada requisito se indica " +
    "el módulo funcional al que pertenece, el estado de cumplimiento, la evidencia técnica " +
    "observable y una observación de carácter académico."
  ),
  pEmpty(),
  p(
    "Los requisitos marcados como 'Mejora futura' corresponden a funcionalidades identificadas " +
    "durante el relevamiento pero excluidas del alcance del presente proyecto, ya sea por " +
    "complejidad técnica, dependencia de infraestructura externa o por no resultar prioritarias " +
    "para los objetivos centrales del sistema."
  ),
  pEmpty(),
  p("Referencia de estados:"),
  pEmpty(),
  leyendaTable,
  pEmpty(),
  hr(),
  pEmpty(),
  matrizTable,
  pEmpty(),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 18 } } },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 16838, height: 11906 }, // A4 apaisado
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // ~2 cm
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = "C:/Users/popet/OneDrive/Desktop/nuevotesis/Matriz_Validacion.docx";
  fs.writeFileSync(out, buffer);
  console.log("Generado:", out);
});
