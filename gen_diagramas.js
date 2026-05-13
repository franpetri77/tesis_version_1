const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign,
} = require("docx");
const fs = require("fs");

// ── Layout A4 con márgenes ~2.5 cm (1418 DXA) ──────────────────────────────
// Ancho útil = 11906 − 2836 = 9070 DXA
const PAGE_W   = 11906;
const MARGIN   = 1418;
const CONTENT_W = PAGE_W - MARGIN * 2; // 9070

const COLOR_HEADER  = "1F3864";
const COLOR_CODE_BG = "F3F4F6";
const COLOR_CAPTION = "374151";

// ── helpers ──────────────────────────────────────────────────────────────────
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

function caption(num, title) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 120 },
    children: [
      new TextRun({ text: `Figura ${num}: `, bold: true, size: 18, font: "Arial", color: COLOR_CAPTION }),
      new TextRun({ text: title, size: 18, font: "Arial", color: COLOR_CAPTION, italics: true }),
    ],
  });
}

// Encuadra un bloque de código Mermaid en una celda con fondo gris
function codeBlock(lines) {
  const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" };
  const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };

  const paragraphs = lines.map(
    (line) =>
      new Paragraph({
        spacing: { before: 0, after: 0, line: 220 },
        children: [new TextRun({ text: line, size: 17, font: "Courier New", color: "111827" })],
      })
  );

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: CONTENT_W, type: WidthType.DXA },
            borders: BORDERS,
            shading: { fill: COLOR_CODE_BG, type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 240, right: 240 },
            verticalAlign: VerticalAlign.TOP,
            children: paragraphs,
          }),
        ],
      }),
    ],
  });
}

// ── Diagramas ────────────────────────────────────────────────────────────────

const diagramas = [
  {
    titulo: "Diagrama general de casos de uso",
    num: 1,
    descripcion:
      "El diagrama de casos de uso presenta los actores del sistema (Cliente, Administrador " +
      "y Mercado Pago como servicio externo) y sus interacciones con los módulos funcionales. " +
      "El Cliente accede al área pública y al proceso de compra; el Administrador opera " +
      "exclusivamente desde el panel de gestión.",
    instruccion:
      "Para renderizar: copiar el código en mermaid.live o en un editor compatible (VS Code con extensión Mermaid).",
    code: [
      "flowchart LR",
      "    classDef actor  fill:#dae8fc,stroke:#6c8ebf,color:#000",
      "    classDef uc     fill:#fff2cc,stroke:#d6b656,color:#000",
      "    classDef ext    fill:#f8cecc,stroke:#b85450,color:#000",
      "",
      "    CL((Cliente))",
      "    AD((Administrador))",
      "    MP((Mercado Pago))",
      "",
      "    subgraph SIS[\"Sistema Tele Import S.A.\"]",
      "        direction TB",
      "        subgraph PUB[\"Área pública\"]",
      "            UC1([Ver catálogo y filtrar])",
      "            UC2([Ver detalle de producto])",
      "            UC3([Registrarse])",
      "            UC4([Iniciar sesión])",
      "        end",
      "        subgraph SHOP[\"Proceso de compra\"]",
      "            UC5([Gestionar carrito])",
      "            UC6([Realizar checkout])",
      "            UC7([Pagar en línea])",
      "            UC8([Ver historial de pedidos])",
      "            UC9([Gestionar direcciones])",
      "            UC10([Escribir reseña])",
      "        end",
      "        subgraph ADM[\"Panel administrativo\"]",
      "            UC11([Gestionar productos y stock])",
      "            UC12([Gestionar pedidos])",
      "            UC13([Gestionar usuarios])",
      "            UC14([Gestionar promociones])",
      "            UC15([Ver reportes y métricas])",
      "            UC16([Consultar auditoría])",
      "            UC17([Moderar reseñas])",
      "        end",
      "    end",
      "",
      "    CL --> UC1",
      "    CL --> UC2",
      "    CL --> UC3",
      "    CL --> UC4",
      "    CL --> UC5",
      "    CL --> UC6",
      "    CL --> UC7",
      "    CL --> UC8",
      "    CL --> UC9",
      "    CL --> UC10",
      "    AD --> UC11",
      "    AD --> UC12",
      "    AD --> UC13",
      "    AD --> UC14",
      "    AD --> UC15",
      "    AD --> UC16",
      "    AD --> UC17",
      "    UC7 --> MP",
      "",
      "    class CL,AD actor",
      "    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10 uc",
      "    class UC11,UC12,UC13,UC14,UC15,UC16,UC17 uc",
      "    class MP ext",
    ],
  },

  {
    titulo: "Diagrama de clases conceptual",
    num: 2,
    descripcion:
      "El diagrama de clases refleja el modelo conceptual del dominio del sistema. Se representan " +
      "las entidades principales con sus atributos clave y las relaciones entre ellas. Es una " +
      "abstracción del modelo de datos físico orientada a la comprensión del dominio del negocio.",
    instruccion:
      "Para renderizar: copiar el código en mermaid.live o en un editor compatible.",
    code: [
      "classDiagram",
      "    direction TB",
      "",
      "    class Usuario {",
      "        +String id",
      "        +String email",
      "        +String nombre",
      "        +Enum rol",
      "        +DateTime creadoEn",
      "    }",
      "    class Categoria {",
      "        +String id",
      "        +String nombre",
      "        +String slug",
      "        +String parentId",
      "    }",
      "    class Producto {",
      "        +String id",
      "        +String nombre",
      "        +String sku",
      "        +Decimal precio",
      "        +Int stock",
      "        +Boolean activo",
      "        +Boolean destacado",
      "    }",
      "    class ImagenProducto {",
      "        +String id",
      "        +String url",
      "        +Int orden",
      "    }",
      "    class EtiquetaProducto {",
      "        +String id",
      "        +String nombre",
      "        +String slug",
      "    }",
      "    class Direccion {",
      "        +String id",
      "        +String calle",
      "        +String ciudad",
      "        +Boolean predeterminada",
      "    }",
      "    class Pedido {",
      "        +String id",
      "        +String numero",
      "        +Enum estado",
      "        +Decimal subtotal",
      "        +Decimal descuento",
      "        +Decimal costoEnvio",
      "        +Decimal total",
      "        +Enum metodoEntrega",
      "    }",
      "    class ItemPedido {",
      "        +String id",
      "        +Int cantidad",
      "        +Decimal precioUnitario",
      "        +Decimal totalLinea",
      "    }",
      "    class Pago {",
      "        +String id",
      "        +Enum estado",
      "        +Decimal monto",
      "        +String mpPaymentId",
      "        +String mpPreferenceId",
      "    }",
      "    class Promocion {",
      "        +String id",
      "        +String codigo",
      "        +Enum tipo",
      "        +Decimal valor",
      "        +Int usosMaximos",
      "        +Int usosCorrientes",
      "    }",
      "    class MovimientoStock {",
      "        +String id",
      "        +Enum tipo",
      "        +Int cantidad",
      "        +Int stockAnterior",
      "        +Int stockNuevo",
      "    }",
      "    class ResenaProducto {",
      "        +String id",
      "        +Int calificacion",
      "        +String cuerpo",
      "        +Boolean aprobada",
      "    }",
      "    class Notificacion {",
      "        +String id",
      "        +Enum tipo",
      "        +String titulo",
      "        +Boolean leida",
      "    }",
      "    class RegistroAuditoria {",
      "        +String id",
      "        +String accion",
      "        +String entidadTipo",
      "        +String entidadId",
      "    }",
      "",
      "    Usuario    \"1\" --> \"0..*\" Pedido            : realiza",
      "    Usuario    \"1\" --> \"0..*\" Direccion         : registra",
      "    Usuario    \"1\" --> \"0..*\" ResenaProducto    : escribe",
      "    Usuario    \"1\" --> \"0..*\" Notificacion      : recibe",
      "    Usuario    \"1\" --> \"0..*\" MovimientoStock   : registra",
      "    Usuario    \"1\" --> \"0..*\" RegistroAuditoria : genera",
      "    Pedido     \"1\" *--  \"1..*\" ItemPedido        : contiene",
      "    Pedido     \"1\" -->  \"0..1\" Pago              : tiene",
      "    Pedido  \"0..*\" -->  \"0..1\" Promocion         : aplica",
      "    ItemPedido \"0..*\" --> \"1\" Producto           : referencia",
      "    Categoria  \"0..*\" --> \"0..1\" Categoria       : es subcategoria de",
      "    Producto   \"0..*\" --> \"1\"    Categoria       : pertenece a",
      "    Producto   \"1\"    --> \"0..*\" ImagenProducto  : tiene",
      "    Producto   \"1\"    --> \"0..*\" EtiquetaProducto : etiquetado con",
      "    Producto   \"1\"    --> \"0..*\" MovimientoStock  : afecta",
      "    Producto   \"1\"    --> \"0..*\" ResenaProducto   : recibe",
    ],
  },

  {
    titulo: "Diagrama de despliegue",
    num: 3,
    descripcion:
      "El diagrama de despliegue muestra la distribución física de los componentes del sistema " +
      "en la infraestructura de producción. El frontend y el backend se despliegan como servicios " +
      "independientes en Render.com. La base de datos MySQL se gestiona como servicio separado " +
      "dentro de la misma plataforma. Mercado Pago actúa como servicio externo de procesamiento " +
      "de pagos, comunicándose bidireccionalmente con el backend mediante webhook.",
    instruccion:
      "Para renderizar: copiar el código en mermaid.live o en un editor compatible.",
    code: [
      "graph TB",
      "    subgraph USR[\"Dispositivo del usuario\"]",
      "        BR[\"Navegador Web — Chrome / Safari / Firefox\"]",
      "    end",
      "",
      "    subgraph CLOUD[\"Render.com — Nube\"]",
      "        subgraph FE[\"Servicio: Frontend\"]",
      "            NEXT[\"Next.js 14 · App Router · SSR\\nPuerto 3001\"]",
      "        end",
      "        subgraph BE[\"Servicio: Backend\"]",
      "            API[\"Node.js · Express · API REST · JWT\\nPuerto 4000\"]",
      "        end",
      "        subgraph DB[\"Base de datos\"]",
      "            MYSQL[(\"MySQL 8.4 · InnoDB · utf8mb4\")]",
      "        end",
      "    end",
      "",
      "    subgraph EXT[\"Servicios externos\"]",
      "        MP[\"Mercado Pago — API de pagos\"]",
      "    end",
      "",
      "    BR   -->|\"HTTPS\"| NEXT",
      "    NEXT -->|\"HTTP (fetch)\"| API",
      "    API  -->|\"TCP 3306\"| MYSQL",
      "    API  -->|\"HTTPS\"| MP",
      "    MP   -->|\"Webhook HTTPS\"| API",
    ],
  },

  {
    titulo: "Diagrama entidad-relación simplificado",
    num: 4,
    descripcion:
      "El diagrama entidad-relación presenta la estructura de la base de datos del sistema " +
      "con sus dieciséis tablas y las relaciones de integridad referencial entre ellas. " +
      "Se incluyen los campos principales de cada entidad con sus tipos de datos. " +
      "Los campos marcados como PK corresponden a claves primarias y los FK a claves foráneas.",
    instruccion:
      "Para renderizar: copiar el código en mermaid.live o en un editor compatible.",
    code: [
      "erDiagram",
      "    users {",
      "        varchar id PK",
      "        varchar email",
      "        varchar password",
      "        enum    role",
      "        varchar first_name",
      "        varchar last_name",
      "    }",
      "    categories {",
      "        varchar id PK",
      "        varchar name",
      "        varchar slug",
      "        varchar parent_id FK",
      "        tinyint is_active",
      "    }",
      "    products {",
      "        varchar id PK",
      "        varchar name",
      "        varchar sku",
      "        decimal price",
      "        int     stock_quantity",
      "        varchar category_id FK",
      "        tinyint is_active",
      "        tinyint is_featured",
      "    }",
      "    product_images {",
      "        varchar id PK",
      "        varchar product_id FK",
      "        text    image_url",
      "        int     sort_order",
      "    }",
      "    product_tags {",
      "        varchar id PK",
      "        varchar name",
      "        varchar slug",
      "    }",
      "    product_tag_map {",
      "        varchar product_id PK",
      "        varchar tag_id     PK",
      "    }",
      "    addresses {",
      "        varchar id PK",
      "        varchar user_id FK",
      "        varchar street",
      "        varchar city",
      "        tinyint is_default",
      "    }",
      "    orders {",
      "        varchar  id PK",
      "        varchar  order_number",
      "        varchar  user_id FK",
      "        enum     status",
      "        decimal  subtotal",
      "        decimal  discount_amount",
      "        decimal  total",
      "        enum     delivery_method",
      "    }",
      "    order_items {",
      "        varchar id PK",
      "        varchar order_id   FK",
      "        varchar product_id FK",
      "        int     quantity",
      "        decimal unit_price",
      "        decimal total_price",
      "    }",
      "    payments {",
      "        varchar  id PK",
      "        varchar  order_id          FK",
      "        varchar  mp_payment_id",
      "        varchar  mp_preference_id",
      "        enum     status",
      "        decimal  amount",
      "    }",
      "    promotions {",
      "        varchar  id PK",
      "        varchar  code",
      "        enum     type",
      "        decimal  value",
      "        int      max_uses",
      "        int      current_uses",
      "        tinyint  is_active",
      "    }",
      "    stock_movements {",
      "        varchar  id PK",
      "        varchar  product_id FK",
      "        varchar  user_id    FK",
      "        enum     type",
      "        int      quantity",
      "        int      previous_quantity",
      "        int      new_quantity",
      "    }",
      "    product_reviews {",
      "        varchar  id PK",
      "        varchar  product_id FK",
      "        varchar  user_id    FK",
      "        tinyint  rating",
      "        text     body",
      "        tinyint  is_approved",
      "    }",
      "    notifications {",
      "        varchar  id PK",
      "        varchar  user_id FK",
      "        enum     type",
      "        varchar  title",
      "        tinyint  is_read",
      "    }",
      "    audit_logs {",
      "        varchar  id PK",
      "        varchar  user_id     FK",
      "        varchar  entity_type",
      "        varchar  entity_id",
      "        varchar  action",
      "    }",
      "    product_views {",
      "        varchar  id PK",
      "        varchar  product_id FK",
      "        varchar  user_id",
      "        datetime created_at",
      "    }",
      "",
      "    users         ||--o{ orders           : \"realiza\"",
      "    users         ||--o{ addresses        : \"registra\"",
      "    users         ||--o{ product_reviews  : \"escribe\"",
      "    users         ||--o{ notifications    : \"recibe\"",
      "    users         ||--o{ stock_movements  : \"registra\"",
      "    users         ||--o{ audit_logs       : \"genera\"",
      "    categories    ||--o{ categories       : \"subcategoria_de\"",
      "    categories    ||--o{ products         : \"clasifica\"",
      "    products      ||--o{ product_images   : \"tiene\"",
      "    products      ||--o{ product_tag_map  : \"etiquetado_en\"",
      "    product_tags  ||--o{ product_tag_map  : \"asignada_en\"",
      "    products      ||--o{ order_items      : \"incluido_en\"",
      "    products      ||--o{ stock_movements  : \"afecta\"",
      "    products      ||--o{ product_reviews  : \"recibe\"",
      "    products      ||--o{ product_views    : \"registra\"",
      "    orders        ||--o{ order_items      : \"contiene\"",
      "    orders        ||--o| payments         : \"tiene\"",
    ],
  },
];

// ── Construcción del documento ────────────────────────────────────────────────

const children = [
  h1("DIAGRAMAS DEL SISTEMA"),
  p(
    "Este anexo presenta los diagramas de modelado del sistema desarrollado para Tele Import S.A. " +
    "Los diagramas están expresados en sintaxis Mermaid, un lenguaje de descripción de diagramas " +
    "basado en texto ampliamente soportado por herramientas de documentación técnica. " +
    "Para renderizar cada diagrama puede utilizarse el editor en línea disponible en mermaid.live " +
    "o cualquier entorno compatible, como VS Code con la extensión Mermaid o Notion."
  ),
  hr(),
];

for (const d of diagramas) {
  children.push(
    h2(`${d.num}. ${d.titulo}`),
    p(d.descripcion),
    pEmpty(),
    p(d.instruccion, { italics: true, color: "6B7280" }),
    pEmpty(),
    codeBlock(d.code),
    pEmpty(),
    caption(d.num, d.titulo),
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
          size: { width: PAGE_W, height: 16838 },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = "C:/Users/popet/OneDrive/Desktop/nuevotesis/Diagramas_Sistema.docx";
  fs.writeFileSync(out, buffer);
  console.log("Generado:", out);
});
