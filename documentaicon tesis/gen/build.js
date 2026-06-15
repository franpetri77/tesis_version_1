// Generador de capítulo de modelado para la tesis "Tele Import S.A."
// Plataforma web de venta de insumos informáticos – React + TypeScript + Directus
// Estilo académico ESCMB (UNC)

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  TabStopType, TabStopPosition, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber
} = require("docx");

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const FONT = "Arial";
const border = { style: BorderStyle.SINGLE, size: 6, color: "888888" };
const borders = { top: border, bottom: border, left: border, right: border };

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 300 },
  alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
  children: [new TextRun({ text, font: FONT, size: 22, bold: !!opts.bold, italics: !!opts.italics })],
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 180 },
  children: [new TextRun({ text, font: FONT, size: 32, bold: true })],
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text, font: FONT, size: 28, bold: true })],
});

const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 220, after: 120 },
  children: [new TextRun({ text, font: FONT, size: 24, bold: true })],
});

const H4 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_4,
  spacing: { before: 180, after: 100 },
  children: [new TextRun({ text, font: FONT, size: 22, bold: true })],
});

const BULL = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 60, line: 280 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text, font: FONT, size: 22 })],
});

const NUM = (text) => new Paragraph({
  numbering: { reference: "nums", level: 0 },
  spacing: { after: 60, line: 280 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text, font: FONT, size: 22 })],
});

const CODE = (text) => new Paragraph({
  spacing: { after: 60 },
  alignment: AlignmentType.LEFT,
  children: [new TextRun({ text, font: "Consolas", size: 18 })],
});

const PB = () => new Paragraph({ children: [new PageBreak()] });

// Tabla de descripción de caso de uso (campo | valor)
const tableUC = (rows) => {
  const TOTAL = 9360;
  const C1 = 2400, C2 = TOTAL - C1;
  const cellShade = "E8EEF5";
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: [C1, C2],
    rows: rows.map(([k, v]) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          borders,
          width: { size: C1, type: WidthType.DXA },
          shading: { fill: cellShade, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, font: FONT, size: 20 })] })],
        }),
        new TableCell({
          borders,
          width: { size: C2, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: v.split("\n").map(line => new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [new TextRun({ text: line, font: FONT, size: 20 })],
          })),
        }),
      ],
    })),
  });
};

// Tabla genérica con cabecera y filas
const dataTable = (header, rows, colWidths) => {
  const TOTAL = 9360;
  const widths = colWidths || header.map(() => Math.floor(TOTAL / header.length));
  const mkCell = (text, opts = {}) => new TableCell({
    borders,
    width: { size: opts.w, type: WidthType.DXA },
    shading: opts.head ? { fill: "2E5C8A", type: ShadingType.CLEAR } : undefined,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), bold: !!opts.head, color: opts.head ? "FFFFFF" : "000000", font: FONT, size: 20 })],
    })],
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

/* ------------------------------------------------------------------ */
/* Apartados faltantes detectados                                      */
/* ------------------------------------------------------------------ */
const missingSection = [
  H1("Análisis preliminar: apartados faltantes en la tesis actual"),
  P("A partir del análisis comparativo entre el documento de tesis actual de Tele Import S.A. y los documentos de referencia metodológica utilizados como guía estructural, se detectaron los siguientes apartados ausentes o incompletos, los cuales son indispensables para alcanzar el nivel de formalidad académica exigido por la Escuela Superior de Comercio Manuel Belgrano (UNC) en una tesis de Análisis y Diseño de Sistemas:"),
  BULL("Capítulo de Modelación: la tesis actual concluye en el Capítulo 5 (Diagnóstico del Proyecto) con la mera identificación de actores, omitiendo por completo el capítulo de modelado del sistema."),
  BULL("Listado clasificado de casos de uso, ordenado por prioridad, complejidad y actor involucrado."),
  BULL("Descripción formal de cada caso de uso (nombre, actor principal, prioridad, complejidad, tipo, objetivo, precondiciones, postcondiciones de éxito y fracaso, descripción detallada y observaciones)."),
  BULL("Diagrama general de casos de uso del sistema."),
  BULL("Diagrama de clases del modelo de dominio."),
  BULL("Diagrama de despliegue adaptado a la arquitectura React + Directus + base de datos relacional."),
  BULL("Diagramas de estados para entidades con ciclo de vida no trivial (Pedido, Producto, Carrito, Usuario)."),
  BULL("Diagrama de actividad para los procesos críticos del sistema (proceso de compra, gestión de stock)."),
  BULL("Diagramas de secuencia para las interacciones más representativas (checkout, autenticación)."),
  BULL("Modelo entidad-relación con descripción de entidades, atributos, relaciones y cardinalidades."),
  BULL("Diagrama de flujo de datos en niveles (contexto, nivel 1 y nivel 2 para procesos críticos)."),
  BULL("Descripción formal de la base de datos: colecciones, campos, tipos de datos, restricciones y relaciones."),
  BULL("Definición de roles del sistema y matriz de permisos."),
  P("El presente documento desarrolla en detalle cada uno de los apartados enumerados, redactados con el mismo grado de profundidad, organización y rigor académico observado en la tesis de referencia, y listos para ser incorporados directamente al cuerpo de la tesis de Tele Import S.A. como Capítulo 6: Modelación del Sistema."),
  PB(),
];

/* ------------------------------------------------------------------ */
/* Capítulo 6 - Modelación                                             */
/* ------------------------------------------------------------------ */
const cap6Intro = [
  H1("Capítulo 6: Modelación del Sistema"),
  P("Habiendo definido en el Capítulo 3 el mandato del proyecto y completado en los Capítulos 4 y 5 el relevamiento y el diagnóstico de la situación actual de Tele Import S.A., el presente capítulo aborda la modelación del sistema propuesto: una plataforma web de venta de insumos informáticos construida sobre una arquitectura de tres capas con frontend desarrollado en React con TypeScript, backend y capa de gestión de datos resuelta mediante Directus, y persistencia sobre una base de datos relacional SQL."),
  P("Para realizar el diseño del sistema se utilizarán distintos diagramas del estándar Unified Modeling Language (UML), los cuales permiten obtener una visión global y formal del sistema desde múltiples perspectivas: comportamental, estructural, dinámica y de implementación. La combinación de estos diagramas garantiza que tanto los requisitos funcionales relevados con el comitente como los no funcionales derivados de la arquitectura tecnológica seleccionada queden plasmados de manera trazable, verificable y mantenible."),
  H3("Diagrama de Casos de Uso"),
  P("Representa las interacciones entre los usuarios (actores) y el sistema. Permite identificar las funcionalidades principales desde la perspectiva del usuario, detallando qué acciones puede realizar cada actor y cómo se comunica con el sistema. Es fundamental para asegurar que la totalidad de los requisitos funcionales relevados con el comitente queden cubiertos por el diseño."),
  H3("Diagrama de Clases"),
  P("Detalla las clases que componen el sistema, sus atributos, métodos y las relaciones entre ellas. Resulta esencial para la planificación de la estructura del software, permitiendo visualizar cómo se organizan y conectan los componentes del dominio y facilitando el desarrollo y mantenimiento del código."),
  H3("Diagrama de Despliegue"),
  P("Muestra la distribución física del sistema, describiendo cómo los componentes del software se distribuyen sobre los nodos de hardware y servicios cloud. Incluye nodos, componentes y sus relaciones, proporcionando una visión clara de la arquitectura de red y de la infraestructura necesaria para soportar el sistema."),
  H3("Diagrama de Estados"),
  P("Ilustra los diferentes estados por los que puede pasar un objeto a lo largo de su ciclo de vida, así como las transiciones entre estos estados. Es útil para modelar el comportamiento dinámico del sistema y entender cómo los eventos internos y externos afectan a los objetos del sistema."),
  H3("Diagrama de Actividad y Secuencia"),
  P("El diagrama de actividad describe el flujo de trabajo de los procesos de negocio críticos, mientras que el diagrama de secuencia muestra el orden temporal de los mensajes intercambiados entre los componentes durante una interacción concreta. Ambos se utilizan en los procesos donde el orden de ejecución y la coordinación entre componentes resultan determinantes."),
];

/* ------------------------------------------------------------------ */
/* 6.1 - Actores del sistema                                           */
/* ------------------------------------------------------------------ */
const actores = [
  H2("6.1 Identificación de actores del sistema"),
  P("Un actor representa a toda entidad externa al sistema que interactúa con él con un propósito determinado. Para la plataforma de Tele Import S.A. se identifican tanto actores humanos —usuarios finales que operan la aplicación a través de su interfaz web— como actores no humanos, correspondientes a sistemas externos integrados a la solución. La correcta identificación de los actores resulta condición necesaria para la posterior definición y clasificación de los casos de uso."),
  H3("Actores primarios (humanos)"),
  dataTable(
    ["Actor", "Descripción", "Rol funcional"],
    [
      ["Cliente no registrado", "Visitante de la plataforma que aún no ha creado una cuenta. Puede navegar el catálogo y consultar productos, pero no puede concretar compras.", "Beneficiario indirecto"],
      ["Cliente registrado", "Usuario final que dispone de una cuenta en el sistema y puede realizar todo el flujo de compra: gestión de carrito, checkout, pago, seguimiento de pedidos e historial.", "Beneficiario directo"],
      ["Administrador", "Usuario con máximo nivel de privilegios. Gestiona usuarios, roles, permisos, configuración global del sistema y posee acceso a la totalidad de los reportes.", "Responsable / gestor"],
      ["Gestor de Catálogo", "Usuario interno responsable del alta, modificación y baja de productos, categorías y marcas, así como de la carga de imágenes y de la actualización de precios.", "Responsable operativo"],
      ["Gestor de Stock", "Usuario interno encargado del registro de movimientos de stock (ingresos por compra a proveedor, egresos por venta, ajustes por inventario y mermas).", "Responsable operativo"],
      ["Gestor de Pedidos", "Usuario interno encargado de procesar los pedidos generados por los clientes: confirmación, preparación, despacho y cierre.", "Responsable operativo"],
    ],
    [2200, 5400, 1760]
  ),
  H3("Actores secundarios (sistemas externos)"),
  dataTable(
    ["Actor", "Descripción"],
    [
      ["Pasarela de pago", "Servicio externo (Mercado Pago u homólogo) responsable de la captura, autorización y confirmación de los pagos electrónicos."],
      ["Servicio de correo electrónico (SMTP)", "Servicio externo encargado de la entrega de notificaciones transaccionales: confirmación de cuenta, recuperación de contraseña, confirmación y cambios de estado de pedidos."],
      ["Servicio de almacenamiento de archivos", "Servicio cloud responsable de la persistencia de los assets binarios (imágenes de productos, comprobantes, archivos descargables)."],
    ],
    [3000, 6360]
  ),
];

/* ------------------------------------------------------------------ */
/* 6.2 - Listado clasificado de casos de uso                            */
/* ------------------------------------------------------------------ */
const ucList = [
  ["CU-01", "Registrar cliente", "Cliente no registrado", "Alta", "Media"],
  ["CU-02", "Iniciar sesión (Login)", "Todos los usuarios", "Alta", "Baja"],
  ["CU-03", "Cerrar sesión (Logout)", "Todos los usuarios", "Baja", "Baja"],
  ["CU-04", "Recuperar contraseña", "Todos los usuarios", "Media", "Media"],
  ["CU-05", "Consultar y editar perfil", "Cliente registrado", "Media", "Baja"],
  ["CU-06", "Consultar catálogo de productos", "Cliente registrado / no registrado", "Alta", "Media"],
  ["CU-07", "Filtrar productos por categoría y marca", "Cliente registrado / no registrado", "Alta", "Media"],
  ["CU-08", "Buscar producto", "Cliente registrado / no registrado", "Alta", "Media"],
  ["CU-09", "Visualizar detalle de producto", "Cliente registrado / no registrado", "Alta", "Baja"],
  ["CU-10", "Agregar producto al carrito", "Cliente registrado", "Alta", "Media"],
  ["CU-11", "Modificar cantidad en el carrito", "Cliente registrado", "Media", "Baja"],
  ["CU-12", "Eliminar producto del carrito", "Cliente registrado", "Media", "Baja"],
  ["CU-13", "Consultar carrito", "Cliente registrado", "Media", "Baja"],
  ["CU-14", "Iniciar proceso de checkout", "Cliente registrado", "Alta", "Alta"],
  ["CU-15", "Seleccionar método y dirección de envío", "Cliente registrado", "Alta", "Media"],
  ["CU-16", "Realizar pago en línea", "Cliente registrado", "Alta", "Alta"],
  ["CU-17", "Confirmar pedido", "Cliente registrado", "Alta", "Alta"],
  ["CU-18", "Consultar historial de pedidos", "Cliente registrado", "Media", "Media"],
  ["CU-19", "Consultar estado de un pedido", "Cliente registrado", "Media", "Baja"],
  ["CU-20", "Cancelar pedido (cliente)", "Cliente registrado", "Media", "Media"],
  ["CU-21", "Alta de producto", "Gestor de Catálogo / Admin.", "Alta", "Media"],
  ["CU-22", "Modificar producto", "Gestor de Catálogo / Admin.", "Alta", "Media"],
  ["CU-23", "Baja de producto", "Gestor de Catálogo / Admin.", "Media", "Baja"],
  ["CU-24", "Gestionar categorías", "Gestor de Catálogo / Admin.", "Media", "Baja"],
  ["CU-25", "Gestionar marcas", "Gestor de Catálogo / Admin.", "Media", "Baja"],
  ["CU-26", "Registrar movimiento de stock", "Gestor de Stock / Admin.", "Alta", "Media"],
  ["CU-27", "Consultar movimientos de stock", "Gestor de Stock / Admin.", "Media", "Baja"],
  ["CU-28", "Procesar pedido (cambio de estado)", "Gestor de Pedidos / Admin.", "Alta", "Media"],
  ["CU-29", "Gestionar usuarios del sistema", "Administrador", "Alta", "Media"],
  ["CU-30", "Asignar roles y permisos", "Administrador", "Alta", "Media"],
  ["CU-31", "Consultar dashboard de reportes", "Administrador", "Media", "Media"],
  ["CU-32", "Generar reporte de ventas", "Administrador", "Alta", "Alta"],
  ["CU-33", "Generar reporte de stock", "Administrador / Gestor de Stock", "Alta", "Media"],
  ["CU-34", "Consultar auditoría del sistema", "Administrador", "Media", "Media"],
];

const listadoCU = [
  H2("6.2 Listado clasificado de casos de uso"),
  P("A continuación se presenta el listado completo de casos de uso identificados a partir del mandato del proyecto y de las entrevistas realizadas al personal de Tele Import S.A. Cada caso de uso se clasifica según su prioridad (Alta, Media o Baja) en relación con el cumplimiento de los objetivos de negocio, y según su complejidad técnica estimada (Alta, Media o Baja) en función del esfuerzo de implementación previsto sobre la arquitectura React + Directus."),
  P("La prioridad Alta corresponde a casos de uso indispensables para el funcionamiento del producto mínimo viable; la prioridad Media a casos de uso necesarios pero diferibles a iteraciones posteriores; y la prioridad Baja a funcionalidades complementarias. La complejidad Alta involucra integraciones con servicios externos o lógica de negocio significativa; la Media implica operaciones CRUD con validaciones de dominio; y la Baja se asocia a consultas o transiciones simples."),
  dataTable(
    ["ID", "Nombre del caso de uso", "Actor principal", "Prioridad", "Complejidad"],
    ucList,
    [900, 3360, 2800, 1100, 1200]
  ),
];

/* ------------------------------------------------------------------ */
/* 6.3 - Descripción detallada de casos de uso                          */
/* ------------------------------------------------------------------ */
const ucDesc = (n, data) => [
  H3(`Caso de uso ${n}: ${data.nombre}`),
  tableUC([
    ["Nombre", data.nombre],
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

const cuDescriptions = [
  H2("6.3 Descripción detallada de casos de uso"),
  P("A continuación se presenta la descripción formal de cada uno de los casos de uso identificados. Para cada caso se especifican los siguientes campos: nombre identificador, actor principal que dispara la interacción, prioridad y complejidad según los criterios definidos en el apartado anterior, tipo (primario, secundario o de soporte) según la clasificación de Larman, objetivo perseguido, precondiciones que deben cumplirse para que la ejecución sea posible, postcondiciones de éxito y de fracaso, descripción detallada del flujo principal y observaciones complementarias relativas a flujos alternativos, reglas de negocio o restricciones de implementación."),

  ...ucDesc(1, {
    nombre: "Registrar cliente",
    actor: "Cliente no registrado",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Permitir que un visitante de la plataforma cree una cuenta personal con la cual pueda concretar compras, almacenar direcciones de envío y consultar su historial de pedidos.",
    pre: "El visitante no posee una cuenta previa asociada al correo electrónico que pretende utilizar.",
    postE: "El sistema crea un nuevo usuario con rol Cliente, persiste la información en la base de datos, envía un correo de confirmación al email indicado y redirige al usuario al formulario de inicio de sesión.",
    postF: "El sistema no crea la cuenta, mantiene los datos del formulario y muestra al usuario un mensaje explicativo del motivo del rechazo (email ya registrado, datos incompletos, contraseña débil o falla de conectividad con el servidor).",
    desc: "El visitante accede a la opción \"Crear cuenta\" desde la barra de navegación. El sistema presenta un formulario que solicita nombre completo, documento de identidad, correo electrónico, teléfono, contraseña y confirmación de contraseña. El visitante completa los campos y confirma. El sistema valida formato y unicidad del correo, verifica que ambas contraseñas coincidan y cumplan con la política de complejidad mínima, aplica un proceso de hashing con salt sobre la contraseña, persiste el nuevo registro y envía un correo de verificación. Una vez confirmado el correo, la cuenta queda habilitada para operar.",
    obs: "El correo electrónico actúa como identificador único de la cuenta. Las contraseñas nunca se almacenan en texto plano. El sistema impide más de tres intentos consecutivos de registro fallidos desde una misma dirección IP en un intervalo de cinco minutos.",
  }),

  ...ucDesc(2, {
    nombre: "Iniciar sesión (Login)",
    actor: "Todos los usuarios",
    prio: "Alta",
    compl: "Baja",
    tipo: "Primario",
    obj: "Autenticar al usuario contra el sistema, identificar su rol y habilitar el conjunto de funcionalidades correspondiente a sus permisos.",
    pre: "El usuario posee una cuenta previamente creada y verificada en el sistema.",
    postE: "El sistema valida las credenciales, genera un token de sesión, registra la fecha y hora del último acceso y redirige al usuario a su dashboard inicial según el rol.",
    postF: "El sistema no concede el acceso, conserva al usuario en la pantalla de login y muestra un mensaje genérico de error sin revelar si el fallo se debió a usuario inexistente o a contraseña incorrecta.",
    desc: "El usuario accede a la pantalla de inicio de sesión e ingresa su correo electrónico y contraseña. El sistema verifica las credenciales contra la base de datos comparando el hash de la contraseña recibida con el almacenado. Si la validación es exitosa, el sistema emite un token de autenticación, lo almacena en el cliente y carga el contexto de usuario, incluyendo rol y permisos. En caso contrario, incrementa el contador de intentos fallidos para esa cuenta.",
    obs: "Tras cinco intentos fallidos consecutivos el sistema bloquea temporalmente la cuenta durante quince minutos. El token de sesión expira por inactividad transcurridos treinta minutos.",
  }),

  ...ucDesc(3, {
    nombre: "Cerrar sesión (Logout)",
    actor: "Todos los usuarios",
    prio: "Baja",
    compl: "Baja",
    tipo: "Primario",
    obj: "Finalizar la sesión activa del usuario invalidando el token y limpiando el estado almacenado en el cliente.",
    pre: "El usuario se encuentra autenticado con una sesión activa.",
    postE: "El sistema invalida el token de sesión, elimina toda referencia al usuario en el navegador y redirige a la página pública de inicio.",
    postF: "El sistema no logra invalidar el token en el servidor; en ese caso fuerza el cierre local y registra el incidente en el log de errores.",
    desc: "El usuario selecciona la opción \"Cerrar sesión\" del menú de cuenta. El sistema solicita al backend la revocación del token activo, limpia el almacenamiento local y de sesión, restablece el contexto de la aplicación y redirige al inicio.",
    obs: "El cierre de sesión es automático si el token expira por inactividad o si el usuario lo invalida desde otro dispositivo.",
  }),

  ...ucDesc(4, {
    nombre: "Recuperar contraseña",
    actor: "Todos los usuarios",
    prio: "Media",
    compl: "Media",
    tipo: "Primario",
    obj: "Permitir al usuario recuperar el acceso a su cuenta en caso de olvido de la contraseña, sin necesidad de intervención manual del administrador.",
    pre: "El usuario posee una cuenta registrada y activa, asociada a un correo electrónico accesible.",
    postE: "El sistema envía un correo con un enlace de restablecimiento de validez limitada; al utilizarlo, el usuario puede definir una contraseña nueva que reemplaza a la anterior.",
    postF: "El sistema no envía el correo (dirección inexistente o falla del servicio SMTP) o el enlace utilizado se encuentra vencido o ya fue consumido; en cualquier caso muestra un mensaje explicativo.",
    desc: "El usuario accede al enlace \"Olvidé mi contraseña\" desde el formulario de login e ingresa su correo electrónico. El sistema verifica la existencia de una cuenta asociada y, en caso afirmativo, genera un token criptográficamente seguro con validez de treinta minutos y lo envía como parte de un enlace al correo registrado. Al hacer clic, el usuario es dirigido a un formulario donde define la nueva contraseña. El sistema valida el token, actualiza el hash en la base de datos, invalida cualquier sesión activa previa y notifica el cambio.",
    obs: "Por motivos de seguridad, el sistema responde con el mismo mensaje tanto si el correo existe como si no existe en la base de datos, para evitar la enumeración de cuentas. El token es de un solo uso.",
  }),

  ...ucDesc(5, {
    nombre: "Consultar y editar perfil",
    actor: "Cliente registrado",
    prio: "Media",
    compl: "Baja",
    tipo: "Primario",
    obj: "Permitir al cliente visualizar y modificar sus datos personales, direcciones de envío y datos de contacto.",
    pre: "El cliente se encuentra autenticado en el sistema.",
    postE: "El sistema persiste los cambios solicitados, confirma la operación y refresca los datos mostrados en pantalla.",
    postF: "El sistema rechaza los cambios por validaciones de formato o por conflicto con datos preexistentes (por ejemplo, intento de uso de un correo electrónico ya registrado por otro usuario).",
    desc: "El cliente accede al apartado \"Mi perfil\" desde el menú de cuenta. El sistema presenta los datos actualmente registrados en modo de sólo lectura. El cliente activa el modo edición, modifica los campos deseados y confirma. El sistema valida cada campo, ejecuta la actualización contra Directus y devuelve la respuesta al cliente.",
    obs: "El cambio de correo electrónico requiere una nueva verificación por correo. El cambio de contraseña se gestiona como un caso de uso independiente con confirmación de contraseña actual.",
  }),

  ...ucDesc(6, {
    nombre: "Consultar catálogo de productos",
    actor: "Cliente registrado / no registrado",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Permitir al usuario explorar el conjunto de productos ofrecidos por Tele Import S.A. de forma paginada y ordenada.",
    pre: "Existe al menos un producto publicado y activo en el catálogo.",
    postE: "El sistema presenta el listado de productos con su imagen, nombre, marca, precio y disponibilidad de stock, paginado según la configuración por defecto.",
    postF: "Si no existen productos publicados o si la consulta al backend falla, el sistema muestra un mensaje informativo y un botón de reintento.",
    desc: "El usuario accede a la sección \"Productos\" de la plataforma. El frontend ejecuta una consulta paginada al servicio REST expuesto por Directus solicitando los productos activos. El sistema devuelve los datos junto con los metadatos de paginación. El frontend renderiza la grilla de productos respetando el diseño responsivo y permite al usuario aplicar filtros y ordenamientos.",
    obs: "El listado por defecto se ordena por relevancia, calculada en función de las visitas recientes y las ventas concretadas. Sólo se muestran productos con el flag de publicación activo.",
  }),

  ...ucDesc(7, {
    nombre: "Filtrar productos por categoría y marca",
    actor: "Cliente registrado / no registrado",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Refinar el listado de productos aplicando filtros por una o varias categorías y/o marcas, así como por rango de precios.",
    pre: "El usuario está visualizando el catálogo de productos.",
    postE: "El sistema actualiza el listado mostrando exclusivamente los productos que cumplen con todos los filtros aplicados, manteniendo la paginación.",
    postF: "Si la combinación de filtros no arroja resultados, el sistema muestra un mensaje claro y ofrece la posibilidad de limpiar los filtros activos.",
    desc: "El usuario selecciona uno o varios filtros desde el panel lateral. El frontend reconstruye la consulta agregando los parámetros correspondientes y la envía al backend. El sistema procesa la solicitud, devuelve el subconjunto correspondiente y el frontend refresca la grilla. Los filtros aplicados se mantienen visibles en forma de etiquetas que el usuario puede remover individualmente.",
    obs: "Los filtros son combinables. La URL refleja los filtros activos para que el estado del catálogo pueda compartirse mediante un enlace.",
  }),

  ...ucDesc(8, {
    nombre: "Buscar producto",
    actor: "Cliente registrado / no registrado",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Encontrar productos específicos a partir de una cadena de búsqueda ingresada por el usuario.",
    pre: "El usuario se encuentra en cualquier pantalla pública de la plataforma.",
    postE: "El sistema retorna el conjunto de productos cuyo nombre, descripción, marca o SKU coinciden parcial o totalmente con la cadena ingresada.",
    postF: "Si la búsqueda no produce resultados, el sistema muestra un mensaje sugerente y propone productos relacionados o destacados.",
    desc: "El usuario ingresa una cadena en el campo de búsqueda. A medida que escribe, el sistema sugiere resultados parciales mediante autocompletado. Al confirmar la búsqueda, el sistema ejecuta la consulta sobre el motor de búsqueda y presenta los resultados ordenados por relevancia.",
    obs: "La búsqueda es insensible a mayúsculas, minúsculas y acentos. Se almacena un historial anónimo de búsquedas para alimentar el módulo de reportes.",
  }),

  ...ucDesc(9, {
    nombre: "Visualizar detalle de producto",
    actor: "Cliente registrado / no registrado",
    prio: "Alta",
    compl: "Baja",
    tipo: "Primario",
    obj: "Mostrar al usuario la totalidad de la información asociada a un producto: imágenes, especificaciones técnicas, precio, stock disponible y marca.",
    pre: "El producto se encuentra publicado y vigente en el catálogo.",
    postE: "El sistema renderiza la ficha detallada del producto con todos sus atributos y registra una visita para el cálculo de tendencias.",
    postF: "Si el producto fue dado de baja, se encuentra despublicado o no existe, el sistema devuelve un mensaje de \"Producto no disponible\" y propone alternativas.",
    desc: "El usuario selecciona un producto desde el catálogo o desde los resultados de búsqueda. El sistema recupera el detalle completo, incluyendo galería de imágenes, descripción larga, atributos técnicos, marca, categoría, precio vigente y stock. Se ofrecen acciones contextuales: agregar al carrito, compartir y consultar productos relacionados.",
    obs: "El stock mostrado corresponde al disponible neto, calculado como stock físico menos reservas activas en carritos no expirados.",
  }),

  ...ucDesc(10, {
    nombre: "Agregar producto al carrito",
    actor: "Cliente registrado",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Permitir al cliente reservar transitoriamente unidades de un producto para una posible compra.",
    pre: "El cliente se encuentra autenticado y el producto seleccionado dispone de stock suficiente.",
    postE: "El sistema agrega el producto al carrito en la cantidad solicitada, actualiza el indicador visual del carrito y muestra una notificación de éxito.",
    postF: "El sistema rechaza la acción si la cantidad solicitada supera el stock disponible o si el producto fue despublicado durante la sesión.",
    desc: "Desde el detalle de producto o desde la grilla del catálogo, el cliente selecciona la cantidad deseada y presiona \"Agregar al carrito\". El sistema verifica disponibilidad, persiste la línea de carrito asociada al usuario y actualiza el contador del icono del carrito en la cabecera. Si el producto ya estaba en el carrito, la nueva cantidad se suma a la existente.",
    obs: "La reserva implícita asociada a un producto en carrito tiene una validez de treinta minutos; transcurrido ese plazo, el sistema libera el stock y notifica al cliente.",
  }),

  ...ucDesc(11, {
    nombre: "Modificar cantidad en el carrito",
    actor: "Cliente registrado",
    prio: "Media",
    compl: "Baja",
    tipo: "Primario",
    obj: "Permitir al cliente aumentar o disminuir la cantidad de unidades de un producto previamente agregado al carrito.",
    pre: "Existe al menos una línea de carrito asociada al cliente.",
    postE: "El sistema actualiza la cantidad y recalcula los subtotales y el total del carrito.",
    postF: "El sistema rechaza el incremento si supera el stock disponible y mantiene la cantidad previa.",
    desc: "El cliente accede a su carrito y modifica la cantidad de la línea deseada mediante los controles de incremento y decremento. El sistema valida la nueva cantidad contra el stock disponible y, si es válida, persiste el cambio y refresca los totales.",
    obs: "Si la nueva cantidad es cero, el sistema interpreta la operación como una eliminación de la línea.",
  }),

  ...ucDesc(12, {
    nombre: "Eliminar producto del carrito",
    actor: "Cliente registrado",
    prio: "Media",
    compl: "Baja",
    tipo: "Primario",
    obj: "Permitir al cliente quitar una línea completa del carrito.",
    pre: "Existe la línea de carrito que se desea eliminar.",
    postE: "El sistema elimina la línea, libera la reserva asociada y recalcula los totales.",
    postF: "Si la línea ya había sido eliminada por otra sesión, el sistema notifica al usuario y refresca el carrito.",
    desc: "El cliente selecciona la acción \"Eliminar\" sobre la línea deseada. El sistema solicita confirmación, ejecuta el borrado lógico, libera la reserva de stock y refresca la vista del carrito.",
    obs: "La eliminación es inmediata y no requiere confirmación adicional cuando se realiza desde el panel lateral del carrito.",
  }),

  ...ucDesc(13, {
    nombre: "Consultar carrito",
    actor: "Cliente registrado",
    prio: "Media",
    compl: "Baja",
    tipo: "Primario",
    obj: "Visualizar la totalidad de las líneas de carrito vigentes para el cliente, junto con sus subtotales y el total a abonar.",
    pre: "El cliente se encuentra autenticado.",
    postE: "El sistema muestra el detalle del carrito con la posibilidad de iniciar el checkout, continuar comprando o modificar el contenido.",
    postF: "Si el carrito se encuentra vacío, el sistema muestra un mensaje informativo y un acceso directo al catálogo.",
    desc: "El cliente accede al carrito desde la cabecera de la aplicación. El sistema recupera las líneas vigentes asociadas al cliente, consulta el stock actual de cada producto, recalcula precios en función de promociones vigentes y presenta el resumen.",
    obs: "El carrito persiste entre sesiones del mismo cliente mientras no expiren las reservas.",
  }),

  ...ucDesc(14, {
    nombre: "Iniciar proceso de checkout",
    actor: "Cliente registrado",
    prio: "Alta",
    compl: "Alta",
    tipo: "Primario",
    obj: "Iniciar el flujo de conversión del carrito en pedido firme, ejecutando los pasos de validación de stock, captura de datos de envío y selección del método de pago.",
    pre: "El carrito contiene al menos una línea con stock suficiente y el cliente se encuentra autenticado.",
    postE: "El sistema genera un pedido en estado \"Pendiente de pago\" y dirige al cliente a la pasarela de pago.",
    postF: "Si la verificación de stock falla, el sistema interrumpe el flujo y notifica al cliente las líneas afectadas.",
    desc: "El cliente confirma su intención de comprar desde el carrito. El sistema verifica nuevamente el stock de cada línea, persiste una reserva firme, solicita al cliente la dirección de envío y el método de envío, recalcula el total considerando costos de envío y promociones aplicables, y persiste un pedido en estado inicial. A continuación, redirige al cliente al caso de uso de pago.",
    obs: "Si durante el proceso el cliente abandona la pantalla, el pedido en estado \"Pendiente de pago\" se cancela automáticamente transcurridos treinta minutos.",
  }),

  ...ucDesc(15, {
    nombre: "Seleccionar método y dirección de envío",
    actor: "Cliente registrado",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Permitir al cliente elegir la modalidad de entrega (retiro en sucursal o envío a domicilio) y, en su caso, la dirección de envío.",
    pre: "El cliente ha iniciado el proceso de checkout.",
    postE: "El sistema persiste la elección y recalcula el costo total del pedido incluyendo el costo de envío, si correspondiera.",
    postF: "Si el cliente no posee direcciones registradas y no completa una nueva, el sistema impide avanzar al pago.",
    desc: "El sistema presenta las opciones disponibles. Si el cliente selecciona envío a domicilio, se muestra el listado de direcciones registradas o un formulario para agregar una nueva. Si elige retiro en sucursal, se presentan las sucursales habilitadas con sus horarios. La elección se asocia al pedido.",
    obs: "El costo de envío se calcula en función del código postal de destino y del peso volumétrico del pedido.",
  }),

  ...ucDesc(16, {
    nombre: "Realizar pago en línea",
    actor: "Cliente registrado",
    prio: "Alta",
    compl: "Alta",
    tipo: "Primario",
    obj: "Capturar el pago del pedido a través de la pasarela de pago externa.",
    pre: "Existe un pedido en estado \"Pendiente de pago\" asociado al cliente.",
    postE: "La pasarela autoriza el pago, notifica al sistema mediante un webhook y el pedido pasa al estado \"Pagado\".",
    postF: "La pasarela rechaza el pago; el sistema mantiene el pedido en estado \"Pendiente de pago\" y permite al cliente reintentar con otro medio de pago.",
    desc: "El sistema redirige al cliente a la URL de la pasarela de pago, transmitiendo los datos del pedido y la URL de retorno. El cliente completa los datos de pago en la interfaz de la pasarela. La pasarela procesa el pago y notifica el resultado a través de un webhook firmado. El sistema valida la firma, actualiza el estado del pedido y envía la confirmación al cliente.",
    obs: "La integración con la pasarela se realiza siguiendo el modelo Server-to-Server con verificación de firma HMAC para garantizar la integridad de los webhooks.",
  }),

  ...ucDesc(17, {
    nombre: "Confirmar pedido",
    actor: "Cliente registrado",
    prio: "Alta",
    compl: "Alta",
    tipo: "Primario",
    obj: "Convertir el pago aprobado en un pedido firme listo para ser procesado por el Gestor de Pedidos.",
    pre: "El pedido fue pagado satisfactoriamente.",
    postE: "El sistema descuenta del stock las unidades vendidas, registra el movimiento, envía un correo de confirmación al cliente y notifica al Gestor de Pedidos.",
    postF: "Si al momento de confirmar el stock resulta insuficiente, el sistema inicia el proceso de reverso del pago y notifica al cliente.",
    desc: "Recibida la confirmación del pago, el sistema ejecuta una transacción que: (a) descuenta el stock de cada línea, (b) registra el movimiento de stock asociado, (c) cambia el estado del pedido a \"Confirmado\", (d) genera el comprobante y (e) emite las notificaciones correspondientes.",
    obs: "La transacción se ejecuta de manera atómica para garantizar la consistencia del stock.",
  }),

  ...ucDesc(18, {
    nombre: "Consultar historial de pedidos",
    actor: "Cliente registrado",
    prio: "Media",
    compl: "Media",
    tipo: "Primario",
    obj: "Visualizar el listado de pedidos previos del cliente con sus respectivos estados.",
    pre: "El cliente se encuentra autenticado.",
    postE: "El sistema presenta el listado paginado de pedidos del cliente, con la posibilidad de acceder al detalle de cada uno.",
    postF: "Si el cliente nunca generó pedidos, el sistema muestra un mensaje informativo.",
    desc: "El cliente accede a la sección \"Mis pedidos\". El sistema recupera de Directus la totalidad de pedidos asociados a su usuario, ordenados por fecha descendente, y los presenta con su número, fecha, total, estado y acciones disponibles según el estado.",
    obs: "El cliente puede aplicar filtros por rango de fechas y por estado.",
  }),

  ...ucDesc(19, {
    nombre: "Consultar estado de un pedido",
    actor: "Cliente registrado",
    prio: "Media",
    compl: "Baja",
    tipo: "Primario",
    obj: "Conocer el estado actual de un pedido específico y el historial de transiciones.",
    pre: "Existe un pedido asociado al cliente.",
    postE: "El sistema presenta el detalle del pedido y la línea de tiempo con los cambios de estado.",
    postF: "Si el pedido no existe o no pertenece al usuario, el sistema responde con un mensaje de acceso denegado.",
    desc: "Desde el historial de pedidos, el cliente selecciona un pedido. El sistema recupera el detalle completo, las líneas de pedido, el método de envío, los datos de pago y la línea de tiempo de transiciones de estado.",
    obs: "La línea de tiempo incluye la fecha y hora de cada transición y el actor que la motivó.",
  }),

  ...ucDesc(20, {
    nombre: "Cancelar pedido (cliente)",
    actor: "Cliente registrado",
    prio: "Media",
    compl: "Media",
    tipo: "Primario",
    obj: "Permitir al cliente cancelar un pedido propio que aún no haya sido despachado.",
    pre: "Existe un pedido en estado \"Confirmado\" o anterior, asociado al cliente.",
    postE: "El sistema cancela el pedido, reintegra el stock, inicia la solicitud de reembolso a la pasarela si correspondiere y notifica al cliente y al Gestor de Pedidos.",
    postF: "Si el pedido ya se encuentra en estado \"En preparación\" o posterior, el sistema deniega la cancelación y orienta al cliente a contactar al Gestor de Pedidos.",
    desc: "El cliente accede al detalle del pedido y presiona \"Cancelar pedido\". El sistema verifica que el estado lo permita, solicita confirmación explícita y, una vez confirmada, ejecuta la transición de estado, reintegra el stock e inicia el reembolso.",
    obs: "El reembolso queda sujeto al tiempo de procesamiento de la pasarela de pago.",
  }),

  ...ucDesc(21, {
    nombre: "Alta de producto",
    actor: "Gestor de Catálogo / Administrador",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Incorporar un nuevo producto al catálogo de Tele Import S.A.",
    pre: "El usuario posee rol con permiso de gestión de catálogo y existen al menos una categoría y una marca activas.",
    postE: "El sistema registra el producto y lo deja disponible en el catálogo según el flag de publicación.",
    postF: "El sistema rechaza el alta por validaciones de unicidad de SKU, datos obligatorios faltantes o formato de imagen inválido.",
    desc: "El usuario accede al panel administrativo y selecciona \"Nuevo producto\". El sistema presenta un formulario con los campos: SKU, nombre, descripción, categoría, marca, precio, stock inicial, imágenes y atributos técnicos. El usuario completa los datos, carga las imágenes y confirma. El sistema valida, persiste el producto y opcionalmente registra el movimiento inicial de stock.",
    obs: "El SKU se valida como único en toda la base de datos. Las imágenes se almacenan en el servicio de archivos asociado a Directus.",
  }),

  ...ucDesc(22, {
    nombre: "Modificar producto",
    actor: "Gestor de Catálogo / Administrador",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Actualizar los datos de un producto existente.",
    pre: "El producto existe y el usuario posee permiso de gestión de catálogo.",
    postE: "El sistema persiste los cambios y registra en auditoría qué usuario realizó la modificación, qué campos se modificaron y el momento del cambio.",
    postF: "El sistema rechaza la modificación por validaciones de dominio o por conflicto de concurrencia.",
    desc: "El usuario accede al detalle del producto y entra en modo edición. Modifica los campos deseados y confirma. El sistema valida y persiste los cambios.",
    obs: "El precio cuenta con histórico: cada cambio genera un registro en la tabla de variaciones de precio.",
  }),

  ...ucDesc(23, {
    nombre: "Baja de producto",
    actor: "Gestor de Catálogo / Administrador",
    prio: "Media",
    compl: "Baja",
    tipo: "Primario",
    obj: "Retirar un producto del catálogo, manteniendo la trazabilidad histórica de los pedidos en los que fue vendido.",
    pre: "El producto existe en el sistema.",
    postE: "El sistema realiza una baja lógica del producto, lo despublica del catálogo y conserva su existencia en la base de datos para los registros históricos.",
    postF: "El sistema impide la baja si el producto se encuentra en carritos activos o si existen pedidos pendientes de despacho que lo incluyan.",
    desc: "El usuario selecciona un producto, presiona \"Dar de baja\" y confirma. El sistema realiza las validaciones previas y, si son satisfactorias, ejecuta el borrado lógico.",
    obs: "La baja es reversible mediante una operación de reactivación.",
  }),

  ...ucDesc(24, {
    nombre: "Gestionar categorías",
    actor: "Gestor de Catálogo / Administrador",
    prio: "Media",
    compl: "Baja",
    tipo: "Soporte",
    obj: "Administrar el árbol de categorías que organiza el catálogo.",
    pre: "El usuario posee permiso de gestión de catálogo.",
    postE: "El sistema persiste el alta, modificación o baja de la categoría afectada.",
    postF: "El sistema impide la baja de una categoría que posea productos asociados activos.",
    desc: "El usuario accede al panel \"Categorías\" donde visualiza la estructura jerárquica. Puede crear una nueva categoría, modificar su nombre y descripción o eliminarla. Cada categoría puede tener una categoría padre, permitiendo construir un árbol de profundidad arbitraria.",
    obs: "Las categorías raíz se utilizan para la navegación principal del catálogo.",
  }),

  ...ucDesc(25, {
    nombre: "Gestionar marcas",
    actor: "Gestor de Catálogo / Administrador",
    prio: "Media",
    compl: "Baja",
    tipo: "Soporte",
    obj: "Administrar las marcas disponibles para asociar a los productos del catálogo.",
    pre: "El usuario posee permiso de gestión de catálogo.",
    postE: "El sistema persiste el alta, modificación o baja de la marca afectada.",
    postF: "El sistema impide la baja de una marca que posea productos asociados activos.",
    desc: "El usuario accede al panel \"Marcas\". El sistema presenta el listado con su logo, nombre y cantidad de productos asociados. El usuario puede crear, editar o eliminar marcas.",
    obs: "El logo de la marca se almacena en el servicio de archivos.",
  }),

  ...ucDesc(26, {
    nombre: "Registrar movimiento de stock",
    actor: "Gestor de Stock / Administrador",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Persistir un ingreso, egreso o ajuste de stock para un producto determinado, manteniendo la trazabilidad del inventario.",
    pre: "El producto existe en el sistema y el usuario posee permiso de gestión de stock.",
    postE: "El sistema registra el movimiento, recalcula el stock actual del producto y deja constancia del usuario y la fecha y hora del registro.",
    postF: "El sistema rechaza el movimiento si dejara el stock en valor negativo o si los datos obligatorios faltan.",
    desc: "El usuario selecciona el producto y la naturaleza del movimiento (ingreso, egreso o ajuste), indica la cantidad, motivo y comprobante asociado y confirma. El sistema valida que el resultado neto no sea negativo, persiste el movimiento y actualiza el stock vigente.",
    obs: "Los movimientos generados por ventas son automáticos y se vinculan al pedido que los originó.",
  }),

  ...ucDesc(27, {
    nombre: "Consultar movimientos de stock",
    actor: "Gestor de Stock / Administrador",
    prio: "Media",
    compl: "Baja",
    tipo: "Soporte",
    obj: "Visualizar el histórico de movimientos de stock filtrando por producto, tipo de movimiento y rango de fechas.",
    pre: "El usuario posee permiso de gestión de stock.",
    postE: "El sistema presenta el listado paginado de movimientos coincidentes con los filtros.",
    postF: "Si los filtros no arrojan coincidencias, el sistema muestra un mensaje informativo.",
    desc: "El usuario accede al panel \"Movimientos de stock\". Define los filtros deseados y confirma. El sistema consulta a Directus y devuelve el listado, exportable a formato CSV.",
    obs: "El detalle de cada movimiento muestra el saldo anterior y el saldo resultante.",
  }),

  ...ucDesc(28, {
    nombre: "Procesar pedido (cambio de estado)",
    actor: "Gestor de Pedidos / Administrador",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Avanzar manualmente un pedido a lo largo de los distintos estados de su ciclo de vida operativo.",
    pre: "Existe un pedido en estado \"Confirmado\" o posterior y el usuario posee permiso de gestión de pedidos.",
    postE: "El sistema persiste la nueva transición de estado, registra el actor y notifica al cliente por correo electrónico.",
    postF: "El sistema rechaza la transición si no resulta válida según la máquina de estados definida para el pedido.",
    desc: "El usuario accede al detalle del pedido y selecciona la próxima transición disponible (\"En preparación\", \"En distribución\", \"Entregado\"). El sistema valida la transición, persiste el cambio y emite la notificación correspondiente.",
    obs: "Las transiciones permitidas se encuentran formalmente definidas en el diagrama de estados del pedido.",
  }),

  ...ucDesc(29, {
    nombre: "Gestionar usuarios del sistema",
    actor: "Administrador",
    prio: "Alta",
    compl: "Media",
    tipo: "Soporte",
    obj: "Administrar las cuentas de los usuarios internos (alta, modificación, baja y bloqueo).",
    pre: "El usuario posee rol de Administrador.",
    postE: "El sistema persiste los cambios y emite las notificaciones correspondientes a los usuarios afectados.",
    postF: "El sistema rechaza la creación si el correo ya está en uso o si los datos obligatorios faltan.",
    desc: "El administrador accede al panel \"Usuarios\". Puede crear nuevos usuarios internos asignándoles un rol inicial, modificar sus datos, bloquearlos o eliminarlos lógicamente. Cada operación se registra en la auditoría.",
    obs: "Los clientes finales se autoregistran mediante el caso de uso CU-01 y no se administran desde este panel.",
  }),

  ...ucDesc(30, {
    nombre: "Asignar roles y permisos",
    actor: "Administrador",
    prio: "Alta",
    compl: "Media",
    tipo: "Soporte",
    obj: "Definir el conjunto de permisos asociados a cada rol y asignar roles a los usuarios.",
    pre: "El usuario posee rol de Administrador.",
    postE: "El sistema persiste la matriz de permisos y la aplica inmediatamente a las sesiones futuras de los usuarios afectados.",
    postF: "El sistema rechaza la modificación si dejara al sistema sin al menos un usuario con rol Administrador.",
    desc: "El administrador accede al panel \"Roles\". Selecciona un rol existente o crea uno nuevo y define la matriz de permisos por recurso y operación. Asigna el rol a los usuarios deseados.",
    obs: "Los permisos se evalúan tanto en el frontend (para condicionar la UI) como en Directus (para garantizar el cumplimiento a nivel de API).",
  }),

  ...ucDesc(31, {
    nombre: "Consultar dashboard de reportes",
    actor: "Administrador",
    prio: "Media",
    compl: "Media",
    tipo: "Primario",
    obj: "Proporcionar al administrador una visión consolidada del estado del negocio mediante indicadores clave.",
    pre: "Existen datos transaccionales suficientes en la base de datos.",
    postE: "El sistema presenta el dashboard con los indicadores calculados al momento de la consulta.",
    postF: "Si no hay datos suficientes para algún indicador, el sistema muestra el indicador con valor cero y la leyenda \"Sin datos\".",
    desc: "El administrador accede al dashboard. El sistema ejecuta las consultas analíticas predefinidas: ventas del período, ticket promedio, pedidos por estado, productos más vendidos, productos con stock crítico y nuevos clientes. Los resultados se presentan mediante tarjetas y gráficos.",
    obs: "El dashboard utiliza caché de cinco minutos para optimizar el costo de las consultas analíticas.",
  }),

  ...ucDesc(32, {
    nombre: "Generar reporte de ventas",
    actor: "Administrador",
    prio: "Alta",
    compl: "Alta",
    tipo: "Primario",
    obj: "Obtener un análisis detallado de las ventas concretadas en un intervalo determinado, con apertura por categoría, marca y producto.",
    pre: "Existen pedidos en estado igual o posterior a \"Confirmado\" dentro del período solicitado.",
    postE: "El sistema genera el reporte solicitado y permite exportarlo a formato PDF o CSV.",
    postF: "Si no existen ventas en el período, el sistema devuelve un reporte vacío con una leyenda explicativa.",
    desc: "El administrador selecciona el rango de fechas, la apertura deseada y el formato de salida. El sistema ejecuta la consulta, agrega los datos, presenta el reporte en pantalla y habilita la exportación.",
    obs: "El reporte distingue entre venta bruta y venta neta de devoluciones.",
  }),

  ...ucDesc(33, {
    nombre: "Generar reporte de stock",
    actor: "Administrador / Gestor de Stock",
    prio: "Alta",
    compl: "Media",
    tipo: "Primario",
    obj: "Obtener el estado actual y la evolución del stock por producto, marca y categoría.",
    pre: "Existen productos cargados en el sistema.",
    postE: "El sistema genera el reporte y permite exportarlo.",
    postF: "Si los filtros no arrojan coincidencias, el sistema devuelve un reporte vacío.",
    desc: "El usuario define los filtros (rango de fechas, marca, categoría, umbral de stock crítico) y confirma. El sistema procesa la solicitud y devuelve el reporte con los datos solicitados.",
    obs: "El reporte resalta los productos con stock por debajo del umbral crítico configurado.",
  }),

  ...ucDesc(34, {
    nombre: "Consultar auditoría del sistema",
    actor: "Administrador",
    prio: "Media",
    compl: "Media",
    tipo: "Soporte",
    obj: "Consultar el registro de acciones realizadas sobre las entidades sensibles del sistema (productos, stock, usuarios, roles, pedidos).",
    pre: "El usuario posee rol de Administrador.",
    postE: "El sistema presenta el listado paginado de eventos de auditoría coincidentes con los filtros aplicados.",
    postF: "Si no existen eventos coincidentes, el sistema lo informa.",
    desc: "El administrador accede al panel \"Auditoría\". Define filtros por entidad, operación, usuario y rango de fechas. El sistema devuelve el listado con la información detallada: actor, fecha, entidad afectada, operación y valores anterior y posterior.",
    obs: "Los registros de auditoría se generan automáticamente por el backend y no pueden ser modificados manualmente.",
  }),
];

/* ------------------------------------------------------------------ */
/* 6.4 - Diagrama general de casos de uso                              */
/* ------------------------------------------------------------------ */
const cuDiagram = [
  H2("6.4 Diagrama general de casos de uso"),
  P("El diagrama general de casos de uso ofrece una vista panorámica de las interacciones entre los actores identificados en el apartado 6.1 y los casos de uso descritos en los apartados 6.2 y 6.3. Por razones de legibilidad se presenta agrupado en cuatro subdiagramas funcionales: gestión de identidad y cuenta, gestión del proceso de compra, gestión administrativa del catálogo y stock, y gestión administrativa de pedidos y reportes."),
  H3("Subdiagrama A: Gestión de identidad y cuenta"),
  P("Agrupa los casos de uso vinculados a la creación, autenticación y mantenimiento de las cuentas de usuario. Participan el Cliente no registrado, el Cliente registrado y, transversalmente, todos los actores humanos del sistema."),
  BULL("CU-01 Registrar cliente"),
  BULL("CU-02 Iniciar sesión"),
  BULL("CU-03 Cerrar sesión"),
  BULL("CU-04 Recuperar contraseña"),
  BULL("CU-05 Consultar y editar perfil"),
  H3("Subdiagrama B: Proceso de compra"),
  P("Agrupa los casos de uso del flujo principal de la plataforma. El actor protagonista es el Cliente registrado, con la participación de la Pasarela de pago como actor secundario."),
  BULL("CU-06 a CU-09 — Exploración y consulta del catálogo"),
  BULL("CU-10 a CU-13 — Gestión del carrito"),
  BULL("CU-14 a CU-17 — Checkout, pago y confirmación"),
  BULL("CU-18 a CU-20 — Consulta y cancelación de pedidos"),
  H3("Subdiagrama C: Gestión de catálogo y stock"),
  P("Agrupa los casos de uso administrativos relacionados con el mantenimiento del catálogo y del inventario. Participan el Gestor de Catálogo, el Gestor de Stock y el Administrador."),
  BULL("CU-21 a CU-25 — Gestión de productos, categorías y marcas"),
  BULL("CU-26 y CU-27 — Gestión y consulta de movimientos de stock"),
  H3("Subdiagrama D: Gestión de pedidos, usuarios y reportes"),
  P("Agrupa los casos de uso correspondientes a la operación administrativa avanzada. Participan el Gestor de Pedidos y el Administrador."),
  BULL("CU-28 — Procesamiento de pedidos"),
  BULL("CU-29 y CU-30 — Gestión de usuarios y permisos"),
  BULL("CU-31 a CU-33 — Dashboard y reportes"),
  BULL("CU-34 — Auditoría"),
  P("La representación gráfica del diagrama se realizará utilizando la notación UML estándar mediante la herramienta StarUML, mostrando cada actor a la izquierda o derecha del rectángulo del sistema y cada caso de uso como una elipse interior, conectados mediante asociaciones simples. Las relaciones de inclusión (<<include>>) y de extensión (<<extend>>) se utilizan en los casos detallados a continuación:"),
  BULL("CU-14 <<include>> CU-15 — el checkout incluye obligatoriamente la selección de método y dirección de envío."),
  BULL("CU-14 <<include>> CU-16 — el checkout incluye obligatoriamente la realización del pago."),
  BULL("CU-17 <<include>> CU-26 — la confirmación del pedido incluye el registro automático del movimiento de stock egresivo."),
  BULL("CU-04 <<extend>> CU-02 — la recuperación de contraseña extiende el flujo de inicio de sesión cuando el usuario no recuerda sus credenciales."),
  BULL("CU-20 <<include>> CU-26 — la cancelación de pedido incluye el reintegro automático de stock."),
];

/* ------------------------------------------------------------------ */
/* 6.5 - Diagrama de clases                                            */
/* ------------------------------------------------------------------ */
const claseTable = (header, rows) => dataTable(header, rows, [2600, 2200, 4560]);

const clases = [
  H2("6.5 Diagrama de clases"),
  P("El diagrama de clases representa el modelo de dominio del sistema, definiendo las entidades de negocio, sus atributos, sus operaciones y las relaciones que entre ellas existen. Para Tele Import S.A. se han identificado las siguientes clases principales, cuyos atributos y operaciones se describen a continuación. La nomenclatura utilizada respeta las convenciones de UML 2.5: visibilidad pública (+), privada (-) y protegida (#), tipos de datos según notación TypeScript y multiplicidades expresadas con los símbolos 0, 1, * y rangos."),

  H3("Clase Usuario"),
  P("Representa a cualquier individuo capaz de autenticarse en el sistema. Es la clase base de la cual heredan Cliente y UsuarioInterno."),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string (UUID)", "Identificador único del usuario."],
    ["- email", "string", "Correo electrónico, único."],
    ["- password_hash", "string", "Hash de la contraseña con salt."],
    ["- nombre", "string", "Nombre completo."],
    ["- telefono", "string", "Teléfono de contacto."],
    ["- fecha_creacion", "Date", "Fecha de alta de la cuenta."],
    ["- fecha_ultimo_acceso", "Date", "Fecha del último inicio de sesión."],
    ["- estado", "EstadoUsuario", "Activo / Bloqueado / Eliminado."],
    ["- rol", "Rol", "Asociación con la clase Rol."],
  ]),
  P("Operaciones: +autenticar(password): boolean, +cambiarContraseña(nueva): void, +bloquear(): void, +desbloquear(): void."),

  H3("Clase Cliente (hereda de Usuario)"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- documento", "string", "Documento de identidad."],
    ["- direcciones", "Direccion[]", "Direcciones de envío registradas."],
    ["- carrito", "Carrito", "Carrito activo (uno y solo uno por cliente)."],
    ["- pedidos", "Pedido[]", "Pedidos históricos."],
  ]),

  H3("Clase UsuarioInterno (hereda de Usuario)"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- legajo", "string", "Identificador interno del empleado."],
    ["- area", "string", "Área funcional dentro de la organización."],
  ]),

  H3("Clase Rol"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string", "Identificador del rol."],
    ["- nombre", "string", "Nombre del rol (Administrador, Gestor de Catálogo, etc.)."],
    ["- permisos", "Permiso[]", "Colección de permisos asociados."],
  ]),
  P("Operaciones: +tienePermiso(recurso, operacion): boolean."),

  H3("Clase Producto"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string", "Identificador único."],
    ["- sku", "string", "Código interno único."],
    ["- nombre", "string", "Nombre comercial."],
    ["- descripcion", "string", "Descripción extensa."],
    ["- precio", "number", "Precio vigente."],
    ["- stock_actual", "number", "Cantidad en stock."],
    ["- stock_minimo", "number", "Umbral crítico."],
    ["- imagenes", "string[]", "URLs de imágenes."],
    ["- publicado", "boolean", "Flag de publicación."],
    ["- categoria", "Categoria", "Categoría asociada."],
    ["- marca", "Marca", "Marca asociada."],
  ]),
  P("Operaciones: +publicar(): void, +despublicar(): void, +ajustarPrecio(nuevo): void, +verificarStock(cantidad): boolean."),

  H3("Clase Categoria"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string", "Identificador."],
    ["- nombre", "string", "Nombre de la categoría."],
    ["- descripcion", "string", "Descripción opcional."],
    ["- categoria_padre", "Categoria", "Referencia a la categoría padre (opcional)."],
    ["- productos", "Producto[]", "Productos de la categoría."],
  ]),

  H3("Clase Marca"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string", "Identificador."],
    ["- nombre", "string", "Nombre de la marca."],
    ["- logo", "string", "URL del logotipo."],
    ["- productos", "Producto[]", "Productos asociados."],
  ]),

  H3("Clase Carrito"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string", "Identificador."],
    ["- cliente", "Cliente", "Cliente propietario."],
    ["- lineas", "LineaCarrito[]", "Conjunto de líneas."],
    ["- fecha_actualizacion", "Date", "Última modificación."],
  ]),
  P("Operaciones: +agregarLinea(producto, cantidad): void, +eliminarLinea(producto): void, +modificarCantidad(producto, cantidad): void, +calcularTotal(): number, +vaciar(): void."),

  H3("Clase LineaCarrito"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- producto", "Producto", "Producto referenciado."],
    ["- cantidad", "number", "Cantidad solicitada."],
    ["- precio_unitario", "number", "Precio capturado al momento de agregarlo."],
  ]),

  H3("Clase Pedido"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string", "Identificador."],
    ["- numero", "string", "Número visible para el cliente."],
    ["- cliente", "Cliente", "Cliente propietario."],
    ["- fecha", "Date", "Fecha de creación."],
    ["- estado", "EstadoPedido", "Estado actual."],
    ["- lineas", "LineaPedido[]", "Líneas del pedido."],
    ["- direccion_envio", "Direccion", "Dirección elegida."],
    ["- metodo_envio", "MetodoEnvio", "Modalidad de entrega."],
    ["- total", "number", "Importe total."],
    ["- pago", "Pago", "Datos del pago asociado."],
    ["- historial_estado", "TransicionEstado[]", "Auditoría de transiciones."],
  ]),
  P("Operaciones: +confirmar(): void, +avanzarEstado(nuevo): void, +cancelar(motivo): void, +calcularTotal(): number."),

  H3("Clase LineaPedido"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- producto", "Producto", "Producto vendido."],
    ["- cantidad", "number", "Unidades vendidas."],
    ["- precio_unitario", "number", "Precio al momento de la venta."],
    ["- subtotal", "number", "Calculado como cantidad x precio_unitario."],
  ]),

  H3("Clase Pago"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string", "Identificador."],
    ["- id_pasarela", "string", "Identificador externo provisto por la pasarela."],
    ["- monto", "number", "Importe."],
    ["- estado", "EstadoPago", "Pendiente / Aprobado / Rechazado / Reembolsado."],
    ["- fecha", "Date", "Fecha y hora del último cambio de estado."],
  ]),

  H3("Clase Stock y MovimientoStock"),
  P("La clase Stock no es persistente como tal: el stock vigente de cada producto se calcula en función de los MovimientoStock históricos asociados. Esta decisión de diseño garantiza la trazabilidad completa de los cambios de inventario."),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string", "Identificador del movimiento."],
    ["- producto", "Producto", "Producto afectado."],
    ["- tipo", "TipoMovimiento", "Ingreso / Egreso / Ajuste."],
    ["- cantidad", "number", "Cantidad movida."],
    ["- motivo", "string", "Motivo del movimiento."],
    ["- pedido", "Pedido", "Pedido asociado (si aplica)."],
    ["- usuario", "Usuario", "Usuario que registra el movimiento."],
    ["- fecha", "Date", "Fecha y hora del movimiento."],
    ["- saldo_resultante", "number", "Saldo de stock posterior al movimiento."],
  ]),

  H3("Clase Reporte"),
  claseTable(["Atributo", "Tipo", "Descripción"], [
    ["- id", "string", "Identificador."],
    ["- tipo", "TipoReporte", "Ventas / Stock / Tendencias."],
    ["- parametros", "Map<string, any>", "Filtros aplicados."],
    ["- generado_por", "Usuario", "Usuario que solicitó el reporte."],
    ["- fecha", "Date", "Momento de generación."],
    ["- resultado", "any", "Estructura tabular del resultado."],
  ]),
  P("Operaciones: +generar(): Resultado, +exportarPDF(): Archivo, +exportarCSV(): Archivo."),

  H3("Relaciones principales del diagrama"),
  BULL("Usuario <- Cliente y Usuario <- UsuarioInterno: relación de herencia (generalización)."),
  BULL("Usuario — Rol: asociación con multiplicidad 1..*. Un usuario posee exactamente un rol; un rol puede asociarse a muchos usuarios."),
  BULL("Cliente — Carrito: composición 1..1. Cada cliente tiene un único carrito y el ciclo de vida del carrito depende del cliente."),
  BULL("Carrito — LineaCarrito: composición 1..*. Una línea no tiene sentido fuera de su carrito."),
  BULL("LineaCarrito — Producto: asociación 0..*..1. Cada línea referencia un producto, y un producto puede aparecer en muchas líneas."),
  BULL("Cliente — Pedido: asociación 1..*. Un pedido pertenece a un cliente; un cliente puede tener muchos pedidos."),
  BULL("Pedido — LineaPedido: composición 1..*."),
  BULL("Pedido — Pago: asociación 1..1. Cada pedido se vincula a un pago."),
  BULL("Producto — Categoria: asociación *..1."),
  BULL("Producto — Marca: asociación *..1."),
  BULL("Categoria — Categoria: auto-asociación reflexiva *..0..1 (jerarquía)."),
  BULL("Producto — MovimientoStock: asociación 1..*."),
  BULL("Pedido — MovimientoStock: asociación 1..0..* (un pedido genera uno o más movimientos automáticos al confirmarse)."),
];

/* ------------------------------------------------------------------ */
/* 6.6 - Diagrama de despliegue                                        */
/* ------------------------------------------------------------------ */
const despliegue = [
  H2("6.6 Diagrama de despliegue"),
  P("El diagrama de despliegue describe la arquitectura física sobre la cual se ejecutará la plataforma. La solución se concibe como una aplicación web de tres capas desplegada sobre infraestructura cloud, con separación estricta entre el frontend, el backend y la capa de persistencia. A continuación se describen los nodos involucrados y los componentes que sobre ellos se despliegan."),
  H3("Nodo 1: Dispositivo del cliente"),
  P("Cualquier dispositivo con un navegador web compatible con los estándares HTML5, CSS3 y ECMAScript 2020 o superior. Sobre este nodo se ejecuta el bundle JavaScript del frontend, que constituye una Single Page Application desarrollada en React + TypeScript. La comunicación con el backend se realiza mediante HTTPS sobre el puerto 443."),
  H3("Nodo 2: CDN / Static hosting (Vercel, Netlify o equivalente)"),
  P("Servidor de archivos estáticos que distribuye el bundle del frontend a los clientes a través de una red de distribución de contenido. Su misión es minimizar la latencia percibida y absorber picos de tráfico sin impactar al backend."),
  H3("Nodo 3: Servidor de aplicación Directus"),
  P("Servidor Node.js sobre el cual se ejecuta la instancia de Directus. Expone una API REST y otra GraphQL para todas las operaciones de negocio. Implementa autenticación basada en tokens JWT, control de permisos por rol, hooks personalizados para la lógica específica del dominio y la generación de comprobantes. Se despliega típicamente como un contenedor Docker orquestado por Kubernetes o por un servicio gestionado equivalente (Render, Railway o AWS ECS)."),
  H3("Nodo 4: Base de datos relacional"),
  P("Servidor PostgreSQL administrado (por ejemplo, AWS RDS, Supabase o un servicio cloud equivalente) que aloja la totalidad de las tablas operativas. La conexión Directus–base de datos se realiza mediante TCP seguro sobre el puerto 5432 a través de una red privada virtual. Para entornos productivos se prevé replicación de lectura para los reportes y respaldos automáticos diarios."),
  H3("Nodo 5: Servicio de almacenamiento de archivos"),
  P("Almacenamiento de objetos (AWS S3, Cloudflare R2 o equivalente) donde se persisten las imágenes de productos, los logos de marcas y los comprobantes generados. Directus actúa como intermediario para la firma de URLs de subida y descarga."),
  H3("Nodo 6: Pasarela de pago"),
  P("Servicio externo (Mercado Pago u otro proveedor) que captura y procesa los pagos. Se integra con Directus mediante una API REST saliente y mediante webhooks entrantes firmados."),
  H3("Nodo 7: Servicio SMTP"),
  P("Proveedor de correo transaccional (Amazon SES, SendGrid o equivalente) responsable de la entrega de las notificaciones generadas por Directus."),
  H3("Componentes desplegados y artefactos"),
  dataTable(["Nodo", "Componente / artefacto", "Tecnología"], [
    ["Dispositivo del cliente", "Bundle SPA, Service Worker", "React 18 + TypeScript, Vite"],
    ["CDN", "Assets estáticos (HTML, JS, CSS, imágenes)", "Edge Network"],
    ["Servidor de aplicación", "Directus Core, hooks personalizados, lógica de dominio", "Node.js 20, Directus 10"],
    ["Base de datos", "Esquema operativo, índices, vistas", "PostgreSQL 15"],
    ["Storage", "Buckets de assets, comprobantes", "S3 / R2"],
    ["Pasarela", "Endpoints de checkout y webhooks", "API REST externa"],
    ["SMTP", "Plantillas de correo, colas de envío", "API REST externa"],
  ], [2400, 4360, 2600]),
  H3("Protocolos y puertos"),
  BULL("Cliente — CDN: HTTPS / 443."),
  BULL("Cliente — Directus: HTTPS / 443."),
  BULL("Directus — Base de datos: TCP cifrado / 5432, dentro de la VPC privada."),
  BULL("Directus — Storage: HTTPS / 443 con firma de URLs."),
  BULL("Directus — Pasarela de pago: HTTPS / 443 con firma HMAC."),
  BULL("Directus — SMTP: HTTPS / 443."),
];

/* ------------------------------------------------------------------ */
/* 6.7 - Diagramas de estados                                          */
/* ------------------------------------------------------------------ */
const estados = [
  H2("6.7 Diagramas de estados"),
  P("Los diagramas de estados modelan el ciclo de vida de las entidades cuyo comportamiento dinámico es relevante para el sistema. Para Tele Import S.A. se han identificado tres entidades con ciclo de vida no trivial: Pedido, Producto y Usuario. A continuación se describen formalmente sus estados, transiciones y eventos disparadores."),

  H3("6.7.1 Diagrama de estados de Pedido"),
  P("El pedido constituye la entidad transaccional central del sistema. Su ciclo de vida abarca desde la confirmación del checkout hasta la entrega o cancelación final."),
  dataTable(["Estado", "Descripción"], [
    ["Pendiente de pago", "Estado inicial. El pedido fue generado pero el pago aún no fue aprobado."],
    ["Pagado", "El pago fue aprobado por la pasarela y notificado al sistema."],
    ["Confirmado", "El stock fue descontado y el pedido se encuentra listo para ser preparado."],
    ["En preparación", "El Gestor de Pedidos comenzó la preparación física."],
    ["En distribución", "El pedido fue despachado y se encuentra en tránsito."],
    ["Entregado", "El cliente recibió el pedido."],
    ["Cancelado", "El pedido fue anulado antes de su entrega; eventualmente se reintegra el stock y se reembolsa el pago."],
    ["Devuelto", "El cliente devolvió el pedido tras la entrega."],
  ], [2400, 6960]),
  P("Transiciones principales:"),
  BULL("Pendiente de pago -> Pagado: evento \"PagoAprobado\" disparado por el webhook de la pasarela."),
  BULL("Pendiente de pago -> Cancelado: evento \"TiempoExpirado\" o \"CancelacionUsuario\"."),
  BULL("Pagado -> Confirmado: evento automático \"ConfirmacionAutomatica\" que ejecuta CU-17 (descuento de stock)."),
  BULL("Confirmado -> En preparación: evento \"InicioPreparacion\" disparado por el Gestor de Pedidos."),
  BULL("En preparación -> En distribución: evento \"Despacho\"."),
  BULL("En distribución -> Entregado: evento \"ConfirmacionEntrega\"."),
  BULL("Confirmado / En preparación -> Cancelado: evento \"CancelacionAdministrativa\"."),
  BULL("Entregado -> Devuelto: evento \"SolicitudDevolucion\" dentro del plazo legal."),

  H3("6.7.2 Diagrama de estados de Producto"),
  dataTable(["Estado", "Descripción"], [
    ["Borrador", "El producto fue creado pero aún no está publicado."],
    ["Publicado disponible", "Visible en el catálogo y con stock positivo."],
    ["Publicado sin stock", "Visible en el catálogo pero con stock cero; no puede agregarse al carrito."],
    ["Despublicado", "Oculto del catálogo público; visible sólo para usuarios internos."],
    ["Dado de baja", "Eliminado lógicamente. Conserva referencia desde pedidos históricos."],
  ], [2700, 6660]),
  BULL("Borrador -> Publicado disponible: evento \"Publicar\" cuando el producto tiene stock > 0."),
  BULL("Publicado disponible -> Publicado sin stock: evento \"StockAgotado\"."),
  BULL("Publicado sin stock -> Publicado disponible: evento \"IngresoStock\"."),
  BULL("Cualquier estado de publicación -> Despublicado: evento \"Despublicar\"."),
  BULL("Despublicado -> Dado de baja: evento \"Eliminar\" si no hay referencias activas."),

  H3("6.7.3 Diagrama de estados de Usuario"),
  dataTable(["Estado", "Descripción"], [
    ["Pendiente de verificación", "La cuenta fue creada pero el correo aún no fue verificado."],
    ["Activo", "La cuenta está habilitada para operar."],
    ["Bloqueado", "La cuenta fue bloqueada por exceso de intentos fallidos o por decisión del administrador."],
    ["Eliminado", "Baja lógica de la cuenta."],
  ], [2700, 6660]),
  BULL("Pendiente de verificación -> Activo: evento \"VerificacionEmail\"."),
  BULL("Activo -> Bloqueado: evento \"ExcesoIntentosFallidos\" o \"BloqueoAdministrativo\"."),
  BULL("Bloqueado -> Activo: evento \"Desbloqueo\" disparado por el Administrador o por expiración del bloqueo automático."),
  BULL("Cualquier estado -> Eliminado: evento \"Baja\"."),

  H3("6.7.4 Diagrama de estados de Carrito"),
  dataTable(["Estado", "Descripción"], [
    ["Vacío", "Estado inicial. El carrito no contiene líneas."],
    ["Con productos", "El carrito contiene una o más líneas vigentes."],
    ["En checkout", "El cliente inició el proceso de conversión a pedido."],
    ["Convertido", "El carrito se convirtió en un pedido confirmado."],
    ["Expirado", "El carrito superó el tiempo máximo de inactividad y las reservas se liberaron."],
  ], [2400, 6960]),
  BULL("Vacío -> Con productos: evento \"AgregarLinea\"."),
  BULL("Con productos -> Vacío: evento \"VaciarCarrito\" o \"EliminarUltimaLinea\"."),
  BULL("Con productos -> En checkout: evento \"IniciarCheckout\"."),
  BULL("En checkout -> Convertido: evento \"PagoAprobado\"."),
  BULL("En checkout -> Con productos: evento \"CancelarCheckout\"."),
  BULL("Con productos -> Expirado: evento \"TiempoInactividad\"."),
];

/* ------------------------------------------------------------------ */
/* 6.8 - ER                                                            */
/* ------------------------------------------------------------------ */
const er = [
  H2("6.8 Modelado de datos"),
  H3("6.8.1 Diagrama Entidad-Relación"),
  P("El modelo entidad-relación constituye la representación conceptual de los datos que el sistema debe persistir y de las relaciones que entre ellos existen. Esta sección presenta el conjunto de entidades fuertes, entidades débiles y relaciones identificadas para Tele Import S.A., junto con sus respectivos atributos clave y cardinalidades."),
  H3("Entidades identificadas"),
  dataTable(["Entidad", "Naturaleza", "Descripción"], [
    ["USUARIO", "Fuerte", "Persona capaz de autenticarse en el sistema. Contiene los atributos comunes a Cliente y Usuario interno."],
    ["ROL", "Fuerte", "Conjunto de permisos asignable a uno o varios usuarios."],
    ["PERMISO", "Débil", "Combinación de recurso y operación que un rol puede ejercer."],
    ["DIRECCION", "Débil", "Dirección de envío vinculada a un cliente."],
    ["PRODUCTO", "Fuerte", "Insumo informático ofrecido por la empresa."],
    ["CATEGORIA", "Fuerte", "Categoría a la cual pertenece un producto."],
    ["MARCA", "Fuerte", "Marca asociada a un producto."],
    ["CARRITO", "Fuerte", "Carrito de compras de un cliente."],
    ["LINEA_CARRITO", "Débil", "Línea individual dentro de un carrito."],
    ["PEDIDO", "Fuerte", "Pedido firme generado por un cliente."],
    ["LINEA_PEDIDO", "Débil", "Línea individual dentro de un pedido."],
    ["PAGO", "Fuerte", "Pago asociado a un pedido."],
    ["MOVIMIENTO_STOCK", "Fuerte", "Registro histórico de cambios de inventario."],
    ["AUDITORIA", "Fuerte", "Registro de acciones sensibles sobre las entidades del sistema."],
  ], [2300, 1400, 5660]),

  H3("Relaciones y cardinalidades"),
  dataTable(["Relación", "Entidades", "Cardinalidad", "Descripción"], [
    ["posee_rol", "USUARIO – ROL", "N : 1", "Cada usuario posee un único rol; cada rol puede asociarse a múltiples usuarios."],
    ["contiene_permiso", "ROL – PERMISO", "1 : N", "Un rol agrupa uno o más permisos."],
    ["registra_direccion", "USUARIO – DIRECCION", "1 : N", "Un cliente puede registrar varias direcciones de envío."],
    ["pertenece_a", "PRODUCTO – CATEGORIA", "N : 1", "Cada producto pertenece a una sola categoría."],
    ["es_de_marca", "PRODUCTO – MARCA", "N : 1", "Cada producto pertenece a una sola marca."],
    ["jerarquia", "CATEGORIA – CATEGORIA", "0..1 : N", "Auto-relación que modela la jerarquía de categorías."],
    ["posee_carrito", "USUARIO – CARRITO", "1 : 1", "Cada cliente posee un único carrito activo."],
    ["compone_carrito", "CARRITO – LINEA_CARRITO", "1 : N", "Composición."],
    ["item_carrito", "LINEA_CARRITO – PRODUCTO", "N : 1", "Cada línea referencia un producto."],
    ["realiza_pedido", "USUARIO – PEDIDO", "1 : N", "Un cliente puede tener muchos pedidos."],
    ["compone_pedido", "PEDIDO – LINEA_PEDIDO", "1 : N", "Composición."],
    ["item_pedido", "LINEA_PEDIDO – PRODUCTO", "N : 1", "Cada línea referencia un producto."],
    ["se_paga", "PEDIDO – PAGO", "1 : 1", "Cada pedido tiene exactamente un pago."],
    ["envia_a", "PEDIDO – DIRECCION", "N : 1", "Cada pedido se envía a una dirección."],
    ["genera_movimiento", "PEDIDO – MOVIMIENTO_STOCK", "1 : N", "Un pedido genera uno o varios movimientos automáticos."],
    ["afecta_a", "MOVIMIENTO_STOCK – PRODUCTO", "N : 1", "Cada movimiento afecta a un producto."],
    ["registra", "USUARIO – MOVIMIENTO_STOCK", "1 : N", "Un usuario interno registra muchos movimientos."],
    ["audita", "AUDITORIA – USUARIO", "N : 1", "Cada registro de auditoría está asociado al usuario que ejecutó la acción."],
  ], [2200, 2200, 1400, 3560]),

  P("La representación gráfica del MER se realizará en notación de Peter Chen para el modelo conceptual y en notación de patas de cuervo (Crow's foot) para el modelo lógico relacional. Las entidades débiles se conectan a sus entidades fuertes mediante una doble línea para indicar dependencia existencial."),
];

/* ------------------------------------------------------------------ */
/* 6.9 - DFD                                                           */
/* ------------------------------------------------------------------ */
const dfd = [
  H2("6.9 Diagrama de flujo de datos"),
  P("El diagrama de flujo de datos (DFD) modela la circulación de la información dentro del sistema y entre éste y sus entidades externas. La descomposición se realiza en tres niveles de detalle: nivel de contexto, nivel 1 (procesos principales) y nivel 2 para los procesos críticos del dominio."),

  H3("6.9.1 Nivel de contexto (Diagrama 0)"),
  P("El diagrama de contexto representa al sistema como una única caja negra y describe los intercambios de información con las entidades externas. Las entidades externas identificadas son: Cliente, Administrador, Empleados (Gestor de Catálogo, de Stock y de Pedidos), Pasarela de pago y Servicio SMTP."),
  H4("Flujos de entrada al sistema"),
  BULL("Cliente -> Sistema: credenciales de autenticación, datos de registro, búsquedas, selección de productos, datos de checkout y dirección de envío."),
  BULL("Administrador / Empleados -> Sistema: credenciales, altas y modificaciones de catálogo, movimientos de stock, transiciones de estado de pedidos, parámetros de reportes y configuración de roles."),
  BULL("Pasarela de pago -> Sistema: notificaciones de aprobación, rechazo o reembolso de pagos (webhooks)."),
  H4("Flujos de salida del sistema"),
  BULL("Sistema -> Cliente: catálogo navegable, detalle de productos, estado del carrito, confirmaciones de pedido y notificaciones."),
  BULL("Sistema -> Administrador / Empleados: dashboard, reportes y registros de auditoría."),
  BULL("Sistema -> Pasarela de pago: solicitudes de captura de pago con los datos del pedido."),
  BULL("Sistema -> Servicio SMTP: cuerpos de correo electrónico para notificaciones transaccionales."),

  H3("6.9.2 Nivel 1"),
  P("El diagrama de nivel 1 descompone el sistema en sus procesos principales. Se han identificado siete procesos:"),
  dataTable(["N°", "Proceso", "Descripción"], [
    ["1.0", "Gestionar identidad", "Registra, autentica y mantiene a los usuarios del sistema."],
    ["2.0", "Gestionar catálogo", "Administra productos, categorías y marcas."],
    ["3.0", "Gestionar stock", "Registra y consulta movimientos y saldos de stock."],
    ["4.0", "Operar carrito", "Maneja el ciclo de vida del carrito de cada cliente."],
    ["5.0", "Procesar pedido", "Coordina checkout, pago, confirmación y transiciones de estado."],
    ["6.0", "Generar reportes", "Construye reportes y consultas analíticas."],
    ["7.0", "Auditar y notificar", "Registra las acciones sensibles y dispara las notificaciones."],
  ], [800, 2400, 6160]),
  H4("Almacenes de datos en nivel 1"),
  BULL("D1 — Usuarios y roles."),
  BULL("D2 — Productos y catálogo (categorías, marcas)."),
  BULL("D3 — Movimientos y saldos de stock."),
  BULL("D4 — Carritos."),
  BULL("D5 — Pedidos, líneas de pedido y pagos."),
  BULL("D6 — Auditoría."),
  BULL("D7 — Reportes y caché analítica."),

  H3("6.9.3 Nivel 2 — Proceso 5.0 \"Procesar pedido\""),
  P("Por ser el proceso crítico del dominio, el proceso 5.0 se descompone en cinco subprocesos:"),
  dataTable(["N°", "Subproceso", "Entradas", "Salidas"], [
    ["5.1", "Validar carrito y stock", "Carrito vigente del cliente, saldos en D3", "Reserva firme de stock; carrito validado o errores"],
    ["5.2", "Capturar datos de envío", "Selección del cliente, direcciones registradas en D1", "Dirección y método de envío asociados al pedido"],
    ["5.3", "Solicitar pago a la pasarela", "Pedido en estado \"Pendiente de pago\", monto, datos del cliente", "URL de pago, identificador externo del pago"],
    ["5.4", "Recibir notificación de pago", "Webhook firmado de la pasarela", "Actualización del estado del pago en D5"],
    ["5.5", "Confirmar pedido y descontar stock", "Pago aprobado, líneas del pedido", "Movimientos de stock en D3, pedido en estado \"Confirmado\", notificación al cliente"],
  ], [600, 2200, 3280, 3280]),

  H3("6.9.4 Nivel 2 — Proceso 3.0 \"Gestionar stock\""),
  dataTable(["N°", "Subproceso", "Entradas", "Salidas"], [
    ["3.1", "Registrar ingreso", "Datos del ingreso, comprobante de compra a proveedor", "Movimiento de ingreso en D3, saldo actualizado"],
    ["3.2", "Registrar egreso automático", "Confirmación de pedido proveniente de 5.5", "Movimiento de egreso en D3"],
    ["3.3", "Registrar ajuste manual", "Datos del ajuste, motivo, usuario", "Movimiento de ajuste en D3"],
    ["3.4", "Consultar saldo y movimientos", "Filtros del usuario", "Listado de movimientos y saldos"],
    ["3.5", "Notificar stock crítico", "Saldo posterior al movimiento, umbral configurado", "Alerta interna y registro en D6"],
  ], [600, 2400, 3280, 3080]),

  H3("6.9.5 Nivel 2 — Proceso 1.0 \"Gestionar identidad\""),
  dataTable(["N°", "Subproceso", "Entradas", "Salidas"], [
    ["1.1", "Registrar usuario", "Datos del formulario de registro", "Nuevo usuario en D1, correo de verificación al SMTP"],
    ["1.2", "Autenticar usuario", "Credenciales", "Token de sesión, contexto de usuario"],
    ["1.3", "Recuperar contraseña", "Correo electrónico", "Token de restablecimiento, correo al SMTP"],
    ["1.4", "Gestionar roles y permisos", "Cambios solicitados por el administrador", "Matriz de roles actualizada en D1"],
    ["1.5", "Bloquear / desbloquear", "Intentos fallidos o decisión administrativa", "Estado de usuario actualizado, auditoría en D6"],
  ], [600, 2400, 3280, 3080]),
];

/* ------------------------------------------------------------------ */
/* 6.10 - Base de datos                                                */
/* ------------------------------------------------------------------ */
const tbl = (title, intro, rows) => [
  H4(title),
  intro ? P(intro) : null,
  dataTable(
    ["Campo", "Requerido", "Tipo de dato", "Restricciones / descripción"],
    rows,
    [2300, 1100, 2200, 3760]
  ),
  P(""),
].filter(Boolean);

const baseDatos = [
  H2("6.10 Base de datos"),
  P("La base de datos a utilizar para el desarrollo del sistema es PostgreSQL, una base de datos relacional, transaccional y de código abierto, escogida por su madurez, su soporte para tipos de datos avanzados (JSONB para atributos dinámicos y arreglos para colecciones simples), su capacidad de garantizar integridad referencial y por su excelente integración nativa con Directus."),
  P("La base de datos consta de las siguientes tablas, agrupadas por dominio funcional. Para cada tabla se describen sus campos, indicando si el campo es requerido, su tipo de dato, las restricciones aplicables y la finalidad del campo dentro del modelo."),

  H3("6.10.1 Dominio: identidad y permisos"),

  ...tbl("Tabla usuarios", "Almacena la información común a todos los usuarios del sistema.", [
    ["id", "Sí", "UUID", "Clave primaria. Generado automáticamente."],
    ["email", "Sí", "VARCHAR(150)", "Único. Identificador funcional del usuario."],
    ["password_hash", "Sí", "VARCHAR(255)", "Hash bcrypt con salt aleatorio. Nunca almacenado en texto plano."],
    ["nombre", "Sí", "VARCHAR(120)", "Nombre completo."],
    ["telefono", "No", "VARCHAR(30)", "Teléfono de contacto."],
    ["documento", "No", "VARCHAR(20)", "Documento de identidad. Único cuando está presente."],
    ["tipo", "Sí", "ENUM", "Valores: cliente, interno."],
    ["rol_id", "Sí", "UUID", "Clave foránea a roles.id."],
    ["estado", "Sí", "ENUM", "Valores: pendiente, activo, bloqueado, eliminado."],
    ["intentos_fallidos", "Sí", "INTEGER", "Valor por defecto 0. Reinicio en cada login exitoso."],
    ["fecha_creacion", "Sí", "TIMESTAMP", "Generado por el sistema."],
    ["fecha_ultimo_acceso", "No", "TIMESTAMP", "Actualizado en cada login exitoso."],
  ]),

  ...tbl("Tabla roles", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["nombre", "Sí", "VARCHAR(50)", "Único. Por ejemplo: Administrador, Gestor de Catálogo."],
    ["descripcion", "No", "TEXT", "Descripción funcional del rol."],
    ["es_sistema", "Sí", "BOOLEAN", "Indica si el rol es predefinido del sistema y no puede eliminarse."],
  ]),

  ...tbl("Tabla permisos", "Modela la matriz de permisos como combinaciones de recurso y operación asociadas a un rol.", [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["rol_id", "Sí", "UUID", "Clave foránea a roles.id."],
    ["recurso", "Sí", "VARCHAR(50)", "Nombre de la entidad (productos, pedidos, etc.)."],
    ["operacion", "Sí", "ENUM", "Valores: crear, leer, modificar, eliminar."],
    ["restriccion", "No", "JSONB", "Predicado opcional para condicionar el permiso (por ejemplo, sólo registros propios)."],
  ]),

  ...tbl("Tabla direcciones", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["usuario_id", "Sí", "UUID", "Clave foránea a usuarios.id. ON DELETE CASCADE."],
    ["calle", "Sí", "VARCHAR(150)", "Calle y altura."],
    ["piso_depto", "No", "VARCHAR(20)", null],
    ["localidad", "Sí", "VARCHAR(80)", null],
    ["provincia", "Sí", "VARCHAR(80)", null],
    ["codigo_postal", "Sí", "VARCHAR(15)", null],
    ["es_principal", "Sí", "BOOLEAN", "Indica si es la dirección por defecto."],
  ]),

  H3("6.10.2 Dominio: catálogo"),

  ...tbl("Tabla categorias", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["nombre", "Sí", "VARCHAR(100)", "Único por categoría padre."],
    ["descripcion", "No", "TEXT", null],
    ["categoria_padre_id", "No", "UUID", "Clave foránea reflexiva. NULL para categorías raíz."],
    ["orden", "Sí", "INTEGER", "Orden de presentación entre hermanas."],
    ["activa", "Sí", "BOOLEAN", "Permite ocultar categorías sin eliminarlas."],
  ]),

  ...tbl("Tabla marcas", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["nombre", "Sí", "VARCHAR(100)", "Único."],
    ["logo_url", "No", "VARCHAR(255)", "URL en el servicio de almacenamiento."],
    ["descripcion", "No", "TEXT", null],
    ["activa", "Sí", "BOOLEAN", null],
  ]),

  ...tbl("Tabla productos", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["sku", "Sí", "VARCHAR(50)", "Único en toda la tabla."],
    ["nombre", "Sí", "VARCHAR(200)", null],
    ["descripcion", "No", "TEXT", "Descripción extendida."],
    ["categoria_id", "Sí", "UUID", "Clave foránea a categorias.id."],
    ["marca_id", "Sí", "UUID", "Clave foránea a marcas.id."],
    ["precio", "Sí", "NUMERIC(12,2)", "Precio vigente. CHECK precio >= 0."],
    ["stock_actual", "Sí", "INTEGER", "Calculado por trigger en función de movimientos_stock. CHECK >= 0."],
    ["stock_minimo", "Sí", "INTEGER", "Umbral crítico configurable."],
    ["atributos", "No", "JSONB", "Atributos técnicos dinámicos (memoria, capacidad, color, etc.)."],
    ["imagenes", "No", "TEXT[]", "Arreglo de URLs de imágenes."],
    ["publicado", "Sí", "BOOLEAN", "Determina la visibilidad pública del producto."],
    ["fecha_creacion", "Sí", "TIMESTAMP", null],
    ["fecha_modificacion", "Sí", "TIMESTAMP", "Actualizado por trigger."],
  ]),

  ...tbl("Tabla historico_precios", "Registra las variaciones de precio para fines de auditoría y reporte.", [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["producto_id", "Sí", "UUID", "Clave foránea a productos.id."],
    ["precio_anterior", "Sí", "NUMERIC(12,2)", null],
    ["precio_nuevo", "Sí", "NUMERIC(12,2)", null],
    ["usuario_id", "Sí", "UUID", "Usuario que efectuó el cambio."],
    ["fecha", "Sí", "TIMESTAMP", null],
  ]),

  H3("6.10.3 Dominio: stock"),

  ...tbl("Tabla movimientos_stock", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["producto_id", "Sí", "UUID", "Clave foránea a productos.id."],
    ["tipo", "Sí", "ENUM", "Valores: ingreso, egreso, ajuste."],
    ["cantidad", "Sí", "INTEGER", "Cantidad afectada. Para egresos se almacena valor positivo y el signo se determina por el tipo."],
    ["motivo", "Sí", "VARCHAR(150)", null],
    ["pedido_id", "No", "UUID", "Clave foránea a pedidos.id. NULL si el movimiento es manual."],
    ["usuario_id", "Sí", "UUID", "Clave foránea a usuarios.id."],
    ["saldo_resultante", "Sí", "INTEGER", "Saldo del producto luego del movimiento."],
    ["fecha", "Sí", "TIMESTAMP", null],
  ]),

  H3("6.10.4 Dominio: carrito"),

  ...tbl("Tabla carritos", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["usuario_id", "Sí", "UUID", "Clave foránea a usuarios.id. Único."],
    ["estado", "Sí", "ENUM", "Valores: vacio, con_productos, en_checkout, convertido, expirado."],
    ["fecha_creacion", "Sí", "TIMESTAMP", null],
    ["fecha_actualizacion", "Sí", "TIMESTAMP", null],
  ]),

  ...tbl("Tabla lineas_carrito", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["carrito_id", "Sí", "UUID", "Clave foránea a carritos.id. ON DELETE CASCADE."],
    ["producto_id", "Sí", "UUID", "Clave foránea a productos.id."],
    ["cantidad", "Sí", "INTEGER", "CHECK > 0."],
    ["precio_unitario_capturado", "Sí", "NUMERIC(12,2)", "Precio al momento de agregar al carrito."],
    ["fecha_alta", "Sí", "TIMESTAMP", null],
  ]),

  H3("6.10.5 Dominio: pedidos y pagos"),

  ...tbl("Tabla pedidos", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["numero", "Sí", "VARCHAR(20)", "Único. Generado por secuencia legible para el cliente."],
    ["usuario_id", "Sí", "UUID", "Clave foránea a usuarios.id."],
    ["fecha", "Sí", "TIMESTAMP", null],
    ["estado", "Sí", "ENUM", "Valores: pendiente_pago, pagado, confirmado, en_preparacion, en_distribucion, entregado, cancelado, devuelto."],
    ["subtotal", "Sí", "NUMERIC(12,2)", null],
    ["costo_envio", "Sí", "NUMERIC(12,2)", null],
    ["total", "Sí", "NUMERIC(12,2)", null],
    ["metodo_envio", "Sí", "ENUM", "Valores: retiro_sucursal, envio_domicilio."],
    ["direccion_id", "No", "UUID", "Clave foránea a direcciones.id. NULL si el método es retiro en sucursal."],
    ["observaciones", "No", "TEXT", null],
  ]),

  ...tbl("Tabla lineas_pedido", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["pedido_id", "Sí", "UUID", "Clave foránea a pedidos.id. ON DELETE CASCADE."],
    ["producto_id", "Sí", "UUID", "Clave foránea a productos.id."],
    ["cantidad", "Sí", "INTEGER", "CHECK > 0."],
    ["precio_unitario", "Sí", "NUMERIC(12,2)", "Precio al momento de la venta."],
    ["subtotal", "Sí", "NUMERIC(12,2)", "Calculado en el backend."],
  ]),

  ...tbl("Tabla pagos", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["pedido_id", "Sí", "UUID", "Clave foránea a pedidos.id. Único."],
    ["id_pasarela", "No", "VARCHAR(80)", "Identificador externo provisto por la pasarela."],
    ["monto", "Sí", "NUMERIC(12,2)", null],
    ["estado", "Sí", "ENUM", "Valores: pendiente, aprobado, rechazado, reembolsado."],
    ["medio_pago", "No", "VARCHAR(40)", "Tarjeta de crédito, débito, transferencia, etc."],
    ["fecha_actualizacion", "Sí", "TIMESTAMP", null],
  ]),

  ...tbl("Tabla transiciones_estado_pedido", "Auditoría dedicada del ciclo de vida del pedido.", [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["pedido_id", "Sí", "UUID", "Clave foránea a pedidos.id."],
    ["estado_anterior", "Sí", "ENUM", null],
    ["estado_nuevo", "Sí", "ENUM", null],
    ["usuario_id", "No", "UUID", "Usuario que disparó la transición (NULL para transiciones automáticas)."],
    ["fecha", "Sí", "TIMESTAMP", null],
    ["motivo", "No", "TEXT", null],
  ]),

  H3("6.10.6 Dominio: auditoría y reportes"),

  ...tbl("Tabla auditoria", null, [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["entidad", "Sí", "VARCHAR(50)", "Nombre de la tabla afectada."],
    ["entidad_id", "Sí", "UUID", "Identificador del registro afectado."],
    ["operacion", "Sí", "ENUM", "Valores: alta, modificacion, baja."],
    ["usuario_id", "No", "UUID", "Usuario que ejecutó la operación."],
    ["valor_anterior", "No", "JSONB", "Snapshot previo."],
    ["valor_posterior", "No", "JSONB", "Snapshot posterior."],
    ["fecha", "Sí", "TIMESTAMP", null],
  ]),

  ...tbl("Tabla reportes_generados", "Registra los reportes solicitados por los usuarios para auditoría y posibles reusos por caché.", [
    ["id", "Sí", "UUID", "Clave primaria."],
    ["tipo", "Sí", "ENUM", "Valores: ventas, stock, tendencias."],
    ["parametros", "Sí", "JSONB", "Filtros utilizados."],
    ["usuario_id", "Sí", "UUID", "Solicitante."],
    ["fecha_generacion", "Sí", "TIMESTAMP", null],
    ["url_archivo", "No", "VARCHAR(255)", "URL en el servicio de almacenamiento si fue exportado."],
  ]),

  H3("6.10.7 Restricciones e índices recomendados"),
  BULL("PRIMARY KEY sobre el campo id de cada tabla."),
  BULL("UNIQUE sobre usuarios.email, productos.sku, roles.nombre, marcas.nombre y pedidos.numero."),
  BULL("FOREIGN KEY con cláusulas ON DELETE RESTRICT por defecto, exceptuando las relaciones de composición (lineas_pedido y lineas_carrito), donde se utiliza ON DELETE CASCADE."),
  BULL("CHECK constraints sobre todos los campos de cantidad y precio para garantizar valores no negativos."),
  BULL("Índices secundarios sobre productos(categoria_id), productos(marca_id), pedidos(usuario_id), pedidos(estado), pedidos(fecha), movimientos_stock(producto_id, fecha) y auditoria(entidad, entidad_id) para optimizar las consultas más frecuentes."),
  BULL("Índice GIN sobre productos.atributos para habilitar búsquedas eficientes sobre el campo JSONB."),
  BULL("Triggers sobre movimientos_stock para mantener consistente productos.stock_actual."),
  BULL("Triggers de auditoría sobre productos, pedidos, usuarios y roles para alimentar automáticamente la tabla auditoria."),
];

/* ------------------------------------------------------------------ */
/* 6.11 - Cierre                                                       */
/* ------------------------------------------------------------------ */
const cierre = [
  H2("6.11 Conclusión del capítulo"),
  P("El presente capítulo ha desarrollado el modelado integral del sistema propuesto para Tele Import S.A. Partiendo de los requisitos relevados en los capítulos previos, se identificaron los actores intervinientes, se definió un conjunto completo de treinta y cuatro casos de uso clasificados por prioridad y complejidad, y se describió formalmente cada uno de ellos mediante una plantilla normalizada."),
  P("A continuación se modeló estructuralmente el sistema mediante un diagrama de clases que captura el dominio del negocio; se describió la arquitectura de despliegue de los componentes sobre infraestructura cloud, respetando la separación entre el frontend React, el backend Directus y la base de datos PostgreSQL; y se modeló el comportamiento dinámico mediante diagramas de estados para las entidades Pedido, Producto, Usuario y Carrito."),
  P("Desde la perspectiva de los datos, se construyó el modelo entidad-relación con la totalidad de las entidades, relaciones y cardinalidades, se diagramó el flujo de datos en tres niveles de detalle y se especificó el esquema completo de la base de datos relacional, incluyendo campos, tipos, restricciones, índices y triggers recomendados."),
  P("El conjunto de artefactos producidos en este capítulo constituye una especificación formal suficiente para iniciar la siguiente etapa del proyecto: el diseño detallado de la interfaz de usuario y la implementación técnica del sistema."),
];

/* ------------------------------------------------------------------ */
/* Build document                                                      */
/* ------------------------------------------------------------------ */
const doc = new Document({
  creator: "Tele Import S.A.",
  title: "Capítulo 6 – Modelación del Sistema",
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
      { reference: "nums",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Tesis – Tele Import S.A. – Capítulo 6: Modelación", font: FONT, size: 18, italics: true, color: "555555" })],
      })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Página ", font: FONT, size: 18 }),
                   new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })],
      })] }),
    },
    children: [
      ...missingSection,
      ...cap6Intro,
      ...actores,
      PB(),
      ...listadoCU,
      PB(),
      ...cuDescriptions,
      PB(),
      ...cuDiagram,
      PB(),
      ...clases,
      PB(),
      ...despliegue,
      PB(),
      ...estados,
      PB(),
      ...er,
      PB(),
      ...dfd,
      PB(),
      ...baseDatos,
      PB(),
      ...cierre,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = "C:\\Users\\popet\\OneDrive\\Desktop\\documentaicon tesis\\gen\\Capitulo_6_Modelacion_TeleImport.docx";
  fs.writeFileSync(out, buf);
  console.log("OK -> " + out + " (" + buf.length + " bytes)");
});
