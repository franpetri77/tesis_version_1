const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  HeadingLevel, LevelFormat, BorderStyle,
} = require("docx");
const fs = require("fs");

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
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial" })],
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 220, after: 80 },
    children: [new TextRun({ text, bold: true, size: 22, font: "Arial" })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80, line: 360 },
    children: [new TextRun({ text, size: 22, font: "Arial", ...opts })],
  });
}

function pEmpty() {
  return new Paragraph({ spacing: { before: 60, after: 60 } });
}

// Módulo: título en negrita + cuerpo en normal, todo en mismo párrafo
function modulo(titulo, cuerpo) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 120, after: 80, line: 360 },
    children: [
      new TextRun({ text: titulo + " ", bold: true, size: 22, font: "Arial" }),
      new TextRun({ text: cuerpo, size: 22, font: "Arial" }),
    ],
  });
}

// Ítem de lista con viñeta manual (negrita label + cuerpo)
function bullet(label, cuerpo) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 40, line: 360 },
    indent: { left: 720, hanging: 280 },
    children: [
      new TextRun({ text: "•  ", size: 22, font: "Arial" }),
      new TextRun({ text: label + ": ", bold: true, size: 22, font: "Arial" }),
      new TextRun({ text: cuerpo, size: 22, font: "Arial" }),
    ],
  });
}

function hr() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 1 },
    },
    children: [],
  });
}

// ── Documento ─────────────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Arial", size: 22 } },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1701, right: 1701, bottom: 1701, left: 1701 }, // ~3 cm
        },
      },
      children: [

        // ── TÍTULO DEL CAPÍTULO
        h1("CAPÍTULO 3: Mandato del Proyecto"),
        hr(),

        // ── 1. DESCRIPCIÓN
        h2("Descripción de la Empresa"),
        p(
          "Tele Import S.A. es una empresa dedicada a la comercialización de insumos y equipos " +
          "electrónicos, con sede en el HiperLibertad de Rodríguez del Busto, Barrio Poeta Lugones, " +
          "Córdoba. La empresa lleva varios años operando dentro del centro comercial y, si bien en el " +
          "pasado contó con múltiples sucursales, actualmente concentra su actividad comercial en dicho local."
        ),
        hr(),

        // ── 2. PROBLEMÁTICA
        h2("Problemática Encontrada"),
        p(
          "La empresa se enfrenta a desafíos estructurales vinculados a la visibilidad digital y a la " +
          "gestión interna de su operación comercial. La ausencia de una plataforma en línea limita la " +
          "capacidad de captar nuevos clientes y fidelizar a los existentes. Al mismo tiempo, la " +
          "administración manual de productos, stock, pedidos y promociones genera ineficiencias " +
          "operativas y dificulta el análisis del desempeño del negocio. La organización carece de " +
          "herramientas sistematizadas para el control de inventario, el seguimiento de ventas y la toma " +
          "de decisiones basada en datos."
        ),
        hr(),

        // ── 3. OBJETIVO
        h2("Objetivo"),
        p(
          "Diseñar e implementar una plataforma de comercio electrónico completa para Tele Import S.A., " +
          "que permita digitalizar y sistematizar sus procesos de venta, gestión de productos, inventario " +
          "y administración de clientes y pedidos. El sistema debe brindar a los usuarios finales una " +
          "experiencia de compra moderna y responsiva, e integrar un procesador de pagos externo " +
          "(Mercado Pago) para la concreción de transacciones. De manera complementaria, el sistema " +
          "incorpora un panel de administración con herramientas de reportería, auditoría y control de " +
          "acceso por roles, con el fin de apoyar la toma de decisiones y mejorar la eficiencia " +
          "operativa de la empresa."
        ),
        hr(),

        // ── 4. LÍMITES
        h2("Límites"),
        p(
          "El sistema abarca desde el acceso a la plataforma web por parte del cliente hasta la " +
          "confirmación del pedido y su preparación para entrega o retiro en sucursal. El procesamiento " +
          "del pago se delega en la pasarela de Mercado Pago, cuya integración forma parte del alcance " +
          "del proyecto. El sistema no gestiona la logística física de entrega, no se integra con " +
          "sistemas de facturación electrónica, y no incluye comunicación por correo electrónico externo " +
          "ni canales de mensajería instantánea en tiempo real."
        ),
        hr(),

        // ── 5. ALCANCE
        h2("Alcance"),
        p("El sistema se organiza en los siguientes módulos funcionales:"),
        pEmpty(),

        // Módulos
        modulo(
          "Módulo 1 – Autenticación y Control de Acceso",
          "Registro e inicio de sesión de usuarios mediante credenciales propias. Gestión de sesiones " +
          "con tokens de autenticación. Sistema de roles con tres niveles: administrador, cliente y solo " +
          "lectura. Control de acceso diferenciado a las funcionalidades del sistema según el rol asignado. " +
          "Gestión del perfil personal por parte del usuario registrado."
        ),
        modulo(
          "Módulo 2 – Catálogo Público",
          "Listado de productos responsivo, adaptado a dispositivos de escritorio y móviles. Filtros por " +
          "categoría, término de búsqueda, rango de precios y criterio de ordenamiento. Paginación de " +
          "resultados. Vista detallada de producto con galería de imágenes, funcionalidad de zoom, " +
          "descripción completa, precio, stock disponible y etiquetas asociadas. Sección de productos " +
          "destacados en la página de inicio."
        ),
        modulo(
          "Módulo 3 – Carrito y Proceso de Compra",
          "Carrito de compras persistente con posibilidad de agregar, modificar y eliminar ítems. " +
          "Validación de stock en tiempo real. Aplicación de códigos de descuento y promociones. " +
          "Selección de método de entrega: retiro en sucursal o envío a domicilio. Ingreso y gestión " +
          "de múltiples direcciones de envío por usuario. Proceso de confirmación de pedido con resumen " +
          "detallado del importe."
        ),
        modulo(
          "Módulo 4 – Pagos e Integración con Mercado Pago",
          "Generación de preferencia de pago y redirección al portal de Mercado Pago. Recepción y " +
          "procesamiento de notificaciones de pago mediante webhook. Validación del estado del pago y " +
          "actualización automática del pedido correspondiente. Validación del monto en el servidor para " +
          "protección contra manipulación de precios desde el cliente."
        ),
        modulo(
          "Módulo 5 – Gestión Administrativa de Productos y Stock",
          "Panel de administración para la creación, modificación, activación y eliminación de " +
          "productos. Carga de imágenes, asignación de categorías y etiquetas. Control de stock " +
          "mediante el registro de movimientos de tipo ingreso, egreso y ajuste manual. Historial " +
          "completo de movimientos de inventario con detalle de usuario y fecha."
        ),
        modulo(
          "Módulo 6 – Gestión de Pedidos y Usuarios",
          "Listado y seguimiento de pedidos con filtro por estado. Actualización del estado de los " +
          "pedidos a lo largo de su ciclo de vida: pendiente, pagado, en preparación, enviado, " +
          "entregado y cancelado. Gestión de usuarios: listado, modificación de rol y eliminación. " +
          "Historial de pedidos accesible para el usuario cliente desde su cuenta personal."
        ),
        modulo(
          "Módulo 7 – Promociones y Descuentos",
          "Creación y administración de códigos de descuento con soporte para descuento porcentual, " +
          "monto fijo y envío gratuito. Configuración de vigencia, límite de usos y monto mínimo de " +
          "compra requerido. Validación de cupones durante el proceso de checkout."
        ),
        modulo(
          "Módulo 8 – Reseñas y Moderación",
          "Sistema de comentarios y calificaciones de productos habilitado para usuarios registrados. " +
          "Restricción de una reseña por usuario por producto. Panel de moderación para la aprobación, " +
          "rechazo y eliminación de reseñas."
        ),
        modulo(
          "Módulo 9 – Notificaciones Internas",
          "Sistema de notificaciones almacenadas en la plataforma, que registra eventos relevantes del " +
          "sistema tales como nuevos pedidos, cambios de estado y alertas de stock bajo. Visualización " +
          "de notificaciones desde el panel de administración."
        ),
        modulo(
          "Módulo 10 – Reportes y Analítica",
          "Reporte de ventas por período con indicadores de ingresos totales, cantidad de pedidos y " +
          "ticket promedio. Ranking de productos más vendidos y productos con menor rendimiento " +
          "comercial. Reporte de productos más visitados con filtro por rango de fechas, basado en el " +
          "seguimiento de visitas al detalle de producto. Métricas globales del negocio: total de " +
          "pedidos, ingresos acumulados, productos activos y usuarios registrados."
        ),
        modulo(
          "Módulo 11 – Auditoría",
          "Registro automático de las operaciones realizadas sobre el inventario, con detalle del " +
          "usuario responsable, fecha, entidad afectada y valores anteriores y posteriores a la " +
          "operación. Panel de consulta con filtros por tipo de acción y entidad."
        ),

        pEmpty(),
        hr(),

        // ── FUNCIONALIDADES COMPLEMENTARIAS
        h3("Funcionalidades complementarias implementadas"),
        p(
          "Las siguientes funcionalidades, si bien no fueron definidas explícitamente en el relevamiento " +
          "inicial, surgieron como extensiones necesarias durante el proceso de desarrollo y fueron " +
          "incorporadas para garantizar la integridad funcional de la plataforma:"
        ),
        pEmpty(),
        bullet(
          "Seguimiento de visitas por producto",
          "registro de visualizaciones a la página de detalle de producto, con identificación opcional " +
          "del usuario autenticado, utilizado como base para el reporte de productos más visitados."
        ),
        bullet(
          "Protección contra condiciones de concurrencia en la compra",
          "bloqueo de stock durante la creación del pedido para evitar sobreventa en operaciones simultáneas."
        ),
        bullet(
          "Dashboard de inicio para el administrador",
          "con indicadores clave de rendimiento del negocio disponibles al ingresar al panel de administración."
        ),

        pEmpty(),
        hr(),

        // ── MEJORAS FUTURAS
        h3("Mejoras futuras y funcionalidades fuera del alcance"),
        p(
          "Las siguientes funcionalidades fueron consideradas durante el relevamiento pero quedaron " +
          "excluidas del alcance del presente proyecto, ya sea por su complejidad técnica, dependencia " +
          "de infraestructura externa o por no resultar prioritarias para los objetivos centrales del sistema:"
        ),
        pEmpty(),
        bullet(
          "Chat en vivo",
          "integración de un canal de atención al cliente en tiempo real mediante mensajería instantánea " +
          "dentro de la plataforma."
        ),
        bullet(
          "Notificaciones externas por correo electrónico y notificaciones push",
          "envío automático de comunicaciones a clientes y al personal de la sucursal ante eventos como " +
          "confirmación de pedido, cambio de estado o stock insuficiente, a través de canales externos " +
          "a la plataforma."
        ),
        bullet(
          "Compartir productos en redes sociales",
          "integración de mecanismos para la difusión de productos en plataformas de terceros " +
          "(redes sociales y servicios de mensajería)."
        ),
        bullet(
          "Integración con sistemas de facturación electrónica",
          "vinculación con herramientas de emisión de comprobantes fiscales."
        ),
        bullet(
          "Gestión logística de entregas a domicilio",
          "coordinación con operadores de logística externos para el seguimiento y despacho de envíos."
        ),

        pEmpty(),

      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = "C:/Users/popet/OneDrive/Desktop/nuevotesis/Capitulo3_Mandato.docx";
  fs.writeFileSync(out, buffer);
  console.log("Generado:", out);
});
