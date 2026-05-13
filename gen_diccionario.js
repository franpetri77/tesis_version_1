const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign,
} = require("docx");
const fs = require("fs");

// ── Constantes de layout ────────────────────────────────────────────────────
// A4 con márgenes ~3 cm (1701 DXA): ancho útil = 11906 - 3402 = 8504 DXA
const COL_CAMPO  = 1900;
const COL_TIPO   = 1700;
const COL_PK     = 560;
const COL_FK     = 560;
const COL_OBS    = 3784;
const TOTAL_W    = COL_CAMPO + COL_TIPO + COL_PK + COL_FK + COL_OBS; // 8504

const COLOR_HEADER = "1F3864";
const COLOR_ROW_A  = "FFFFFF";
const COLOR_ROW_B  = "EEF2F7";

// ── Helpers de texto ────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial" })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 60, after: 100, line: 320 },
    children: [new TextRun({ text, size: 20, font: "Arial", ...opts })],
  });
}

function pEmpty() {
  return new Paragraph({ spacing: { before: 40, after: 40 } });
}

function hr() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 } },
    children: [],
  });
}

// ── Helpers de tabla ────────────────────────────────────────────────────────
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

function cellText(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text: String(text ?? ""), size: opts.size ?? 18, font: "Arial", ...opts })],
  });
}

function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    shading: { fill: COLOR_HEADER, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [cellText(text, { bold: true, size: 18, color: "FFFFFF" })],
  });
}

function dataCell(text, width, isAlt, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    shading: { fill: isAlt ? COLOR_ROW_B : COLOR_ROW_A, type: ShadingType.CLEAR },
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    children: [cellText(text, { size: 18, center: opts.center ?? false })],
  });
}

// Genera la tabla completa de una entidad
// fields: [{ campo, tipo, pk, fk, obs }]
function dictTable(fields) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell("Campo",        COL_CAMPO),
      headerCell("Tipo de dato", COL_TIPO),
      headerCell("PK",           COL_PK),
      headerCell("FK",           COL_FK),
      headerCell("Observaciones",COL_OBS),
    ],
  });

  const dataRows = fields.map((f, i) => {
    const alt = i % 2 === 1;
    return new TableRow({
      children: [
        dataCell(f.campo, COL_CAMPO, alt),
        dataCell(f.tipo,  COL_TIPO,  alt),
        dataCell(f.pk ? "✓" : "", COL_PK, alt, { center: true }),
        dataCell(f.fk || "",      COL_FK, alt),
        dataCell(f.obs || "",     COL_OBS, alt),
      ],
    });
  });

  return new Table({
    width: { size: TOTAL_W, type: WidthType.DXA },
    columnWidths: [COL_CAMPO, COL_TIPO, COL_PK, COL_FK, COL_OBS],
    rows: [headerRow, ...dataRows],
  });
}

// ── Definición de tablas ────────────────────────────────────────────────────

const tables = [

  {
    nombre: "users",
    desc: "Almacena los datos de todos los usuarios del sistema, tanto clientes como administradores. El rol determina el nivel de acceso a las funcionalidades.",
    fields: [
      { campo: "id",         tipo: "VARCHAR(50)",  pk: true,  fk: "",  obs: "Identificador único. UUID generado por la aplicación." },
      { campo: "email",      tipo: "VARCHAR(255)", pk: false, fk: "",  obs: "Dirección de correo electrónico. Valor único (UNIQUE)." },
      { campo: "password",   tipo: "VARCHAR(255)", pk: false, fk: "",  obs: "Hash de la contraseña (bcrypt)." },
      { campo: "first_name", tipo: "VARCHAR(100)", pk: false, fk: "",  obs: "Nombre del usuario." },
      { campo: "last_name",  tipo: "VARCHAR(100)", pk: false, fk: "",  obs: "Apellido del usuario." },
      { campo: "phone",      tipo: "VARCHAR(50)",  pk: false, fk: "",  obs: "Teléfono de contacto. Nullable." },
      { campo: "role",       tipo: "ENUM",         pk: false, fk: "",  obs: "Rol del usuario: admin | customer | readonly. Default: customer." },
      { campo: "created_at", tipo: "DATETIME",     pk: false, fk: "",  obs: "Fecha y hora de creación. Default: CURRENT_TIMESTAMP." },
      { campo: "updated_at", tipo: "DATETIME",     pk: false, fk: "",  obs: "Fecha y hora de última modificación. ON UPDATE CURRENT_TIMESTAMP." },
    ],
  },

  {
    nombre: "categories",
    desc: "Define las categorías del catálogo de productos. Soporta jerarquía de dos niveles mediante la referencia self-referencial parent_id.",
    fields: [
      { campo: "id",          tipo: "VARCHAR(50)",  pk: true,  fk: "",              obs: "Identificador único." },
      { campo: "name",        tipo: "VARCHAR(255)", pk: false, fk: "",              obs: "Nombre visible de la categoría." },
      { campo: "slug",        tipo: "VARCHAR(255)", pk: false, fk: "",              obs: "Identificador amigable para URL. Valor único." },
      { campo: "description", tipo: "TEXT",         pk: false, fk: "",              obs: "Descripción opcional de la categoría." },
      { campo: "image_url",   tipo: "TEXT",         pk: false, fk: "",              obs: "URL de imagen representativa. Nullable." },
      { campo: "parent_id",   tipo: "VARCHAR(50)",  pk: false, fk: "categories.id", obs: "Referencia a categoría padre. NULL indica categoría raíz. ON DELETE SET NULL." },
      { campo: "sort_order",  tipo: "INT",          pk: false, fk: "",              obs: "Orden de visualización. Default: 0." },
      { campo: "is_active",   tipo: "TINYINT(1)",   pk: false, fk: "",              obs: "Estado de publicación. 1 = activa, 0 = inactiva. Default: 1." },
    ],
  },

  {
    nombre: "products",
    desc: "Catálogo completo de productos disponibles en la tienda. Incluye información comercial, logística y de presentación.",
    fields: [
      { campo: "id",                tipo: "VARCHAR(50)",   pk: true,  fk: "",               obs: "Identificador único." },
      { campo: "name",              tipo: "VARCHAR(255)",  pk: false, fk: "",               obs: "Nombre del producto." },
      { campo: "slug",              tipo: "VARCHAR(255)",  pk: false, fk: "",               obs: "Identificador amigable para URL. Valor único." },
      { campo: "description",       tipo: "TEXT",          pk: false, fk: "",               obs: "Descripción larga del producto. Nullable." },
      { campo: "short_description", tipo: "TEXT",          pk: false, fk: "",               obs: "Descripción breve para listados. Nullable." },
      { campo: "sku",               tipo: "VARCHAR(100)",  pk: false, fk: "",               obs: "Código de referencia del producto. Valor único." },
      { campo: "price",             tipo: "DECIMAL(15,2)", pk: false, fk: "",               obs: "Precio de venta vigente." },
      { campo: "compare_price",     tipo: "DECIMAL(15,2)", pk: false, fk: "",               obs: "Precio de referencia para mostrar descuento. Nullable." },
      { campo: "category_id",       tipo: "VARCHAR(50)",   pk: false, fk: "categories.id",  obs: "Categoría a la que pertenece el producto. NOT NULL." },
      { campo: "stock_quantity",    tipo: "INT",            pk: false, fk: "",               obs: "Cantidad disponible en stock. Default: 0." },
      { campo: "is_active",         tipo: "TINYINT(1)",    pk: false, fk: "",               obs: "Publicado en catálogo. 1 = activo. Default: 1." },
      { campo: "is_featured",       tipo: "TINYINT(1)",    pk: false, fk: "",               obs: "Destacado en página de inicio. Default: 0." },
      { campo: "brand",             tipo: "VARCHAR(100)",  pk: false, fk: "",               obs: "Marca del producto. Nullable." },
      { campo: "model",             tipo: "VARCHAR(100)",  pk: false, fk: "",               obs: "Modelo del producto. Nullable." },
      { campo: "weight",            tipo: "DOUBLE",         pk: false, fk: "",               obs: "Peso en kilogramos para cálculo de envío. Nullable." },
      { campo: "metadata",          tipo: "TEXT",           pk: false, fk: "",               obs: "Atributos adicionales en formato JSON. Nullable." },
      { campo: "created_at",        tipo: "DATETIME",       pk: false, fk: "",               obs: "Fecha de alta del producto." },
      { campo: "updated_at",        tipo: "DATETIME",       pk: false, fk: "",               obs: "Fecha de última modificación. ON UPDATE CURRENT_TIMESTAMP." },
    ],
  },

  {
    nombre: "product_images",
    desc: "Galería de imágenes asociadas a cada producto. Un producto puede tener múltiples imágenes ordenadas según sort_order.",
    fields: [
      { campo: "id",         tipo: "VARCHAR(50)",  pk: true,  fk: "",            obs: "Identificador único." },
      { campo: "product_id", tipo: "VARCHAR(50)",  pk: false, fk: "products.id", obs: "Producto al que pertenece la imagen. ON DELETE CASCADE." },
      { campo: "image_url",  tipo: "TEXT",          pk: false, fk: "",            obs: "URL absoluta de la imagen almacenada." },
      { campo: "alt_text",   tipo: "VARCHAR(255)",  pk: false, fk: "",            obs: "Texto alternativo para accesibilidad. Nullable." },
      { campo: "sort_order", tipo: "INT",            pk: false, fk: "",            obs: "Orden de visualización dentro de la galería. Default: 0." },
    ],
  },

  {
    nombre: "product_tags",
    desc: "Catálogo de etiquetas utilizadas para clasificar y filtrar productos en el catálogo público.",
    fields: [
      { campo: "id",   tipo: "VARCHAR(50)",  pk: true,  fk: "", obs: "Identificador único." },
      { campo: "name", tipo: "VARCHAR(100)", pk: false, fk: "", obs: "Nombre visible de la etiqueta." },
      { campo: "slug", tipo: "VARCHAR(100)", pk: false, fk: "", obs: "Identificador amigable para URL. Valor único." },
    ],
  },

  {
    nombre: "product_tag_map",
    desc: "Tabla de relación muchos a muchos entre productos y etiquetas. La clave primaria es compuesta (product_id, tag_id).",
    fields: [
      { campo: "product_id", tipo: "VARCHAR(50)", pk: true,  fk: "products.id",     obs: "Referencia al producto. ON DELETE CASCADE." },
      { campo: "tag_id",     tipo: "VARCHAR(50)", pk: true,  fk: "product_tags.id", obs: "Referencia a la etiqueta. ON DELETE CASCADE." },
    ],
  },

  {
    nombre: "addresses",
    desc: "Domicilios de entrega registrados por los usuarios. Cada usuario puede gestionar múltiples direcciones y designar una como predeterminada.",
    fields: [
      { campo: "id",          tipo: "VARCHAR(50)",  pk: true,  fk: "",        obs: "Identificador único." },
      { campo: "user_id",     tipo: "VARCHAR(50)",  pk: false, fk: "users.id", obs: "Usuario propietario de la dirección. ON DELETE CASCADE." },
      { campo: "street",      tipo: "VARCHAR(255)", pk: false, fk: "",        obs: "Nombre de la calle." },
      { campo: "number",      tipo: "VARCHAR(20)",  pk: false, fk: "",        obs: "Número de puerta o altura." },
      { campo: "floor",       tipo: "VARCHAR(20)",  pk: false, fk: "",        obs: "Piso. Nullable." },
      { campo: "apartment",   tipo: "VARCHAR(20)",  pk: false, fk: "",        obs: "Departamento o unidad. Nullable." },
      { campo: "city",        tipo: "VARCHAR(100)", pk: false, fk: "",        obs: "Ciudad." },
      { campo: "province",    tipo: "VARCHAR(100)", pk: false, fk: "",        obs: "Provincia." },
      { campo: "postal_code", tipo: "VARCHAR(20)",  pk: false, fk: "",        obs: "Código postal." },
      { campo: "country",     tipo: "VARCHAR(100)", pk: false, fk: "",        obs: "País. Default: Argentina." },
      { campo: "is_default",  tipo: "TINYINT(1)",   pk: false, fk: "",        obs: "Indica si es la dirección predeterminada del usuario. Default: 0." },
      { campo: "created_at",  tipo: "DATETIME",     pk: false, fk: "",        obs: "Fecha de registro de la dirección." },
    ],
  },

  {
    nombre: "orders",
    desc: "Registra cada pedido realizado en la plataforma, desde su creación hasta su entrega o cancelación. El ciclo de vida del pedido se refleja en el campo status.",
    fields: [
      { campo: "id",               tipo: "VARCHAR(50)",   pk: true,  fk: "",        obs: "Identificador único." },
      { campo: "order_number",     tipo: "VARCHAR(50)",   pk: false, fk: "",        obs: "Número de pedido visible para el usuario. Valor único." },
      { campo: "user_id",          tipo: "VARCHAR(50)",   pk: false, fk: "users.id", obs: "Usuario que realizó el pedido." },
      { campo: "status",           tipo: "ENUM",          pk: false, fk: "",        obs: "Estado del pedido: pending | paid | processing | ready_to_ship | shipped | delivered | cancelled | refunded." },
      { campo: "subtotal",         tipo: "DECIMAL(15,2)", pk: false, fk: "",        obs: "Suma de ítems sin descuentos ni envío." },
      { campo: "discount_amount",  tipo: "DECIMAL(15,2)", pk: false, fk: "",        obs: "Monto total de descuento aplicado. Default: 0." },
      { campo: "shipping_cost",    tipo: "DECIMAL(15,2)", pk: false, fk: "",        obs: "Costo de envío. Default: 0 (retiro en sucursal)." },
      { campo: "total",            tipo: "DECIMAL(15,2)", pk: false, fk: "",        obs: "Importe final a cobrar (subtotal - descuento + envío)." },
      { campo: "delivery_method",  tipo: "ENUM",          pk: false, fk: "",        obs: "Método de entrega: pickup (retiro) | shipping (envío a domicilio)." },
      { campo: "shipping_address", tipo: "TEXT",          pk: false, fk: "",        obs: "Datos del domicilio de entrega en formato JSON. Nullable si es retiro." },
      { campo: "notes",            tipo: "TEXT",          pk: false, fk: "",        obs: "Observaciones adicionales del cliente. Nullable." },
      { campo: "created_at",       tipo: "DATETIME",      pk: false, fk: "",        obs: "Fecha y hora de creación del pedido." },
      { campo: "updated_at",       tipo: "DATETIME",      pk: false, fk: "",        obs: "Fecha de última actualización. ON UPDATE CURRENT_TIMESTAMP." },
    ],
  },

  {
    nombre: "order_items",
    desc: "Líneas de detalle de cada pedido. Registra el producto, la cantidad y el precio unitario en el momento de la compra, preservando el valor histórico.",
    fields: [
      { campo: "id",          tipo: "VARCHAR(50)",   pk: true,  fk: "",            obs: "Identificador único." },
      { campo: "order_id",    tipo: "VARCHAR(50)",   pk: false, fk: "orders.id",   obs: "Pedido al que pertenece el ítem. ON DELETE CASCADE." },
      { campo: "product_id",  tipo: "VARCHAR(50)",   pk: false, fk: "products.id", obs: "Producto incluido en el pedido." },
      { campo: "quantity",    tipo: "INT",            pk: false, fk: "",            obs: "Cantidad solicitada." },
      { campo: "unit_price",  tipo: "DECIMAL(15,2)", pk: false, fk: "",            obs: "Precio unitario al momento de la compra." },
      { campo: "total_price", tipo: "DECIMAL(15,2)", pk: false, fk: "",            obs: "Subtotal del ítem (quantity × unit_price)." },
    ],
  },

  {
    nombre: "payments",
    desc: "Registro de los intentos y resultados de pago asociados a cada pedido. Almacena los identificadores de Mercado Pago y la respuesta raw del proveedor para trazabilidad.",
    fields: [
      { campo: "id",               tipo: "VARCHAR(50)",   pk: true,  fk: "",        obs: "Identificador único." },
      { campo: "order_id",         tipo: "VARCHAR(50)",   pk: false, fk: "orders.id", obs: "Pedido al que corresponde el pago." },
      { campo: "mp_payment_id",    tipo: "VARCHAR(100)",  pk: false, fk: "",        obs: "ID de pago asignado por Mercado Pago. Nullable hasta confirmación." },
      { campo: "mp_preference_id", tipo: "VARCHAR(100)",  pk: false, fk: "",        obs: "ID de preferencia generada al iniciar el checkout. Nullable." },
      { campo: "status",           tipo: "ENUM",          pk: false, fk: "",        obs: "Estado del pago: pending | approved | rejected | cancelled | refunded." },
      { campo: "amount",           tipo: "DECIMAL(15,2)", pk: false, fk: "",        obs: "Importe procesado." },
      { campo: "currency",         tipo: "VARCHAR(10)",   pk: false, fk: "",        obs: "Código de moneda ISO 4217. Default: ARS." },
      { campo: "payment_method",   tipo: "VARCHAR(100)",  pk: false, fk: "",        obs: "Medio de pago informado por Mercado Pago (tarjeta, etc.). Nullable." },
      { campo: "raw_response",     tipo: "TEXT",          pk: false, fk: "",        obs: "Respuesta completa del webhook en formato JSON. Nullable." },
      { campo: "created_at",       tipo: "DATETIME",      pk: false, fk: "",        obs: "Fecha de registro del pago." },
      { campo: "updated_at",       tipo: "DATETIME",      pk: false, fk: "",        obs: "Fecha de última actualización. ON UPDATE CURRENT_TIMESTAMP." },
    ],
  },

  {
    nombre: "promotions",
    desc: "Cupones y descuentos aplicables durante el proceso de compra. Soporta tres modalidades de descuento: porcentual, monto fijo y envío gratuito.",
    fields: [
      { campo: "id",               tipo: "VARCHAR(50)",   pk: true,  fk: "", obs: "Identificador único." },
      { campo: "code",             tipo: "VARCHAR(50)",   pk: false, fk: "", obs: "Código de cupón ingresado por el cliente. Valor único." },
      { campo: "name",             tipo: "VARCHAR(255)",  pk: false, fk: "", obs: "Nombre descriptivo de la promoción." },
      { campo: "description",      tipo: "TEXT",          pk: false, fk: "", obs: "Detalle adicional de la promoción. Nullable." },
      { campo: "type",             tipo: "ENUM",          pk: false, fk: "", obs: "Tipo de descuento: percentage | fixed_amount | free_shipping." },
      { campo: "value",            tipo: "DECIMAL(15,2)", pk: false, fk: "", obs: "Valor del descuento (porcentaje o monto según type)." },
      { campo: "min_order_amount", tipo: "DECIMAL(15,2)", pk: false, fk: "", obs: "Importe mínimo del pedido para aplicar el cupón. Nullable." },
      { campo: "max_uses",         tipo: "INT",            pk: false, fk: "", obs: "Límite máximo de usos totales. NULL = sin límite." },
      { campo: "current_uses",     tipo: "INT",            pk: false, fk: "", obs: "Cantidad de veces que el cupón fue utilizado. Default: 0." },
      { campo: "is_active",        tipo: "TINYINT(1)",    pk: false, fk: "", obs: "Estado del cupón. 1 = activo. Default: 1." },
      { campo: "valid_from",       tipo: "VARCHAR(20)",   pk: false, fk: "", obs: "Fecha de inicio de vigencia en formato YYYY-MM-DD." },
      { campo: "valid_until",      tipo: "VARCHAR(20)",   pk: false, fk: "", obs: "Fecha de fin de vigencia en formato YYYY-MM-DD. Nullable = sin vencimiento." },
    ],
  },

  {
    nombre: "stock_movements",
    desc: "Historial completo de movimientos del inventario. Cada registro refleja un cambio en el stock de un producto, indicando la causa, el responsable y los valores anterior y posterior.",
    fields: [
      { campo: "id",                tipo: "VARCHAR(50)",  pk: true,  fk: "",            obs: "Identificador único." },
      { campo: "product_id",        tipo: "VARCHAR(50)",  pk: false, fk: "products.id", obs: "Producto afectado." },
      { campo: "type",              tipo: "ENUM",         pk: false, fk: "",            obs: "Tipo de movimiento: ingreso | egreso | ajuste | venta | devolucion." },
      { campo: "quantity",          tipo: "INT",           pk: false, fk: "",            obs: "Cantidad del movimiento (positivo o negativo según tipo)." },
      { campo: "previous_quantity", tipo: "INT",           pk: false, fk: "",            obs: "Stock antes del movimiento." },
      { campo: "new_quantity",      tipo: "INT",           pk: false, fk: "",            obs: "Stock resultante tras el movimiento." },
      { campo: "reason",            tipo: "TEXT",          pk: false, fk: "",            obs: "Descripción o justificación del movimiento. Nullable." },
      { campo: "reference_id",      tipo: "VARCHAR(50)",  pk: false, fk: "",            obs: "ID del pedido u operación relacionada. Nullable." },
      { campo: "user_id",           tipo: "VARCHAR(50)",  pk: false, fk: "users.id",    obs: "Usuario que registró el movimiento. Nullable (puede ser automático)." },
      { campo: "created_at",        tipo: "DATETIME",     pk: false, fk: "",            obs: "Fecha y hora del movimiento." },
    ],
  },

  {
    nombre: "audit_logs",
    desc: "Registro de auditoría de las operaciones críticas realizadas sobre el sistema. Permite rastrear qué usuario realizó cada acción, sobre qué entidad y cuáles fueron los valores modificados.",
    fields: [
      { campo: "id",             tipo: "VARCHAR(50)",  pk: true,  fk: "",        obs: "Identificador único." },
      { campo: "action",         tipo: "VARCHAR(100)", pk: false, fk: "",        obs: "Nombre de la acción ejecutada (ej. CREATE_PRODUCT, UPDATE_STOCK)." },
      { campo: "entity_type",    tipo: "VARCHAR(100)", pk: false, fk: "",        obs: "Tipo de entidad afectada (ej. product, user, order)." },
      { campo: "entity_id",      tipo: "VARCHAR(50)",  pk: false, fk: "",        obs: "ID de la instancia afectada." },
      { campo: "user_id",        tipo: "VARCHAR(50)",  pk: false, fk: "users.id", obs: "Usuario responsable de la acción. Nullable (acciones de sistema)." },
      { campo: "previous_value", tipo: "TEXT",          pk: false, fk: "",        obs: "Estado anterior de la entidad en formato JSON. Nullable." },
      { campo: "new_value",      tipo: "TEXT",          pk: false, fk: "",        obs: "Estado posterior a la operación en formato JSON. Nullable." },
      { campo: "ip_address",     tipo: "VARCHAR(45)",  pk: false, fk: "",        obs: "Dirección IP del solicitante. Soporta IPv4 e IPv6. Nullable." },
      { campo: "created_at",     tipo: "DATETIME",     pk: false, fk: "",        obs: "Fecha y hora exacta de la acción." },
    ],
  },

  {
    nombre: "notifications",
    desc: "Notificaciones internas generadas por el sistema y dirigidas a usuarios administradores. Se registran eventos como nuevos pedidos, cambios de estado y alertas de stock bajo.",
    fields: [
      { campo: "id",         tipo: "VARCHAR(50)",  pk: true,  fk: "",        obs: "Identificador único." },
      { campo: "user_id",    tipo: "VARCHAR(50)",  pk: false, fk: "users.id", obs: "Usuario destinatario. ON DELETE CASCADE." },
      { campo: "type",       tipo: "ENUM",         pk: false, fk: "",        obs: "Tipo de evento: order_new | order_status | stock_low | review_new." },
      { campo: "title",      tipo: "VARCHAR(255)", pk: false, fk: "",        obs: "Título de la notificación." },
      { campo: "message",    tipo: "TEXT",         pk: false, fk: "",        obs: "Cuerpo del mensaje." },
      { campo: "is_read",    tipo: "TINYINT(1)",   pk: false, fk: "",        obs: "Estado de lectura. 0 = no leída, 1 = leída. Default: 0." },
      { campo: "link",       tipo: "VARCHAR(500)", pk: false, fk: "",        obs: "URL relativa de navegación al origen del evento. Nullable." },
      { campo: "created_at", tipo: "DATETIME",     pk: false, fk: "",        obs: "Fecha y hora de generación de la notificación." },
    ],
  },

  {
    nombre: "product_reviews",
    desc: "Reseñas y calificaciones de productos enviadas por usuarios registrados. Cada usuario puede publicar como máximo una reseña por producto. Las reseñas requieren aprobación del administrador antes de ser visibles.",
    fields: [
      { campo: "id",          tipo: "VARCHAR(50)",  pk: true,  fk: "",            obs: "Identificador único." },
      { campo: "product_id",  tipo: "VARCHAR(50)",  pk: false, fk: "products.id", obs: "Producto al que se refiere la reseña. ON DELETE CASCADE." },
      { campo: "user_id",     tipo: "VARCHAR(50)",  pk: false, fk: "users.id",    obs: "Usuario autor de la reseña." },
      { campo: "rating",      tipo: "TINYINT",      pk: false, fk: "",            obs: "Calificación numérica entre 1 y 5 (CHECK constraint)." },
      { campo: "title",       tipo: "VARCHAR(255)", pk: false, fk: "",            obs: "Título opcional de la reseña. Nullable." },
      { campo: "body",        tipo: "TEXT",         pk: false, fk: "",            obs: "Contenido textual de la reseña." },
      { campo: "is_approved", tipo: "TINYINT(1)",   pk: false, fk: "",            obs: "Estado de moderación. 0 = pendiente, 1 = aprobada. Default: 0." },
      { campo: "created_at",  tipo: "DATETIME",     pk: false, fk: "",            obs: "Fecha de envío de la reseña." },
    ],
  },

  {
    nombre: "product_views",
    desc: "Registro de visitas a las páginas de detalle de producto. Permite generar el reporte de productos más visitados. Se registra tanto para usuarios autenticados como para visitantes anónimos.",
    fields: [
      { campo: "id",         tipo: "VARCHAR(50)", pk: true,  fk: "",            obs: "Identificador único." },
      { campo: "product_id", tipo: "VARCHAR(50)", pk: false, fk: "products.id", obs: "Producto visualizado. ON DELETE CASCADE." },
      { campo: "user_id",    tipo: "VARCHAR(50)", pk: false, fk: "",            obs: "Usuario autenticado que realizó la visita. Nullable para visitantes anónimos." },
      { campo: "ip_address", tipo: "VARCHAR(45)", pk: false, fk: "",            obs: "Dirección IP del visitante. Soporta IPv4 e IPv6. Nullable." },
      { campo: "created_at", tipo: "DATETIME",    pk: false, fk: "",            obs: "Fecha y hora exacta de la visita." },
    ],
  },

];

// ── Construcción del documento ───────────────────────────────────────────────

const children = [
  h1("DICCIONARIO DE DATOS"),
  p(
    "El presente diccionario describe la estructura completa de la base de datos relacional del " +
    "sistema. Se documenta cada tabla con sus campos, tipos de datos, claves y restricciones de " +
    "integridad referencial. La base de datos está implementada en MySQL 8 con motor InnoDB, " +
    "codificación utf8mb4 y collation utf8mb4_unicode_ci."
  ),
  pEmpty(),
  p(
    "Los identificadores de todas las entidades se implementan como VARCHAR(50) para soportar " +
    "tanto valores fijos definidos en la carga inicial como UUIDs generados en tiempo de ejecución " +
    "mediante crypto.randomUUID(). Los valores monetarios se almacenan como DECIMAL(15,2) para " +
    "garantizar precisión aritmética. Los campos booleanos utilizan TINYINT(1), donde 1 " +
    "corresponde a verdadero y 0 a falso."
  ),
  hr(),
];

for (const t of tables) {
  children.push(
    h2(`Tabla: ${t.nombre}`),
    p(t.desc),
    pEmpty(),
    dictTable(t.fields),
    pEmpty(),
    hr(),
  );
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1701, right: 1701, bottom: 1701, left: 1701 },
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = "C:/Users/popet/OneDrive/Desktop/nuevotesis/Diccionario_de_Datos.docx";
  fs.writeFileSync(out, buffer);
  console.log("Generado:", out);
});
