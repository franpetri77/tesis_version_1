// =====================================================================
// Tesis completa — Tele Import S.A.
// Capítulos: carátula, tabla de versiones, índice, Capítulo 1 (Análisis
// grupal completo: FODA, empresas, ponderación, carta de presentación,
// primer acercamiento, marco metodológico), Capítulo 2 (planeamiento con
// fases + Gantt + sprints hasta diciembre 2026), Capítulo 3 (mandato).
// Sin captions "Figura X.Y" ni "Tabla X.Y".
// Títulos en negro. Arial 11 / 1.5 / justificado. Márgenes con
// encuadernación (3 cm izquierdo).
// =====================================================================

const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageBreak, PageNumber,
  TableOfContents, VerticalAlign,
} = require("docx");

const FONT = "Arial";
const BODY = 22;
const SMALL = 20;
const BLACK = "000000";
const GANTT = "1F3864";

const border = { style: BorderStyle.SINGLE, size: 6, color: "808080" };
const borders = { top: border, bottom: border, left: border, right: border };

/* ---------- helpers ---------- */
const P = (t, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 360 },
  alignment: opts.center ? AlignmentType.CENTER : (opts.right ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED),
  children: [new TextRun({ text: t, font: FONT, size: opts.size || BODY, bold: !!opts.bold, italics: !!opts.italics })],
});

const H1 = (t, opts = {}) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 480, after: 240 },
  pageBreakBefore: opts.noBreak ? false : true,
  alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
  children: [new TextRun({ text: t, font: FONT, size: 32, bold: true, color: BLACK })],
});

const H2 = t => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 360, after: 180 },
  children: [new TextRun({ text: t, font: FONT, size: 28, bold: true, color: BLACK })],
});

const H3 = t => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 140 },
  children: [new TextRun({ text: t, font: FONT, size: 24, bold: true, color: BLACK })],
});

const BULL = t => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80, line: 320 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: t, font: FONT, size: BODY })],
});

const NUM = t => new Paragraph({
  numbering: { reference: "nums", level: 0 },
  spacing: { after: 80, line: 320 },
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: t, font: FONT, size: BODY })],
});

const PB = () => new Paragraph({ children: [new PageBreak()] });
const SPACER = (n = 1) => Array.from({ length: n }, () => new Paragraph({ spacing: { after: 0, line: 360 }, children: [new TextRun({ text: " ", font: FONT, size: BODY })] }));

const dataTable = (header, rows, colWidths, opts = {}) => {
  const TOTAL = 9100;
  const widths = colWidths || header.map(() => Math.floor(TOTAL / header.length));
  const mkCell = (text, o = {}) => new TableCell({
    borders,
    width: { size: o.w, type: WidthType.DXA },
    shading: o.head ? { fill: GANTT, type: ShadingType.CLEAR } : (o.alt ? { fill: "F5F7FA", type: ShadingType.CLEAR } : undefined),
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    verticalAlign: VerticalAlign.CENTER,
    children: String(text == null ? "" : text).split("\n").map(line => new Paragraph({
      alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 0, line: 280 },
      children: [new TextRun({
        text: line,
        bold: !!o.head || !!o.bold,
        color: o.head ? "FFFFFF" : "000000",
        font: FONT,
        size: SMALL,
      })],
    })),
  });
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => mkCell(h, { head: true, w: widths[i], center: true })) }),
      ...rows.map((r, idx) => new TableRow({ cantSplit: true, children: r.map((c, i) => mkCell(c, { w: widths[i], alt: idx % 2 === 1 })) })),
    ],
  });
};

const formTable = (rows, colWidths) => {
  const TOTAL = 9100;
  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map(r => new TableRow({
      cantSplit: true,
      children: r.map((cell, i) => new TableCell({
        borders,
        width: { size: colWidths[i], type: WidthType.DXA },
        shading: cell.head ? { fill: "E8EEF5", type: ShadingType.CLEAR } : undefined,
        margins: { top: 70, bottom: 70, left: 110, right: 110 },
        children: [new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 0, line: 280 },
          children: [new TextRun({ text: cell.t || "", bold: !!cell.head || !!cell.bold, font: FONT, size: SMALL })],
        })],
      })),
    })),
  });
};

/* ============================================================ */
/* CARÁTULA                                                      */
/* ============================================================ */
const caratula = [
  ...SPACER(6),
  P("UNIVERSIDAD NACIONAL DE CÓRDOBA", { center: true, bold: true, size: 36 }),
  ...SPACER(2),
  P("ESCUELA SUPERIOR DE COMERCIO MANUEL BELGRANO", { center: true, bold: true, size: 30 }),
  ...SPACER(6),
  P("PROYECTO", { center: true, bold: true, size: 32 }),
  ...SPACER(1),
  P("ANALISTA UNIVERSITARIO DE SISTEMAS INFORMÁTICOS", { center: true, bold: true, size: 28 }),
  ...SPACER(8),
  P("INTEGRANTES", { center: true, bold: true, size: 26 }),
  ...SPACER(1),
  P("• EMANUELLI, PABLO", { center: true, size: 24 }),
  P("• PETRI, FRANCISCO", { center: true, size: 24 }),
  P("• ALLASIA, ANTONIO", { center: true, size: 24 }),
  ...SPACER(6),
  P("Año académico 2026", { center: true, italics: true, size: 22 }),
];

/* ============================================================ */
/* TABLA DE VERSIONES                                            */
/* ============================================================ */
const versiones = [
  H1("Tabla de versiones"),
  P("A continuación se presenta el historial de versiones del documento, en el que se detallan las modificaciones realizadas durante todo el desarrollo del proyecto, desde su inicio en junio de 2023 hasta la implementación del prototipo y su revisión integral en mayo de 2026."),
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
];

/* ============================================================ */
/* ÍNDICE (TOC automático)                                       */
/* ============================================================ */
const indice = [
  H1("Índice"),
  new Paragraph({
    children: [new TextRun({
      text: "Tabla de contenidos generada automáticamente a partir de los títulos del documento.",
      font: FONT, size: BODY, italics: true,
    })],
    spacing: { after: 200 },
  }),
  new TableOfContents("Tabla de contenidos", {
    hyperlink: true,
    headingStyleRange: "1-3",
  }),
];

/* ============================================================ */
/* CAPÍTULO 1 — ANÁLISIS GRUPAL                                  */
/* ============================================================ */
const cap1 = [
  H1("Capítulo 1: Análisis grupal"),
  P("El presente capítulo reúne el análisis grupal preliminar del equipo de trabajo, la evaluación de las empresas postuladas como caso de estudio, la justificación de la elección de Tele Import S.A., la carta de presentación remitida al comitente y la descripción inicial de la organización seleccionada. Asimismo se incluye el marco metodológico adoptado para la totalidad del proyecto."),

  /* ---------- 1.1 FODA Grupal ---------- */
  H2("1.1 FODA grupal"),
  P("Se realizó un análisis FODA grupal con el objetivo de identificar las fortalezas, oportunidades, debilidades y amenazas del equipo de trabajo. La finalidad de este ejercicio fue conocer las capacidades y limitaciones del grupo y diseñar un plan de acción que permitiera potenciar las fortalezas y mitigar las debilidades."),
  dataTable(
    ["Fortalezas", "Oportunidades"],
    [
      ["• Compromiso\n• Proactividad\n• Programación\n• Creatividad\n• Redacción",
       "• Avance tecnológico y su incorporación\n• Generación de nuevos contactos\n• Aprendizaje y ejecución de métodos óptimos para tareas extensas"],
      ["Debilidades", "Amenazas"],
      ["• Pensamiento estratégico\n• Capacidad analítica\n• Capacidad de negociación\n• Trabajo grupal\n• Comunicación",
       "• Disponibilidad de tiempo de las empresas\n• Resistencia al cambio\n• Conocimiento del rubro"],
    ],
    [4550, 4550]
  ),

  /* ---------- 1.2 FODA detallado ---------- */
  H2("1.2 FODA detallado"),
  P("Para profundizar el análisis se aplicó una escala de ponderación del 1 al 10, donde 1 representa una manifestación muy débil del rasgo y 10 una manifestación muy fuerte. Cada integrante del equipo evaluó las fortalezas y debilidades identificadas en el apartado anterior, lo que permitió obtener una visión cuantitativa del perfil grupal."),

  H3("Fortalezas"),
  dataTable(
    ["Fortaleza", "Allasia", "Petri", "Emanuelli"],
    [
      ["Compromiso", "7", "9", "8"],
      ["Proactividad", "6", "8", "6"],
      ["Programación", "8", "7", "5"],
      ["Creatividad", "6", "5", "7"],
      ["Redacción", "6", "6", "6"],
    ],
    [3700, 1800, 1800, 1800]
  ),

  H3("Debilidades"),
  dataTable(
    ["Debilidad", "Allasia", "Petri", "Emanuelli"],
    [
      ["Pensamiento estratégico", "8", "6", "6"],
      ["Capacidad analítica", "7", "7", "6"],
      ["Capacidad de negociación", "8", "5", "6"],
      ["Trabajo grupal", "7", "7", "7"],
      ["Comunicación", "8", "8", "6"],
    ],
    [3700, 1800, 1800, 1800]
  ),

  /* ---------- Análisis de fortalezas ---------- */
  H2("1.3 Análisis de fortalezas"),
  P("Como complemento del FODA detallado, se desagregó cada fortaleza en sus manifestaciones concretas observadas dentro del equipo. Este nivel de detalle permite identificar las capacidades reales que pueden aplicarse durante el desarrollo del proyecto."),
  dataTable(
    ["Programación web", "Redacción"],
    [
      ["Programación web con React", "Ortografía"],
      ["Programación en Java y PHP", "Glosario, vocabulario y sintaxis"],
      ["Programación orientada a objetos", "Exposición de información documentada"],
    ],
    [4550, 4550]
  ),
  P(""),
  dataTable(
    ["Compromiso", "Proactividad", "Creatividad"],
    [
      ["Toma de decisiones",
       "Anticipación a los problemas mediante acciones preventivas",
       "Combinación de creatividad y proactividad para generar ideas originales e implementarlas de manera efectiva"],
      ["Responsabilidad",
       "Identificación de nuevas formas de abordar problemas y aplicación a las debilidades",
       "Desarrollo de soluciones innovadoras y generación de un entorno propicio para superar obstáculos"],
      ["Asignación de tareas",
       "Adaptación rápida a los cambios",
       "—"],
    ],
    [3033, 3033, 3034]
  ),

  /* ---------- Variables Objeto ---------- */
  H2("1.4 Variables objeto"),
  P("Las variables objeto representan los aspectos sobre los cuales se aplicarán las fortalezas identificadas. Permiten orientar el trabajo del equipo hacia los puntos críticos del proyecto."),
  dataTable(
    ["Programación", "Comunicación"],
    [
      ["Estructura de la página", "Preguntas directas"],
      ["Maquetación", "Escucha activa"],
      ["Diseño", "Buen manejo del léxico y del habla"],
    ],
    [4550, 4550]
  ),

  /* ---------- Plan de mitigación ---------- */
  H2("1.5 Plan de mitigación"),
  P("Para cada una de las debilidades identificadas se definieron acciones concretas de mitigación, organizadas a continuación."),
  dataTable(
    ["Pensamiento estratégico", "Capacidad analítica"],
    [
      ["Planeamiento concreto y correcto; manejo adecuado de los tiempos.",
       "Práctica e incorporación de una mirada analítica."],
      ["Asignación de fechas mediante calendario y fijación de metas concretas.",
       "Lectura y repaso de manuales, recursos y clases grabadas."],
    ],
    [4550, 4550]
  ),
  P(""),
  dataTable(
    ["Capacidad de negociación", "Comunicación"],
    [
      ["Acción coordinada y estudiada en cada instancia de negociación.",
       "Uso de WhatsApp y reuniones por Meet para conocer mejor a los integrantes del equipo."],
      ["Aplicación de la fortaleza en redacción para fortalecer la negociación.",
       "—"],
    ],
    [4550, 4550]
  ),

  /* ---------- Conclusión FODA ---------- */
  H2("1.6 Conclusión del FODA grupal"),
  P("El análisis FODA grupal aporta una visión integral de las fortalezas, debilidades, oportunidades y amenazas del equipo. El plan de mitigación propuesto, junto con el enfoque proactivo y creativo del grupo, constituye una base sólida para superar las debilidades identificadas y aprovechar las oportunidades del entorno. Con una adecuada implementación de las estrategias y acciones definidas, el equipo cuenta con el potencial necesario para crecer, desarrollarse y alcanzar los objetivos planteados de manera efectiva."),

  /* ---------- 1.7 Empresas ---------- */
  H2("1.7 Empresas postuladas"),
  P("A continuación se presentan las empresas postuladas por el equipo como posibles casos de estudio del proyecto, junto con una breve descripción y la expectativa identificada para cada una."),
  dataTable(
    ["Empresa", "Descripción", "Expectativa"],
    [
      ["Tele Import S.A.",
       "Empresa del rubro de venta de insumos electrónicos, ubicada en el HiperLibertad de Rodríguez del Busto, en el Barrio Poeta Lugones. Desarrolla su actividad en el centro comercial desde hace varios años; en otra etapa de su historia llegó a contar con varias sucursales.",
       "Se identifica como la empresa con mayor potencial. Al no contar con una plataforma web ni con un canal digital para mejorar las ventas, se considera factible aportar una solución en esa dirección."],
      ["Panadería Rossi",
       "Panificadora ubicada en la zona de Marqués de Sobremonte. Funciona como panadería y pastelería, atiende eventos y abastece a otros puntos de venta de la ciudad.",
       "Identificación del problema a través del relevamiento entre los empleados. Posibilidad de organizar un sistema de control de stock o de inventario."],
      ["Ferretería A La Par",
       "Ferretería ubicada en Barrio General Paz, próxima al Barrio Yapeyú. Inició su actividad durante la pandemia con un alto nivel de ventas; tras ese período se encuentra en una etapa de recesión con margen de mejora.",
       "No dispone de un sistema de stock ni de una plataforma web. Se considera factible implementar una base de datos y un canal de exposición."],
      ["Gestamp Córdoba S.A.",
       "Empresa autopartista con más de veinte años de trayectoria y sucursales en todo el mundo, que trabaja con compañías líderes (Renault, Volkswagen, General Motors, Stellantis, entre otras). Está ubicada en el Camino Interfábricas, dentro del Parque Industrial Ferreyra.",
       "Ya cuenta con varios sistemas en funcionamiento. El objetivo sería identificar alguna falencia específica sobre la que se pueda intervenir."],
      ["IM Aromas",
       "Empresa dedicada a la comercialización de productos para el cuidado personal y la aromatización de hogares, oficinas y fábricas. Ubicada en Luis de Tejeda esquina Juan Bautista Daniel, Barrio Valle del Cerro.",
       "No cuenta con infraestructura para la exposición de la empresa ni con acciones de promoción. Se considera factible trabajar sobre ese aspecto."],
      ["Richetta y Cía. S.A.",
       "Empresa dedicada a la comercialización de productos de electricidad e iluminación. Ubicada en Av. Sabattini 4222, próxima al Arco de Córdoba, en Barrio Empalme.",
       "Se busca maximizar el canal de venta mediante la captación de proveedores y la ganancia de exposición en el mercado."],
      ["Cordiez Supermercados",
       "Empresa dedicada a la comercialización de productos comestibles. Ubicada en Av. Sabattini 4500, Barrio Empalme.",
       "Empresa conocida que ya cuenta con sistemas y software en funcionamiento. La idea es indagar dónde es posible mejorar o innovar."],
    ],
    [1700, 4200, 3200]
  ),

  /* ---------- 1.8 Criterios de ponderación ---------- */
  H2("1.8 Criterios de ponderación"),
  P("Para la selección de la empresa se definió una escala de ponderación de 1 a 5, donde 1 representa el menor valor y 5 el máximo. Cada criterio se evalúa de manera independiente y la empresa con mayor puntaje total resulta la seleccionada."),
  dataTable(
    ["Puntaje", "Distancia", "Interés", "Conocimiento del rubro", "Conocido en la empresa", "Tamaño"],
    [
      ["1", "Muy lejos", "Muy poco interés", "Muy poco", "No se tiene en cuenta", "Familiar"],
      ["2", "Lejos", "Poco interés", "Poco", "No se tiene en cuenta", "Pequeña"],
      ["3", "Medio", "Medio", "Medio", "Ningún conocido", "Mediana"],
      ["4", "Cerca", "Interesante", "Alto", "Conocido indirecto", "Varias sucursales"],
      ["5", "Muy cerca", "Muy interesante", "Muy alto", "Conocido directo", "Multinacional"],
    ],
    [900, 1340, 1640, 1640, 1840, 1740]
  ),

  H3("Ponderación final"),
  P("Aplicando los criterios definidos a las empresas postuladas se obtuvo la siguiente matriz de ponderación."),
  dataTable(
    ["Empresa", "Cercanía", "Interés", "Conocimiento del rubro", "Dimensión", "Conocido en la empresa", "Total"],
    [
      ["Gestamp Córdoba",       "1", "3", "2", "5", "2", "13"],
      ["IM Aromas",             "2", "3", "1", "1", "2",  "9"],
      ["Richetta y Cía.",       "2", "4", "2", "3", "2", "13"],
      ["Cordiez Supermercados", "3", "3", "3", "4", "2", "15"],
      ["Tele Import S.A.",      "3", "4", "3", "2", "5", "17"],
      ["Panadería Rossi",       "3", "3", "2", "3", "3", "14"],
      ["Ferretería A La Par",   "3", "2", "2", "3", "4", "14"],
    ],
    [2200, 1100, 1100, 1500, 1100, 1300, 800]
  ),

  H3("Ranking de empresas"),
  dataTable(
    ["Posición", "Empresa", "Puntaje"],
    [
      ["1°", "Tele Import S.A.",      "17"],
      ["2°", "Cordiez Supermercados", "15"],
      ["3°", "Panadería Rossi",       "14"],
      ["3°", "Ferretería A La Par",   "14"],
      ["5°", "Gestamp Córdoba",       "13"],
      ["5°", "Richetta y Cía.",       "13"],
      ["7°", "IM Aromas",              "9"],
    ],
    [1300, 5500, 2300]
  ),

  /* ---------- 1.9 Conclusión de la elección ---------- */
  H2("1.9 Conclusión de la elección"),
  P("Tras un análisis detenido de las empresas postuladas y la ponderación de sus respectivas cualidades, el equipo alcanzó un consenso: la opción más adecuada para llevar adelante el trabajo de campo es Tele Import S.A. Si bien se obtuvieron respuestas negativas de varias empresas previamente consultadas, finalmente se logró concretar la colaboración con Tele Import S.A. La elección se fundamenta en varios motivos relevantes: la presencia de la empresa en el centro comercial HiperLibertad —en el cual desarrolla, además de la venta de insumos, distintos servicios de atención al cliente— y la excelente predisposición manifestada por la organización hacia el desarrollo del proyecto."),
  P("La colaboración con Tele Import S.A. no sólo permitirá llevar adelante el análisis de forma efectiva, sino que también brindará al equipo la oportunidad de desarrollar habilidades específicas como analistas de sistemas, lo que constituye una preparación valiosa frente a los desafíos del mercado laboral futuro."),

  /* ---------- 1.10 Carta de presentación ---------- */
  H2("1.10 Carta de presentación"),
  P("Córdoba Capital, 28 de agosto de 2023.", { right: true }),
  P("Tele Import S.A.", { bold: true }),
  P("HiperLibertad — Rodríguez del Busto, Barrio Poeta Lugones."),
  P("Atención: Sr. Ricardo Scipioni."),
  P(""),
  P("Estimados representantes de Tele Import S.A.:"),
  P("Somos un grupo de estudiantes de tercer año de la carrera de Analista Universitario de Sistemas Informáticos de la Escuela Superior de Comercio Manuel Belgrano, dependiente de la Universidad Nacional de Córdoba."),
  P("Nos dirigimos a ustedes con el propósito de solicitar su autorización para desarrollar nuestro trabajo final de tesis tomando como caso de estudio a su empresa. Este proyecto se enmarca en la asignatura de Práctica Profesional, la cual posee fines tanto profesionalizantes como universitarios y tiene como objetivo consolidar los conocimientos adquiridos durante la formación. Por tal motivo, la selección, los avances y el seguimiento del trabajo se encuentran supervisados y guiados por el profesor responsable de la materia."),
  P("La adquisición de experiencia y práctica resulta fundamental para nuestro desempeño profesional. Por esta razón, sería de gran valor poder realizar consultas sobre la organización sin entorpecer las actividades cotidianas y garantizando, en todo momento, la confidencialidad de la información obtenida."),
  P("Cabe destacar que este trabajo posee un enfoque estrictamente académico, sin fines comerciales de ningún tipo."),
  P("Agradecemos desde ya su atención y quedamos a disposición para responder cualquier consulta o solicitud adicional que pudiera surgir."),
  P("Atentamente,"),
  P(""),
  dataTable(
    ["Integrante", "DNI", "Correo electrónico"],
    [
      ["Petri, Francisco",          "43.812.535", "francisco.petri@mi.unc.edu.ar"],
      ["Allasia, Antonio",          "35.674.319", "antonio.allasia@mi.unc.edu.ar"],
      ["Emanuelli, Pablo Andrés",   "32.080.648", "pablo.emanuelli@mi.unc.edu.ar"],
    ],
    [2800, 2000, 4300]
  ),

  /* ---------- 1.11 Primer acercamiento ---------- */
  H2("1.11 Primer acercamiento"),

  H3("1.11.1 Nombre y rubro"),
  P("La empresa se encuentra ubicada en la zona norte de la ciudad de Córdoba y desarrolla diversas actividades vinculadas a la atención al cliente, entre las que se destacan la venta de insumos electrónicos, el servicio técnico de relojes y de pequeños artefactos eléctricos. Para llevar adelante estas tareas, el personal opera distintas herramientas específicas, lo que requiere un entrenamiento previo por parte de los empleados."),

  H3("1.11.2 Reseña histórica"),
  P("La historia de la organización comienza en el año 1998 como una empresa con varios locales distribuidos en la ciudad de Córdoba. Ricardo, actual encargado del local, fue uno de los primeros empleados en formar parte del proyecto y continúa ejerciendo dicho cargo en la actualidad. Hoy la empresa enfrenta la competencia de varios actores del rubro y se encuentra en la búsqueda de un nuevo ciclo de crecimiento equivalente al alcanzado en períodos anteriores."),

  H3("1.11.3 Organigrama"),
  P("A continuación se presenta el organigrama relevado por el equipo de trabajo durante las visitas a la empresa. En él se sintetizan las áreas funcionales y las dependencias jerárquicas observadas, las cuales serán retomadas en los capítulos siguientes para fundamentar la propuesta de modelación del sistema."),

  /* ---------- 1.12 Marco metodológico ---------- */
  H2("1.12 Marco metodológico"),
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
/* Diagrama de Gantt                                             */
/* ============================================================ */
const ganttTable = () => {
  const periods = [
    "Jun 23", "Jul-Ago 23", "Sep-Oct 23", "Nov 23 – Jun 24",
    "Jul 24 – Mar 26", "Abr-May 26", "Jun-Jul 26",
    "Ago-Sep 26", "Oct 26", "Nov 26", "Dic 26",
  ];
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

  const headCell = (text, w) => new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: GANTT, type: ShadingType.CLEAR },
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, line: 240 },
      children: [new TextRun({ text, bold: true, color: "FFFFFF", font: FONT, size: 16 })],
    })],
  });
  const labelCell = (txt, w) => new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
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
    children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
      children: [new TextRun({ text: " ", font: FONT, size: 14 })] })],
  });

  return new Table({
    width: { size: TOTAL, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: [headCell("Fase", widths[0]), ...periods.map((p, i) => headCell(p, widths[i + 1]))] }),
      ...phases.map(ph => new TableRow({
        cantSplit: true,
        children: [labelCell(`${ph.id} — ${ph.name}`, widths[0]),
                   ...periods.map((_, idx) => barCell(ph.active.includes(idx), widths[idx + 1]))],
      })),
    ],
  });
};

/* ============================================================ */
/* CAPÍTULO 2 — PLANEAMIENTO                                     */
/* ============================================================ */
const cap2 = [
  H1("Capítulo 2: Planeamiento del proyecto"),

  H2("2.1 Planeamiento"),
  P("En la presente etapa se elabora e implementa un plan de acción asociado a un cronograma de las actividades necesarias para iniciar y finalizar el trabajo dentro del plazo establecido por el equipo como meta."),
  P("Se diseñarán modelos de formularios, entrevistas y observaciones destinados a relevamientos en distintos niveles jerárquicos y áreas, con el objetivo de tomar contacto directo con la situación real y actual de la organización."),

  H2("2.2 Planificación de tareas"),
  P("La planificación del proyecto se estructuró en trece fases sucesivas que abarcan desde el estudio preliminar de la organización hasta la defensa final del trabajo. La etapa de prototipado, llevada adelante durante mayo de 2026, permitió alcanzar un nivel de funcionalidad cercano al ochenta por ciento del sistema previsto. A partir de la devolución académica del profesor tutor, prevista para junio y julio de 2026, se incorporan las correcciones correspondientes y comienza la fase de programación oficial, organizada en sprints según la metodología Kanban definida en el marco metodológico, hasta llegar a la defensa del trabajo en diciembre de 2026."),
  P("A continuación se presenta, en primer lugar, una síntesis de las fases con sus fechas, duración y responsables; luego un diagrama de Gantt que resume gráficamente la distribución temporal del trabajo; y, por último, el detalle pormenorizado de las actividades ejecutadas dentro de cada fase."),

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

  H3("2.2.2 Diagrama de Gantt"),
  P("El siguiente diagrama presenta de manera visual la distribución temporal de cada fase del proyecto. Cabe destacar el período de pausa comprendido entre julio de 2024 y marzo de 2026, durante el cual el proyecto permaneció en suspenso hasta su reactivación con la confirmación del stack tecnológico y el inicio del proceso de implementación."),
  ganttTable(),

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

  H2("2.3 Formulario de entrevista"),
  P("Con el fin de estandarizar el registro de la información recabada durante los relevamientos, se elaboró la siguiente planilla modelo, utilizada para todas las entrevistas previstas en el marco metodológico."),
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
  P("A continuación se presenta el modelo de diagrama de Ishikawa adoptado por el equipo de trabajo para representar las causas y efectos identificados durante el análisis."),
];

/* ============================================================ */
/* CAPÍTULO 3 — MANDATO                                          */
/* ============================================================ */
const cap3 = [
  H1("Capítulo 3: Mandato del proyecto"),

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
  title: "Tesis — Tele Import S.A.",
  styles: {
    default: { document: { run: { font: FONT, size: BODY } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: FONT, color: BLACK },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: FONT, color: BLACK },
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
        size: { width: 11906, height: 16838 },
        margin: { top: 1417, right: 1417, bottom: 1417, left: 1701 },
      },
      titlePage: true,  // sin encabezado/pie en la carátula
    },
    headers: {
      default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Tesis — Tele Import S.A.", font: FONT, size: 18, italics: true, color: "666666" })],
      })] }),
      first: new Header({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Página ", font: FONT, size: 18 }),
                   new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 })],
      })] }),
      first: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "" })] })] }),
    },
    children: [
      ...caratula,
      PB(),
      ...versiones,
      PB(),
      ...indice,
      ...cap1,
      ...cap2,
      ...cap3,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = "C:\\Users\\popet\\OneDrive\\Desktop\\Tesis_Completa_TeleImport.docx";
  fs.writeFileSync(out, buf);
  console.log("OK -> " + out + " (" + buf.length + " bytes)");
});
