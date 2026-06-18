// =============================================
// Generador de tesis actualizada (Capítulos 6, 7 y 8)
// Refleja el sistema realmente construido:
// Next.js 14 (Vercel) + Express + MySQL (Render) + Mercado Pago
// =============================================

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageBreak, LevelFormat, PageOrientation, TableOfContents,
  Header, Footer, PageNumber,
} = require("docx");
const fs = require("fs");

// ── Paleta ────────────────────────────────────────────────────────────────────
const COLOR_H1 = "1F3864";
const COLOR_H2 = "2E5FA3";
const COLOR_H3 = "365F91";
const COLOR_TH_BG = "1F3864";
const COLOR_TH_TX = "FFFFFF";
const COLOR_ROW_A = "FFFFFF";
const COLOR_ROW_B = "EEF2F7";
const COLOR_CODE_BG = "F3F4F6";
const COLOR_CAPTION = "374151";

const FONT = "Arial";
const SIZE_BODY = 22; // 11pt
const SIZE_SMALL = 20; // 10pt
const SIZE_H1 = 30; // 15pt
const SIZE_H2 = 26; // 13pt
const SIZE_H3 = 24; // 12pt

// ── Helpers ──────────────────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 480, after: 220 },
  children: [new TextRun({ text, bold: true, size: SIZE_H1, font: FONT, color: COLOR_H1 })],
});
const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 360, after: 160 },
  children: [new TextRun({ text, bold: true, size: SIZE_H2, font: FONT, color: COLOR_H2 })],
});
const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 260, after: 120 },
  children: [new TextRun({ text, bold: true, size: SIZE_H3, font: FONT, color: COLOR_H3 })],
});
const p = (text) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { before: 80, after: 80, line: 320 },
  children: [new TextRun({ text, size: SIZE_BODY, font: FONT })],
});
const pRich = (parts) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  spacing: { before: 80, after: 80, line: 320 },
  children: parts.map((x) => typeof x === "string"
    ? new TextRun({ text: x, size: SIZE_BODY, font: FONT })
    : new TextRun({ text: x.text, bold: !!x.bold, italics: !!x.it, size: SIZE_BODY, font: FONT, color: x.color })),
});
const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { before: 40, after: 40, line: 300 },
  children: [new TextRun({ text, size: SIZE_BODY, font: FONT })],
});
const bulletRich = (parts) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { before: 40, after: 40, line: 300 },
  children: parts.map((x) => typeof x === "string"
    ? new TextRun({ text: x, size: SIZE_BODY, font: FONT })
    : new TextRun({ text: x.text, bold: !!x.bold, italics: !!x.it, size: SIZE_BODY, font: FONT })),
});
const code = (text) => new Paragraph({
  spacing: { before: 60, after: 60 },
  shading: { type: ShadingType.CLEAR, fill: COLOR_CODE_BG, color: "auto" },
  children: [new TextRun({ text, font: "Consolas", size: 20 })],
});
const caption = (text) => new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 60, after: 220 },
  children: [new TextRun({ text, italics: true, size: SIZE_SMALL, font: FONT, color: COLOR_CAPTION })],
});
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const spacer = () => new Paragraph({ children: [new TextRun({ text: "" })] });

// ── Tabla genérica ───────────────────────────────────────────────────────────
const TABLE_W = 9070; // A4 ancho útil aprox

function thinBorder() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: "BFC9D6" };
  return { top: b, bottom: b, left: b, right: b };
}

function makeTable(headers, rows, widths) {
  const n = headers.length;
  const w = widths ?? Array(n).fill(Math.floor(TABLE_W / n));
  const sum = w.reduce((a, b) => a + b, 0);
  // Asegurar suma exacta
  if (sum !== TABLE_W) w[w.length - 1] += (TABLE_W - sum);

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((text, i) => new TableCell({
      width: { size: w[i], type: WidthType.DXA },
      borders: thinBorder(),
      shading: { type: ShadingType.CLEAR, fill: COLOR_TH_BG, color: "auto" },
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: COLOR_TH_TX, size: SIZE_BODY, font: FONT })],
      })],
    })),
  });

  const bodyRows = rows.map((cells, ri) => new TableRow({
    children: cells.map((cell, ci) => {
      const bg = ri % 2 === 0 ? COLOR_ROW_A : COLOR_ROW_B;
      const txt = typeof cell === "string" ? cell : cell.text;
      const bold = typeof cell === "object" && cell.bold;
      return new TableCell({
        width: { size: w[ci], type: WidthType.DXA },
        borders: thinBorder(),
        shading: { type: ShadingType.CLEAR, fill: bg, color: "auto" },
        margins: { top: 90, bottom: 90, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({ text: txt, bold: !!bold, size: SIZE_BODY, font: FONT })],
        })],
      });
    }),
  }));

  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: w,
    rows: [headerRow, ...bodyRows],
  });
}

// ── Tabla del diccionario de datos ───────────────────────────────────────────
function dictTable(rows) {
  // columnas: Campo / Tipo / PK / FK / Descripción
  const w = [2000, 1900, 600, 600, TABLE_W - (2000 + 1900 + 600 + 600)];
  const headers = ["Campo", "Tipo", "PK", "FK", "Descripción"];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((text, i) => new TableCell({
      width: { size: w[i], type: WidthType.DXA },
      borders: thinBorder(),
      shading: { type: ShadingType.CLEAR, fill: COLOR_TH_BG, color: "auto" },
      margins: { top: 80, bottom: 80, left: 110, right: 110 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: COLOR_TH_TX, size: SIZE_BODY, font: FONT })],
      })],
    })),
  });
  const body = rows.map((r, ri) => {
    const bg = ri % 2 === 0 ? COLOR_ROW_A : COLOR_ROW_B;
    return new TableRow({
      children: r.map((cell, ci) => new TableCell({
        width: { size: w[ci], type: WidthType.DXA },
        borders: thinBorder(),
        shading: { type: ShadingType.CLEAR, fill: bg, color: "auto" },
        margins: { top: 70, bottom: 70, left: 110, right: 110 },
        children: [new Paragraph({
          alignment: ci === 2 || ci === 3 ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [new TextRun({ text: cell, size: SIZE_SMALL, font: FONT })],
        })],
      })),
    });
  });
  return new Table({
    width: { size: TABLE_W, type: WidthType.DXA },
    columnWidths: w,
    rows: [headerRow, ...body],
  });
}

// ── Contenido ────────────────────────────────────────────────────────────────
const content = [];

// Portada simple
content.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 1200, after: 200 },
  children: [new TextRun({ text: "TESIS — TELE IMPORT S.A.", bold: true, size: 44, font: FONT, color: COLOR_H1 })],
}));
content.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 600 },
  children: [new TextRun({ text: "Capítulos 6, 7 y 8 — Diseño, Implementación y Despliegue", size: 28, font: FONT, color: COLOR_H2 })],
}));
content.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200 },
  children: [new TextRun({ text: "Allasia · Emanuelli · Petri", size: 24, font: FONT })],
}));
content.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Versión actualizada al sistema implementado", italics: true, size: 22, font: FONT, color: COLOR_CAPTION })],
}));
content.push(pageBreak());

// ═════════════════════════════════════════════════════════════════════════
// CAPÍTULO 6
// ═════════════════════════════════════════════════════════════════════════
content.push(h1("Capítulo 6 — Diseño y Modelación del Sistema"));
content.push(p("Este capítulo describe el diseño del sistema web desarrollado para Tele Import S.A. a partir del mandato, las entrevistas y el diagnóstico de los capítulos anteriores. Se documenta la arquitectura adoptada, los modelos conceptuales (casos de uso, clases, despliegue, entidad–relación), el diccionario de datos correspondiente a la base productiva y el diseño de la API REST que sostiene la aplicación."));
content.push(p("Respecto a la versión preliminar de esta tesis, donde se había planteado el uso de la herramienta GeneXus, durante la fase de diseño se decidió migrar a un stack web moderno basado en Node.js, TypeScript, Next.js y MySQL. Esta decisión se justifica en la sección 6.1."));

content.push(h2("6.1 Selección del stack tecnológico"));
content.push(p("La elección del stack se realizó priorizando tres ejes: control total del código generado, facilidad de despliegue en servicios de nube gratuitos o de bajo costo y disponibilidad de personal técnico con conocimiento de la tecnología. Se evaluaron tres alternativas: GeneXus (propuesta original), un stack tradicional PHP/Laravel y un stack JavaScript/TypeScript con Next.js y Express."));
content.push(p("Se descartó GeneXus al no contar con una licencia disponible para el equipo y al detectarse una curva de aprendizaje incompatible con el cronograma. Se descartó PHP/Laravel por preferencia del equipo de desarrollo. Finalmente se adoptó el stack JavaScript/TypeScript que permite compartir el lenguaje entre frontend y backend, integrarse de manera natural con servicios como Vercel, Render y Mercado Pago, y desplegarse sin costo durante la etapa de validación del producto."));

content.push(h3("Stack definitivo"));
content.push(makeTable(
  ["Capa", "Tecnología", "Justificación"],
  [
    ["Frontend",  "Next.js 14 (App Router) + React 18 + TypeScript", "SSR para SEO del catálogo, route groups para separar área pública/privada y panel admin, integración con Vercel."],
    ["Estilos",   "Tailwind CSS 3 + lucide-react",                   "Diseño responsivo rápido sin CSS ad hoc; iconografía consistente."],
    ["Estado",    "Zustand + TanStack React Query",                  "Carrito persistente en cliente (Zustand) y caché de datos remotos (React Query)."],
    ["Backend",   "Node.js + Express 4 + TypeScript",                "API REST liviana, mismo lenguaje que el frontend, ecosistema maduro."],
    ["Auth",      "JWT + bcryptjs",                                  "Sesiones sin estado, simples de escalar horizontalmente."],
    ["Base de datos", "MySQL 8.4 (InnoDB, utf8mb4)",                 "Motor relacional con soporte de FK, transacciones y plan de hosting estable en Render."],
    ["Validación", "Zod",                                            "Validación de DTOs de entrada en endpoints críticos (login, registro, pagos)."],
    ["Pagos",      "Mercado Pago (Checkout Pro + Webhooks)",         "Procesador de pagos local con cobertura de tarjetas, transferencias y QR."],
    ["Despliegue FE", "Vercel",                                      "CDN global, despliegue automático desde Git."],
    ["Despliegue BE", "Render.com",                                  "Hosting Node persistente con DB MySQL administrada."],
  ],
  [1400, 2700, TABLE_W - (1400 + 2700)]
));
content.push(caption("Tabla 6.1 — Stack tecnológico adoptado."));

content.push(h2("6.2 Arquitectura general del sistema"));
content.push(p("Se adoptó una arquitectura cliente–servidor en tres capas con separación estricta entre presentación, lógica de negocio y persistencia. El frontend es una aplicación Next.js que se ejecuta tanto en el servidor (renderizado SSR de páginas públicas como catálogo y detalle de producto) como en el navegador del cliente (interacciones del carrito, panel administrativo y formularios). El backend es una API REST que centraliza la lógica de negocio y el acceso a la base de datos. La base de datos MySQL actúa como única fuente de verdad."));
content.push(p("La comunicación entre frontend y backend se realiza por HTTPS mediante peticiones JSON. La autenticación se resuelve con tokens JWT firmados por el backend, transmitidos por el cliente en el encabezado Authorization. Los pagos se delegan a Mercado Pago siguiendo el flujo de Checkout Pro: el backend genera una preferencia de pago, el cliente es redirigido al portal de Mercado Pago y al finalizar el pago el backend recibe la notificación por webhook."));

content.push(h3("Diagrama de despliegue"));
content.push(p("El siguiente diagrama, expresado en notación Mermaid, muestra los nodos físicos/lógicos del sistema y los protocolos de comunicación entre ellos."));
content.push(code("graph TB"));
content.push(code("  subgraph USR[Dispositivo del usuario]"));
content.push(code("    BR[Navegador Web — Chrome / Firefox / Safari]"));
content.push(code("  end"));
content.push(code("  subgraph VRC[Vercel]"));
content.push(code("    NEXT[Frontend Next.js 14 — SSR / App Router]"));
content.push(code("  end"));
content.push(code("  subgraph RND[Render.com]"));
content.push(code("    API[Backend Node.js + Express — API REST + JWT]"));
content.push(code("    MYSQL[(MySQL 8.4 — InnoDB / utf8mb4)]"));
content.push(code("  end"));
content.push(code("  subgraph EXT[Servicios externos]"));
content.push(code("    MP[Mercado Pago — Checkout Pro]"));
content.push(code("  end"));
content.push(code("  BR  -->|HTTPS| NEXT"));
content.push(code("  NEXT -->|HTTPS fetch| API"));
content.push(code("  API -->|TCP 3306| MYSQL"));
content.push(code("  API -->|HTTPS REST| MP"));
content.push(code("  MP  -->|Webhook HTTPS| API"));
content.push(caption("Figura 6.1 — Diagrama de despliegue del sistema."));

content.push(h2("6.3 Diagrama de casos de uso"));
content.push(p("Se identificaron dos actores humanos principales (Cliente y Administrador) y un actor externo (Mercado Pago). El cliente accede al sistema a través del área pública y, una vez autenticado, gestiona su carrito, realiza compras y consulta su historial. El administrador opera el panel privado para mantener productos, stock, pedidos, promociones, reseñas y reportes."));

content.push(h3("Actores"));
content.push(bullet("Cliente: usuario final que navega el catálogo, realiza compras, gestiona direcciones y deja reseñas."));
content.push(bullet("Administrador: usuario con rol 'admin' que gestiona productos, stock, pedidos, promociones, reseñas y consulta reportes y auditoría."));
content.push(bullet("Usuario de solo lectura: rol 'readonly' previsto en la base de datos para auditoría interna; puede consultar el panel sin modificar datos."));
content.push(bullet("Mercado Pago: actor externo que provee el servicio de cobro electrónico y notifica el resultado por webhook."));

content.push(h3("Casos de uso del Cliente"));
content.push(makeTable(
  ["Código", "Caso de uso", "Descripción breve"],
  [
    ["CU-01", "Ver catálogo y filtrar",   "Listar productos con filtros por categoría, búsqueda por texto y orden por precio o relevancia."],
    ["CU-02", "Ver detalle de producto",  "Consultar la ficha de un producto, sus imágenes, descripción, stock y reseñas."],
    ["CU-03", "Registrarse",              "Crear una cuenta de cliente con email y contraseña."],
    ["CU-04", "Iniciar sesión",           "Autenticarse mediante email y contraseña; obtener un JWT."],
    ["CU-05", "Gestionar carrito",        "Agregar, quitar y modificar cantidades de productos en el carrito (persistido en cliente)."],
    ["CU-06", "Realizar checkout",        "Confirmar pedido, elegir método de entrega (retiro en sucursal o envío) y dirección."],
    ["CU-07", "Pagar en línea",           "Ser redirigido a Mercado Pago para completar el pago del pedido."],
    ["CU-08", "Ver historial de pedidos", "Consultar pedidos anteriores y su estado."],
    ["CU-09", "Gestionar direcciones",    "Agregar, modificar, eliminar direcciones y marcar una como predeterminada."],
    ["CU-10", "Escribir reseña",          "Calificar y comentar un producto previamente comprado."],
    ["CU-11", "Recibir notificaciones",   "Consultar notificaciones del sistema (cambio de estado de pedido, etc.)."],
  ],
  [900, 2600, TABLE_W - (900 + 2600)]
));
content.push(caption("Tabla 6.2 — Casos de uso del actor Cliente."));

content.push(h3("Casos de uso del Administrador"));
content.push(makeTable(
  ["Código", "Caso de uso", "Descripción breve"],
  [
    ["CU-12", "Gestionar productos y stock", "Alta, baja, modificación de productos; ingreso/egreso/ajuste de stock con historial."],
    ["CU-13", "Gestionar pedidos",           "Visualizar pedidos, cambiar estado (pendiente → pagado → enviado → entregado, etc.)."],
    ["CU-14", "Gestionar usuarios",          "Listar usuarios y modificar su rol (admin / customer / readonly)."],
    ["CU-15", "Gestionar promociones",       "Crear cupones con porcentaje, monto fijo o envío gratis, con vigencia y tope de usos."],
    ["CU-16", "Ver reportes",                "Productos más vistos, tendencias de venta y ventas por período."],
    ["CU-17", "Consultar auditoría",         "Filtrar el log de acciones críticas por entidad, usuario o fecha."],
    ["CU-18", "Moderar reseñas",             "Aprobar o rechazar reseñas escritas por clientes antes de su publicación."],
  ],
  [900, 2600, TABLE_W - (900 + 2600)]
));
content.push(caption("Tabla 6.3 — Casos de uso del actor Administrador."));

content.push(h3("Diagrama de casos de uso (notación Mermaid)"));
content.push(code("flowchart LR"));
content.push(code("  CL((Cliente)) --> UC1([Ver catálogo])"));
content.push(code("  CL --> UC2([Ver detalle])"));
content.push(code("  CL --> UC3([Registrarse])"));
content.push(code("  CL --> UC4([Iniciar sesión])"));
content.push(code("  CL --> UC5([Carrito])"));
content.push(code("  CL --> UC6([Checkout])"));
content.push(code("  CL --> UC7([Pagar])"));
content.push(code("  UC7 --> MP((Mercado Pago))"));
content.push(code("  CL --> UC8([Historial pedidos])"));
content.push(code("  AD((Administrador)) --> UC12([Gestionar productos/stock])"));
content.push(code("  AD --> UC13([Gestionar pedidos])"));
content.push(code("  AD --> UC14([Gestionar usuarios])"));
content.push(code("  AD --> UC15([Promociones])"));
content.push(code("  AD --> UC16([Reportes])"));
content.push(code("  AD --> UC17([Auditoría])"));
content.push(code("  AD --> UC18([Moderar reseñas])"));
content.push(caption("Figura 6.2 — Casos de uso generales (renderizable en mermaid.live)."));

content.push(h2("6.4 Diagrama de clases conceptual"));
content.push(p("El siguiente diagrama representa las entidades del dominio del problema y sus relaciones, independientes de su implementación física. Se modelan los actores (Usuario), el catálogo (Categoría, Producto, ImagenProducto, EtiquetaProducto), el proceso de compra (Pedido, ItemPedido, Pago, Promoción) y los servicios complementarios (MovimientoStock, ReseñaProducto, Notificación, RegistroAuditoría)."));
content.push(code("classDiagram"));
content.push(code("  class Usuario { +id; +email; +nombre; +rol; +creadoEn }"));
content.push(code("  class Categoria { +id; +nombre; +slug; +parentId }"));
content.push(code("  class Producto { +id; +nombre; +sku; +precio; +stock; +activo; +destacado }"));
content.push(code("  class ImagenProducto { +id; +url; +orden }"));
content.push(code("  class EtiquetaProducto { +id; +nombre; +slug }"));
content.push(code("  class Direccion { +id; +calle; +ciudad; +predeterminada }"));
content.push(code("  class Pedido { +id; +numero; +estado; +subtotal; +descuento; +costoEnvio; +total; +metodoEntrega }"));
content.push(code("  class ItemPedido { +id; +cantidad; +precioUnitario; +totalLinea }"));
content.push(code("  class Pago { +id; +estado; +monto; +mpPaymentId; +mpPreferenceId }"));
content.push(code("  class Promocion { +id; +codigo; +tipo; +valor; +usosMaximos; +usosCorrientes }"));
content.push(code("  class MovimientoStock { +id; +tipo; +cantidad; +stockAnterior; +stockNuevo; +motivo }"));
content.push(code("  class ResenaProducto { +id; +calificacion; +titulo; +cuerpo; +aprobada }"));
content.push(code("  class Notificacion { +id; +tipo; +titulo; +leida }"));
content.push(code("  class RegistroAuditoria { +id; +accion; +entidadTipo; +entidadId; +valorAnterior; +valorNuevo }"));
content.push(code("  Usuario \"1\" --> \"0..*\" Pedido"));
content.push(code("  Usuario \"1\" --> \"0..*\" Direccion"));
content.push(code("  Usuario \"1\" --> \"0..*\" ResenaProducto"));
content.push(code("  Usuario \"1\" --> \"0..*\" Notificacion"));
content.push(code("  Pedido  \"1\"    *-- \"1..*\" ItemPedido"));
content.push(code("  Pedido  \"1\"    --> \"0..1\" Pago"));
content.push(code("  Pedido  \"0..*\" --> \"0..1\" Promocion"));
content.push(code("  ItemPedido \"0..*\" --> \"1\" Producto"));
content.push(code("  Categoria \"0..*\" --> \"0..1\" Categoria"));
content.push(code("  Producto  \"0..*\" --> \"1\"    Categoria"));
content.push(code("  Producto  \"1\"    --> \"0..*\" ImagenProducto"));
content.push(code("  Producto  \"1\"    --> \"0..*\" EtiquetaProducto"));
content.push(code("  Producto  \"1\"    --> \"0..*\" MovimientoStock"));
content.push(code("  Producto  \"1\"    --> \"0..*\" ResenaProducto"));
content.push(caption("Figura 6.3 — Diagrama de clases del dominio."));

content.push(h2("6.5 Modelo entidad–relación y diccionario de datos"));
content.push(p("La base de datos MySQL del sistema cuenta con 17 tablas. El esquema completo se inicializa de forma idempotente al arrancar el backend (archivo backend/src/db/schema.ts). A continuación se detalla cada tabla con sus campos, tipos, claves y descripción."));

// — Tabla users —
content.push(h3("Tabla: users"));
content.push(p("Almacena las cuentas del sistema: clientes registrados, administradores y usuarios de solo lectura."));
content.push(dictTable([
  ["id",         "VARCHAR(50)",                                  "✓", "",  "Identificador (UUID o slug corto)."],
  ["email",      "VARCHAR(255) UNIQUE",                          "",  "",  "Email del usuario (único)."],
  ["password",   "VARCHAR(255)",                                 "",  "",  "Hash bcrypt de la contraseña."],
  ["first_name", "VARCHAR(100)",                                 "",  "",  "Nombre."],
  ["last_name",  "VARCHAR(100)",                                 "",  "",  "Apellido."],
  ["phone",      "VARCHAR(50)",                                  "",  "",  "Teléfono de contacto (opcional)."],
  ["role",       "ENUM(admin, customer, readonly)",              "",  "",  "Rol del usuario, define permisos."],
  ["created_at", "DATETIME",                                     "",  "",  "Fecha de alta."],
  ["updated_at", "DATETIME",                                     "",  "",  "Fecha de última modificación."],
]));

content.push(h3("Tabla: categories"));
content.push(p("Árbol de categorías con autorreferencia (parent_id) para soportar subcategorías."));
content.push(dictTable([
  ["id",          "VARCHAR(50)",            "✓", "",  "Identificador."],
  ["name",        "VARCHAR(255)",           "",  "",  "Nombre visible."],
  ["slug",        "VARCHAR(255) UNIQUE",    "",  "",  "Identificador legible para la URL."],
  ["description", "TEXT",                   "",  "",  "Descripción larga (opcional)."],
  ["image_url",   "TEXT",                   "",  "",  "Imagen ilustrativa."],
  ["parent_id",   "VARCHAR(50)",            "",  "✓", "FK a categories.id; null = categoría raíz."],
  ["sort_order",  "INT",                    "",  "",  "Orden de presentación."],
  ["is_active",   "TINYINT(1)",             "",  "",  "1 = visible en el catálogo."],
]));

content.push(h3("Tabla: products"));
content.push(p("Catálogo principal de productos. La columna metadata permite atributos flexibles en JSON."));
content.push(dictTable([
  ["id",                "VARCHAR(50)",           "✓", "",  "Identificador del producto."],
  ["name",              "VARCHAR(255)",          "",  "",  "Nombre del producto."],
  ["slug",              "VARCHAR(255) UNIQUE",   "",  "",  "Slug para URL pública."],
  ["description",       "TEXT",                  "",  "",  "Descripción larga (HTML/Markdown)."],
  ["short_description", "TEXT",                  "",  "",  "Descripción breve para listados."],
  ["sku",               "VARCHAR(100) UNIQUE",   "",  "",  "Código interno del producto."],
  ["price",             "DECIMAL(15,2)",         "",  "",  "Precio de venta."],
  ["compare_price",     "DECIMAL(15,2)",         "",  "",  "Precio tachado para mostrar descuento."],
  ["category_id",       "VARCHAR(50)",           "",  "✓", "FK a categories.id."],
  ["stock_quantity",    "INT",                   "",  "",  "Stock disponible actual."],
  ["is_active",         "TINYINT(1)",            "",  "",  "Producto publicado/no publicado."],
  ["is_featured",       "TINYINT(1)",            "",  "",  "Aparece en sección destacados."],
  ["brand",             "VARCHAR(100)",          "",  "",  "Marca del producto."],
  ["model",             "VARCHAR(100)",          "",  "",  "Modelo del producto."],
  ["weight",            "DOUBLE",                "",  "",  "Peso (para cálculo de envío)."],
  ["metadata",          "TEXT",                  "",  "",  "Atributos extra serializados como JSON."],
  ["created_at",        "DATETIME",              "",  "",  "Fecha de alta."],
  ["updated_at",        "DATETIME",              "",  "",  "Última modificación."],
]));

content.push(h3("Tabla: product_images"));
content.push(dictTable([
  ["id",         "VARCHAR(50)",   "✓", "",  "Identificador."],
  ["product_id", "VARCHAR(50)",   "",  "✓", "FK a products.id (CASCADE)."],
  ["image_url",  "TEXT",          "",  "",  "URL absoluta de la imagen."],
  ["alt_text",   "VARCHAR(255)",  "",  "",  "Texto alternativo (accesibilidad)."],
  ["sort_order", "INT",           "",  "",  "Orden de visualización."],
]));

content.push(h3("Tabla: product_tags y product_tag_map"));
content.push(p("Relación N:M entre productos y etiquetas para búsqueda y filtros transversales a la categoría."));
content.push(dictTable([
  ["product_tags.id",       "VARCHAR(50)",          "✓", "",  "Identificador de la etiqueta."],
  ["product_tags.name",     "VARCHAR(100)",         "",  "",  "Nombre visible."],
  ["product_tags.slug",     "VARCHAR(100) UNIQUE",  "",  "",  "Slug para URL/filtros."],
  ["product_tag_map.product_id", "VARCHAR(50)",     "✓", "✓", "FK a products.id (CASCADE)."],
  ["product_tag_map.tag_id",     "VARCHAR(50)",     "✓", "✓", "FK a product_tags.id (CASCADE)."],
]));

content.push(h3("Tabla: addresses"));
content.push(dictTable([
  ["id",          "VARCHAR(50)",          "✓", "",  "Identificador."],
  ["user_id",     "VARCHAR(50)",          "",  "✓", "FK a users.id (CASCADE)."],
  ["street",      "VARCHAR(255)",         "",  "",  "Calle."],
  ["number",      "VARCHAR(20)",          "",  "",  "Altura."],
  ["floor",       "VARCHAR(20)",          "",  "",  "Piso (opcional)."],
  ["apartment",   "VARCHAR(20)",          "",  "",  "Departamento (opcional)."],
  ["city",        "VARCHAR(100)",         "",  "",  "Ciudad/Localidad."],
  ["province",    "VARCHAR(100)",         "",  "",  "Provincia."],
  ["postal_code", "VARCHAR(20)",          "",  "",  "Código postal."],
  ["country",     "VARCHAR(100)",         "",  "",  "País (default Argentina)."],
  ["is_default",  "TINYINT(1)",           "",  "",  "Marca dirección predeterminada."],
  ["created_at",  "DATETIME",             "",  "",  "Fecha de alta."],
]));

content.push(h3("Tabla: orders"));
content.push(p("Pedidos generados desde el checkout. El estado sigue una máquina de estados controlada por el backend y por el webhook de Mercado Pago."));
content.push(dictTable([
  ["id",               "VARCHAR(50)",                                                                                                "✓", "",  "Identificador interno."],
  ["order_number",     "VARCHAR(50) UNIQUE",                                                                                          "",  "",  "Número visible al usuario."],
  ["user_id",          "VARCHAR(50)",                                                                                                 "",  "✓", "FK a users.id."],
  ["status",           "ENUM(pending, paid, processing, ready_to_ship, shipped, delivered, cancelled, refunded)",                     "",  "",  "Estado del pedido."],
  ["subtotal",         "DECIMAL(15,2)",                                                                                               "",  "",  "Suma de líneas sin descuento ni envío."],
  ["discount_amount",  "DECIMAL(15,2)",                                                                                               "",  "",  "Descuento aplicado por cupón."],
  ["shipping_cost",    "DECIMAL(15,2)",                                                                                               "",  "",  "Costo de envío calculado."],
  ["total",            "DECIMAL(15,2)",                                                                                               "",  "",  "Total final cobrado."],
  ["delivery_method",  "ENUM(pickup, shipping)",                                                                                       "",  "",  "Retiro en sucursal o envío a domicilio."],
  ["shipping_address", "TEXT",                                                                                                         "",  "",  "Dirección completa serializada."],
  ["notes",            "TEXT",                                                                                                         "",  "",  "Notas del cliente."],
  ["created_at",       "DATETIME",                                                                                                     "",  "",  "Fecha de creación."],
  ["updated_at",       "DATETIME",                                                                                                     "",  "",  "Última modificación."],
]));

content.push(h3("Tabla: order_items"));
content.push(dictTable([
  ["id",          "VARCHAR(50)",     "✓", "",  "Identificador de la línea."],
  ["order_id",    "VARCHAR(50)",     "",  "✓", "FK a orders.id (CASCADE)."],
  ["product_id",  "VARCHAR(50)",     "",  "✓", "FK a products.id (snapshot)."],
  ["quantity",    "INT",             "",  "",  "Unidades vendidas."],
  ["unit_price",  "DECIMAL(15,2)",   "",  "",  "Precio al momento de la compra."],
  ["total_price", "DECIMAL(15,2)",   "",  "",  "Subtotal de la línea."],
]));

content.push(h3("Tabla: payments"));
content.push(p("Registro de los pagos. La columna raw_response guarda la respuesta cruda de Mercado Pago para trazabilidad."));
content.push(dictTable([
  ["id",                "VARCHAR(50)",                                                "✓", "",  "Identificador."],
  ["order_id",          "VARCHAR(50)",                                                "",  "✓", "FK a orders.id."],
  ["mp_payment_id",     "VARCHAR(100)",                                               "",  "",  "ID del pago en Mercado Pago."],
  ["mp_preference_id",  "VARCHAR(100)",                                               "",  "",  "ID de la preferencia creada."],
  ["status",            "ENUM(pending, approved, rejected, cancelled, refunded)",     "",  "",  "Estado del pago."],
  ["amount",            "DECIMAL(15,2)",                                              "",  "",  "Monto."],
  ["currency",          "VARCHAR(10)",                                                "",  "",  "Moneda (ARS por defecto)."],
  ["payment_method",    "VARCHAR(100)",                                               "",  "",  "Medio (tarjeta, transferencia, etc.)."],
  ["raw_response",      "TEXT",                                                       "",  "",  "Respuesta cruda de MP."],
  ["created_at",        "DATETIME",                                                   "",  "",  "Fecha de creación."],
  ["updated_at",        "DATETIME",                                                   "",  "",  "Última modificación."],
]));

content.push(h3("Tabla: promotions"));
content.push(dictTable([
  ["id",               "VARCHAR(50)",                                          "✓", "",  "Identificador."],
  ["code",             "VARCHAR(50) UNIQUE",                                   "",  "",  "Cupón ingresado por el usuario."],
  ["name",             "VARCHAR(255)",                                         "",  "",  "Nombre interno."],
  ["description",      "TEXT",                                                 "",  "",  "Descripción de la promoción."],
  ["type",             "ENUM(percentage, fixed_amount, free_shipping)",        "",  "",  "Tipo de descuento."],
  ["value",            "DECIMAL(15,2)",                                        "",  "",  "Valor del descuento."],
  ["min_order_amount", "DECIMAL(15,2)",                                        "",  "",  "Monto mínimo de compra."],
  ["max_uses",         "INT",                                                  "",  "",  "Tope total de usos."],
  ["current_uses",     "INT",                                                  "",  "",  "Usos consumidos."],
  ["is_active",        "TINYINT(1)",                                           "",  "",  "Activa/inactiva."],
  ["valid_from",       "VARCHAR(20)",                                          "",  "",  "Vigente desde (YYYY-MM-DD)."],
  ["valid_until",      "VARCHAR(20)",                                          "",  "",  "Vigente hasta (YYYY-MM-DD)."],
]));

content.push(h3("Tabla: stock_movements"));
content.push(dictTable([
  ["id",                 "VARCHAR(50)",                                                "✓", "",  "Identificador."],
  ["product_id",         "VARCHAR(50)",                                                "",  "✓", "FK a products.id."],
  ["type",               "ENUM(ingreso, egreso, ajuste, venta, devolucion)",           "",  "",  "Tipo de movimiento."],
  ["quantity",           "INT",                                                        "",  "",  "Cantidad del movimiento."],
  ["previous_quantity",  "INT",                                                        "",  "",  "Stock antes del movimiento."],
  ["new_quantity",       "INT",                                                        "",  "",  "Stock luego del movimiento."],
  ["reason",             "TEXT",                                                       "",  "",  "Motivo o nota."],
  ["reference_id",       "VARCHAR(50)",                                                "",  "",  "ID relacionado (p. ej. pedido)."],
  ["user_id",            "VARCHAR(50)",                                                "",  "✓", "FK a users.id (quién registró)."],
  ["created_at",         "DATETIME",                                                   "",  "",  "Fecha del movimiento."],
]));

content.push(h3("Tabla: audit_logs"));
content.push(dictTable([
  ["id",             "VARCHAR(50)",   "✓", "",  "Identificador."],
  ["action",         "VARCHAR(100)",  "",  "",  "Acción realizada (create, update, delete)."],
  ["entity_type",    "VARCHAR(100)",  "",  "",  "Tipo de entidad (product, order, user…)."],
  ["entity_id",      "VARCHAR(50)",   "",  "",  "ID de la entidad afectada."],
  ["user_id",        "VARCHAR(50)",   "",  "✓", "FK a users.id."],
  ["previous_value", "TEXT",          "",  "",  "Valor previo (JSON)."],
  ["new_value",      "TEXT",          "",  "",  "Valor nuevo (JSON)."],
  ["ip_address",     "VARCHAR(45)",   "",  "",  "IP origen."],
  ["created_at",     "DATETIME",      "",  "",  "Fecha del evento."],
]));

content.push(h3("Tabla: notifications"));
content.push(dictTable([
  ["id",         "VARCHAR(50)",                                            "✓", "",  "Identificador."],
  ["user_id",    "VARCHAR(50)",                                            "",  "✓", "FK a users.id (CASCADE)."],
  ["type",       "ENUM(order_new, order_status, stock_low, review_new)",   "",  "",  "Tipo de notificación."],
  ["title",      "VARCHAR(255)",                                           "",  "",  "Título corto."],
  ["message",    "TEXT",                                                   "",  "",  "Cuerpo del mensaje."],
  ["is_read",    "TINYINT(1)",                                             "",  "",  "Marca leída/no leída."],
  ["link",       "VARCHAR(500)",                                           "",  "",  "URL relacionada."],
  ["created_at", "DATETIME",                                               "",  "",  "Fecha."],
]));

content.push(h3("Tabla: product_reviews"));
content.push(dictTable([
  ["id",          "VARCHAR(50)",  "✓", "",  "Identificador."],
  ["product_id",  "VARCHAR(50)",  "",  "✓", "FK a products.id (CASCADE)."],
  ["user_id",     "VARCHAR(50)",  "",  "✓", "FK a users.id."],
  ["rating",      "TINYINT 1..5", "",  "",  "Puntuación."],
  ["title",       "VARCHAR(255)", "",  "",  "Título de la reseña."],
  ["body",        "TEXT",         "",  "",  "Cuerpo del comentario."],
  ["is_approved", "TINYINT(1)",   "",  "",  "Aprobada por moderación."],
  ["created_at",  "DATETIME",     "",  "",  "Fecha de envío."],
]));

content.push(h3("Tabla: product_views"));
content.push(p("Registra visitas a fichas de producto para alimentar reportes y recomendaciones."));
content.push(dictTable([
  ["id",         "VARCHAR(50)",  "✓", "",  "Identificador."],
  ["product_id", "VARCHAR(50)",  "",  "✓", "FK a products.id (CASCADE)."],
  ["user_id",    "VARCHAR(50)",  "",  "",  "Usuario autenticado (null si anónimo)."],
  ["ip_address", "VARCHAR(45)",  "",  "",  "IP del visitante."],
  ["created_at", "DATETIME",     "",  "",  "Timestamp de la visita."],
]));

content.push(h2("6.6 Diseño de la API REST"));
content.push(p("La API se organiza en cinco routers (auth, catalog, payments, admin, webhooks). Las rutas administrativas requieren JWT + rol admin; las de cuenta requieren JWT; las de catálogo son públicas con autenticación opcional para personalización."));
content.push(makeTable(
  ["Método", "Ruta", "Descripción"],
  [
    ["POST",   "/auth/login",                       "Autenticación con email y contraseña; devuelve JWT."],
    ["POST",   "/auth/register",                    "Registro de cliente."],
    ["GET",    "/auth/me",                          "Datos del usuario autenticado."],
    ["PATCH",  "/auth/me",                          "Actualizar perfil."],
    ["GET",    "/auth/orders",                      "Pedidos del usuario."],
    ["GET",    "/auth/orders/:id",                  "Detalle de un pedido propio."],
    ["GET",    "/auth/addresses",                   "Listar direcciones."],
    ["POST",   "/auth/addresses",                   "Crear dirección."],
    ["PUT",    "/auth/addresses/:id",               "Actualizar dirección."],
    ["DELETE", "/auth/addresses/:id",               "Eliminar dirección."],
    ["PATCH",  "/auth/addresses/:id/default",       "Marcar predeterminada."],
    ["GET",    "/auth/notifications",               "Listar notificaciones."],
    ["PATCH",  "/auth/notifications/read-all",      "Marcar todas como leídas."],
    ["GET",    "/catalog/products",                 "Listado con filtros/paginación."],
    ["GET",    "/catalog/products/featured",        "Productos destacados."],
    ["GET",    "/catalog/products/:slug",           "Detalle de producto."],
    ["GET",    "/catalog/categories",               "Categorías activas."],
    ["POST",   "/catalog/reviews",                  "Crear reseña."],
    ["POST",   "/catalog/views",                    "Registrar visita a ficha."],
    ["POST",   "/payments/validate-coupon",         "Validar cupón."],
    ["POST",   "/payments/create-order",            "Crear pedido + preferencia MP."],
    ["GET",    "/admin/products",                   "Listado para administración."],
    ["POST",   "/admin/products",                   "Alta de producto."],
    ["PUT",    "/admin/products/:id",               "Modificación."],
    ["DELETE", "/admin/products/:id",               "Baja lógica."],
    ["POST",   "/admin/stock/:productId/movement",  "Registrar movimiento de stock."],
    ["GET",    "/admin/orders",                     "Listado de pedidos."],
    ["PATCH",  "/admin/orders/:id/status",          "Cambiar estado."],
    ["GET",    "/admin/users",                      "Listar usuarios."],
    ["PATCH",  "/admin/users/:id/role",             "Cambiar rol."],
    ["GET",    "/admin/promotions",                 "Listar promociones."],
    ["POST",   "/admin/promotions",                 "Crear promoción."],
    ["GET",    "/admin/audit-logs",                 "Consultar auditoría."],
    ["GET",    "/admin/reviews",                    "Reseñas pendientes."],
    ["PATCH",  "/admin/reviews/:id/approve",        "Aprobar reseña."],
    ["GET",    "/reports/top-products",             "Productos más visitados."],
    ["GET",    "/reports/sales-by-period",          "Ventas por período."],
    ["POST",   "/webhooks/mercadopago",             "Webhook de pagos."],
    ["GET",    "/health",                           "Healthcheck del servicio."],
  ],
  [800, 3400, TABLE_W - (800 + 3400)]
));
content.push(caption("Tabla 6.4 — Endpoints principales de la API REST."));

content.push(h2("6.7 Diseño de seguridad"));
content.push(bulletRich([{ text: "Contraseñas: ", bold: true }, "se almacenan únicamente como hash bcrypt (factor de costo 10). El backend nunca persiste ni loguea contraseñas en claro."]));
content.push(bulletRich([{ text: "Sesiones: ", bold: true }, "JWT firmado con HS256 mediante un secreto leído de la variable de entorno JWT_SECRET. El token incluye userId y role, y vence a los 7 días."]));
content.push(bulletRich([{ text: "Autorización: ", bold: true }, "middleware requireAuth valida el token; middleware requireAdmin verifica role === 'admin' para todas las rutas bajo /admin."]));
content.push(bulletRich([{ text: "Webhooks: ", bold: true }, "el endpoint /webhooks/mercadopago valida la firma HMAC-SHA256 enviada en el header x-signature usando MP_WEBHOOK_SECRET antes de procesar la notificación."]));
content.push(bulletRich([{ text: "CORS: ", bold: true }, "restringido al dominio del frontend mediante la variable FRONTEND_URL."]));
content.push(bulletRich([{ text: "Auditoría: ", bold: true }, "operaciones críticas del panel (alta, modificación, baja de productos, pedidos y usuarios) registran un audit_log con usuario, IP, valores previo y nuevo."]));
content.push(bulletRich([{ text: "Validación de entradas: ", bold: true }, "se usa Zod para validar DTOs en endpoints sensibles (login, registro, creación de pedidos y cupones)."]));

content.push(h2("6.8 Estudio de factibilidad actualizado"));
content.push(h3("Factibilidad técnica"));
content.push(p("El sistema corre sobre tecnologías de uso masivo y libres. El frontend se ejecuta sobre Node 18+ y se despliega en Vercel; el backend sobre Node 18+ en Render. La base de datos MySQL se administra desde el mismo proveedor. Para el desarrollo local sólo se requiere Node, npm y un servidor MySQL (o un contenedor Docker). Cualquier notebook moderno con 4 GB de RAM y 5 GB libres en disco es suficiente."));
content.push(h3("Factibilidad operativa"));
content.push(p("El panel administrativo es accesible desde un navegador web y reutiliza patrones conocidos (formularios, tablas paginadas, filtros). El personal de Tele Import S.A. ya opera otros sistemas web, por lo que se prevé únicamente una capacitación inicial breve. Adicionalmente, las acciones críticas son reversibles y quedan registradas en auditoría."));
content.push(h3("Factibilidad económica"));
content.push(p("Durante la etapa de validación, el sistema puede desplegarse con costo cero usando las capas gratuitas de Vercel y Render. En producción real, los costos estimados rondan los USD 7–25 mensuales por el plan básico de hosting del backend y la base de datos. Mercado Pago cobra una comisión por venta procesada según su tarifario público."));

content.push(pageBreak());

// ═════════════════════════════════════════════════════════════════════════
// CAPÍTULO 7
// ═════════════════════════════════════════════════════════════════════════
content.push(h1("Capítulo 7 — Implementación del Sistema"));
content.push(p("Este capítulo documenta la implementación concreta del diseño descripto en el capítulo 6. Se detalla la estructura del repositorio, los módulos de cada capa, las decisiones técnicas relevantes y los algoritmos no triviales del sistema."));

content.push(h2("7.1 Estructura del repositorio"));
content.push(p("El proyecto se organiza como un monorepo simple con dos sub-proyectos independientes (backend y frontend) más scripts de generación de documentación en la raíz."));
content.push(code("nuevotesis/"));
content.push(code("├── backend/                  # API REST (Express + MySQL)"));
content.push(code("│   ├── src/"));
content.push(code("│   │   ├── db/               # conexión + schema + seed"));
content.push(code("│   │   ├── routes/           # auth, catalog, payments, admin, webhooks, reports"));
content.push(code("│   │   ├── services/         # recommendations, notifications"));
content.push(code("│   │   ├── middleware/       # auth, errores"));
content.push(code("│   │   └── index.ts          # bootstrap del servidor"));
content.push(code("│   └── package.json"));
content.push(code("├── frontend/                 # Next.js 14 (App Router)"));
content.push(code("│   ├── src/"));
content.push(code("│   │   ├── app/              # rutas con route groups"));
content.push(code("│   │   ├── components/       # UI reusable"));
content.push(code("│   │   ├── hooks/            # custom hooks (cart, auth, queries)"));
content.push(code("│   │   ├── lib/              # api client, helpers"));
content.push(code("│   │   ├── stores/           # estado global (Zustand)"));
content.push(code("│   │   └── types/            # tipos TypeScript compartidos"));
content.push(code("│   └── package.json"));
content.push(code("├── render.yaml               # blueprint de Render"));
content.push(code("├── DEPLOY.md                 # guía de despliegue"));
content.push(code("└── Diagramas_Mermaid.md      # diagramas en notación Mermaid"));

content.push(h2("7.2 Backend — Express + MySQL"));
content.push(p("El backend es una API REST construida con Express. El punto de entrada (src/index.ts) inicializa el pool de conexiones MySQL, ejecuta el script de creación de esquema (idempotente) y monta los routers."));

content.push(h3("Pool de conexiones MySQL"));
content.push(p("Se usa la versión promesa de mysql2 para aprovechar async/await. El pool acota la cantidad máxima de conexiones simultáneas y maneja la reconexión automática."));
content.push(code("import mysql from \"mysql2/promise\";"));
content.push(code("const pool = mysql.createPool({"));
content.push(code("  host: process.env.DB_HOST,"));
content.push(code("  user: process.env.DB_USER,"));
content.push(code("  password: process.env.DB_PASSWORD,"));
content.push(code("  database: process.env.DB_NAME,"));
content.push(code("  waitForConnections: true,"));
content.push(code("  connectionLimit: 10,"));
content.push(code("});"));

content.push(h3("Routers"));
content.push(makeTable(
  ["Router", "Archivo", "Responsabilidad"],
  [
    ["authRouter",     "src/routes/auth.ts",      "Autenticación, perfil, direcciones, notificaciones."],
    ["catalogRouter",  "src/routes/catalog.ts",   "Catálogo público, búsqueda, detalle, reseñas, visitas."],
    ["paymentsRouter", "src/routes/payments.ts",  "Validación de cupones, creación de pedidos y preferencias MP."],
    ["adminRouter",    "src/routes/admin.ts",     "CRUD de productos, stock, usuarios, promociones, pedidos."],
    ["webhooksRouter", "src/routes/webhooks.ts",  "Recepción y verificación de notificaciones de Mercado Pago."],
    ["reportsRouter",  "src/routes/reports.ts",   "Reportes: top productos, ventas por período, tendencias."],
  ],
  [1700, 2400, TABLE_W - (1700 + 2400)]
));
content.push(caption("Tabla 7.1 — Routers del backend."));

content.push(h3("Servicios"));
content.push(bulletRich([{ text: "services/recommendations.ts: ", bold: true }, "calcula recomendaciones combinando categorías preferidas del usuario (a partir de su historial de pedidos pagados) y productos en tendencia (más vendidos en los últimos 30 días)."]));
content.push(bulletRich([{ text: "services/notifications.ts: ", bold: true }, "centraliza la creación de notificaciones internas cuando ocurren eventos relevantes (nuevo pedido, cambio de estado, stock bajo, nueva reseña)."]));

content.push(h2("7.3 Frontend — Next.js 14 con App Router"));
content.push(p("El frontend usa el App Router de Next.js 14, que permite definir layouts anidados, server components y route groups. Los route groups (carpetas entre paréntesis) agrupan páginas que comparten layout sin afectar la URL."));

content.push(h3("Mapa de rutas"));
content.push(makeTable(
  ["Grupo", "Ruta pública", "Páginas"],
  [
    ["(public)",  "/, /catalogo, /producto/[slug]",       "Catálogo y ficha de producto, SSR para SEO."],
    ["(auth)",    "/login, /registro",                    "Formularios de autenticación."],
    ["(shop)",    "/carrito, /checkout, /checkout/exitoso, /checkout/fallido", "Flujo de compra y resultado del pago."],
    ["(account)", "/perfil, /pedidos, /perfil/direcciones, /perfil/pedidos", "Área privada del cliente."],
    ["(admin)",   "/admin/productos, /admin/stock, /admin/pedidos, /admin/usuarios, /admin/promociones, /admin/reportes, /admin/resenas, /admin/auditoria", "Panel administrativo (rol admin)."],
    ["api",       "/api/pagos/preferencia, /api/pagos/validar-cupon, /api/recomendaciones", "Route Handlers que actúan como proxy/BFF al backend."],
  ],
  [1100, 3000, TABLE_W - (1100 + 3000)]
));
content.push(caption("Tabla 7.2 — Mapa de rutas del frontend."));

content.push(h3("Gestión de estado"));
content.push(bulletRich([{ text: "Zustand: ", bold: true }, "estado del carrito (líneas, totales, persistencia en localStorage) y sesión del usuario (JWT, datos básicos)."]));
content.push(bulletRich([{ text: "TanStack React Query: ", bold: true }, "fetching, caché e invalidación de datos remotos. Cada vista del panel admin define sus propias queries con stale-time razonable."]));
content.push(bulletRich([{ text: "Server Components: ", bold: true }, "el catálogo y la ficha de producto se renderizan en el servidor para optimizar SEO y primer pintado."]));

content.push(h2("7.4 Algoritmo de recomendaciones"));
content.push(p("La función getRecommendedProducts combina dos señales:"));
content.push(bullet("Preferencias del usuario: categorías de productos comprados previamente (consulta sobre orders + order_items + products)."));
content.push(bullet("Tendencias globales: top de productos más vendidos en los últimos 30 días."));
content.push(p("Cuando el usuario está autenticado, se ponderan ambas señales y se filtran productos sin stock. Cuando no lo está, se devuelve sólo el ranking global de tendencias. El resultado se cachea con React Query del lado del cliente."));

content.push(h2("7.5 Integración con Mercado Pago"));
content.push(p("El flujo de pago sigue el patrón Checkout Pro:"));
content.push(bulletRich([{ text: "Paso 1 — Validación y reserva: ", bold: true }, "el frontend envía el carrito al endpoint /payments/create-order. El backend valida stock, recalcula precios desde DB (nunca confía en los del cliente), aplica cupones y crea la fila orders con estado 'pending'."]));
content.push(bulletRich([{ text: "Paso 2 — Preferencia MP: ", bold: true }, "el backend invoca al SDK de Mercado Pago con los ítems del pedido y URLs de retorno (exitoso, fallido, pendiente). Recibe un preference_id."]));
content.push(bulletRich([{ text: "Paso 3 — Redirección: ", bold: true }, "el frontend recibe init_point y redirige el navegador a la URL de Mercado Pago."]));
content.push(bulletRich([{ text: "Paso 4 — Webhook: ", bold: true }, "al finalizar el pago, Mercado Pago llama a /webhooks/mercadopago. El backend verifica la firma HMAC, consulta el detalle del pago vía API y actualiza payments.status y orders.status (pending → paid o pending → cancelled). También dispara una notificación interna y descuenta stock con un stock_movement de tipo 'venta'."]));
content.push(bulletRich([{ text: "Paso 5 — Retorno: ", bold: true }, "el usuario aterriza en /checkout/exitoso o /checkout/fallido según el resultado, y el frontend hace polling al endpoint del pedido para reflejar el estado real."]));

content.push(h2("7.6 Auditoría"));
content.push(p("Toda mutación en /admin/products, /admin/orders y /admin/users genera un audit_log con la siguiente información: acción, tipo y ID de entidad, usuario que la ejecutó, valor previo y nuevo (en JSON) e IP de origen. La consulta de auditoría desde el panel admite filtros por entidad, acción, usuario y rango de fechas."));

content.push(h2("7.7 Reportes y métricas"));
content.push(bulletRich([{ text: "Productos más visitados: ", bold: true }, "ranking por COUNT(*) sobre product_views, con ventana temporal configurable (7 días, 30 días, total)."]));
content.push(bulletRich([{ text: "Ventas por período: ", bold: true }, "agregación de orders con estado 'paid' o 'delivered' agrupada por día/mes/año."]));
content.push(bulletRich([{ text: "Tendencias de compra: ", bold: true }, "categorías y productos con mayor crecimiento porcentual respecto al período anterior."]));

content.push(pageBreak());

// ═════════════════════════════════════════════════════════════════════════
// CAPÍTULO 8
// ═════════════════════════════════════════════════════════════════════════
content.push(h1("Capítulo 8 — Despliegue, Pruebas y Conclusión"));

content.push(h2("8.1 Despliegue del backend en Render"));
content.push(p("El backend se despliega con un blueprint declarativo (render.yaml). Render detecta el archivo al conectar el repositorio y aprovisiona el servicio web y la base de datos MySQL. La build ejecuta tsc para compilar TypeScript; el comando de arranque es node dist/index.js. Se configura un healthcheck sobre el endpoint GET /health."));

content.push(h3("Variables de entorno del backend"));
content.push(makeTable(
  ["Variable", "Descripción"],
  [
    ["PORT",                  "Puerto del servicio (4000 por defecto)."],
    ["FRONTEND_URL",          "URL del frontend (para CORS y URLs de retorno de MP)."],
    ["BACKEND_URL",           "URL pública del backend (para webhooks)."],
    ["DB_HOST / DB_USER / DB_PASSWORD / DB_NAME", "Credenciales MySQL."],
    ["JWT_SECRET",            "Secreto para firmar JWT."],
    ["MP_ACCESS_TOKEN",       "Access token de Mercado Pago."],
    ["MP_WEBHOOK_SECRET",     "Secreto compartido para validar firmas de webhook."],
  ],
  [2300, TABLE_W - 2300]
));
content.push(caption("Tabla 8.1 — Variables de entorno requeridas por el backend."));

content.push(h2("8.2 Despliegue del frontend en Vercel"));
content.push(p("Se importa el repositorio en Vercel y se configura frontend como directorio raíz. Vercel detecta Next.js automáticamente, ejecuta next build y publica el sitio bajo HTTPS con CDN global. Cada push a la rama principal dispara un redeploy."));

content.push(h3("Variables de entorno del frontend"));
content.push(makeTable(
  ["Variable", "Descripción"],
  [
    ["NEXT_PUBLIC_APP_URL",      "URL pública del frontend."],
    ["NEXT_PUBLIC_API_URL",      "URL del backend (consumida desde el cliente)."],
    ["BACKEND_SERVICE_URL",      "URL del backend (consumida desde route handlers server-side)."],
    ["NEXT_PUBLIC_MP_PUBLIC_KEY","Public key de Mercado Pago para el SDK del cliente."],
    ["MP_ACCESS_TOKEN",          "Access token MP para llamadas server-side desde route handlers."],
  ],
  [2700, TABLE_W - 2700]
));
content.push(caption("Tabla 8.2 — Variables de entorno requeridas por el frontend."));

content.push(h2("8.3 Webhook de Mercado Pago"));
content.push(p("Tras desplegar el backend, se configura el webhook en el panel de Mercado Pago apuntando a https://<backend>/webhooks/mercadopago. El secreto que MP entrega para firmar las notificaciones debe coincidir con MP_WEBHOOK_SECRET en el backend; cualquier discrepancia se rechaza con 401."));

content.push(h2("8.4 Healthcheck y monitoreo"));
content.push(p("El backend expone GET /health, que devuelve { status: \"ok\", db: \"up\", uptime } luego de validar una consulta SELECT 1 contra MySQL. Render usa este endpoint para considerar al servicio saludable. Los logs de aplicación se consultan desde el panel de Render; los del frontend, desde el panel de Vercel."));

content.push(h2("8.5 Plan de pruebas"));
content.push(p("Las pruebas se organizaron en tres niveles."));
content.push(h3("Pruebas funcionales (manuales)"));
content.push(makeTable(
  ["ID", "Escenario", "Resultado esperado"],
  [
    ["PF-01", "Registro de cliente con email nuevo.",                 "Cuenta creada, JWT emitido, redirección al catálogo."],
    ["PF-02", "Login con credenciales válidas.",                       "JWT emitido y guardado en cliente."],
    ["PF-03", "Login con contraseña incorrecta.",                      "401 con mensaje genérico, sin filtrar si el email existe."],
    ["PF-04", "Agregar producto al carrito.",                          "Línea aparece en el carrito; subtotal actualizado."],
    ["PF-05", "Checkout con producto sin stock.",                      "Error de validación antes de llamar a MP."],
    ["PF-06", "Pago aprobado.",                                         "Pedido pasa a 'paid'; se descuenta stock; aparece notificación al admin."],
    ["PF-07", "Pago rechazado.",                                        "Pedido pasa a 'cancelled'; no se descuenta stock."],
    ["PF-08", "Cupón válido.",                                          "Se aplica descuento; se incrementa current_uses."],
    ["PF-09", "Cupón vencido o sin usos.",                              "Validación rechazada con mensaje claro."],
    ["PF-10", "Acceso a /admin sin rol admin.",                        "403 Acceso denegado."],
    ["PF-11", "Alta de producto desde panel.",                          "Producto visible en catálogo público inmediatamente."],
    ["PF-12", "Cambio de stock desde panel.",                           "stock_movement creado; auditoría registrada."],
    ["PF-13", "Reseña enviada por cliente.",                            "Queda en estado is_approved = 0; visible en /admin/resenas."],
    ["PF-14", "Reseña aprobada por admin.",                             "Aparece en la ficha del producto."],
  ],
  [700, 3000, TABLE_W - (700 + 3000)]
));
content.push(caption("Tabla 8.3 — Casos de prueba funcionales."));

content.push(h3("Pruebas no funcionales"));
content.push(bulletRich([{ text: "Compatibilidad: ", bold: true }, "verificación en Chrome, Firefox y Safari sobre escritorio; Chrome y Safari sobre iOS y Android."]));
content.push(bulletRich([{ text: "Responsivo: ", bold: true }, "verificación visual en breakpoints sm/md/lg/xl de Tailwind."]));
content.push(bulletRich([{ text: "Seguridad: ", bold: true }, "intento de modificar pedidos ajenos vía API responde 403; intento de inyección SQL en filtros del catálogo es neutralizado por queries parametrizadas; uploads se restringen por tipo de contenido."]));
content.push(bulletRich([{ text: "Performance: ", bold: true }, "Lighthouse > 85 en Performance, Accessibility, Best Practices y SEO sobre el home y catálogo."]));

content.push(h2("8.6 Conclusión"));
content.push(p("El sistema desarrollado cumple los objetivos planteados en el mandato original: provee a Tele Import S.A. de una plataforma web propia para exhibir su catálogo, recibir pedidos en línea con pago integrado, gestionar el stock y las operaciones desde un panel privado, y obtener métricas que apoyen la toma de decisiones comerciales."));
content.push(p("La migración del stack desde la propuesta inicial (GeneXus) hacia un stack JavaScript moderno fue determinante para sostener el ritmo del proyecto, posibilitar el despliegue continuo en servicios de nube y mantener el costo de infraestructura cercano a cero durante la validación. La separación clara entre frontend, backend y base de datos, junto con la integración nativa con Mercado Pago, dejan al sistema en condiciones de operar en producción y de incorporar mejoras incrementales (por ejemplo, módulos de envío, integración con AFIP o sistema de fidelización) sin reescribir su núcleo."));
content.push(p("Se entregan junto con esta tesis el código fuente completo, los archivos render.yaml y vercel.json para reproducir el despliegue, los diagramas en notación Mermaid y la guía DEPLOY.md con el procedimiento operativo paso a paso."));

// ── Documento ────────────────────────────────────────────────────────────────
const doc = new Document({
  creator: "Allasia – Emanuelli – Petri",
  title: "Tesis Tele Import S.A. — Cap 6, 7 y 8",
  styles: {
    default: { document: { run: { font: FONT, size: SIZE_BODY } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: SIZE_H1, bold: true, font: FONT, color: COLOR_H1 },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: SIZE_H2, bold: true, font: FONT, color: COLOR_H2 },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: SIZE_H3, bold: true, font: FONT, color: COLOR_H3 },
        paragraph: { spacing: { before: 220, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 }, // A4
        margin: { top: 1418, right: 1418, bottom: 1418, left: 1418 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Tele Import S.A. — Tesis · Página ", size: 18, font: FONT, color: COLOR_CAPTION }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: FONT, color: COLOR_CAPTION }),
          ],
        })],
      }),
    },
    children: content,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = "Tesis_Cap6-7-8_Actualizada.docx";
  fs.writeFileSync(out, buf);
  console.log(`✔ Generado ${out} (${(buf.length / 1024).toFixed(1)} KB)`);
}).catch((err) => {
  console.error("✖ Error al generar el documento:", err);
  process.exit(1);
});
