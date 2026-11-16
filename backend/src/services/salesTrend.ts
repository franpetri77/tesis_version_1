// =============================================
// SERVICIO: TENDENCIAS DE COMPRA (R02)
// Agrupa unidades vendidas por período y compara períodos
// equivalentes. La lógica de períodos es pura (sin base de
// datos) para poder probarla de forma aislada.
// =============================================

// Estados que cuentan como venta: el pedido está pagado o avanzando en su
// circuito logístico. pending, cancelled y refunded quedan afuera.
export const SALE_STATUSES = ["paid", "processing", "ready_to_ship", "shipped", "delivered"] as const;
export const SALE_STATUSES_SQL = SALE_STATUSES.map((s) => `'${s}'`).join(",");

export type TrendGroup = "day" | "week" | "month";

// Zona horaria del reporte: la fecha de corte ("hoy") se calcula en hora de
// Córdoba. Un período que termina hoy o después todavía no cerró.
export const REPORT_TIMEZONE = "America/Argentina/Cordoba";

export function todayInReportZone(now: Date = new Date()): string {
  // en-CA formatea como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: REPORT_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export interface TrendRow {
  day: string;          // YYYY-MM-DD
  status: string;
  item_id: string;      // producto o categoría, según el desglose
  item_name: string;
  units: number;
}

export interface TrendPeriod {
  start: string;
  end: string;
  label: string;
  partial: boolean;
  // true si el período no terminó al momento de la consulta (en curso o futuro)
  open: boolean;
  units: number;
  refunded_units: number;
  variation_pct: number | null;
}

export interface TrendBreakdownItem {
  id: string;
  name: string;
  units_current: number;
  units_previous: number;
  variation_pct: number | null;
}

export interface TrendResult {
  series: TrendPeriod[];
  comparison: { current: { start: string; end: string }; previous: { start: string; end: string } } | null;
  breakdown: TrendBreakdownItem[];
}

const MAX_SPAN_DAYS: Record<TrendGroup, number> = { day: 92, week: 371, month: 1100 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export class TrendInputError extends Error {}

function parseDay(value: string): Date {
  if (!DATE_RE.test(value)) throw new TrendInputError("Las fechas deben tener el formato AAAA-MM-DD");
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new TrendInputError(`Fecha inválida: ${value}`);
  }
  return d;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

export function validateTrendInput(from: string, to: string, group: string): { from: Date; to: Date; group: TrendGroup } {
  if (group !== "day" && group !== "week" && group !== "month") {
    throw new TrendInputError("La agrupación debe ser day, week o month");
  }
  const f = parseDay(from);
  const t = parseDay(to);
  if (f > t) throw new TrendInputError("La fecha desde no puede ser posterior a la fecha hasta");
  const span = Math.round((t.getTime() - f.getTime()) / 86_400_000) + 1;
  if (span > MAX_SPAN_DAYS[group]) {
    throw new TrendInputError(`El rango supera el máximo de ${MAX_SPAN_DAYS[group]} días para la agrupación elegida`);
  }
  return { from: f, to: t, group };
}

// Períodos calendario que cubren [from, to]. Un período recortado por el
// rango se marca como parcial y no se compara con uno completo.
export function buildPeriods(from: Date, to: Date, group: TrendGroup): Array<{ start: Date; end: Date; label: string; partial: boolean }> {
  const periods: Array<{ start: Date; end: Date; label: string; partial: boolean }> = [];
  let cursor = from;
  while (cursor <= to) {
    let naturalStart: Date;
    let naturalEnd: Date;
    let label: string;
    if (group === "day") {
      naturalStart = cursor;
      naturalEnd = cursor;
      label = `${String(cursor.getUTCDate()).padStart(2, "0")}/${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    } else if (group === "week") {
      const dow = (cursor.getUTCDay() + 6) % 7; // lunes = 0
      naturalStart = addDays(cursor, -dow);
      naturalEnd = addDays(naturalStart, 6);
      label = `Sem. ${String(naturalStart.getUTCDate()).padStart(2, "0")}/${String(naturalStart.getUTCMonth() + 1).padStart(2, "0")}`;
    } else {
      naturalStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
      naturalEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
      label = `${MONTHS[cursor.getUTCMonth()]} ${cursor.getUTCFullYear()}`;
    }
    const start = naturalStart < from ? from : naturalStart;
    const end = naturalEnd > to ? to : naturalEnd;
    periods.push({ start, end, label, partial: start > naturalStart || end < naturalEnd });
    cursor = addDays(end, 1);
  }
  return periods;
}

function variation(current: number, previous: number): number | null {
  if (previous <= 0) return null; // sin base positiva no hay variación
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function computeTrend(rows: TrendRow[], from: Date, to: Date, group: TrendGroup, asOf: string = todayInReportZone()): TrendResult {
  // Un período cerrado es el que terminó antes de hoy: el de hoy sigue sumando
  // ventas y compararlo daría una caída artificial.
  const periods = buildPeriods(from, to, group).map((p) => ({ ...p, open: iso(p.end) >= asOf }));
  const closed = (p: { partial: boolean; open: boolean }) => !p.partial && !p.open;
  const sale = new Set<string>(SALE_STATUSES);
  const indexOf = (day: string) => periods.findIndex((p) => day >= iso(p.start) && day <= iso(p.end));

  const units = periods.map(() => 0);
  const refunded = periods.map(() => 0);
  const perItem = new Map<string, { name: string; units: number[] }>();
  for (const row of rows) {
    const i = indexOf(row.day);
    if (i < 0) continue;
    const qty = Number(row.units) || 0;
    if (row.status === "refunded") { refunded[i] += qty; continue; }
    if (!sale.has(row.status)) continue;
    units[i] += qty;
    const entry = perItem.get(row.item_id) ?? { name: row.item_name, units: periods.map(() => 0) };
    entry.units[i] += qty;
    perItem.set(row.item_id, entry);
  }

  const series: TrendPeriod[] = periods.map((p, i) => {
    const prev = i > 0 ? periods[i - 1] : undefined;
    const comparable = !!prev && closed(p) && closed(prev);
    return {
      start: iso(p.start), end: iso(p.end), label: p.label, partial: p.partial, open: p.open,
      units: units[i]!, refunded_units: refunded[i]!,
      variation_pct: comparable ? variation(units[i]!, units[i - 1]!) : null,
    };
  });

  // Comparación del desglose: los dos últimos períodos completos, cerrados y consecutivos.
  let cur = -1;
  for (let i = periods.length - 1; i > 0; i--) {
    if (closed(periods[i]!) && closed(periods[i - 1]!)) { cur = i; break; }
  }
  if (cur < 0) return { series, comparison: null, breakdown: [] };

  const breakdown = [...perItem.entries()]
    .map(([id, e]) => ({
      id, name: e.name,
      units_current: e.units[cur]!, units_previous: e.units[cur - 1]!,
      variation_pct: variation(e.units[cur]!, e.units[cur - 1]!),
    }))
    .filter((b) => b.units_current > 0 || b.units_previous > 0)
    .sort((a, b) => b.units_current - a.units_current || b.units_previous - a.units_previous || a.name.localeCompare(b.name))
    .slice(0, 10);

  return {
    series,
    comparison: {
      current: { start: iso(periods[cur]!.start), end: iso(periods[cur]!.end) },
      previous: { start: iso(periods[cur - 1]!.start), end: iso(periods[cur - 1]!.end) },
    },
    breakdown,
  };
}

export function nextDay(value: string): string {
  return iso(addDays(parseDay(value), 1));
}
