// =============================================
// SERVICIO: CSV (T6b)
// Lectura y escritura de CSV según RFC 4180, sin dependencias externas.
// - Detecta el separador (";", "," o tabulación) en la fila de encabezados.
// - Acepta campos entre comillas con saltos de línea y comillas dobladas.
//   Una comilla en medio de un campo sin comillas se toma como texto
//   (ej. {"Color":"Negro"} escrito a mano), como hacen las planillas.
// - Al exportar protege contra fórmulas en planillas (=, +, -, @) con un
//   apóstrofo inicial, que la importación vuelve a quitar. El escape es
//   reversible: un apóstrofo original delante de esos caracteres también
//   se protege, así que exportar e importar no cambia ningún texto.
// =============================================

export type CsvDelimiter = ";" | "," | "\t";

export class CsvError extends Error {}


/** Separador más frecuente fuera de comillas en la primera línea. */
export function detectDelimiter(text: string): CsvDelimiter {
  const counts: Record<CsvDelimiter, number> = { ";": 0, ",": 0, "\t": 0 };
  let quoted = false;
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === "\n" || ch === "\r")) break;
    else if (!quoted && ch in counts) counts[ch as CsvDelimiter]++;
  }
  const best = (Object.keys(counts) as CsvDelimiter[]).sort((a, b) => counts[b] - counts[a])[0];
  return counts[best] > 0 ? best : ";";
}

/**
 * Convierte el texto en filas de celdas. Cada fila trae la línea del archivo
 * donde empieza, para informar errores con el mismo número que ve el usuario.
 */
export function parseCsv(input: string, delimiter: CsvDelimiter = detectDelimiter(input.replace(/^﻿/, ""))): Array<{ line: number; cells: string[] }> {
  const text = input.replace(/^﻿/, "");
  const rows: Array<{ line: number; cells: string[] }> = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let afterQuote = false;
  let line = 1;
  let rowLine = 1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; afterQuote = true; }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell.length === 0 && !afterQuote) {
      quoted = true;
    } else if (ch === '"' && afterQuote) {
      throw new CsvError(`Línea ${line}: comilla inesperada después de cerrar un campo`);
    } else if (ch === delimiter) {
      cells.push(cell); cell = ""; afterQuote = false;
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cells.push(cell); cell = ""; afterQuote = false;
      rows.push({ line: rowLine, cells });
      cells = [];
      line++;
      rowLine = line;
    } else {
      if (afterQuote) throw new CsvError(`Línea ${line}: texto después de cerrar las comillas`);
      cell += ch;
    }
  }
  if (quoted) throw new CsvError(`Línea ${rowLine}: falta cerrar las comillas`);
  if (cell.length > 0 || cells.length > 0 || afterQuote) {
    cells.push(cell);
    rows.push({ line: rowLine, cells });
  }
  // Las filas completamente vacías (por ejemplo, la línea final) no cuentan
  return rows.filter((r) => r.cells.some((c) => c.trim() !== ""));
}

// Texto que una planilla tomaría como fórmula, aunque vaya precedido de
// apóstrofos: "=x", "'=x", "''=x"...
const NEEDS_PROTECTION = /^'*[=+\-@\t\r]/;

/**
 * Quita el apóstrofo de protección que agrega la exportación: exactamente uno.
 * Es la inversa de protectCell: "'=x" → "=x", "''=x" → "'=x".
 */
export function unprotectCell(value: string): string {
  return value.startsWith("'") && NEEDS_PROTECTION.test(value.slice(1)) ? value.slice(1) : value;
}

/**
 * Antepone un apóstrofo a lo que empieza como fórmula. También a lo que ya
 * empieza con apóstrofos seguidos de =, +, -, @, tabulación o CR: si no, la
 * importación no podría distinguir el apóstrofo original del protector y
 * "'=Nombre literal" volvería como "=Nombre literal".
 */
export function protectCell(value: string): string {
  return NEEDS_PROTECTION.test(value) ? `'${value}` : value;
}

function quoteCell(value: string, delimiter: CsvDelimiter): string {
  const safe = protectCell(value);
  return /["\r\n]/.test(safe) || safe.includes(delimiter) || safe !== safe.trim() ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Arma el CSV con BOM (para que las planillas lo abran en UTF-8) y CRLF. */
export function toCsv(rows: string[][], delimiter: CsvDelimiter = ";"): string {
  return "﻿" + rows.map((r) => r.map((c) => quoteCell(c, delimiter)).join(delimiter)).join("\r\n") + "\r\n";
}
