const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageBreak,
} = require("docx");
const fs = require("fs");

// ── Paleta ────────────────────────────────────────────────────────────────────
const COLOR_HEADER = "1F3864";   // Azul oscuro para encabezados de tabla
const COLOR_SUB    = "2E5FA3";   // Azul medio para subtítulos de tabla
const COLOR_LIGHT  = "D9E2F3";   // Azul muy claro para filas pares
const COLOR_WHITE  = "FFFFFF";

// ── Helpers de texto ─────────────────────────────────────────────────────────
const FONT = "Arial";
const SIZE_BODY  = 22; // 11pt
const SIZE_H1    = 28; // 14pt
const SIZE_H2    = 24; // 12pt
const SIZE_H3    = 22; // 11pt bold
const LINE_15    = 360;

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 180 },
    children: [new TextRun({ text, bold: true, size: SIZE_H1, font: FONT, color: "1F3864" })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 140 },
    children: [new TextRun({ text, bold: true, size: SIZE_H2, font: FONT, color: "2E5FA3" })],
  });
}
function h3(text) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: SIZE_H3, font: FONT })],
  });
}
function p(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80, line: LINE_15 },
    children: [new TextRun({ text, size: SIZE_BODY, font: FONT })],
  });
}
function pB(parts) {
  // parts: [{text, bold?}]
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80, line: LINE_15 },
    children: parts.map(
      (pt) => new TextRun({ text: pt.text, bold: !!pt.bold, size: SIZE_BODY, font: FONT })
    ),
  });
}
function empty() {
  return new Paragraph({ spacing: { before: 60, after: 60 } });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function note(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 140, after: 140 },
    border: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      left:   { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
      right:  { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
    },
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
    children: [new TextRun({ text, italics: true, size: SIZE_BODY, font: FONT, color: "555555" })],
  });
}
function bullet(label, body) {
  const children = [];
  children.push(new TextRun({ text: "•  ", size: SIZE_BODY, font: FONT }));
  if (label) children.push(new TextRun({ text: label + ": ", bold: true, size: SIZE_BODY, font: FONT }));
  children.push(new TextRun({ text: body, size: SIZE_BODY, font: FONT }));
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 60, after: 60, line: LINE_15 },
    indent: { left: 600, hanging: 260 },
    children,
  });
}
function bullet2(body) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 50, after: 50, line: LINE_15 },
    indent: { left: 900, hanging: 260 },
    children: [
      new TextRun({ text: "–  ", size: SIZE_BODY, font: FONT }),
      new TextRun({ text: body, size: SIZE_BODY, font: FONT }),
    ],
  });
}

// ── Helpers de tabla ─────────────────────────────────────────────────────────
const BORDER_CELL = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
  left:   { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
  right:  { style: BorderStyle.SINGLE, size: 4, color: "AAAAAA" },
};

function cell(text, { bold = false, shade = null, width = 2000, color = "000000" } = {}) {
  return new TableCell({
    borders: BORDER_CELL,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20, font: FONT, color })],
      }),
    ],
  });
}

// Tabla de diccionario: nombre de tabla + descripción + filas de campos
function dictTable(tableName, tableDesc, fields) {
  // fields: [{key, campo, tipo, tamano, descripcion}]
  // key = 'PK' | 'FK' | ''
  const TOTAL = 9026; // A4 contenido en DXA
  const COL = [800, 2200, 1600, 900, 3526]; // clave, campo, tipo, tamaño, descripción

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      cell("Clave",       { bold: true, shade: COLOR_HEADER, color: COLOR_WHITE, width: COL[0] }),
      cell("Campo",       { bold: true, shade: COLOR_HEADER, color: COLOR_WHITE, width: COL[1] }),
      cell("Tipo",        { bold: true, shade: COLOR_HEADER, color: COLOR_WHITE, width: COL[2] }),
      cell("Tamaño",      { bold: true, shade: COLOR_HEADER, color: COLOR_WHITE, width: COL[3] }),
      cell("Descripción", { bold: true, shade: COLOR_HEADER, color: COLOR_WHITE, width: COL[4] }),
    ],
  });

  const dataRows = fields.map((f, i) =>
    new TableRow({
      children: [
        cell(f.key  || "",  { shade: i % 2 === 0 ? COLOR_LIGHT : COLOR_WHITE, width: COL[0] }),
        cell(f.campo,        { bold: f.key === "PK", shade: i % 2 === 0 ? COLOR_LIGHT : COLOR_WHITE, width: COL[1] }),
        cell(f.tipo,         { shade: i % 2 === 0 ? COLOR_LIGHT : COLOR_WHITE, width: COL[2] }),
        cell(f.tamano || "", { shade: i % 2 === 0 ? COLOR_LIGHT : COLOR_WHITE, width: COL[3] }),
        cell(f.desc  || "", { shade: i % 2 === 0 ? COLOR_LIGHT : COLOR_WHITE, width: COL[4] }),
      ],
    })
  );

  return [
    empty(),
    pB([{ text: tableName, bold: true }, { text: " — " + tableDesc }]),
    new Table({
      width: { size: TOTAL, type: WidthType.DXA },
      columnWidths: COL,
      rows: [headerRow, ...dataRows],
    }),
    empty(),
  ];
}

// ── Tablas de módulos funcionales ─────────────────────────────────────────────
function modulesTable(rows) {
  const COL = [1800, 3200, 4026];
  const TOTAL = COL.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: COL,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell("Módulo",        { bold: true, shade: COLOR_HEADER, color: COLOR_WHITE, width: COL[0] }),
          cell("Responsabilidad", { bold: true, shade: COLOR_HEADER, color: COLOR_WHITE, width: COL[1] }),
          cell("Endpoints / Componentes clave", { bold: true, shade: COLOR_HEADER, color: COLOR_WHITE, width: COL[2] }),
        ],
      }),
      ...rows.map((r, i) =>
        new TableRow({
          children: [
            cell(r[0], { bold: true, shade: i % 2 === 0 ? COLOR_LIGHT : COLOR_WHITE, width: COL[0] }),
            cell(r[1], { shade: i % 2 === 0 ? COLOR_LIGHT : COLOR_WHITE, width: COL[1] }),
            cell(r[2], { shade: i % 2 === 0 ? COLOR_LIGHT : COLOR_WHITE, width: COL[2] }),
          ],
        })
      ),
    ],
  });
}

// ── DATOS ─────────────────────────────────────────────────────────────────────

const modulesData = [
  ["Autenticación",        "Registro, login y emisión de tokens JWT",                        "POST /auth/register · POST /auth/login · middleware requireAuth"],
  ["Usuarios y Roles",     "Gestión de cuentas, perfiles y control de acceso por rol",       "GET/PUT/DELETE /admin/users · roles: admin, customer, readonly"],
  ["Catálogo Público",     "Listado de productos con filtros, paginación y búsqueda",        "GET /catalog/products · GET /catalog/categories · GET /catalog/products/featured"],
  ["Detalle de Producto",  "Vista completa de un producto, galería e imágenes ampliadas",    "GET /catalog/products/:slug · ProductImageGallery · ProductViewTracker"],
  ["Carrito de Compras",   "Estado local del carrito, validación de stock en tiempo real",   "Zustand cartStore · AddToCartButton · CartDrawer"],
  ["Checkout",             "Resumen de compra, dirección, cupón y confirmación de pedido",   "POST /payments/create-order · POST /payments/validate-coupon"],
  ["Pagos",                "Integración con Mercado Pago: preferencia, webhook y estado",    "POST /payments/create-preference · POST /payments/webhook"],
  ["Pedidos",              "Ciclo de vida del pedido y seguimiento por cliente y admin",     "GET /reports/orders · PUT /admin/orders/:id/status"],
  ["Stock",                "Movimientos de inventario con historial y trazabilidad",         "POST /reports/stock-movement · GET /reports/stock-movements"],
  ["Promociones",          "Cupones de descuento: porcentual, monto fijo, envío gratis",     "GET /reports/promotions · validate-coupon (checkout)"],
  ["Reseñas",              "Comentarios de clientes y moderación por administrador",         "GET/POST /catalog/products/:id/reviews · GET/PATCH/DELETE /admin/reviews"],
  ["Notificaciones",       "Alertas internas sobre pedidos, stock y nuevas reseñas",         "Tabla notifications · servicio notifyOrderStatusChange"],
  ["Reportes",             "Analítica de ventas, productos y visitas por período",           "GET /reports/sales · /top-products · /worst-products · /most-visited-products · /metrics"],
  ["Auditoría",            "Registro de operaciones con detalle de usuario y valores",       "GET /admin/audit-logs · tabla audit_logs"],
  ["Tracking de Visitas",  "Conteo de visualizaciones por producto con filtro de fechas",   "POST /catalog/products/:id/view · tabla product_views"],
];

// ── Diccionario de datos ──────────────────────────────────────────────────────
const dictData = [
  {
    name: "users", desc: "Usuarios del sistema (clientes y administradores)",
    fields: [
      { key: "PK", campo: "id",         tipo: "VARCHAR(50)",  tamano: "50",  desc: "Identificador único (UUID)" },
      { key: "",   campo: "email",       tipo: "VARCHAR(255)", tamano: "255", desc: "Correo electrónico — único en el sistema" },
      { key: "",   campo: "password",    tipo: "VARCHAR(255)", tamano: "255", desc: "Hash bcrypt de la contraseña" },
      { key: "",   campo: "first_name",  tipo: "VARCHAR(100)", tamano: "100", desc: "Nombre del usuario" },
      { key: "",   campo: "last_name",   tipo: "VARCHAR(100)", tamano: "100", desc: "Apellido del usuario" },
      { key: "",   campo: "phone",       tipo: "VARCHAR(50)",  tamano: "50",  desc: "Teléfono de contacto (nullable)" },
      { key: "",   campo: "role",        tipo: "ENUM",         tamano: "",    desc: "Rol: admin | customer | readonly" },
      { key: "",   campo: "created_at",  tipo: "DATETIME",     tamano: "",    desc: "Fecha de creación (automática)" },
      { key: "",   campo: "updated_at",  tipo: "DATETIME",     tamano: "",    desc: "Fecha de última actualización (auto)" },
    ],
  },
  {
    name: "categories", desc: "Árbol de categorías de productos",
    fields: [
      { key: "PK", campo: "id",          tipo: "VARCHAR(50)",  tamano: "50",  desc: "Identificador único" },
      { key: "",   campo: "name",         tipo: "VARCHAR(255)", tamano: "255", desc: "Nombre de la categoría" },
      { key: "",   campo: "slug",         tipo: "VARCHAR(255)", tamano: "255", desc: "URL amigable — único" },
      { key: "",   campo: "description",  tipo: "TEXT",         tamano: "",    desc: "Descripción opcional" },
      { key: "",   campo: "image_url",    tipo: "TEXT",         tamano: "",    desc: "URL de imagen representativa" },
      { key: "FK", campo: "parent_id",    tipo: "VARCHAR(50)",  tamano: "50",  desc: "Referencia a categoría padre (nullable)" },
      { key: "",   campo: "sort_order",   tipo: "INT",          tamano: "",    desc: "Orden de visualización" },
      { key: "",   campo: "is_active",    tipo: "TINYINT(1)",   tamano: "",    desc: "1 = activa, 0 = oculta" },
    ],
  },
  {
    name: "products", desc: "Catálogo de productos comercializados",
    fields: [
      { key: "PK", campo: "id",                tipo: "VARCHAR(50)",   tamano: "50",  desc: "Identificador único" },
      { key: "",   campo: "name",               tipo: "VARCHAR(255)",  tamano: "255", desc: "Nombre del producto" },
      { key: "",   campo: "slug",               tipo: "VARCHAR(255)",  tamano: "255", desc: "URL amigable — único" },
      { key: "",   campo: "description",        tipo: "TEXT",          tamano: "",    desc: "Descripción completa" },
      { key: "",   campo: "short_description",  tipo: "TEXT",          tamano: "",    desc: "Descripción breve para resumen" },
      { key: "",   campo: "sku",                tipo: "VARCHAR(100)",  tamano: "100", desc: "Código interno de inventario — único" },
      { key: "",   campo: "price",              tipo: "DECIMAL(15,2)", tamano: "",    desc: "Precio de venta" },
      { key: "",   campo: "compare_price",      tipo: "DECIMAL(15,2)", tamano: "",    desc: "Precio de comparación (antes del descuento)" },
      { key: "FK", campo: "category_id",        tipo: "VARCHAR(50)",   tamano: "50",  desc: "Referencia a categories" },
      { key: "",   campo: "stock_quantity",      tipo: "INT",           tamano: "",    desc: "Unidades disponibles" },
      { key: "",   campo: "is_active",           tipo: "TINYINT(1)",    tamano: "",    desc: "1 = visible en catálogo" },
      { key: "",   campo: "is_featured",         tipo: "TINYINT(1)",    tamano: "",    desc: "1 = destacado en página principal" },
      { key: "",   campo: "brand",               tipo: "VARCHAR(100)",  tamano: "100", desc: "Marca del producto" },
      { key: "",   campo: "model",               tipo: "VARCHAR(100)",  tamano: "100", desc: "Modelo del producto" },
      { key: "",   campo: "created_at",          tipo: "DATETIME",      tamano: "",    desc: "Fecha de alta" },
      { key: "",   campo: "updated_at",          tipo: "DATETIME",      tamano: "",    desc: "Última modificación (auto)" },
    ],
  },
  {
    name: "product_images", desc: "Imágenes asociadas a cada producto",
    fields: [
      { key: "PK", campo: "id",          tipo: "VARCHAR(50)", tamano: "50",  desc: "Identificador único" },
      { key: "FK", campo: "product_id",  tipo: "VARCHAR(50)", tamano: "50",  desc: "Referencia a products (CASCADE DELETE)" },
      { key: "",   campo: "image_url",   tipo: "TEXT",        tamano: "",    desc: "URL de la imagen" },
      { key: "",   campo: "alt_text",    tipo: "VARCHAR(255)",tamano: "255", desc: "Texto alternativo para accesibilidad" },
      { key: "",   campo: "sort_order",  tipo: "INT",         tamano: "",    desc: "Orden de aparición en la galería" },
    ],
  },
  {
    name: "product_tags", desc: "Etiquetas para búsqueda y filtrado",
    fields: [
      { key: "PK", campo: "id",    tipo: "VARCHAR(50)",  tamano: "50",  desc: "Identificador único" },
      { key: "",   campo: "name",  tipo: "VARCHAR(100)", tamano: "100", desc: "Nombre de la etiqueta" },
      { key: "",   campo: "slug",  tipo: "VARCHAR(100)", tamano: "100", desc: "Versión URL de la etiqueta — único" },
    ],
  },
  {
    name: "product_tag_map", desc: "Relación muchos-a-muchos entre productos y etiquetas",
    fields: [
      { key: "FK", campo: "product_id", tipo: "VARCHAR(50)", tamano: "50", desc: "Referencia a products (PK compuesta)" },
      { key: "FK", campo: "tag_id",     tipo: "VARCHAR(50)", tamano: "50", desc: "Referencia a product_tags (PK compuesta)" },
    ],
  },
  {
    name: "addresses", desc: "Direcciones de envío registradas por los usuarios",
    fields: [
      { key: "PK", campo: "id",           tipo: "VARCHAR(50)",  tamano: "50",  desc: "Identificador único" },
      { key: "FK", campo: "user_id",       tipo: "VARCHAR(50)",  tamano: "50",  desc: "Referencia a users (CASCADE DELETE)" },
      { key: "",   campo: "street",        tipo: "VARCHAR(255)", tamano: "255", desc: "Nombre de la calle" },
      { key: "",   campo: "number",        tipo: "VARCHAR(20)",  tamano: "20",  desc: "Número de puerta" },
      { key: "",   campo: "floor",         tipo: "VARCHAR(20)",  tamano: "20",  desc: "Piso (opcional)" },
      { key: "",   campo: "apartment",     tipo: "VARCHAR(20)",  tamano: "20",  desc: "Departamento (opcional)" },
      { key: "",   campo: "city",          tipo: "VARCHAR(100)", tamano: "100", desc: "Ciudad" },
      { key: "",   campo: "province",      tipo: "VARCHAR(100)", tamano: "100", desc: "Provincia" },
      { key: "",   campo: "postal_code",   tipo: "VARCHAR(20)",  tamano: "20",  desc: "Código postal" },
      { key: "",   campo: "is_default",    tipo: "TINYINT(1)",   tamano: "",    desc: "1 = dirección predeterminada del usuario" },
    ],
  },
  {
    name: "orders", desc: "Pedidos generados en el proceso de checkout",
    fields: [
      { key: "PK", campo: "id",               tipo: "VARCHAR(50)",   tamano: "50",  desc: "Identificador único (UUID)" },
      { key: "",   campo: "order_number",      tipo: "VARCHAR(50)",   tamano: "50",  desc: "Código legible (ej. TI-20240501-A1B2C3)" },
      { key: "FK", campo: "user_id",           tipo: "VARCHAR(50)",   tamano: "50",  desc: "Referencia a users" },
      { key: "",   campo: "status",            tipo: "ENUM",          tamano: "",    desc: "pending | paid | processing | shipped | delivered | cancelled | refunded" },
      { key: "",   campo: "subtotal",          tipo: "DECIMAL(15,2)", tamano: "",    desc: "Suma de ítems antes de descuentos" },
      { key: "",   campo: "discount_amount",   tipo: "DECIMAL(15,2)", tamano: "",    desc: "Importe de descuento aplicado" },
      { key: "",   campo: "shipping_cost",     tipo: "DECIMAL(15,2)", tamano: "",    desc: "Costo de envío" },
      { key: "",   campo: "total",             tipo: "DECIMAL(15,2)", tamano: "",    desc: "Total cobrado al cliente" },
      { key: "",   campo: "delivery_method",   tipo: "ENUM",          tamano: "",    desc: "pickup | shipping" },
      { key: "",   campo: "shipping_address",  tipo: "TEXT",          tamano: "",    desc: "Dirección de entrega serializada en JSON" },
      { key: "",   campo: "created_at",        tipo: "DATETIME",      tamano: "",    desc: "Fecha y hora del pedido" },
    ],
  },
  {
    name: "order_items", desc: "Líneas de detalle de cada pedido",
    fields: [
      { key: "PK", campo: "id",           tipo: "VARCHAR(50)",   tamano: "50", desc: "Identificador único" },
      { key: "FK", campo: "order_id",     tipo: "VARCHAR(50)",   tamano: "50", desc: "Referencia a orders (CASCADE DELETE)" },
      { key: "FK", campo: "product_id",   tipo: "VARCHAR(50)",   tamano: "50", desc: "Referencia a products" },
      { key: "",   campo: "quantity",     tipo: "INT",           tamano: "",   desc: "Cantidad comprada" },
      { key: "",   campo: "unit_price",   tipo: "DECIMAL(15,2)", tamano: "",   desc: "Precio unitario validado en el servidor" },
      { key: "",   campo: "total_price",  tipo: "DECIMAL(15,2)", tamano: "",   desc: "unit_price × quantity" },
    ],
  },
  {
    name: "payments", desc: "Registros de pago asociados a pedidos (Mercado Pago)",
    fields: [
      { key: "PK", campo: "id",                tipo: "VARCHAR(50)",   tamano: "50",  desc: "Identificador único" },
      { key: "FK", campo: "order_id",          tipo: "VARCHAR(50)",   tamano: "50",  desc: "Referencia a orders" },
      { key: "",   campo: "mp_payment_id",     tipo: "VARCHAR(100)",  tamano: "100", desc: "ID del pago en Mercado Pago" },
      { key: "",   campo: "mp_preference_id",  tipo: "VARCHAR(100)",  tamano: "100", desc: "ID de preferencia generada en MP" },
      { key: "",   campo: "status",            tipo: "ENUM",          tamano: "",    desc: "pending | approved | rejected | cancelled | refunded" },
      { key: "",   campo: "amount",            tipo: "DECIMAL(15,2)", tamano: "",    desc: "Monto cobrado" },
      { key: "",   campo: "currency",          tipo: "VARCHAR(10)",   tamano: "10",  desc: "Moneda (ARS por defecto)" },
      { key: "",   campo: "payment_method",    tipo: "VARCHAR(100)",  tamano: "100", desc: "Medio de pago reportado por MP" },
      { key: "",   campo: "raw_response",      tipo: "TEXT",          tamano: "",    desc: "Respuesta completa del webhook para auditoría" },
    ],
  },
  {
    name: "promotions", desc: "Códigos de descuento y cupones",
    fields: [
      { key: "PK", campo: "id",               tipo: "VARCHAR(50)",   tamano: "50",  desc: "Identificador único" },
      { key: "",   campo: "code",              tipo: "VARCHAR(50)",   tamano: "50",  desc: "Código ingresado por el cliente — único" },
      { key: "",   campo: "name",              tipo: "VARCHAR(255)",  tamano: "255", desc: "Nombre descriptivo de la promoción" },
      { key: "",   campo: "type",              tipo: "ENUM",          tamano: "",    desc: "percentage | fixed_amount | free_shipping" },
      { key: "",   campo: "value",             tipo: "DECIMAL(15,2)", tamano: "",    desc: "Valor del descuento (porcentaje o monto fijo)" },
      { key: "",   campo: "min_order_amount",  tipo: "DECIMAL(15,2)", tamano: "",    desc: "Monto mínimo de compra para aplicar el cupón" },
      { key: "",   campo: "max_uses",          tipo: "INT",           tamano: "",    desc: "Límite de usos totales (null = ilimitado)" },
      { key: "",   campo: "current_uses",      tipo: "INT",           tamano: "",    desc: "Contador de usos acumulados" },
      { key: "",   campo: "is_active",         tipo: "TINYINT(1)",    tamano: "",    desc: "1 = cupón habilitado" },
      { key: "",   campo: "valid_from",        tipo: "VARCHAR(20)",   tamano: "20",  desc: "Fecha de inicio de vigencia (YYYY-MM-DD)" },
      { key: "",   campo: "valid_until",       tipo: "VARCHAR(20)",   tamano: "20",  desc: "Fecha de vencimiento (null = sin límite)" },
    ],
  },
  {
    name: "stock_movements", desc: "Historial de movimientos de inventario",
    fields: [
      { key: "PK", campo: "id",                tipo: "VARCHAR(50)", tamano: "50", desc: "Identificador único" },
      { key: "FK", campo: "product_id",        tipo: "VARCHAR(50)", tamano: "50", desc: "Referencia a products" },
      { key: "",   campo: "type",              tipo: "ENUM",        tamano: "",   desc: "ingreso | egreso | ajuste | venta | devolucion" },
      { key: "",   campo: "quantity",          tipo: "INT",         tamano: "",   desc: "Cantidad del movimiento" },
      { key: "",   campo: "previous_quantity", tipo: "INT",         tamano: "",   desc: "Stock antes del movimiento" },
      { key: "",   campo: "new_quantity",      tipo: "INT",         tamano: "",   desc: "Stock después del movimiento" },
      { key: "",   campo: "reason",            tipo: "TEXT",        tamano: "",   desc: "Motivo del movimiento (nullable)" },
      { key: "FK", campo: "user_id",           tipo: "VARCHAR(50)", tamano: "50", desc: "Usuario que realizó el movimiento" },
      { key: "",   campo: "created_at",        tipo: "DATETIME",    tamano: "",   desc: "Fecha y hora del movimiento" },
    ],
  },
  {
    name: "audit_logs", desc: "Registro de auditoría de operaciones del sistema",
    fields: [
      { key: "PK", campo: "id",              tipo: "VARCHAR(50)",  tamano: "50",  desc: "Identificador único" },
      { key: "",   campo: "action",          tipo: "VARCHAR(100)", tamano: "100", desc: "Tipo de acción (ej. stock_ingreso, stock_egreso)" },
      { key: "",   campo: "entity_type",     tipo: "VARCHAR(100)", tamano: "100", desc: "Entidad afectada (ej. product)" },
      { key: "",   campo: "entity_id",       tipo: "VARCHAR(50)",  tamano: "50",  desc: "ID del registro afectado" },
      { key: "FK", campo: "user_id",         tipo: "VARCHAR(50)",  tamano: "50",  desc: "Usuario responsable de la acción (nullable)" },
      { key: "",   campo: "previous_value",  tipo: "TEXT",         tamano: "",    desc: "Estado anterior serializado en JSON" },
      { key: "",   campo: "new_value",       tipo: "TEXT",         tamano: "",    desc: "Estado nuevo serializado en JSON" },
      { key: "",   campo: "ip_address",      tipo: "VARCHAR(45)",  tamano: "45",  desc: "Dirección IP del solicitante" },
      { key: "",   campo: "created_at",      tipo: "DATETIME",     tamano: "",    desc: "Fecha y hora del evento" },
    ],
  },
  {
    name: "notifications", desc: "Notificaciones internas del sistema",
    fields: [
      { key: "PK", campo: "id",         tipo: "VARCHAR(50)",  tamano: "50",  desc: "Identificador único" },
      { key: "FK", campo: "user_id",    tipo: "VARCHAR(50)",  tamano: "50",  desc: "Usuario destinatario (CASCADE DELETE)" },
      { key: "",   campo: "type",       tipo: "ENUM",         tamano: "",    desc: "order_new | order_status | stock_low | review_new" },
      { key: "",   campo: "title",      tipo: "VARCHAR(255)", tamano: "255", desc: "Título de la notificación" },
      { key: "",   campo: "message",    tipo: "TEXT",         tamano: "",    desc: "Cuerpo del mensaje" },
      { key: "",   campo: "is_read",    tipo: "TINYINT(1)",   tamano: "",    desc: "0 = no leída, 1 = leída" },
      { key: "",   campo: "link",       tipo: "VARCHAR(500)", tamano: "500", desc: "URL de navegación relacionada (opcional)" },
      { key: "",   campo: "created_at", tipo: "DATETIME",     tamano: "",    desc: "Fecha de creación" },
    ],
  },
  {
    name: "product_reviews", desc: "Reseñas y calificaciones de productos por clientes",
    fields: [
      { key: "PK", campo: "id",           tipo: "VARCHAR(50)", tamano: "50",  desc: "Identificador único" },
      { key: "FK", campo: "product_id",   tipo: "VARCHAR(50)", tamano: "50",  desc: "Referencia a products (CASCADE DELETE)" },
      { key: "FK", campo: "user_id",      tipo: "VARCHAR(50)", tamano: "50",  desc: "Referencia a users" },
      { key: "",   campo: "rating",       tipo: "TINYINT",     tamano: "",    desc: "Puntuación del 1 al 5" },
      { key: "",   campo: "title",        tipo: "VARCHAR(255)",tamano: "255", desc: "Título de la reseña (opcional)" },
      { key: "",   campo: "body",         tipo: "TEXT",        tamano: "",    desc: "Contenido de la reseña" },
      { key: "",   campo: "is_approved",  tipo: "TINYINT(1)",  tamano: "",    desc: "0 = pendiente de moderación, 1 = aprobada" },
      { key: "",   campo: "created_at",   tipo: "DATETIME",    tamano: "",    desc: "Fecha de envío" },
    ],
  },
  {
    name: "product_views", desc: "Visitas registradas a la página de detalle de cada producto",
    fields: [
      { key: "PK", campo: "id",           tipo: "VARCHAR(50)", tamano: "50", desc: "Identificador único" },
      { key: "FK", campo: "product_id",   tipo: "VARCHAR(50)", tamano: "50", desc: "Referencia a products (CASCADE DELETE)" },
      { key: "",   campo: "user_id",      tipo: "VARCHAR(50)", tamano: "50", desc: "Usuario autenticado que visitó (nullable = anónimo)" },
      { key: "",   campo: "ip_address",   tipo: "VARCHAR(45)", tamano: "45", desc: "Dirección IP del visitante" },
      { key: "",   campo: "created_at",   tipo: "DATETIME",    tamano: "",   desc: "Fecha y hora de la visita" },
    ],
  },
];

// ── CONSTRUCCIÓN DEL DOCUMENTO ────────────────────────────────────────────────
const children = [];

// ═══════════════════════════════════════════════════════════════════
// CAPÍTULO 6
// ═══════════════════════════════════════════════════════════════════
children.push(h1("Capítulo 6: Diseño y Modelación del Sistema"));
children.push(p(
  "El presente capítulo describe el diseño arquitectónico y el modelo de datos del sistema de " +
  "comercio electrónico desarrollado para Tele Import S.A. Se presentan la estructura general de " +
  "capas, los casos de uso, los módulos funcionales, el modelo de clases, el esquema de despliegue, " +
  "el modelado relacional y el diccionario de datos completo."
));

// ─── 6.1 ARQUITECTURA ────────────────────────────────────────────────────────
children.push(h2("6.1 Arquitectura general del sistema"));
children.push(p(
  "El sistema adopta una arquitectura cliente-servidor de tres capas, ampliamente utilizada en " +
  "aplicaciones web modernas por su claridad en la separación de responsabilidades, su " +
  "mantenibilidad y su capacidad de escalar de forma independiente cada componente."
));
children.push(empty());
children.push(bullet("Capa de presentación",
  "Implementada con Next.js 14 y React. Combina renderizado en el servidor (SSR) para las páginas " +
  "del catálogo público —lo que favorece el posicionamiento en buscadores y la velocidad de carga " +
  "inicial— con renderizado en el cliente (CSR) para los componentes interactivos como el carrito, " +
  "el checkout y el panel de administración. El diseño visual se desarrolló con Tailwind CSS y el " +
  "lenguaje de programación utilizado es TypeScript, lo que aporta tipado estático y reduce errores " +
  "en tiempo de compilación."
));
children.push(bullet("Capa de lógica de negocio",
  "Implementada con Node.js y Express. Expone una API REST que recibe las solicitudes del cliente, " +
  "aplica las reglas de negocio (validación de precios, verificación de stock, autorización por roles) " +
  "y delega la persistencia en la capa de datos. La autenticación se gestiona mediante JSON Web Tokens " +
  "(JWT) con expiración configurable. Cada grupo de funcionalidades se organiza en un router " +
  "independiente: autenticación, catálogo, administración, reportes y pagos."
));
children.push(bullet("Capa de datos",
  "Motor de base de datos relacional MySQL 8 con motor de almacenamiento InnoDB, que garantiza " +
  "integridad referencial mediante claves foráneas y soporte completo de transacciones ACID. El " +
  "esquema contempla 16 tablas interrelacionadas que cubren todos los dominios del sistema."
));
children.push(bullet("Integración externa",
  "Mercado Pago actúa como pasarela de cobro. El backend genera una preferencia de pago y redirige " +
  "al usuario al portal de Mercado Pago. Una vez procesado el pago, la plataforma notifica al " +
  "servidor mediante un webhook que actualiza automáticamente el estado del pedido."
));
children.push(empty());
children.push(p(
  "La elección de esta arquitectura se justifica en la necesidad de mantener el frontend y el " +
  "backend como unidades independientes que pueden evolucionar, desplegarse y escalarse por " +
  "separado. La comunicación entre capas se realiza exclusivamente mediante HTTP/HTTPS con " +
  "intercambio de datos en formato JSON, lo que facilita la interoperabilidad y el eventual " +
  "desarrollo de aplicaciones móviles que consuman la misma API."
));
children.push(empty());
children.push(note(
  "Figura 6.1 — Diagrama de arquitectura de tres capas: Navegador → Frontend Next.js → " +
  "API REST Express → MySQL · Mercado Pago (integración externa)"
));

// ─── 6.2 CASOS DE USO ────────────────────────────────────────────────────────
children.push(h2("6.2 Diagrama de casos de uso"));
children.push(p(
  "Se identifican tres actores principales en el sistema:"
));
children.push(bullet("Visitante",
  "Usuario no autenticado que accede al catálogo público, navega productos, consulta detalles y " +
  "puede registrarse o iniciar sesión."
));
children.push(bullet("Cliente autenticado",
  "Usuario registrado que puede agregar productos al carrito, aplicar cupones, completar el proceso " +
  "de compra, consultar sus pedidos, gestionar su perfil y direcciones, y dejar reseñas."
));
children.push(bullet("Administrador",
  "Usuario con rol admin que, además de las funcionalidades del cliente, tiene acceso completo al " +
  "panel de administración para gestionar productos, stock, pedidos, usuarios, promociones, reseñas, " +
  "reportes y registros de auditoría."
));
children.push(empty());
children.push(h3("Casos de uso — Visitante"));
children.push(bullet2("Navegar catálogo de productos con filtros y paginación"));
children.push(bullet2("Buscar productos por nombre, categoría o etiqueta"));
children.push(bullet2("Ver detalle de producto con galería de imágenes y zoom"));
children.push(bullet2("Registrarse en la plataforma"));
children.push(bullet2("Iniciar sesión con credenciales propias"));
children.push(empty());
children.push(h3("Casos de uso — Cliente autenticado"));
children.push(bullet2("Agregar, modificar y eliminar productos del carrito"));
children.push(bullet2("Aplicar código de descuento en el checkout"));
children.push(bullet2("Seleccionar método de entrega (envío o retiro en sucursal)"));
children.push(bullet2("Ingresar y gestionar direcciones de envío"));
children.push(bullet2("Confirmar pedido y redirigirse al portal de Mercado Pago"));
children.push(bullet2("Consultar historial y estado de sus pedidos"));
children.push(bullet2("Editar perfil personal y contraseña"));
children.push(bullet2("Enviar reseña y calificación sobre un producto"));
children.push(empty());
children.push(h3("Casos de uso — Administrador"));
children.push(bullet2("Crear, editar, activar y eliminar productos del catálogo"));
children.push(bullet2("Registrar movimientos de stock (ingreso, egreso, ajuste)"));
children.push(bullet2("Consultar y actualizar el estado de los pedidos"));
children.push(bullet2("Gestionar usuarios: listar, cambiar rol, eliminar"));
children.push(bullet2("Administrar códigos de promoción y descuentos"));
children.push(bullet2("Moderar, aprobar y eliminar reseñas de productos"));
children.push(bullet2("Consultar reportes de ventas, top de productos y visitas"));
children.push(bullet2("Revisar registros de auditoría del sistema"));
children.push(empty());
children.push(note("Figura 6.2 — Diagrama de casos de uso UML con actores Visitante, Cliente Autenticado y Administrador"));

// ─── 6.3 MÓDULOS FUNCIONALES ─────────────────────────────────────────────────
children.push(h2("6.3 Descripción de módulos funcionales"));
children.push(p(
  "La siguiente tabla resume los quince módulos que componen el sistema, indicando su " +
  "responsabilidad principal y los componentes o endpoints más representativos de cada uno."
));
children.push(empty());
children.push(modulesTable(modulesData));

// ─── 6.4 DIAGRAMA DE CLASES ──────────────────────────────────────────────────
children.push(pageBreak());
children.push(h2("6.4 Diagrama de clases"));
children.push(p(
  "El modelo de clases del sistema refleja las entidades del dominio y sus relaciones. " +
  "A continuación se describen las principales clases y sus asociaciones:"
));
children.push(empty());

children.push(h3("Clase Usuario (User)"));
children.push(pB([
  { text: "Atributos: " }, { text: "id, email, passwordHash, firstName, lastName, phone, role, createdAt.", bold: false },
]));
children.push(pB([
  { text: "Rol (enum): " }, { text: "admin | customer | readonly." },
]));
children.push(pB([
  { text: "Relaciones: " },
  { text: "un usuario tiene muchos pedidos (1–N), muchas direcciones (1–N), muchas reseñas (1–N) y muchas notificaciones (1–N)." },
]));
children.push(empty());

children.push(h3("Clase Producto (Product)"));
children.push(pB([
  { text: "Atributos: " }, { text: "id, name, slug, sku, price, comparePrice, stockQuantity, isActive, isFeatured, brand, model." },
]));
children.push(pB([
  { text: "Relaciones: " },
  { text: "un producto pertenece a una categoría (N–1), tiene muchas imágenes (1–N), muchas etiquetas (N–M via product_tag_map), muchos movimientos de stock (1–N), muchas reseñas (1–N) y muchas visitas (1–N)." },
]));
children.push(empty());

children.push(h3("Clase Pedido (Order)"));
children.push(pB([
  { text: "Atributos: " }, { text: "id, orderNumber, status, subtotal, discountAmount, shippingCost, total, deliveryMethod." },
]));
children.push(pB([
  { text: "Estado (enum): " }, { text: "pending → paid → processing → shipped → delivered / cancelled / refunded." },
]));
children.push(pB([
  { text: "Relaciones: " },
  { text: "un pedido pertenece a un usuario (N–1), tiene muchos ítems (1–N via order_items) y tiene un registro de pago asociado (1–1 con payments)." },
]));
children.push(empty());

children.push(h3("Clase Pago (Payment)"));
children.push(pB([
  { text: "Atributos: " }, { text: "id, mpPaymentId, mpPreferenceId, status, amount, currency, paymentMethod, rawResponse." },
]));
children.push(pB([
  { text: "Relaciones: " }, { text: "un pago pertenece a un pedido (N–1)." },
]));
children.push(empty());

children.push(h3("Clase Promoción (Promotion)"));
children.push(pB([
  { text: "Atributos: " }, { text: "id, code, type, value, minOrderAmount, maxUses, currentUses, isActive, validFrom, validUntil." },
]));
children.push(pB([
  { text: "Tipo (enum): " }, { text: "percentage | fixed_amount | free_shipping." },
]));
children.push(empty());

children.push(h3("Otras clases relevantes"));
children.push(bullet("Categoría (Category)", "id, name, slug, parentId (auto-referencia para árbol de categorías)."));
children.push(bullet("Ítem de pedido (OrderItem)", "Vincula un producto a un pedido con cantidad, precio unitario y precio total."));
children.push(bullet("Movimiento de stock (StockMovement)", "Registra ingreso, egreso o ajuste de inventario con stock anterior y nuevo."));
children.push(bullet("Reseña (ProductReview)", "Comentario y calificación (1–5 estrellas) pendiente de moderación."));
children.push(bullet("Auditoría (AuditLog)", "Evento inmutable con acción, entidad, usuario, IP y valores anterior/posterior."));
children.push(bullet("Visita (ProductView)", "Registro de acceso a la ficha de producto, con usuario opcional (anónimo si no está autenticado)."));
children.push(empty());
children.push(note("Figura 6.3 — Diagrama de clases UML con relaciones de asociación, composición y herencia de enumeraciones"));

// ─── 6.5 DIAGRAMA DE DESPLIEGUE ──────────────────────────────────────────────
children.push(h2("6.5 Diagrama de despliegue"));
children.push(p(
  "El sistema se despliega en tres nodos principales, cada uno con responsabilidades claramente " +
  "delimitadas:"
));
children.push(empty());
children.push(bullet("Nodo Cliente (Navegador web)",
  "El usuario accede a la aplicación desde cualquier navegador moderno mediante HTTPS. El frontend " +
  "Next.js sirve las páginas con renderizado en el servidor para el catálogo público y renderizado " +
  "en el cliente para los componentes interactivos (carrito, panel de admin). Las páginas estáticas " +
  "del catálogo se regeneran automáticamente cada 120 segundos mediante Incremental Static " +
  "Regeneration (ISR)."
));
children.push(bullet("Nodo Servidor de Aplicación",
  "Aloja tanto el frontend Next.js (servidor de páginas y API Routes) como el backend Express. " +
  "El backend escucha en el puerto configurado por variable de entorno y expone los grupos de " +
  "rutas REST bajo los prefijos /auth, /catalog, /admin, /reports y /payments."
));
children.push(bullet("Nodo Base de Datos",
  "Servidor MySQL 8 con InnoDB. Recibe conexiones exclusivamente desde el backend a través de un " +
  "pool de conexiones administrado. En el entorno de desarrollo se ejecuta en un contenedor Docker " +
  "para facilitar la reproducibilidad del entorno."
));
children.push(bullet("Servicio Externo — Mercado Pago",
  "Plataforma de cobro en línea. El backend genera una preferencia de pago mediante la API de " +
  "Mercado Pago y recibe las confirmaciones de pago a través de webhooks enviados al endpoint " +
  "/payments/webhook del servidor."
));
children.push(empty());
children.push(note(
  "Figura 6.4 — Diagrama de despliegue UML: Navegador ←HTTPS→ Servidor (Next.js + Express) " +
  "←TCP→ MySQL · Servidor ←HTTPS→ Mercado Pago"
));

// ─── 6.6 MODELADO DE DATOS ───────────────────────────────────────────────────
children.push(h2("6.6 Modelado de datos"));
children.push(p(
  "El modelo relacional del sistema se compone de dieciséis tablas organizadas en torno a cuatro " +
  "dominios principales:"
));
children.push(empty());
children.push(bullet("Dominio de usuarios y acceso",
  "Tablas users y addresses. Gestiona identidades, credenciales, roles y domicilios de envío."
));
children.push(bullet("Dominio de catálogo",
  "Tablas categories, products, product_images, product_tags y product_tag_map. Representa la " +
  "jerarquía de categorías, los artículos disponibles, sus galerías de imágenes y las etiquetas " +
  "de búsqueda mediante una relación muchos-a-muchos."
));
children.push(bullet("Dominio de comercio",
  "Tablas orders, order_items, payments y promotions. Cubre el ciclo completo de una transacción: " +
  "desde la generación del pedido hasta la confirmación del pago, con soporte para descuentos " +
  "y cupones."
));
children.push(bullet("Dominio de operaciones y analítica",
  "Tablas stock_movements, audit_logs, notifications, product_reviews y product_views. Registra el " +
  "historial de inventario, los eventos de auditoría, las notificaciones internas, las reseñas de " +
  "clientes y el tráfico de visitas por producto."
));
children.push(empty());
children.push(p(
  "Todas las tablas utilizan VARCHAR(50) como tipo de clave primaria para almacenar UUIDs " +
  "generados por la aplicación, lo que desacopla la generación de identificadores de la base de " +
  "datos y facilita la portabilidad. Los precios se almacenan como DECIMAL(15,2) para evitar " +
  "imprecisiones del tipo flotante. Los campos booleanos utilizan TINYINT(1) y los campos de " +
  "dominio acotado se definen como ENUM."
));
children.push(empty());
children.push(note("Figura 6.5 — Diagrama Entidad-Relación (DER) con las 16 tablas y sus relaciones de clave foránea"));

// ─── 6.7 DICCIONARIO DE DATOS ────────────────────────────────────────────────
children.push(h2("6.7 Diccionario de datos"));
children.push(p(
  "A continuación se detalla la estructura de cada tabla de la base de datos, indicando tipo de " +
  "clave (PK = primaria, FK = foránea), nombre del campo, tipo de dato, tamaño y descripción " +
  "funcional."
));

for (const t of dictData) {
  const rows = dictTable(t.name, t.desc, t.fields);
  for (const r of rows) children.push(r);
}

children.push(empty());

// ── DOCUMENTO FINAL ───────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: SIZE_BODY } } },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1701, right: 1701, bottom: 1701, left: 1701 },
        },
      },
      children,
    },
  ],
});

const OUT = "C:/Users/popet/OneDrive/Desktop/nuevotesis/Capitulo6_Diseno.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("Generado:", OUT);
});
