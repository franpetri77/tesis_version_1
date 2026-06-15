// Complemento para Tesis_Cap6-7-8_Actualizada.docx (Tele Import S.A.)
// Stack REAL: Next.js 14 + Express + MySQL 8 + JWT (bcryptjs) + Mercado Pago (Checkout Pro).
// NO usa Directus.
// Casos de uso alineados con la tesis existente (CU-01 a CU-18).

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageBreak, PageNumber,
} = require("docx");

const FONT = "Arial";
const border = { style: BorderStyle.SINGLE, size: 6, color: "888888" };
const borders = { top: border, bottom: border, left: border, right: border };

const P = (t, o = {}) => new Paragraph({
  spacing: { after: 120, line: 300 },
  alignment: o.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: t, font: FONT, size: 22, bold: !!o.bold, italics: !!o.italics })],
});
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 180 }, children: [new TextRun({ text: t, font: FONT, size: 32, bold: true })] });
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 140 }, children: [new TextRun({ text: t, font: FONT, size: 28, bold: true })] });
const H3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 120 }, children: [new TextRun({ text: t, font: FONT, size: 24, bold: true })] });
const H4 = t => new Paragraph({ heading: HeadingLevel.HEADING_4, spacing: { before: 180, after: 100 }, children: [new TextRun({ text: t, font: FONT, size: 22, bold: true })] });
const BULL = t => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60, line: 280 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: t, font: FONT, size: 22 })] });
const PB = () => new Paragraph({ children: [new PageBreak()] });

const tableUC = rows => {
  const TOTAL = 9360, C1 = 2400, C2 = TOTAL - C1;
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [C1, C2],
    rows: rows.map(([k, v]) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ borders, width: { size: C1, type: WidthType.DXA }, shading: { fill: "E8EEF5", type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, font: FONT, size: 20 })] })] }),
        new TableCell({ borders, width: { size: C2, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: v.split("\n").map(line => new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun({ text: line, font: FONT, size: 20 })] })) }),
      ],
    })),
  });
};

const dataTable = (header, rows, colWidths) => {
  const TOTAL = 9360;
  const widths = colWidths || header.map(() => Math.floor(TOTAL / header.length));
  const mkCell = (text, opts = {}) => new TableCell({
    borders, width: { size: opts.w, type: WidthType.DXA },
    shading: opts.head ? { fill: "1F3864", type: ShadingType.CLEAR } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: [new Paragraph({ alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), bold: !!opts.head, color: opts.head ? "FFFFFF" : "000000", font: FONT, size: 20 })] })],
  });
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => mkCell(h, { head: true, w: widths[i] })) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => mkCell(c, { w: widths[i] })) })),
    ],
  });
};

/* ================================================================== */
/* 0 — Análisis y alineación                                          */
/* ================================================================== */
const intro = [
  H1("Apartados faltantes y alineación con el sistema implementado"),
  P("El presente documento complementa al archivo Tesis_Cap6-7-8_Actualizada.docx ya existente en el repositorio del proyecto. Tras analizar dicha tesis y los documentos de referencia (en particular el cierre del proyecto Panificadora Bosque), se confirma que el sistema desarrollado para Tele Import S.A. NO utiliza Directus, sino que se trata de una solución a medida construida sobre el siguiente stack tecnológico, conforme al código fuente alojado en backend/ y frontend/ del proyecto:"),
  BULL("Frontend: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + Zustand + TanStack React Query."),
  BULL("Backend: Node.js + Express 4 + TypeScript + Zod para validación de DTOs."),
  BULL("Persistencia: MySQL 8 con motor InnoDB y collation utf8mb4_unicode_ci, gestionado mediante el pool de conexiones mysql2/promise (archivo backend/src/db/database.ts) y esquema inicializado en backend/src/db/schema.ts."),
  BULL("Autenticación: tokens JWT firmados en el backend (jsonwebtoken) con hashing de contraseñas mediante bcryptjs."),
  BULL("Pasarela de pagos: Mercado Pago (Checkout Pro) integrado en backend/src/routes/payments.ts y backend/src/routes/webhooks.ts."),
  BULL("Despliegue: frontend en Vercel (vercel.json) y backend con MySQL administrada en Render.com (render.yaml)."),
  P("La tesis actual cubre adecuadamente la selección del stack (6.1), la arquitectura general (6.2), el listado de casos de uso CU-01 a CU-18 (6.3), el diagrama de clases (6.4), el modelo entidad-relación con diccionario de datos para las 17 tablas reales del esquema MySQL (6.5), el diseño de la API REST (6.6) y los aspectos de seguridad, factibilidad y despliegue (6.7 a 8.6). No obstante, contrastado con la profundidad académica del cierre del proyecto Panificadora Bosque y con la formalidad exigida por la Escuela Superior de Comercio Manuel Belgrano (UNC), se detectan los siguientes apartados faltantes o incompletos:"),
  BULL("Descripción formal detallada de cada uno de los dieciocho casos de uso (nombre, actor principal, prioridad, complejidad, tipo, objetivo, precondiciones, postcondiciones de éxito y de fracaso, descripción detallada y observaciones). La tesis actual sólo presenta el código, nombre y descripción breve de una línea."),
  BULL("Diagramas de estado para las entidades con ciclo de vida no trivial: Pedido (estados pending → paid → processing → ready_to_ship → shipped → delivered, con bifurcaciones a cancelled y refunded), Producto (publicado, despublicado, sin stock, dado de baja), Usuario (rol customer / admin / readonly y transiciones de activación) y Reseña (pendiente / aprobada / rechazada)."),
  BULL("Diagramas de flujo de datos (DFD) en niveles de contexto, nivel 1 y nivel 2 para los procesos críticos: checkout-pago-confirmación, gestión de stock y autenticación."),
  BULL("Capítulo Desarrollo siguiendo el modelo del documento de cierre: planificación en sprints, programa de desarrollo detallado de frontend y backend y mapeo de cada tarea con los casos de uso que satisface."),
  P("El presente documento desarrolla cada uno de estos apartados respetando estrictamente el stack tecnológico real (Next.js + Express + MySQL + JWT + Mercado Pago), la nomenclatura de casos de uso CU-01 a CU-18 utilizada en la tesis actual y los nombres exactos de tablas y columnas tal como aparecen en backend/src/db/schema.ts. El contenido está listo para incorporarse como continuación del Capítulo 6 actual y como nuevo Capítulo 9: Desarrollo."),
  PB(),
];

/* ================================================================== */
/* 1 — Listado clasificado de los 18 CU + actores                     */
/* ================================================================== */
const actoresSection = [
  H1("Capítulo 6 (ampliación): Modelación detallada"),
  H2("6.A Actores del sistema implementado"),
  P("A partir del campo role definido en la tabla users del esquema MySQL (ENUM('admin','customer','readonly')) y de la integración con la pasarela de pago externa, el sistema reconoce los siguientes actores:"),
  dataTable(["Actor", "Rol técnico", "Descripción"], [
    ["Cliente", "users.role = 'customer'", "Usuario final que navega el catálogo, gestiona carrito, realiza compras a través de Mercado Pago, consulta su historial de pedidos, administra direcciones de envío y publica reseñas."],
    ["Administrador", "users.role = 'admin'", "Operador interno con acceso al panel /admin del frontend. Gestiona productos, stock, pedidos, promociones, usuarios, reseñas y consulta los reportes y la auditoría."],
    ["Usuario de solo lectura", "users.role = 'readonly'", "Rol previsto en la base de datos para fines de auditoría y supervisión interna. Puede consultar el panel sin realizar modificaciones."],
    ["Mercado Pago", "Actor externo (Checkout Pro)", "Servicio externo encargado de la captura y autorización de los pagos. Se comunica con el backend mediante la API REST de Mercado Pago para crear preferencias y mediante webhooks firmados para notificar el resultado."],
    ["Cliente no autenticado", "Sin sesión activa", "Visitante que puede consultar el catálogo público y el detalle de los productos pero no operar el carrito ni realizar compras hasta autenticarse."],
  ], [2200, 2500, 4660]),

  H2("6.B Listado clasificado de casos de uso"),
  P("Se reordena el listado de casos de uso ya presentado en el apartado 6.3 de la tesis, agregando para cada uno la prioridad respecto del objetivo de negocio y la complejidad técnica estimada según el código fuente del proyecto (backend/src/routes y frontend/src/app)."),
  dataTable(["Código", "Caso de uso", "Actor principal", "Prioridad", "Complejidad"], [
    ["CU-01", "Ver catálogo y filtrar", "Cliente / Visitante", "Alta", "Media"],
    ["CU-02", "Ver detalle de producto", "Cliente / Visitante", "Alta", "Baja"],
    ["CU-03", "Registrarse", "Visitante", "Alta", "Media"],
    ["CU-04", "Iniciar sesión", "Cliente / Administrador", "Alta", "Media"],
    ["CU-05", "Gestionar carrito", "Cliente", "Alta", "Media"],
    ["CU-06", "Realizar checkout", "Cliente", "Alta", "Alta"],
    ["CU-07", "Pagar en línea", "Cliente", "Alta", "Alta"],
    ["CU-08", "Ver historial de pedidos", "Cliente", "Media", "Media"],
    ["CU-09", "Gestionar direcciones", "Cliente", "Media", "Baja"],
    ["CU-10", "Escribir reseña", "Cliente", "Media", "Media"],
    ["CU-11", "Recibir notificaciones", "Cliente / Administrador", "Media", "Media"],
    ["CU-12", "Gestionar productos y stock", "Administrador", "Alta", "Alta"],
    ["CU-13", "Gestionar pedidos", "Administrador", "Alta", "Media"],
    ["CU-14", "Gestionar usuarios", "Administrador", "Alta", "Media"],
    ["CU-15", "Gestionar promociones", "Administrador", "Media", "Media"],
    ["CU-16", "Ver reportes", "Administrador", "Alta", "Alta"],
    ["CU-17", "Consultar auditoría", "Administrador", "Media", "Media"],
    ["CU-18", "Moderar reseñas", "Administrador", "Media", "Baja"],
  ], [900, 3000, 2300, 1280, 1880]),
  P("Las prioridades se clasifican en Alta (indispensable para el funcionamiento del producto mínimo viable), Media (necesaria pero diferible) y Baja (complementaria). La complejidad se clasifica en Alta (involucra integraciones con servicios externos o lógica de negocio significativa), Media (operaciones CRUD con validaciones de dominio o cálculos derivados) y Baja (consultas o transiciones simples)."),
];

/* ================================================================== */
/* 2 — Descripción formal detallada de los 18 CU                       */
/* ================================================================== */
const ucDesc = (code, data) => [
  H3(`${code}: ${data.nombre}`),
  tableUC([
    ["Nombre", data.nombre],
    ["Código", code],
    ["Actor principal", data.actor],
    ["Prioridad", data.prio],
    ["Complejidad", data.compl],
    ["Tipo", data.tipo],
    ["Objetivo", data.obj],
    ["Precondiciones", data.pre],
    ["Postcondiciones de éxito", data.postE],
    ["Postcondiciones de fracaso", data.postF],
    ["Descripción detallada", data.desc],
    ["Observaciones", data.obs],
  ]),
  P(""),
];

const cuDetalle = [
  H2("6.C Descripción formal detallada de los casos de uso"),
  P("Para cada caso de uso se especifica de manera normalizada la totalidad de sus atributos académicos, lo que constituye la base trazable a los requisitos relevados y al código fuente del sistema implementado."),

  ...ucDesc("CU-01", {
    nombre: "Ver catálogo y filtrar",
    actor: "Cliente / Visitante",
    prio: "Alta", compl: "Media", tipo: "Primario",
    obj: "Permitir al usuario navegar el catálogo de insumos informáticos de Tele Import S.A., aplicando filtros por categoría, búsqueda textual y ordenamiento por precio o relevancia, con paginación.",
    pre: "Existe al menos un registro en la tabla products con is_active = 1.",
    postE: "El sistema devuelve un conjunto de productos que satisface los criterios, paginado, y refresca la grilla del frontend en la ruta /catalogo.",
    postF: "Si la combinación de filtros no arroja resultados o si el endpoint GET /api/catalog/products falla, el sistema muestra un mensaje informativo y permite limpiar los filtros activos.",
    desc: "El usuario accede a /catalogo. El componente frontend src/app/(public)/catalogo/page.tsx invoca, mediante el cliente de API src/lib/api/catalog.ts, al endpoint expuesto por backend/src/routes/catalog.ts. El backend realiza una consulta parametrizada a la tabla products de MySQL, aplicando los filtros recibidos (category_id, búsqueda por LIKE sobre name y short_description, rango de precios, orden por precio o por destacados), devuelve los registros junto con la información de paginación, y el frontend los renderiza utilizando los componentes ProductCard y CatalogFilters.",
    obs: "El listado por defecto destaca primero los productos con is_featured = 1. La búsqueda textual es insensible a mayúsculas y acentos por la collation utf8mb4_unicode_ci. Las visitas a productos se registran en la tabla product_views para alimentar el algoritmo de recomendaciones (backend/src/services/recommendations.ts).",
  }),

  ...ucDesc("CU-02", {
    nombre: "Ver detalle de producto",
    actor: "Cliente / Visitante",
    prio: "Alta", compl: "Baja", tipo: "Primario",
    obj: "Permitir al usuario consultar la ficha completa de un producto, incluyendo galería de imágenes, descripción extendida, precio, stock disponible, marca, modelo, etiquetas asociadas y reseñas aprobadas.",
    pre: "Existe el producto en la tabla products con is_active = 1.",
    postE: "El sistema presenta la página /producto/[slug] con todos los atributos del producto, registra una visita anónima o identificada en product_views y muestra reseñas con is_approved = 1.",
    postF: "Si el slug no corresponde a ningún producto activo, el sistema redirige a la página /not-found.tsx.",
    desc: "La ruta /producto/[slug] del App Router consume el endpoint GET /api/catalog/products/[slug]. El backend recupera el producto, sus imágenes (product_images), sus etiquetas (product_tag_map) y las reseñas aprobadas (product_reviews). El componente ProductImageGallery presenta la galería y ProductReviews lista las reseñas con su calificación. El componente ProductViewTracker invoca al endpoint que inserta el registro en product_views.",
    obs: "El stock visible al cliente corresponde al campo products.stock_quantity, mantenido por el último registro de stock_movements. El componente AddToCartButton se deshabilita cuando stock_quantity es cero.",
  }),

  ...ucDesc("CU-03", {
    nombre: "Registrarse",
    actor: "Visitante",
    prio: "Alta", compl: "Media", tipo: "Primario",
    obj: "Crear una nueva cuenta de cliente persistida en la tabla users con rol customer y contraseña hasheada con bcrypt.",
    pre: "No existe una cuenta previa con el mismo email en la tabla users (clave única uq_users_email).",
    postE: "El sistema inserta una nueva fila en users con role = 'customer' y devuelve al frontend un JWT junto con los datos del usuario. La cookie / store de sesión queda inicializada.",
    postF: "Si el email ya existe, si la validación Zod del DTO falla o si la operación de inserción retorna un error, el backend responde con 400 o 409 según corresponda, conservando los datos del formulario para que el usuario corrija.",
    desc: "El usuario accede a /registro y completa nombre, apellido, email, teléfono y contraseña. El componente del formulario invoca a la función register de src/lib/api/auth.ts, que llama a POST /api/auth/register. La ruta backend/src/routes/auth.ts valida el DTO con Zod, verifica unicidad por email, hashea la contraseña con bcryptjs (10 rounds), genera un UUID, inserta la fila y emite el JWT mediante jsonwebtoken. El frontend almacena el token y dirige al usuario al área (account).",
    obs: "La contraseña jamás se almacena en texto plano. El JWT incluye id y role como claims; su expiración configurable se gestiona desde variables de entorno. Las direcciones se gestionan en un caso de uso separado (CU-09).",
  }),

  ...ucDesc("CU-04", {
    nombre: "Iniciar sesión",
    actor: "Cliente / Administrador",
    prio: "Alta", compl: "Media", tipo: "Primario",
    obj: "Autenticar a un usuario existente, devolver un JWT firmado y habilitar las funcionalidades correspondientes a su rol.",
    pre: "El usuario posee una cuenta con email y password registrados en users.",
    postE: "El backend devuelve un JWT válido con los claims { id, role, email } y el frontend redirige al área correspondiente: el rol 'customer' al área (account), el rol 'admin' al panel (admin).",
    postF: "Si el email no existe o la comparación bcrypt del password falla, el backend responde con 401 sin distinguir el motivo, para evitar la enumeración de cuentas.",
    desc: "Desde /login (componente src/app/(auth)/login/page.tsx o desde el componente AuthModals) el usuario ingresa email y contraseña. El cliente llama a POST /api/auth/login. La ruta verifica la existencia del usuario mediante SELECT sobre users, compara la contraseña con bcrypt.compare contra password_hash, firma un JWT con la clave secreta de entorno y lo retorna. El hook useAuth en frontend/src/hooks/useAuth.ts persiste el token y carga el contexto del usuario.",
    obs: "El middleware backend/src/middleware/validateToken.ts protege las rutas que requieren autenticación, decodificando el JWT del header Authorization y poblando req.user. Las rutas del panel administrativo verifican adicionalmente que req.user.role sea 'admin'.",
  }),

  ...ucDesc("CU-05", {
    nombre: "Gestionar carrito",
    actor: "Cliente",
    prio: "Alta", compl: "Media", tipo: "Primario",
    obj: "Permitir al cliente agregar productos al carrito, modificar cantidades y eliminar líneas, manteniendo el estado persistido en el navegador entre sesiones del mismo dispositivo.",
    pre: "El cliente se encuentra autenticado y existen productos con stock disponible.",
    postE: "El estado del carrito en Zustand queda actualizado y persistido en localStorage; los iconos de cabecera (componente Header y CartToast) reflejan el cambio.",
    postF: "Si la cantidad solicitada excede products.stock_quantity, el componente AddToCartButton muestra un mensaje y rechaza la operación.",
    desc: "La store de Zustand definida en el frontend gestiona el arreglo de líneas { productId, cantidad, precioUnitario }. El componente AddToCartButton invoca a la acción agregar; la página /carrito (src/app/(shop)/carrito/page.tsx) permite modificar y eliminar líneas. Al ingresar al checkout, las líneas se validan contra el backend para confirmar precios y stock vigentes.",
    obs: "A diferencia de las soluciones que persisten el carrito en la base de datos, en esta implementación el carrito vive únicamente en el cliente hasta el momento del checkout (CU-06), donde se materializa como filas en orders y order_items dentro de una transacción.",
  }),

  ...ucDesc("CU-06", {
    nombre: "Realizar checkout",
    actor: "Cliente",
    prio: "Alta", compl: "Alta", tipo: "Primario",
    obj: "Convertir el carrito local en un pedido firme registrado en la tabla orders, capturando la dirección de envío y el método de entrega.",
    pre: "El cliente está autenticado, el carrito contiene al menos una línea válida y, si el método de entrega es shipping, posee al menos una dirección en addresses.",
    postE: "El sistema crea una fila en orders con status = 'pending', inserta los order_items correspondientes y devuelve el order_number, dirigiendo al cliente al paso de pago (CU-07).",
    postF: "Si alguna línea no tiene stock suficiente o si la dirección elegida no existe, el endpoint retorna error y el pedido no se crea (rollback de la transacción).",
    desc: "En /checkout (src/app/(shop)/checkout/page.tsx) el cliente elige delivery_method (pickup o shipping), selecciona o agrega una dirección y revisa el resumen. Al confirmar, el frontend envía a POST /api/payments/preferencia las líneas del carrito; el backend abre una transacción, valida stock por línea, inserta orders y order_items, calcula subtotal/discount/shipping/total y devuelve el id de pedido junto con la preferencia de Mercado Pago.",
    obs: "El order_number es legible para el cliente y se genera con un prefijo más timestamp. La dirección elegida se serializa en JSON en el campo shipping_address para preservar el dato histórico aunque la dirección sea modificada después.",
  }),

  ...ucDesc("CU-07", {
    nombre: "Pagar en línea",
    actor: "Cliente",
    prio: "Alta", compl: "Alta", tipo: "Primario",
    obj: "Capturar el pago del pedido a través de Mercado Pago Checkout Pro y reflejar el resultado en orders y payments.",
    pre: "Existe un pedido con status = 'pending' asociado al cliente.",
    postE: "Mercado Pago aprueba el pago, notifica al webhook /api/webhooks/mercadopago y el sistema actualiza payments.status a 'approved' y orders.status a 'paid', registrando el evento en audit_logs y creando una notificación en notifications.",
    postF: "Si Mercado Pago rechaza el pago, el sistema marca payments.status como 'rejected' y mantiene el pedido en 'pending' para permitir un nuevo intento, redirigiendo al cliente a /checkout/fallido.",
    desc: "El endpoint POST /api/pagos/preferencia (frontend src/app/api/pagos/preferencia/route.ts) llama a la API de Mercado Pago para crear la preferencia con los items, el back_url y el notification_url. El cliente es redirigido al portal de Mercado Pago. Al finalizar, Mercado Pago notifica el resultado a backend/src/routes/webhooks.ts, que valida la firma, recupera el detalle del pago vía la API de Mercado Pago, persiste o actualiza la fila en payments y avanza el estado del pedido si fue aprobado.",
    obs: "Las URLs de retorno son /checkout/exitoso, /checkout/fallido y /checkout/pendiente. La integración utiliza el SDK oficial mercadopago. El raw_response del pago se almacena en payments.raw_response para auditoría.",
  }),

  ...ucDesc("CU-08", {
    nombre: "Ver historial de pedidos",
    actor: "Cliente",
    prio: "Media", compl: "Media", tipo: "Primario",
    obj: "Permitir al cliente consultar sus pedidos previos y el detalle de cada uno.",
    pre: "El cliente está autenticado y existe al menos un pedido suyo en orders.",
    postE: "El sistema lista los pedidos ordenados por created_at descendente y permite acceder al detalle (líneas, dirección y estado).",
    postF: "Si el cliente no posee pedidos, la vista muestra un mensaje y un enlace al catálogo.",
    desc: "Las rutas /perfil/pedidos y /pedidos consumen el endpoint GET /api/orders, filtrado por req.user.id. El detalle /perfil/pedidos/[id] muestra las order_items asociadas, el estado actual y la dirección de envío. El backend rechaza cualquier intento de acceder a un pedido cuyo user_id no coincide con el del JWT.",
    obs: "Los estados se renderizan con etiquetas legibles para el cliente: pending = 'Pendiente de pago', paid = 'Pagado', processing = 'En preparación', shipped = 'En distribución', delivered = 'Entregado', cancelled = 'Cancelado', refunded = 'Reembolsado'.",
  }),

  ...ucDesc("CU-09", {
    nombre: "Gestionar direcciones",
    actor: "Cliente",
    prio: "Media", compl: "Baja", tipo: "Soporte",
    obj: "Administrar el conjunto de direcciones de envío del cliente, incluyendo el marcado de una como predeterminada.",
    pre: "El cliente está autenticado.",
    postE: "El sistema inserta, actualiza o elimina la fila correspondiente en addresses, garantizando que a lo sumo una posea is_default = 1 por usuario.",
    postF: "Si los datos obligatorios faltan o la operación viola una restricción, el backend devuelve un error y la dirección no se modifica.",
    desc: "La vista /perfil/direcciones (src/app/(account)/perfil/direcciones/page.tsx) consume los endpoints CRUD GET/POST/PUT/DELETE /api/account/addresses. La cláusula ON DELETE CASCADE definida en el FK fk_addresses_user garantiza que las direcciones de un usuario eliminado también lo sean.",
    obs: "El campo country tiene como valor por defecto 'Argentina'. El cambio de la dirección predeterminada se realiza dentro de una transacción que primero pone en 0 todas las is_default del usuario y luego marca la nueva.",
  }),

  ...ucDesc("CU-10", {
    nombre: "Escribir reseña",
    actor: "Cliente",
    prio: "Media", compl: "Media", tipo: "Primario",
    obj: "Permitir al cliente calificar y comentar un producto.",
    pre: "El cliente está autenticado.",
    postE: "El sistema inserta una nueva fila en product_reviews con is_approved = 0 y queda a la espera de moderación (CU-18).",
    postF: "Si la calificación no está entre 1 y 5 (CHECK constraint) o si el body está vacío, el backend rechaza el alta.",
    desc: "El componente ProductReviews permite al cliente abrir un formulario de carga. El endpoint POST /api/catalog/products/[id]/reviews persiste rating, title (opcional), body y user_id en product_reviews. Hasta que un administrador apruebe la reseña, la misma no aparece en la ficha pública del producto.",
    obs: "El constraint UNIQUE no se aplica sobre (product_id, user_id) para permitir reseñas múltiples a lo largo del tiempo; la moderación filtra duplicados manuales.",
  }),

  ...ucDesc("CU-11", {
    nombre: "Recibir notificaciones",
    actor: "Cliente / Administrador",
    prio: "Media", compl: "Media", tipo: "Soporte",
    obj: "Comunicar a los usuarios eventos relevantes del sistema: nuevo pedido, cambio de estado, stock bajo, nueva reseña.",
    pre: "El usuario está autenticado.",
    postE: "Las notificaciones existentes se muestran en el componente NotificationBell y permiten marcarlas como leídas (notifications.is_read = 1).",
    postF: "Si la consulta al endpoint GET /api/notifications falla, el componente muestra un estado de error y reintenta automáticamente.",
    desc: "El servicio backend/src/services/notifications.ts inserta filas en notifications cuando ocurren eventos. El frontend consulta el endpoint y refresca el badge del componente NotificationBell. Cada notificación contiene type (order_new, order_status, stock_low, review_new), title, message y un link opcional para navegar al recurso.",
    obs: "El borrado de un usuario propaga ON DELETE CASCADE sobre sus notificaciones gracias al FK fk_notifications_user.",
  }),

  ...ucDesc("CU-12", {
    nombre: "Gestionar productos y stock",
    actor: "Administrador",
    prio: "Alta", compl: "Alta", tipo: "Primario",
    obj: "Permitir al administrador realizar el alta, modificación y baja de productos, así como registrar ingresos, egresos y ajustes de stock con trazabilidad completa.",
    pre: "El usuario autenticado posee role = 'admin'.",
    postE: "El sistema persiste el alta/modificación en products y/o registra una fila en stock_movements con previous_quantity y new_quantity, actualizando products.stock_quantity de forma transaccional.",
    postF: "Las operaciones que dejarían stock_quantity negativo o que violan unicidad de sku o slug son rechazadas.",
    desc: "Las rutas /admin/productos y /admin/stock del panel administrativo consumen los endpoints expuestos por backend/src/routes/admin.ts. La alta de producto inserta en products y opcionalmente en product_images. Cada movimiento de stock se inserta dentro de una transacción que también actualiza el saldo del producto y registra el evento en audit_logs.",
    obs: "Los tipos válidos de movimiento son: ingreso, egreso, ajuste, venta y devolucion (ENUM). Las ventas (type = 'venta') las inserta el sistema automáticamente al confirmarse un pago aprobado, vinculando reference_id con el order_id.",
  }),

  ...ucDesc("CU-13", {
    nombre: "Gestionar pedidos",
    actor: "Administrador",
    prio: "Alta", compl: "Media", tipo: "Primario",
    obj: "Visualizar la totalidad de los pedidos y avanzar su estado a lo largo de su ciclo de vida operativo.",
    pre: "El usuario autenticado posee role = 'admin'.",
    postE: "El sistema modifica orders.status conforme a la máquina de estados, registra el evento en audit_logs y genera una notificación al cliente.",
    postF: "Las transiciones no permitidas por la máquina de estados son rechazadas.",
    desc: "La ruta /admin/pedidos lista los pedidos con filtros por estado y rango de fechas. El detalle permite seleccionar la próxima transición disponible (paid → processing → ready_to_ship → shipped → delivered) o bien cancelar/reembolsar. Cada cambio dispara una notificación de tipo order_status para el cliente y registra el evento.",
    obs: "Los estados están tipados como ENUM en MySQL y validados también en el backend para impedir transiciones inválidas vía API directa.",
  }),

  ...ucDesc("CU-14", {
    nombre: "Gestionar usuarios",
    actor: "Administrador",
    prio: "Alta", compl: "Media", tipo: "Soporte",
    obj: "Listar los usuarios del sistema y modificar su rol (admin, customer, readonly).",
    pre: "El usuario autenticado posee role = 'admin'.",
    postE: "El sistema actualiza users.role y registra el evento en audit_logs.",
    postF: "Si el cambio dejaría al sistema sin ningún usuario con rol admin activo, la operación es rechazada.",
    desc: "La ruta /admin/usuarios lista los usuarios con paginación, filtros por rol y email. El cambio de rol invoca un endpoint protegido que valida que el solicitante sea admin y que aplica un UPDATE sobre users.role.",
    obs: "El alta de usuarios para los clientes se realiza por autoregistro (CU-03); este caso de uso administra exclusivamente los usuarios ya existentes.",
  }),

  ...ucDesc("CU-15", {
    nombre: "Gestionar promociones",
    actor: "Administrador",
    prio: "Media", compl: "Media", tipo: "Primario",
    obj: "Administrar cupones de descuento aplicables al checkout, con vigencia temporal y tope de usos.",
    pre: "El usuario autenticado posee role = 'admin'.",
    postE: "El sistema persiste la promoción en promotions y queda disponible para su validación durante el checkout.",
    postF: "Las altas con code duplicado o con valid_until anterior a valid_from son rechazadas.",
    desc: "La ruta /admin/promociones permite crear cupones de tipo percentage, fixed_amount o free_shipping, con value, min_order_amount, max_uses y vigencias. El endpoint POST /api/pagos/validar-cupon (frontend src/app/api/pagos/validar-cupon/route.ts) valida el cupón en tiempo real durante el checkout, verificando is_active, vigencia y tope de usos. El campo current_uses se incrementa transaccionalmente al confirmar el pedido.",
    obs: "Las fechas valid_from y valid_until se almacenan como VARCHAR en formato YYYY-MM-DD para compatibilidad con el código existente, conforme a la nota presente en backend/src/db/schema.ts.",
  }),

  ...ucDesc("CU-16", {
    nombre: "Ver reportes",
    actor: "Administrador",
    prio: "Alta", compl: "Alta", tipo: "Primario",
    obj: "Proporcionar al administrador análisis sobre productos más vistos, tendencias de venta y ventas por período.",
    pre: "Existen datos transaccionales en product_views, orders y order_items.",
    postE: "El sistema presenta los reportes solicitados en la ruta /admin/reportes con los indicadores y gráficos calculados.",
    postF: "Si no existen datos para el período solicitado, se muestra un mensaje informativo y los gráficos quedan vacíos.",
    desc: "La ruta /admin/reportes consume los endpoints expuestos por backend/src/routes/reports.ts. Los reportes implementados incluyen: top de productos más vistos (basado en product_views agrupado por día/semana/mes), tendencias de venta por categoría (joins entre order_items, products y categories) y volumen de ventas por período (sumando orders.total para estados >= paid). Los resultados se renderizan con tarjetas y gráficos en el panel.",
    obs: "El cálculo de ventas excluye los pedidos en estado cancelled y refunded. Los reportes pueden exportarse a CSV desde el frontend.",
  }),

  ...ucDesc("CU-17", {
    nombre: "Consultar auditoría",
    actor: "Administrador",
    prio: "Media", compl: "Media", tipo: "Soporte",
    obj: "Permitir filtrar el log de acciones críticas del sistema por entidad, usuario o rango de fechas.",
    pre: "El usuario autenticado posee role = 'admin' y existen registros en audit_logs.",
    postE: "El sistema lista los registros coincidentes con la información detallada (action, entity_type, entity_id, user_id, previous_value, new_value, ip_address, created_at).",
    postF: "Si los filtros no arrojan coincidencias, la ruta /admin/auditoria muestra un mensaje informativo.",
    desc: "La página /admin/auditoria consume un endpoint del módulo de admin que ejecuta una SELECT paginada sobre audit_logs con los filtros aplicados. Los valores previous_value y new_value se almacenan como JSON serializado en TEXT, lo que permite mostrar diferencias formato amigable en la UI.",
    obs: "Los registros de auditoría son insertados automáticamente por el backend cuando ocurren cambios sobre products, orders, users, promotions y stock_movements, y son inmodificables.",
  }),

  ...ucDesc("CU-18", {
    nombre: "Moderar reseñas",
    actor: "Administrador",
    prio: "Media", compl: "Baja", tipo: "Primario",
    obj: "Aprobar o rechazar las reseñas escritas por los clientes antes de su publicación en la ficha del producto.",
    pre: "Existen reseñas en product_reviews con is_approved = 0.",
    postE: "El sistema actualiza product_reviews.is_approved a 1 (aprobada) o elimina/marca la reseña como rechazada y registra el evento en audit_logs.",
    postF: "Si la reseña ya fue moderada previamente, la operación es informada como redundante y no se realiza cambio.",
    desc: "La página /admin/resenas lista las reseñas pendientes con su producto, autor, rating y body. El administrador selecciona aprobar o rechazar. Las reseñas aprobadas pasan a ser visibles en el componente ProductReviews de la ficha pública del producto.",
    obs: "Esta etapa de moderación protege la reputación del comercio frente a contenido inapropiado o spam.",
  }),
];

/* ================================================================== */
/* 3 — Diagramas de estado                                             */
/* ================================================================== */
const estados = [
  PB(),
  H2("6.D Diagramas de estado"),
  P("Los diagramas de estado modelan el ciclo de vida de las entidades con comportamiento dinámico no trivial. Se documentan los correspondientes a Pedido (orders.status), Producto, Usuario y Reseña, alineados con los ENUM y los flags reales definidos en backend/src/db/schema.ts."),

  H3("6.D.1 Estados de Pedido (orders.status)"),
  dataTable(["Estado (ENUM)", "Etiqueta para el cliente", "Descripción"], [
    ["pending", "Pendiente de pago", "Estado inicial. El pedido fue creado pero el pago aún no fue aprobado por Mercado Pago."],
    ["paid", "Pagado", "Mercado Pago aprobó el pago y notificó el resultado por webhook."],
    ["processing", "En preparación", "El administrador inició la preparación física del pedido."],
    ["ready_to_ship", "Listo para despachar", "Pedido empaquetado y a la espera del retiro por la transportista o por el cliente."],
    ["shipped", "En distribución", "Pedido despachado y en tránsito hacia el destino."],
    ["delivered", "Entregado", "El cliente recibió el pedido o lo retiró en la sucursal."],
    ["cancelled", "Cancelado", "Pedido anulado antes de su entrega. Reintegra stock si fue confirmado previamente."],
    ["refunded", "Reembolsado", "Pedido devuelto y reembolsado a través de Mercado Pago."],
  ], [1800, 2300, 5260]),
  P("Transiciones permitidas:"),
  BULL("pending → paid: disparada por el webhook /api/webhooks/mercadopago al recibir notification_type = payment con status = approved."),
  BULL("pending → cancelled: por inactividad mayor al timeout configurado o por cancelación explícita del cliente."),
  BULL("paid → processing: por acción del administrador en /admin/pedidos."),
  BULL("processing → ready_to_ship → shipped → delivered: transiciones secuenciales del flujo de despacho."),
  BULL("paid / processing / ready_to_ship → cancelled: por acción del administrador, reintegrando stock automáticamente."),
  BULL("delivered → refunded: por iniciativa del administrador en caso de devolución dentro del plazo legal."),

  H3("6.D.2 Estados de Producto"),
  P("El estado de un producto se modela combinando los flags products.is_active y products.is_featured y el saldo de stock_quantity."),
  dataTable(["Estado", "Condición técnica", "Descripción"], [
    ["Activo con stock", "is_active = 1 y stock_quantity > 0", "Producto visible y comprable."],
    ["Activo destacado", "is_featured = 1", "Producto resaltado en el home y en el catálogo."],
    ["Activo sin stock", "is_active = 1 y stock_quantity = 0", "Producto visible pero no comprable."],
    ["Inactivo", "is_active = 0", "Producto oculto del catálogo público; sólo visible para administradores."],
    ["Dado de baja", "Eliminado lógicamente (no aparece en listados ni búsquedas)", "Conserva los registros históricos en order_items, product_reviews y stock_movements."],
  ], [2200, 3000, 4160]),

  H3("6.D.3 Estados de Pago (payments.status)"),
  dataTable(["Estado (ENUM)", "Descripción"], [
    ["pending", "Preferencia generada y a la espera de que el cliente complete el pago."],
    ["approved", "Mercado Pago aprobó la operación."],
    ["rejected", "Mercado Pago rechazó la operación. El pedido permanece en estado pending para reintento."],
    ["cancelled", "Pago cancelado por el cliente antes de finalizar."],
    ["refunded", "Pago reembolsado a través de Mercado Pago."],
  ], [2200, 7160]),

  H3("6.D.4 Estados de Usuario"),
  dataTable(["Estado", "Condición técnica", "Descripción"], [
    ["Activo cliente", "role = 'customer'", "Usuario final con permisos de cliente."],
    ["Activo administrador", "role = 'admin'", "Operador interno con acceso al panel /admin."],
    ["Activo solo lectura", "role = 'readonly'", "Auditor interno con consulta sin modificación."],
    ["Eliminado", "Borrado lógico (no presente en users)", "ON DELETE CASCADE propaga sobre addresses y notifications."],
  ], [2200, 2700, 4460]),

  H3("6.D.5 Estados de Reseña (product_reviews.is_approved)"),
  BULL("Pendiente: estado inicial al crearse la reseña (is_approved = 0)."),
  BULL("Aprobada: tras la moderación del administrador (is_approved = 1). Pasa a ser visible en la ficha pública."),
  BULL("Rechazada: la reseña es eliminada por el administrador y no se publica."),
];

/* ================================================================== */
/* 4 — DFD                                                            */
/* ================================================================== */
const dfd = [
  PB(),
  H2("6.E Diagramas de flujo de datos"),
  P("El diagrama de flujo de datos (DFD) representa la circulación de información dentro del sistema y entre éste y sus entidades externas. Se presenta en niveles de detalle crecientes según la metodología clásica de Yourdon."),

  H3("6.E.1 Nivel de contexto (Diagrama 0)"),
  P("Entidades externas:"),
  BULL("Cliente — interactúa a través del frontend público y autenticado."),
  BULL("Administrador — interactúa a través del panel /admin."),
  BULL("Mercado Pago — servicio externo de cobro."),
  P("Flujos:"),
  BULL("Cliente → Sistema: credenciales, búsquedas, decisiones de carrito, datos de checkout, intentos de pago, contenido de reseñas."),
  BULL("Sistema → Cliente: catálogo, fichas, estado del carrito, comprobantes de pedido, notificaciones."),
  BULL("Administrador → Sistema: altas/modificaciones/bajas de productos y promociones, ajustes de stock, transiciones de estado de pedidos, parámetros de reportes, decisiones de moderación."),
  BULL("Sistema → Administrador: dashboard de reportes, log de auditoría, panel de gestión."),
  BULL("Sistema → Mercado Pago: requests de creación de preferencia con items, back_urls y notification_url."),
  BULL("Mercado Pago → Sistema: webhooks firmados con notificaciones de pagos."),

  H3("6.E.2 Nivel 1 — Procesos principales"),
  dataTable(["N°", "Proceso", "Descripción"], [
    ["1.0", "Gestionar identidad", "Registro (CU-03), login (CU-04), validación de JWT, gestión de roles (CU-14)."],
    ["2.0", "Gestionar catálogo y promociones", "CRUD de productos, categorías, etiquetas y promociones (CU-12, CU-15) y exposición pública (CU-01, CU-02)."],
    ["3.0", "Gestionar stock", "Movimientos manuales y automáticos sobre stock_movements y saldos en products (CU-12)."],
    ["4.0", "Operar carrito", "Estado local en Zustand y validación de stock/precio al iniciar checkout (CU-05)."],
    ["5.0", "Procesar pedido y pago", "Checkout, integración con Mercado Pago, transiciones de orders.status (CU-06, CU-07, CU-13)."],
    ["6.0", "Atención y comunidad", "Direcciones (CU-09), reseñas (CU-10, CU-18) e historial (CU-08)."],
    ["7.0", "Generar reportes y auditar", "Consultas analíticas y registros de auditoría (CU-16, CU-17)."],
    ["8.0", "Notificar", "Generación y consumo de notificaciones (CU-11)."],
  ], [800, 2600, 5960]),
  P("Almacenes de datos:"),
  BULL("D1 — users + addresses."),
  BULL("D2 — categories + products + product_images + product_tags + product_tag_map + product_reviews + product_views."),
  BULL("D3 — stock_movements."),
  BULL("D4 — Carrito local (no persistente en BD; vive en localStorage del cliente)."),
  BULL("D5 — orders + order_items + payments + promotions."),
  BULL("D6 — audit_logs."),
  BULL("D7 — notifications."),

  H3("6.E.3 Nivel 2 — Proceso 5.0 \"Procesar pedido y pago\""),
  dataTable(["N°", "Subproceso", "Entradas", "Salidas"], [
    ["5.1", "Validar carrito y stock", "Líneas del carrito, products.stock_quantity de D2", "Carrito validado; rechazo si stock insuficiente"],
    ["5.2", "Capturar dirección y método", "Selección del cliente, direcciones de D1", "Pedido con shipping_address y delivery_method"],
    ["5.3", "Persistir orden y crear preferencia MP", "Pedido validado", "Filas en orders y order_items (D5); preference_id; redirección a Mercado Pago"],
    ["5.4", "Recibir webhook de pago", "Notificación firmada de Mercado Pago", "Fila en payments con raw_response; payments.status actualizado"],
    ["5.5", "Confirmar pedido y descontar stock", "Pago aprobado", "orders.status = 'paid'; stock_movements (type = venta); audit_logs; notification"],
    ["5.6", "Avanzar estado operativo", "Acción del administrador", "Transición de orders.status; notification al cliente"],
  ], [600, 2300, 3000, 3460]),

  H3("6.E.4 Nivel 2 — Proceso 3.0 \"Gestionar stock\""),
  dataTable(["N°", "Subproceso", "Entradas", "Salidas"], [
    ["3.1", "Registrar ingreso manual", "Cantidad, motivo, usuario, producto", "Fila en stock_movements (type = ingreso); products.stock_quantity actualizado"],
    ["3.2", "Registrar egreso/ajuste", "Cantidad, motivo, usuario", "Fila en stock_movements; saldo recalculado"],
    ["3.3", "Registrar venta automática", "Confirmación de pago aprobado proveniente de 5.5", "Fila en stock_movements (type = venta) con reference_id = order_id"],
    ["3.4", "Registrar devolución", "Reembolso aprobado en payments", "Fila en stock_movements (type = devolucion)"],
    ["3.5", "Alertar stock crítico", "Saldo posterior al movimiento", "Notification de tipo stock_low al administrador (D7)"],
  ], [600, 2400, 3000, 3360]),

  H3("6.E.5 Nivel 2 — Proceso 1.0 \"Gestionar identidad\""),
  dataTable(["N°", "Subproceso", "Entradas", "Salidas"], [
    ["1.1", "Registrar usuario", "DTO de registro validado por Zod", "Fila en users con password hasheado y role = customer; JWT emitido"],
    ["1.2", "Iniciar sesión", "email + password", "JWT firmado o error 401"],
    ["1.3", "Validar token", "Header Authorization", "req.user poblado o 401"],
    ["1.4", "Modificar rol de usuario", "id de usuario + nuevo rol", "users.role actualizado; audit_logs"],
    ["1.5", "Eliminar usuario", "id de usuario", "users eliminado; cascade sobre addresses y notifications"],
  ], [600, 2400, 3000, 3360]),
];

/* ================================================================== */
/* 5 — Capítulo 9: Desarrollo (estilo cierre.docx)                     */
/* ================================================================== */
const desarrollo = [
  PB(),
  H1("Capítulo 9: Desarrollo"),
  P("El desarrollo de la aplicación web de Tele Import S.A. se llevó a cabo aplicando metodologías ágiles (Scrum y Kanban), organizado en cuatro sprints de dos semanas cada uno, para un total de ocho semanas de trabajo. El equipo adoptó el flujo de tableros propio de Kanban (Backlog, En curso, Revisión, Hecho) y las ceremonias de Scrum (planificación de sprint, daily de quince minutos, revisión y retrospectiva al cierre de cada iteración)."),
  P("El código fuente se aloja en dos repositorios independientes versionados con Git:"),
  BULL("Frontend: directorio frontend/ del repositorio nuevotesis (Next.js 14)."),
  BULL("Backend: directorio backend/ del repositorio nuevotesis (Express + MySQL)."),
  P("Las URLs de producción son las que el archivo render.yaml provee para el backend y las que vercel.json provee para el frontend."),

  H2("9.1 Tecnologías utilizadas"),
  H3("Frontend"),
  BULL("Next.js 14 con App Router."),
  BULL("React 18."),
  BULL("TypeScript 5."),
  BULL("Tailwind CSS 3."),
  BULL("Zustand para el estado del carrito y la sesión."),
  BULL("TanStack React Query (con devtools) para la caché de datos del backend."),
  BULL("lucide-react para los iconos."),
  BULL("clsx + tailwind-merge para la composición de clases."),
  BULL("Zod para la validación de DTOs compartidos con el backend."),
  BULL("@mercadopago/sdk-react para los componentes de Checkout Pro."),
  H3("Backend"),
  BULL("Node.js + Express 4."),
  BULL("TypeScript 5 con tsx para desarrollo (hot reload) y tsc para build de producción."),
  BULL("mysql2/promise para el pool de conexiones."),
  BULL("jsonwebtoken para la emisión y validación de JWT."),
  BULL("bcryptjs para el hashing de contraseñas."),
  BULL("Zod para la validación de DTOs."),
  BULL("cors y dotenv como utilidades estándar."),
  BULL("mercadopago (SDK oficial) para Checkout Pro y verificación de webhooks."),
  H3("Base de datos e infraestructura"),
  BULL("MySQL 8 con motor InnoDB y collation utf8mb4_unicode_ci."),
  BULL("Render.com para el hosting del backend y de la base de datos administrada."),
  BULL("Vercel para el hosting y CDN del frontend (configurado en vercel.json)."),

  H2("9.2 Programa general de desarrollo"),
  P("El siguiente programa enumera, en orden cronológico, las tareas ejecutadas durante el proyecto. Constituye la columna vertebral del plan de sprints presentado a continuación."),
  BULL("9.2.1 Reunión para confirmar el stack tecnológico (Next.js + Express + MySQL + Mercado Pago)."),
  BULL("9.2.2 Creación de los repositorios Git iniciales para backend y frontend."),
  H3("Frontend"),
  BULL("9.2.3 Instalación y configuración de Next.js 14, Tailwind y dependencias."),
  BULL("9.2.4 Definición del App Router y estructura de carpetas con route groups (public), (auth), (account), (shop), (admin)."),
  BULL("9.2.5 Configuración del store global con Zustand y de React Query."),
  BULL("9.2.6 Construcción de componentes reutilizables (Button, Input, Modal, Skeleton, Badge, CartToast, LoadingScreen, SplashScreen)."),
  BULL("9.2.7 Construcción del layout público: Header, Footer, NotificationBell."),
  BULL("9.2.8 Construcción del Home (carrousel, banners, productos destacados)."),
  BULL("9.2.9 Construcción de las vistas de autenticación (/login y /registro) y AuthModals."),
  BULL("9.2.10 Construcción del catálogo público y la ficha de detalle (/catalogo, /producto/[slug]) con filtros, búsqueda y reseñas."),
  BULL("9.2.11 Construcción del carrito y del checkout (/carrito, /checkout, /checkout/exitoso, /checkout/fallido)."),
  BULL("9.2.12 Construcción del área privada del cliente (/perfil, /perfil/direcciones, /perfil/pedidos, /perfil/pedidos/[id])."),
  BULL("9.2.13 Construcción del panel administrativo (/admin/productos, /admin/stock, /admin/pedidos, /admin/usuarios, /admin/promociones, /admin/reportes, /admin/resenas, /admin/auditoria)."),
  BULL("9.2.14 Integración con Mercado Pago mediante src/lib/mercadopago/client.ts y las API routes src/app/api/pagos/preferencia/route.ts y src/app/api/pagos/validar-cupon/route.ts."),
  BULL("9.2.15 Despliegue en Vercel."),
  H3("Backend"),
  BULL("9.2.16 Instalación de Express, mysql2, bcryptjs, jsonwebtoken, Zod, mercadopago."),
  BULL("9.2.17 Configuración del pool de conexiones MySQL (backend/src/db/database.ts)."),
  BULL("9.2.18 Definición del esquema completo (backend/src/db/schema.ts) ejecutado idempotentemente al iniciar el servidor."),
  BULL("9.2.19 Carga de datos de prueba con backend/src/db/seed.ts y seed_extra.ts."),
  BULL("9.2.20 Implementación del módulo de autenticación (backend/src/routes/auth.ts) y middleware validateToken."),
  BULL("9.2.21 Implementación del catálogo (backend/src/routes/catalog.ts) y del servicio de recomendaciones."),
  BULL("9.2.22 Implementación del módulo administrativo (backend/src/routes/admin.ts)."),
  BULL("9.2.23 Implementación de pagos (backend/src/routes/payments.ts) y webhooks (backend/src/routes/webhooks.ts)."),
  BULL("9.2.24 Implementación de reportes (backend/src/routes/reports.ts) y notificaciones (backend/src/services/notifications.ts)."),
  BULL("9.2.25 Despliegue en Render con MySQL administrada."),

  H2("9.3 Planificación de sprints"),

  H3("Sprint 1 (Semanas 1-2) — Infraestructura y autenticación"),
  P("Objetivos del Sprint:"),
  BULL("Establecer la infraestructura básica del proyecto en ambos repositorios."),
  BULL("Configurar el entorno de desarrollo, los lints y los scripts de build/dev."),
  BULL("Construir los componentes fundamentales del frontend y los módulos básicos del backend."),
  BULL("Implementar la autenticación de extremo a extremo (registro y login)."),
  P("Tareas del Sprint:"),
  H4("Frontend"),
  BULL("Instalación de Next.js 14, Tailwind, Zustand, React Query, lucide-react y configuraciones generales."),
  BULL("Definición de los route groups (public), (auth), (account), (shop) y (admin)."),
  BULL("Componentes reutilizables (Button, Input, Modal, Skeleton, Badge, LoadingScreen, SplashScreen)."),
  BULL("Construcción del Header, Footer y NotificationBell."),
  BULL("Pantalla Home con HeroCarousel y UserWelcomeBar."),
  BULL("Pantallas /login y /registro y componente AuthModals."),
  BULL("Hook useAuth y cliente HTTP base (src/lib/api/client.ts)."),
  H4("Backend"),
  BULL("Instalación de Express, mysql2, bcryptjs, jsonwebtoken, Zod."),
  BULL("Pool de conexiones MySQL (database.ts) y esquema completo (schema.ts)."),
  BULL("Middleware validateToken."),
  BULL("Rutas backend/src/routes/auth.ts (POST /register, POST /login, GET /me)."),
  BULL("Seed inicial (seed.ts) con usuarios admin, customer y readonly de prueba."),
  P("Mapeo tarea → caso de uso:"),
  dataTable(["Tarea", "Casos de uso satisfechos"], [
    ["FE y BE — Instalación y configuración general", "—"],
    ["FE — Componentes reutilizables, Header, Footer, Home", "—"],
    ["FE — Pantallas de login y registro", "CU-03 Registrarse; CU-04 Iniciar sesión"],
    ["BE — Esquema MySQL completo", "Soporte de CU-03 a CU-18"],
    ["BE — Rutas de autenticación y middleware JWT", "CU-03 Registrarse; CU-04 Iniciar sesión"],
    ["BE — Seed de datos iniciales", "—"],
  ], [5800, 3560]),
  P("Nota: FE refiere a Frontend y BE a Backend."),

  H3("Sprint 2 (Semanas 3-4) — Catálogo y panel administrativo I"),
  P("Objetivos del Sprint:"),
  BULL("Exponer el catálogo público con filtros y ficha de detalle."),
  BULL("Implementar el panel administrativo de productos y stock."),
  BULL("Construir las primeras pantallas del panel de pedidos."),
  P("Tareas del Sprint:"),
  H4("Frontend"),
  BULL("Catálogo público (/catalogo) con CatalogFilters, ActiveFilterChips, ProductCard, PromoBanner."),
  BULL("Ficha de producto (/producto/[slug]) con ProductImageGallery, AddToCartButton, ProductReviews, ProductViewTracker."),
  BULL("Panel admin de productos (/admin/productos, /admin/productos/nuevo, /admin/productos/[id])."),
  BULL("Panel admin de stock (/admin/stock)."),
  H4("Backend"),
  BULL("backend/src/routes/catalog.ts con endpoints de listado paginado, detalle por slug, búsqueda y filtros."),
  BULL("backend/src/services/recommendations.ts y registro de visitas en product_views."),
  BULL("backend/src/routes/admin.ts con CRUD de productos, gestión de stock_movements y consulta de saldos."),
  P("Mapeo tarea → caso de uso:"),
  dataTable(["Tarea", "Casos de uso satisfechos"], [
    ["FE — Catálogo público y filtros", "CU-01 Ver catálogo y filtrar"],
    ["FE — Ficha de producto y reseñas", "CU-02 Ver detalle de producto; CU-10 Escribir reseña"],
    ["FE — Panel admin de productos y stock", "CU-12 Gestionar productos y stock"],
    ["BE — Endpoints de catálogo y recomendaciones", "CU-01; CU-02"],
    ["BE — Endpoints admin de productos y stock", "CU-12"],
    ["BE — Registro de visitas en product_views", "Soporte de CU-16 Ver reportes"],
  ], [5800, 3560]),

  H3("Sprint 3 (Semanas 5-6) — Carrito, checkout y pagos"),
  P("Objetivos del Sprint:"),
  BULL("Construir el flujo completo de compra (carrito → checkout → pago)."),
  BULL("Integrar Mercado Pago Checkout Pro y los webhooks de notificación."),
  BULL("Persistir órdenes y pagos con sus auditorías."),
  P("Tareas del Sprint:"),
  H4("Frontend"),
  BULL("Store del carrito en Zustand con persistencia en localStorage."),
  BULL("Página /carrito y componente CartToast."),
  BULL("Página /checkout con selección de método y dirección."),
  BULL("Páginas /checkout/exitoso, /checkout/fallido y /checkout/pendiente."),
  BULL("API routes src/app/api/pagos/preferencia/route.ts y src/app/api/pagos/validar-cupon/route.ts."),
  BULL("Cliente Mercado Pago (src/lib/mercadopago/client.ts) y página de gestión de direcciones (/perfil/direcciones)."),
  H4("Backend"),
  BULL("backend/src/routes/payments.ts con creación de preferencias y reverse-lookup."),
  BULL("backend/src/routes/webhooks.ts con verificación de firma y actualización de orders y payments."),
  BULL("Endpoints CRUD de direcciones (en backend/src/routes/admin.ts o módulo dedicado)."),
  BULL("Inserción transaccional en orders y order_items y registro en stock_movements (type = venta) al confirmar el pago."),
  P("Mapeo tarea → caso de uso:"),
  dataTable(["Tarea", "Casos de uso satisfechos"], [
    ["FE — Carrito local y persistente", "CU-05 Gestionar carrito"],
    ["FE — Página de checkout y selección de envío", "CU-06 Realizar checkout"],
    ["FE — API routes de preferencia y cupón + redirección a Mercado Pago", "CU-07 Pagar en línea; CU-15 Gestionar promociones"],
    ["FE — Páginas de retorno de Mercado Pago", "CU-07"],
    ["FE — Gestión de direcciones del cliente", "CU-09 Gestionar direcciones"],
    ["BE — Creación de preferencia y webhook", "CU-06; CU-07"],
    ["BE — Movimientos de stock automáticos por venta", "CU-12 (soporte)"],
  ], [5800, 3560]),

  H3("Sprint 4 (Semanas 7-8) — Pedidos, reportes, moderación y despliegue"),
  P("Objetivos del Sprint:"),
  BULL("Completar la gestión administrativa de pedidos, promociones, usuarios, reportes y auditoría."),
  BULL("Implementar la moderación de reseñas y las notificaciones."),
  BULL("Realizar pruebas integrales y desplegar en Vercel y Render."),
  P("Tareas del Sprint:"),
  H4("Frontend"),
  BULL("Página /perfil/pedidos y /perfil/pedidos/[id] (CU-08)."),
  BULL("Panel /admin/pedidos con transiciones de estado."),
  BULL("Panel /admin/usuarios con cambio de rol."),
  BULL("Panel /admin/promociones."),
  BULL("Panel /admin/reportes con gráficos y exportación."),
  BULL("Panel /admin/resenas con flujo de moderación."),
  BULL("Panel /admin/auditoria con filtros."),
  BULL("Componente NotificationBell y página de notificaciones."),
  BULL("Pruebas de regresión, ajustes visuales y de UX, despliegue en Vercel."),
  H4("Backend"),
  BULL("Endpoints administrativos de pedidos, usuarios, promociones, reportes, auditoría y reseñas."),
  BULL("Servicio backend/src/services/notifications.ts."),
  BULL("Refinamiento de seguridad: rate limiting, hardening de headers, validación de webhooks."),
  BULL("Despliegue en Render con render.yaml y MySQL administrada."),
  P("Mapeo tarea → caso de uso:"),
  dataTable(["Tarea", "Casos de uso satisfechos"], [
    ["FE — Vistas /perfil/pedidos y detalle", "CU-08 Ver historial de pedidos"],
    ["FE — Panel /admin/pedidos", "CU-13 Gestionar pedidos"],
    ["FE — Panel /admin/usuarios", "CU-14 Gestionar usuarios"],
    ["FE — Panel /admin/promociones", "CU-15 Gestionar promociones"],
    ["FE — Panel /admin/reportes", "CU-16 Ver reportes"],
    ["FE — Panel /admin/resenas", "CU-18 Moderar reseñas"],
    ["FE — Panel /admin/auditoria", "CU-17 Consultar auditoría"],
    ["FE — NotificationBell y vista de notificaciones", "CU-11 Recibir notificaciones"],
    ["BE — Endpoints admin de pedidos, usuarios, promociones, reportes, auditoría y reseñas", "CU-13 a CU-18"],
    ["BE — Servicio de notificaciones", "CU-11"],
    ["BE — Despliegue en Render", "—"],
    ["FE — Despliegue en Vercel", "—"],
  ], [5800, 3560]),

  H2("9.4 Notas finales del capítulo"),
  P("FE refiere a Frontend; BE refiere a Backend. Al finalizar cada sprint el equipo realizó una revisión con el comitente y una retrospectiva interna. Se priorizó la cobertura funcional mediante pruebas manuales guiadas por los casos de uso descritos en el apartado 6.C, y se acompañó cada despliegue de una verificación de regresión sobre los flujos críticos: autenticación, compra completa con Mercado Pago en modo sandbox y reverso de stock por cancelación o reembolso."),
  P("El plan de pruebas detallado y los criterios de aceptación se documentan en el apartado 8.5 de la tesis principal, manteniendo consistencia con el alcance funcional definido aquí."),
];

/* ================================================================== */
/* Document                                                            */
/* ================================================================== */
const doc = new Document({
  creator: "Tele Import S.A.",
  title: "Complemento de Modelación y Capítulo Desarrollo",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: FONT, color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, font: FONT, color: "1F3864" },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: FONT, color: "2E5C8A" },
        paragraph: { spacing: { before: 240, after: 140 }, outlineLevel: 2 } },
      { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: FONT, color: "2E5C8A" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 3 } },
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
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
    },
    headers: { default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Tesis Tele Import S.A. — Complemento de Cap. 6 y nuevo Cap. 9", font: FONT, size: 18, italics: true, color: "555555" })],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Página ", font: FONT, size: 18 }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })],
    })] }) },
    children: [
      ...intro,
      ...actoresSection,
      PB(),
      ...cuDetalle,
      ...estados,
      ...dfd,
      ...desarrollo,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = "C:\\Users\\popet\\OneDrive\\Desktop\\Tesis_Complemento_Cap6_y_Cap9_Desarrollo.docx";
  fs.writeFileSync(out, buf);
  console.log("OK -> " + out + " (" + buf.length + " bytes)");
});
