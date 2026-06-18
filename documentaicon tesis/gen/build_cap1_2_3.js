// Capítulos 1 (apartados 1.9 y 1.10), Capítulo 2 (Planeamiento) y
// apertura del Capítulo 3 (Mandato) — Tele Import S.A.
// Aplicando los lineamientos académicos definidos:
// Arial 11, interlineado 1.5, justificado, márgenes 2.5/3 cm,
// títulos en Heading 1/2/3, tablas con formato uniforme.

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageBreak, PageNumber,
} = require("docx");

const FONT = "Arial";
const BODY_SIZE = 22;       // 11pt (docx usa half-points)
const SMALL_SIZE = 20;      // 10pt (tablas)
const NAVY = "000000";    // Títulos en negro (antes #1F3864)
const GANTT = "1F3864";   // Color de las barras del Gantt

const border = { style: BorderStyle.SINGLE, size: 6, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };

const P = (t, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 360 },  // 1.5 line spacing
  alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: t, font: FONT, size: BODY_SIZE, bold: !!opts.bold, italics: !!opts.italics })],
});

const H1 = t => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 480, after: 240 },
  pageBreakBefore: true,
  children: [new TextRun({ text: t, font: FONT, size: 32, bold: true, color: NAVY })],
});

const H1NoBreak = t => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 480, after: 240 },
  children: [new TextRun({ text: t, font: FONT, size: 32, bold: true, color: NAVY })],
});

const H2 = t => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 360, after: 180 },
  children: [new TextRun({ text: t, font: FONT, size: 28, bold: true, color: NAVY })],
});

const H3 = t => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 140 },
  children: [new TextRun({ text: t, font: FONT, size: 24, bold: true, color: NAVY })],
});

const BULL = t => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80, line: 320 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: t, font: FONT, size: BODY_SIZE })],
});

const NUM = t => new Paragraph({
  numbering: { reference: "nums", level: 0 },
  spacing: { after: 80, line: 320 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: t, font: FONT, size: BODY_SIZE })],
});

const Caption = t => new Paragraph({
  spacing: { before: 120, after: 240 },
  alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: t, font: FONT, size: SMALL_SIZE, italics: true, color: "555555" })],
});

const dataTable = (header, rows, colWidths) => {
  const TOTAL = 9100;
  const widths = colWidths || header.map(() => Math.floor(TOTAL / header.length));
  const mkCell = (text, opts = {}) => new TableCell({
    borders, width: { size: opts.w, type: WidthType.DXA },
    shading: opts.head ? { fill: NAVY, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 0, line: 280 },
      children: [new TextRun({
        text: String(text == null ? "" : text),
        bold: !!opts.head,
        color: opts.head ? "FFFFFF" : "000000",
        font: FONT,
        size: SMALL_SIZE,
      })],
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

// Tabla "formulario en blanco" (sin cabecera azul)
const formTable = (rows, colWidths) => {
  const TOTAL = 9100;
  const widths = colWidths;
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map(r => new TableRow({
      cantSplit: true,
      children: r.map((cell, i) => new TableCell({
        borders,
        width: { size: widths[i], type: WidthType.DXA },
        shading: cell.head ? { fill: "E8EEF5", type: ShadingType.CLEAR } : undefined,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 0, line: 280 },
          children: [new TextRun({ text: cell.t || "", bold: !!cell.head || !!cell.bold, font: FONT, size: SMALL_SIZE })],
        })],
      })),
    })),
  });
};

/* ============================================================ */
/* Diagrama de Gantt (tabla con celdas sombreadas)               */
/* ============================================================ */
// Cada fase es una fila; las columnas representan tramos temporales.
// Las celdas pintadas (con relleno GANTT) representan la barra de la fase.
const ganttTable = () => {
  // 11 columnas de tiempo + 1 de etiqueta de fase.
  // Se incluye una franja sombreada ("Jul 24 – Mar 26") que indica
  // el período de pausa del proyecto.
  const periods = [
    "Jun 23", "Jul-Ago 23", "Sep-Oct 23", "Nov 23 – Jun 24",
    "Jul 24 – Mar 26", "Abr-May 26", "Jun-Jul 26",
    "Ago-Sep 26", "Oct 26", "Nov 26", "Dic 26",
  ];
  // Cada fase indica en qué columnas (0..periods.length-1) está activa
  const phases = [
    { id: "F1",  name: "Estudio preliminar y selección",          active: [0, 1] },
    { id: "F2",  name: "Planeamiento y marco metodológico",       active: [1, 2] },
    { id: "F3",  name: "Relevamiento y entrevistas",              active: [2] },
    { id: "F4",  name: "Diagnóstico y mandato",                   active: [2] },
    { id: "F5",  name: "Modelación y modelado de datos",          active: [2, 3] },
    { id: "F6",  name: "Redefinición tecnológica y factibilidad", active: [5] },
    { id: "F7",  name: "Implementación del prototipo",            active: [5] },
    { id: "F8",  name: "Despliegue y revisión integral",          active: [5] },
    { id: "F9",  name: "Devolución académica y ajustes",          active: [6] },
    { id: "F10", name: "Planificación de sprints (Kanban)",       active: [6] },
    { id: "F11", name: "Programación oficial con Kanban",         active: [7, 8] },
    { id: "F12", name: "Pruebas integrales y refinamiento",       active: [8, 9] },
    { id: "F13", name: "Documentación, ensayo y defensa",         active: [9, 10] },
  ];

  const LABEL_W = 3000;
  const TOTAL = 9100;
  const PERIOD_W = Math.floor((TOTAL - LABEL_W) / periods.length);
  const widths = [LABEL_W, ...periods.map(() => PERIOD_W)];

  const headCell = (text, w, dark) => new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: dark ? NAVY : "E8EEF5", type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 240 },
      children: [new TextRun({ text, bold: true, color: dark ? "FFFFFF" : "000000", font: FONT, size: 16 })],
    })],
  });

  const phaseLabelCell = (txt, w) => new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 0, line: 260 },
      children: [new TextRun({ text: txt, font: FONT, size: 18 })],
    })],
  });

  const barCell = (filled, w) => new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: filled ? { fill: GANTT, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 20, right: 20 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: " ", font: FONT, size: 14 })],
    })],
  });

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headCell("Fase", widths[0], true),
      ...periods.map((p, i) => headCell(p, widths[i + 1], true)),
    ],
  });

  const phaseRows = phases.map(ph => new TableRow({
    cantSplit: true,
    children: [
      phaseLabelCell(`${ph.id} — ${ph.name}`, widths[0]),
      ...periods.map((_, idx) => barCell(ph.active.includes(idx), widths[idx + 1])),
    ],
  }));

  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...phaseRows],
  });
};

/* ============================================================ */
/* 1.9 Primer acercamiento                                       */
/* ============================================================ */
const s19 = [
  H2("1.9 Primer acercamiento"),

  H3("1.9.1 Nombre y rubro"),
  P("La empresa se encuentra ubicada en la zona norte de la ciudad de Córdoba y desarrolla diversas actividades vinculadas a la atención al cliente, entre las que se destacan la venta de insumos electrónicos, el servicio técnico de relojes y de pequeños artefactos eléctricos. Para llevar adelante estas tareas, el personal opera distintas herramientas específicas, lo que requiere un entrenamiento previo por parte de los empleados."),

  H3("1.9.2 Reseña histórica"),
  P("La historia de la organización comienza en el año 1998 como una empresa con varios locales distribuidos en la ciudad de Córdoba. Ricardo, actual encargado del local, fue uno de los primeros empleados en formar parte del proyecto y continúa ejerciendo dicho cargo en la actualidad. Hoy la empresa enfrenta la competencia de varios actores del rubro y se encuentra en la búsqueda de un nuevo ciclo de crecimiento equivalente al alcanzado en períodos anteriores."),

  H3("1.9.3 Organigrama"),
  P("A continuación se presenta el organigrama relevado por el equipo de trabajo durante las visitas a la empresa. En él se sintetizan las áreas funcionales y las dependencias jerárquicas observadas, las cuales serán retomadas en los capítulos siguientes para fundamentar la propuesta de modelación del sistema."),
  Caption("Figura 1.1 — Organigrama de Tele Import S.A. (relevamiento propio)."),
];

/* ============================================================ */
/* 1.10 Marco Metodológico                                       */
/* ============================================================ */
const s110 = [
  H2("1.10 Marco metodológico"),
  P("Para el presente trabajo de campo se ha optado por un marco metodológico mixto, que combina dos enfoques complementarios. Inicialmente se utilizará la metodología clásica —de tipo cascada— para las siguientes etapas:"),
  BULL("Estudio preliminar y análisis."),
  BULL("Planeamiento."),
  BULL("Relevamiento y recolección de datos y hechos."),
  BULL("Diagnóstico."),
  P("Esta metodología aporta una estructura ordenada durante el reconocimiento de la organización y permite un desarrollo secuencial del proyecto, condición indispensable para obtener la información necesaria y avanzar etapa por etapa."),
  P("De haber optado por una metodología ágil en estas fases iniciales, habría sido necesario documentar la información de manera continua a lo largo del trabajo, lo cual resultaba poco factible para el alcance y los tiempos del proyecto."),
  P("En la etapa de relevamiento y recolección de datos se utilizarán como herramientas la entrevista, los cuestionarios, las encuestas y la observación directa."),
  P("Para las etapas de programación y testing se adopta una metodología ágil: Kanban. Su elección se fundamenta en las ventajas que ofrece para los requerimientos del trabajo:"),
  BULL("Permite administrar de manera eficiente el flujo de trabajo."),
  BULL("Facilita la identificación temprana de problemas."),
  BULL("Visualiza claramente cada etapa del proceso."),
  BULL("Garantiza la calidad del proyecto: no premia la rapidez, sino la ejecución correcta de cada tarea desde el inicio."),
  BULL("Promueve la economía del desperdicio: se realiza lo justo y necesario, relegando a un segundo plano aquello que resulta superficial o secundario."),

  H3("Ejecución de la estrategia Kanban"),
  P("La aplicación del método Kanban implica la construcción de un tablero de tareas que permite optimizar el flujo de trabajo. Para implementar esta metodología se contemplan los siguientes pasos:"),
  NUM("Preparación del equipo de trabajo: los integrantes deben formarse en la metodología para poder aplicarla con propiedad cuando corresponda."),
  NUM("Visualización del flujo de trabajo: los proyectos se dividen en las fases necesarias para su seguimiento."),
  NUM("Delimitación del número de tareas en curso: evita acumular tareas inconclusas, dado que no resulta conveniente iniciar múltiples actividades en paralelo y dejarlas sin terminar."),
  NUM("Control del flujo: permite verificar que las tareas avancen correctamente y resolver cualquier inconveniente que pueda presentarse."),
  NUM("Mejora continua: a partir de la retroalimentación o feedback recibido al cierre de cada iteración."),
];

/* ============================================================ */
/* Capítulo 2 — Planeamiento del Proyecto                        */
/* ============================================================ */
const cap2 = [
  H1("Capítulo 2: Planeamiento del Proyecto"),

  H2("2.1 Planeamiento del proyecto"),
  P("En la presente etapa se elabora e implementa un plan de acción asociado a un cronograma de las actividades necesarias para iniciar y finalizar el trabajo dentro del plazo establecido por el equipo como meta."),
  P("Se diseñarán modelos de formularios, entrevistas y observaciones destinados a relevamientos en distintos niveles jerárquicos y áreas, con el objetivo de tomar contacto directo con la situación real y actual de la organización."),

  H2("2.2 Planificación de tareas"),
  P("La planificación del proyecto se estructuró en trece fases sucesivas que abarcan desde el estudio preliminar de la organización hasta la defensa final del trabajo. La etapa de prototipado, llevada adelante durante mayo de 2026, permitió alcanzar un nivel de funcionalidad cercano al ochenta por ciento del sistema previsto. A partir de la devolución académica del profesor tutor, prevista para junio y julio de 2026, se incorporan las correcciones correspondientes y comienza la fase de programación oficial, organizada en sprints según la metodología Kanban definida en el marco metodológico, hasta llegar a la defensa del trabajo en diciembre de 2026."),
  P("A continuación se presenta, en primer lugar, una síntesis de las fases —con sus fechas, duración estimada y responsables— y, a continuación, un diagrama de Gantt que resume gráficamente la distribución temporal del trabajo. Por último, se incluye el detalle pormenorizado de las actividades ejecutadas dentro de cada fase."),

  H3("2.2.1 Síntesis de fases"),
  dataTable(
    ["Fase", "Descripción", "Inicio", "Fin", "Responsables"],
    [
      ["F1",  "Estudio preliminar y selección de empresa", "01/06/2023", "22/08/2023", "Allasia, Petri, Emanuelli"],
      ["F2",  "Planeamiento del proyecto y marco metodológico", "29/08/2023", "31/10/2023", "Allasia, Emanuelli"],
      ["F3",  "Relevamiento y entrevistas", "07/09/2023", "19/09/2023", "Petri, Emanuelli, Allasia"],
      ["F4",  "Diagnóstico y consolidación del mandato", "22/09/2023", "19/10/2023", "Petri, Emanuelli, Allasia"],
      ["F5",  "Modelación inicial y modelado de datos", "24/10/2023", "26/06/2024", "Petri, Emanuelli, Allasia"],
      ["F6",  "Redefinición tecnológica y estudio de factibilidad", "31/03/2026", "01/05/2026", "Petri, Emanuelli, Allasia"],
      ["F7",  "Implementación del prototipo", "07/05/2026", "21/05/2026", "Petri, Emanuelli"],
      ["F8",  "Simulacro de despliegue y revisión integral", "21/05/2026", "30/05/2026", "Petri, Emanuelli, Allasia"],
      ["F9",  "Devolución académica e incorporación de correcciones", "02/06/2026", "15/07/2026", "Petri, Emanuelli, Allasia"],
      ["F10", "Planificación de sprints de programación (Kanban)", "16/07/2026", "29/07/2026", "Petri, Emanuelli, Allasia"],
      ["F11", "Programación oficial con metodología Kanban", "30/07/2026", "21/10/2026", "Petri, Emanuelli, Allasia"],
      ["F12", "Pruebas integrales y refinamiento del sistema", "22/10/2026", "22/11/2026", "Petri, Emanuelli, Allasia"],
      ["F13", "Documentación final, ensayo y defensa del trabajo", "23/11/2026", "15/12/2026", "Petri, Emanuelli, Allasia"],
    ],
    [600, 4000, 1300, 1300, 1900]
  ),
  Caption("Tabla 2.1 — Síntesis de fases del proyecto."),

  H3("2.2.2 Diagrama de Gantt"),
  P("El siguiente diagrama presenta de manera visual la distribución temporal de cada fase del proyecto. Cabe destacar el período de pausa comprendido entre julio de 2024 y marzo de 2026, durante el cual el proyecto permaneció en suspenso hasta su reactivación con la confirmación del stack tecnológico y el inicio del proceso de implementación."),
  ganttTable(),
  Caption("Figura 2.1 — Diagrama de Gantt del proyecto."),

  H3("2.2.3 Detalle de actividades"),
  P("El detalle completo de las actividades agrupadas por fase, con sus respectivos responsables y fechas de inicio y finalización, se presenta en la siguiente tabla."),
  dataTable(
    ["Fase", "ID", "Tarea", "Responsable", "Inicio", "Fin"],
    [
      ["F1", "1",  "FODA grupal", "Allasia, Petri, Emanuelli", "01/06/2023", "30/06/2023"],
      ["F1", "2",  "Postulación de empresas", "Allasia, Petri, Emanuelli", "16/06/2023", "30/06/2023"],
      ["F1", "3",  "Ponderación de empresas", "Allasia, Petri, Emanuelli", "16/06/2023", "30/06/2023"],
      ["F1", "4",  "Elección de la empresa", "Allasia, Petri, Emanuelli", "10/08/2023", "22/08/2023"],
      ["F2", "5",  "Marco metodológico", "Emanuelli", "29/08/2023", "31/10/2023"],
      ["F2", "6",  "Planeamiento del proyecto", "Allasia, Petri, Emanuelli", "29/08/2023", "31/10/2023"],
      ["F2", "7",  "Planificación", "Allasia", "29/08/2023", "31/10/2023"],
      ["F2", "8",  "Carta de presentación a la empresa", "Allasia, Petri, Emanuelli", "29/08/2023", "31/10/2023"],
      ["F2", "9",  "Formulario de entrevista", "Allasia", "29/08/2023", "07/09/2023"],
      ["F3", "10", "Investigación y relevamiento", "Petri, Emanuelli, Allasia", "07/09/2023", "19/09/2023"],
      ["F3", "11", "Entrevista N° 1", "Petri", "07/09/2023", "07/09/2023"],
      ["F3", "12", "Entrevistas con otras áreas", "Petri, Emanuelli, Allasia", "12/09/2023", "19/09/2023"],
      ["F4", "13", "Completar mandato; corregir marco metodológico y flujograma; agregar diagnóstico", "Petri, Emanuelli, Allasia", "22/09/2023", "19/10/2023"],
      ["F5", "14", "Agregar modelación e iniciar los casos de uso", "Emanuelli", "24/10/2023", "25/10/2023"],
      ["F5", "15", "Agregar diagrama de clases y diagrama de despliegue", "Petri", "25/10/2023", "27/10/2023"],
      ["F5", "16", "Agregar modelado de datos y diccionario de datos", "Petri, Emanuelli, Allasia", "25/04/2024", "26/06/2024"],
      ["F5", "17", "Modificación de la planificación del proyecto", "Allasia, Emanuelli", "26/06/2024", "26/06/2024"],
      ["F6", "18", "Confirmación del stack tecnológico (React / Next.js) y capacitación interna", "Emanuelli", "31/03/2026", "11/04/2026"],
      ["F6", "19", "Modificación del diseño", "Petri, Allasia", "11/04/2026", "22/04/2026"],
      ["F6", "20", "Estudio de factibilidad", "Emanuelli", "22/04/2026", "28/04/2026"],
      ["F6", "21", "Incorporación de casos de uso al modelado", "Petri, Emanuelli", "28/04/2026", "01/05/2026"],
      ["F6", "22", "Continuación del modelado de datos", "Allasia, Petri", "01/05/2026", "07/05/2026"],
      ["F7", "23", "Inicio de la implementación del sistema (backend y frontend)", "Petri", "07/05/2026", "12/05/2026"],
      ["F7", "24", "Modificaciones sobre la implementación", "Petri", "12/05/2026", "21/05/2026"],
      ["F8", "25", "Simulacro de despliegue y ajustes al planeamiento", "Petri, Emanuelli", "21/05/2026", "30/05/2026"],
      ["F8", "26", "Revisión integral del prototipo", "Petri, Emanuelli, Allasia", "30/05/2026", "30/05/2026"],
      ["F9", "27", "Entrega del documento al profesor tutor para devolución", "Petri, Emanuelli, Allasia", "02/06/2026", "02/06/2026"],
      ["F9", "28", "Recepción de la devolución académica e incorporación de correcciones", "Petri, Emanuelli, Allasia", "15/06/2026", "15/07/2026"],
      ["F10", "29", "Definición del backlog de programación oficial", "Petri, Emanuelli", "16/07/2026", "22/07/2026"],
      ["F10", "30", "Configuración del tablero Kanban y definición de criterios de aceptación", "Allasia", "23/07/2026", "29/07/2026"],
      ["F11", "31", "Sprint 1 — Backend: autenticación, catálogo y productos", "Emanuelli, Allasia", "30/07/2026", "19/08/2026"],
      ["F11", "32", "Sprint 2 — Backend: pedidos, pagos y webhooks de Mercado Pago", "Emanuelli, Allasia", "20/08/2026", "09/09/2026"],
      ["F11", "33", "Sprint 3 — Frontend: área pública, catálogo y carrito de compras", "Petri, Allasia", "10/09/2026", "30/09/2026"],
      ["F11", "34", "Sprint 4 — Frontend: panel administrativo, reportes y auditoría", "Petri, Allasia", "01/10/2026", "21/10/2026"],
      ["F12", "35", "Pruebas integrales del sistema y corrección de errores", "Petri, Emanuelli, Allasia", "22/10/2026", "11/11/2026"],
      ["F12", "36", "Optimización de rendimiento y endurecimiento de seguridad", "Emanuelli, Allasia", "12/11/2026", "22/11/2026"],
      ["F13", "37", "Documentación final del sistema y manual de usuario", "Petri, Emanuelli, Allasia", "23/11/2026", "02/12/2026"],
      ["F13", "38", "Ensayo de defensa", "Petri, Emanuelli, Allasia", "03/12/2026", "08/12/2026"],
      ["F13", "39", "Defensa final y recepción", "Petri, Emanuelli, Allasia", "15/12/2026", "15/12/2026"],
    ],
    [600, 500, 2600, 2100, 1350, 1350]
  ),
  Caption("Tabla 2.2 — Detalle de actividades por fase."),

  H2("2.3 Formulario de entrevista"),
  P("Con el fin de estandarizar el registro de la información recabada durante los relevamientos, se elaboró la siguiente planilla modelo. La misma será utilizada para todas las entrevistas previstas en el marco metodológico."),
  formTable(
    [
      [{ t: "Planilla para entrevista", head: true, bold: true }, { t: "Versión: 1.0", bold: true }],
      [{ t: "Fecha:", bold: true }, { t: "" }],
      [{ t: "Organización", head: true, bold: true }, { t: "" }],
      [{ t: "Razón social:", bold: true }, { t: "" }],
      [{ t: "CUIL / CUIT:", bold: true }, { t: "" }],
      [{ t: "Entrevistadores:", bold: true }, { t: "" }],
      [{ t: "Registro:", bold: true }, { t: "Anotaciones    /    Grabación de voz    /    Videollamada" }],
      [{ t: "Entrevistado", head: true, bold: true }, { t: "" }],
      [{ t: "Apellido y nombre:", bold: true }, { t: "" }],
      [{ t: "Cargo:", bold: true }, { t: "" }],
      [{ t: "Área:", bold: true }, { t: "" }],
      [{ t: "Personas a cargo:", bold: true }, { t: "" }],
      [{ t: "Objetivo de la entrevista:", bold: true }, { t: "" }],
      [{ t: "Hora de inicio:", bold: true }, { t: "Hora de fin:" }],
      [{ t: "Preguntas", head: true, bold: true }, { t: "Respuestas", head: true, bold: true }],
      [{ t: "" }, { t: "" }],
      [{ t: "" }, { t: "" }],
      [{ t: "" }, { t: "" }],
      [{ t: "Observaciones:", bold: true }, { t: "" }],
    ],
    [3000, 6100]
  ),
  Caption("Tabla 2.3 — Modelo de planilla para entrevista."),

  H2("2.4 Calidad"),
  P("Cuando se habla de calidad en un proyecto, se hace referencia a la mejora continua de los procesos que lo componen. Estos procesos se rigen por una serie de principios fundamentales basados en criterios sólidos para determinar por dónde comenzar y cuál es la importancia relativa de cada uno a nivel organizacional. Tales criterios resultan esenciales para garantizar la calidad tanto del proyecto en sí como de la documentación asociada."),
  P("Para alcanzar la calidad en un proyecto se dispone de diversas herramientas que facilitan la manipulación y presentación de la información, la cual se dirige a distintos usuarios con el objetivo de satisfacer sus necesidades. Entre las herramientas más relevantes se destacan:"),
  BULL("Diagrama de flujo: permite visualizar gráficamente la secuencia de pasos de un proceso. Facilita la identificación de posibles cuellos de botella y la optimización de los flujos de trabajo."),
  BULL("Organigrama: representa la estructura jerárquica de una organización. Ayuda a comprender la distribución de responsabilidades y roles dentro del proyecto, condición esencial para una gestión eficaz."),
  BULL("Casos de uso: técnica utilizada en la ingeniería de software para describir cómo interactúan los usuarios con un sistema. Resulta de utilidad para definir requisitos y funcionalidades, asegurando que el proyecto satisfaga las necesidades de los usuarios finales."),
  BULL("Lenguaje de programación: herramienta fundamental en el desarrollo de software. La elección del lenguaje adecuado puede tener un impacto significativo en la calidad y eficiencia del proyecto, dado que ciertos lenguajes resultan más apropiados que otros para determinados tipos de aplicaciones."),

  H2("2.5 Proformas para facilitar la gestión de documentación"),
  P("Con el objetivo de agilizar la creación y el manejo de documentos y formularios en las distintas etapas del proyecto, se han desarrollado diversas plantillas reutilizables tanto en el presente trabajo como en proyectos futuros:"),
  BULL("Plantilla 1: Captura de requerimientos del cliente durante las entrevistas."),
  BULL("Plantilla 2: Creación de diagrama de Ishikawa."),
  BULL("Plantilla 3: Creación de mapa de impacto."),
  BULL("Plantilla 4: Desarrollo de historias de usuario."),
  P("Estas plantillas están diseñadas para optimizar el proceso de documentación y mejorar la eficiencia en cada fase del proyecto."),

  H3("Plantilla 1: Captura de requerimientos del cliente durante entrevistas"),
  formTable(
    [
      [{ t: "Actividad:", bold: true }, { t: "Recolectar la primera información" }],
      [{ t: "Etapa:", bold: true }, { t: "Estudio preliminar" }],
      [{ t: "Fecha de inicio:", bold: true }, { t: "xx/xx/xx" }],
      [{ t: "Fecha de finalización:", bold: true }, { t: "xx/xx/xx" }],
      [{ t: "Nombre del cliente:", bold: true }, { t: "XXX" }],
      [{ t: "Responsable a cargo:", bold: true }, { t: "XXX" }],
      [{ t: "Objetivo de la entrevista:", bold: true }, { t: "" }],
      [{ t: "Requerimientos principales:", bold: true }, { t: "XX" }],
      [{ t: "Requerimiento 1:", bold: true }, { t: "XX" }],
      [{ t: "Requerimiento 2:", bold: true }, { t: "XX" }],
      [{ t: "Requerimiento 3:", bold: true }, { t: "XX" }],
      [{ t: "Comentarios adicionales:", bold: true }, { t: "XX" }],
    ],
    [3200, 5900]
  ),
  Caption("Tabla 2.4 — Plantilla 1: Captura de requerimientos del cliente."),

  H2("2.6 Diagrama de Ishikawa e identificación del problema"),
  H3("Plantilla 2: Identificación del problema y causas"),
  formTable(
    [
      [{ t: "Etapa:", bold: true }, { t: "Relevamiento y análisis" }],
      [{ t: "Título del problema:", bold: true }, { t: "xx" }],
      [{ t: "Fecha de inicio:", bold: true }, { t: "xx/xx/xx" }],
      [{ t: "Fecha final:", bold: true }, { t: "xx/xx/xx" }],
    ],
    [3200, 5900]
  ),
  P(""),
  dataTable(
    ["Causas potenciales", "Efectos observados"],
    [
      ["Causa 1: XX", "Efecto 1: XX"],
      ["Causa 2: XX", "Efecto 2: XX"],
      ["Causa 3: XX", "Efecto 3: XX"],
    ],
    [4550, 4550]
  ),
  Caption("Tabla 2.5 — Plantilla 2: Identificación del problema y causas."),
  P("A continuación se presenta el modelo de diagrama de Ishikawa adoptado por el equipo de trabajo para representar las causas y efectos identificados durante el análisis."),
  Caption("Figura 2.2 — Modelo de diagrama de Ishikawa."),

  H2("2.7 Control de versiones"),
  P("Con el objetivo de mantener la trazabilidad de los cambios efectuados sobre el documento, se lleva un registro de versiones que detalla la fecha de cada modificación, el número de versión, una descripción de los cambios introducidos y los autores responsables."),
  dataTable(
    ["Fecha", "Versión", "Descripción", "Autores"],
    [
      ["14/06/2023", "1.0",     "Inicio del documento.", "Petri, Emanuelli, Allasia"],
      ["15/06/2023", "1.1",     "Se agregan carátula, índice y encabezado.", "Petri"],
      ["16/06/2023", "1.2",     "Se agregan FODA grupal, carta de presentación y ponderación de empresas.", "Petri, Emanuelli"],
      ["22/06/2023", "1.3",     "Se modifican la carta de presentación y el pie de página; se agrega la mitigación al FODA.", "Petri"],
      ["27/06/2023", "1.3",     "Se agregan la expectativa y el análisis superficial de la empresa.", "Petri"],
      ["28/06/2023", "1.3",     "Actualización del FODA grupal.", "Allasia, Emanuelli"],
      ["30/06/2023", "1.3",     "Se agregan los recursos y el plan de mitigación.", "Petri, Allasia, Emanuelli"],
      ["10/08/2023", "1.3.1",   "Se modifica la carta de presentación.", "Petri, Emanuelli"],
      ["15/08/2023", "1.3.2",   "Se modifica la carta de presentación.", "Emanuelli"],
      ["22/08/2023", "1.4",     "Se confirma la empresa y se inicia el estudio preliminar.", "Petri"],
      ["28/08/2023", "1.4.1",   "Se agrega información de la empresa (organigrama).", "Petri"],
      ["29/08/2023", "1.4.2",   "Se agrega el marco metodológico.", "Emanuelli"],
      ["30/08/2023", "1.5",     "Se elabora la primera versión del mandato.", "Petri, Emanuelli, Allasia"],
      ["30/08/2023", "1.5",     "Se inicia el planeamiento.", "Allasia"],
      ["07/09/2023", "1.5.1",   "Planillas de gestión de documentación y entrevista con el encargado.", "Petri"],
      ["10/09/2023", "1.5.1",   "Se modifica el mandato.", "Petri, Emanuelli, Allasia"],
      ["12/09/2023", "1.6",     "Entrevista con el encargado.", "Petri, Emanuelli, Allasia"],
      ["16/09/2023", "1.6",     "Entrevista al jefe de Logística / depósito.", "Emanuelli, Petri"],
      ["19/09/2023", "1.6",     "Entrevista con el jefe de Logística / depósito.", "Petri, Allasia"],
      ["22/09/2023", "1.6",     "Se modifica el mandato.", "Petri, Emanuelli, Allasia"],
      ["29/09/2023", "1.7",     "Se modifica el mandato, se corrigen el marco metodológico y el flujograma; se agrega el diagnóstico.", "Petri, Emanuelli, Allasia"],
      ["13/10/2023", "1.7.1",   "Se modifica el mandato y se corrige el diagnóstico.", "Emanuelli"],
      ["19/10/2023", "1.7.2",   "Se modifica el mandato y se ajusta el diagnóstico.", "Petri"],
      ["24/10/2023", "1.8",     "Se agrega modelación y se inician los casos de uso.", "Emanuelli"],
      ["25/10/2023", "1.8.1",   "Continúa la modelación; se agregan el diagrama de clases y el diagrama de despliegue.", "Petri"],
      ["25/04/2024", "1.8.2",   "Se agregan el modelado de datos y el diccionario de datos.", "Emanuelli, Petri, Allasia"],
      ["26/06/2024", "1.8.3",   "Se modifica la planificación del proyecto.", "Allasia, Emanuelli"],
      ["31/03/2026", "1.8.3",   "Se acuerda continuar con las tecnologías previamente señaladas. Curso de React / Next.js.", "Emanuelli"],
      ["11/04/2026", "1.8.4",   "Se modifica el diseño.", "Petri, Allasia"],
      ["22/04/2026", "1.8.5",   "Estudio de factibilidad.", "Emanuelli"],
      ["28/04/2026", "1.8.5",   "Se agregan casos de uso al modelado.", "Petri, Emanuelli"],
      ["01/05/2026", "1.8.5.1", "Se continúa con el modelado de datos.", "Allasia, Petri"],
      ["07/05/2026", "1.8.6",   "Se inicia la implementación del sistema.", "Petri"],
      ["12/05/2026", "1.8.6.1", "Modificaciones sobre la implementación.", "Petri"],
      ["21/05/2026", "1.8.7",   "Simulacro de despliegue y modificaciones en el planeamiento.", "Petri, Emanuelli"],
      ["30/05/2026", "1.8.7",   "Revisión integral del trabajo.", "Petri, Emanuelli, Allasia"],
    ],
    [1300, 1100, 4500, 2200]
  ),
  Caption("Tabla 2.6 — Control de versiones del documento."),
];

/* ============================================================ */
/* Capítulo 3 (apertura) — Mandato del Proyecto                  */
/* ============================================================ */
const cap3 = [
  H1("Capítulo 3: Mandato del Proyecto"),

  H2("3.1 Descripción de la empresa"),
  P("Tele Import S.A. es una empresa del rubro de venta de insumos electrónicos, ubicada en el centro comercial HiperLibertad de Rodríguez del Busto, en el Barrio Poeta Lugones de la ciudad de Córdoba. Desarrolla su actividad en dicho centro comercial desde hace varios años; en otra etapa de su historia llegó a contar con varias sucursales, manteniendo en la actualidad la operación en esta única ubicación."),

  H2("3.2 Problemática encontrada"),
  P("La empresa enfrenta tres desafíos centrales: incrementar el volumen de ventas, fidelizar a la cartera de clientes existente y consolidar una mayor visibilidad en el entorno digital."),

  H2("3.3 Objetivo"),
  P("Desarrollar e implementar una plataforma web para Tele Import S.A. que incorpore algoritmos de recomendación basados en las preferencias del cliente, permita la importación y exportación eficiente de datos de productos —apoyándose en etiquetas y metadatos para optimizar la búsqueda y la categorización— y posibilite la personalización de la interfaz para resaltar las características diferenciales de cada producto."),
  P("El objetivo central es utilizar la presencia en línea como herramienta para captar nuevos clientes y fidelizar a los actuales."),
];

/* ============================================================ */
/* Construcción del documento                                    */
/* ============================================================ */
const doc = new Document({
  creator: "Tele Import S.A.",
  title: "Tesis – Capítulos 1 (1.9–1.10), 2 y apertura del 3",
  styles: {
    default: { document: { run: { font: FONT, size: BODY_SIZE } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: NAVY },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: FONT, color: NAVY },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: NAVY },
        paragraph: { spacing: { before: 240, after: 140 }, outlineLevel: 2 } },
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
        size: { width: 11906, height: 16838 },  // A4
        margin: { top: 1417, right: 1417, bottom: 1417, left: 1701 }, // 2.5/3 cm
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Tesis — Tele Import S.A.", font: FONT, size: 18, italics: true, color: "666666" })],
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
      ...s19,
      ...s110,
      ...cap2,
      ...cap3,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = "C:\\Users\\popet\\OneDrive\\Desktop\\Tesis_Cap1-2-3_PlanDic2026.docx";
  fs.writeFileSync(out, buf);
  console.log("OK -> " + out + " (" + buf.length + " bytes)");
});
