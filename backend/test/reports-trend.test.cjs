// node --test test/reports-trend.test.cjs (después de npm run build).
// T1: tendencias de compra (R02) y corrección de reportes. Sin MySQL: la base
// se sustituye por un doble que registra las consultas y devuelve filas fijas.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

let queries = [];
let nextRows = [];
const pool = { query: async (sql, params = []) => { queries.push({ sql: sql.replace(/\s+/g, ' '), params }); return [nextRows, []]; } };
require.cache[require.resolve('../dist/db/database')] = { exports: { __esModule: true, default: pool } };
process.env.JWT_SECRET = 't1-local-memory-test-only';

const trend = require('../dist/services/salesTrend');
const { reportsRouter } = require('../dist/routes/reports');

let server, base;
const admin = jwt.sign({ userId: 'u-admin', role: 'admin' }, process.env.JWT_SECRET);
const customer = jwt.sign({ userId: 'u-cust', role: 'customer' }, process.env.JWT_SECRET);
before(async () => {
  const app = express();
  app.use(express.json());
  app.use('/reports', reportsRouter);
  server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(r => server.close(r)); });
beforeEach(() => { queries = []; nextRows = []; });
const get = async (path, token = admin) => {
  const res = await fetch(base + path, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
  return { status: res.status, body: await res.json() };
};
const D = s => new Date(s + 'T00:00:00Z');

// ── Períodos y validación ──────────────────────────────────────────────────
test('meses: el primero y el último se marcan parciales cuando el rango los recorta', () => {
  const p = trend.buildPeriods(D('2026-08-15'), D('2026-11-10'), 'month');
  assert.deepEqual(p.map(x => [x.label, x.partial]), [['ago 2026', true], ['sep 2026', false], ['oct 2026', false], ['nov 2026', true]]);
  assert.equal(p[0].start.toISOString().slice(0, 10), '2026-08-15');
  assert.equal(p[3].end.toISOString().slice(0, 10), '2026-11-10');
});
test('semanas ISO: empiezan el lunes; un rango de lunes a domingo da semanas completas', () => {
  const p = trend.buildPeriods(D('2026-11-02'), D('2026-11-15'), 'week');
  assert.deepEqual(p.map(x => [x.start.toISOString().slice(0, 10), x.end.toISOString().slice(0, 10), x.partial]),
    [['2026-11-02', '2026-11-08', false], ['2026-11-09', '2026-11-15', false]]);
  assert.equal(trend.buildPeriods(D('2026-11-04'), D('2026-11-15'), 'week')[0].partial, true);
});
test('días: un período por fecha, todos completos', () => {
  const p = trend.buildPeriods(D('2026-02-27'), D('2026-03-02'), 'day');
  assert.equal(p.length, 4);
  assert.ok(p.every(x => !x.partial));
});
test('validación: formato, fecha inexistente, orden, agrupación y tope de rango', () => {
  assert.throws(() => trend.validateTrendInput('2026/11/01', '2026-11-10', 'month'), /AAAA-MM-DD/);
  assert.throws(() => trend.validateTrendInput('2026-02-30', '2026-03-10', 'month'), /inválida/);
  assert.throws(() => trend.validateTrendInput('2026-11-10', '2026-11-01', 'month'), /posterior/);
  assert.throws(() => trend.validateTrendInput('2026-11-01', '2026-11-10', 'year'), /day, week o month/);
  assert.throws(() => trend.validateTrendInput('2026-01-01', '2026-06-30', 'day'), /máximo de 92/);
  assert.doesNotThrow(() => trend.validateTrendInput('2024-01-01', '2026-12-31', 'month'));
});

// ── Cálculo ────────────────────────────────────────────────────────────────
const rows = [
  { day: '2026-09-03', status: 'paid', item_id: 'c1', item_name: 'Audio', units: 4 },
  { day: '2026-09-20', status: 'ready_to_ship', item_id: 'c2', item_name: 'Cables', units: 6 },
  { day: '2026-10-05', status: 'delivered', item_id: 'c1', item_name: 'Audio', units: 6 },
  { day: '2026-10-06', status: 'shipped', item_id: 'c2', item_name: 'Cables', units: 3 },
  { day: '2026-10-07', status: 'refunded', item_id: 'c1', item_name: 'Audio', units: 2 },
  { day: '2026-10-08', status: 'pending', item_id: 'c1', item_name: 'Audio', units: 50 },
  { day: '2026-10-09', status: 'cancelled', item_id: 'c2', item_name: 'Cables', units: 50 },
  { day: '2026-11-02', status: 'processing', item_id: 'c1', item_name: 'Audio', units: 1 },
];
test('cuenta ready_to_ship como venta, separa reembolsados e ignora pendientes y cancelados', () => {
  const r = trend.computeTrend(rows, D('2026-09-01'), D('2026-11-10'), 'month');
  assert.deepEqual(r.series.map(s => [s.label, s.units, s.refunded_units]), [['sep 2026', 10, 0], ['oct 2026', 9, 2], ['nov 2026', 1, 0]]);
});
test('variación sólo entre períodos completos consecutivos; el parcial no se compara', () => {
  const r = trend.computeTrend(rows, D('2026-09-01'), D('2026-11-10'), 'month');
  assert.deepEqual(r.series.map(s => s.variation_pct), [null, -10, null]);
  assert.equal(r.series[2].partial, true);
});
test('sin base positiva no hay variación (no se informa infinito ni 100%)', () => {
  const r = trend.computeTrend([{ day: '2026-10-02', status: 'paid', item_id: 'c1', item_name: 'Audio', units: 3 }], D('2026-09-01'), D('2026-10-31'), 'month');
  assert.deepEqual(r.series.map(s => [s.units, s.variation_pct]), [[0, null], [3, null]]);
});
test('desglose: compara los dos últimos períodos completos y ordena por unidades actuales', () => {
  const r = trend.computeTrend(rows, D('2026-09-01'), D('2026-11-10'), 'month');
  assert.deepEqual(r.comparison, { current: { start: '2026-10-01', end: '2026-10-31' }, previous: { start: '2026-09-01', end: '2026-09-30' } });
  assert.deepEqual(r.breakdown.map(b => [b.name, b.units_current, b.units_previous, b.variation_pct]), [['Audio', 6, 4, 50], ['Cables', 3, 6, -50]]);
});
test('sin dos períodos completos no hay comparación ni desglose', () => {
  const r = trend.computeTrend(rows, D('2026-10-10'), D('2026-11-10'), 'month');
  assert.equal(r.comparison, null);
  assert.deepEqual(r.breakdown, []);
});
test('fechas fuera del rango se descartan', () => {
  const r = trend.computeTrend([{ day: '2026-12-01', status: 'paid', item_id: 'c1', item_name: 'A', units: 9 }], D('2026-11-01'), D('2026-11-30'), 'month');
  assert.equal(r.series[0].units, 0);
});

// ── Endpoints ──────────────────────────────────────────────────────────────
test('/sales-trend exige rol admin', async () => {
  assert.equal((await get('/reports/sales-trend', null)).status, 401);
  assert.equal((await get('/reports/sales-trend', customer)).status, 403);
  assert.equal(queries.length, 0);
});
test('/sales-trend: fechas inclusivas, estados de venta + reembolsados, filtros parametrizados', async () => {
  nextRows = rows;
  const r = await get('/reports/sales-trend?from=2026-09-01&to=2026-11-10&group=month&category_id=c1');
  assert.equal(r.status, 200);
  const q = queries[0];
  assert.deepEqual(q.params, ['2026-09-01', '2026-11-11', 'c1']);
  assert.match(q.sql, /o\.created_at >= \? AND o\.created_at < \?/);
  assert.match(q.sql, /'paid','processing','ready_to_ship','shipped','delivered', 'refunded'/);
  assert.match(q.sql, /AND p\.category_id = \?/);
  assert.ok(!q.sql.includes("'c1'"), 'el filtro no se concatena en el SQL');
  assert.equal(r.body.breakdown_by, 'category');
  assert.equal(r.body.series.length, 3);
});
test('/sales-trend: desglose por producto y entradas inválidas con 400 sin consultar la base', async () => {
  await get('/reports/sales-trend?from=2026-10-01&to=2026-10-31&group=week&by=product');
  assert.match(queries[0].sql, /p\.id AS item_id, p\.name AS item_name/);
  queries = [];
  for (const qs of ['from=2026-10-31&to=2026-10-01', 'from=2026-13-01&to=2026-12-01', 'group=year', 'from=2026-01-01&to=2026-12-31&group=day']) {
    const r = await get('/reports/sales-trend?' + qs);
    assert.equal(r.status, 400, qs);
  }
  assert.equal(queries.length, 0);
});
test('/sales: incluye ready_to_ship, fechas inclusivas y 400 ante rango inválido', async () => {
  nextRows = [{ revenue: 1000, count: 2 }];
  const r = await get('/reports/sales?from=2026-11-01&to=2026-11-10');
  assert.equal(r.status, 200);
  assert.match(queries[0].sql, /status IN \('paid','processing','ready_to_ship','shipped','delivered'\)/);
  assert.deepEqual(queries[0].params, ['2026-11-01', '2026-11-11']);
  assert.match(queries[0].sql, /created_at < \?/);
  assert.equal(r.body.metrics.average_order_value, 500);
  queries = [];
  assert.equal((await get('/reports/sales?from=2026-11-10&to=2026-11-01')).status, 400);
  assert.equal(queries.length, 0);
});
test('/top-products y /metrics cuentan ready_to_ship', async () => {
  await get('/reports/top-products?limit=5');
  assert.match(queries[0].sql, /'ready_to_ship'/);
  queries = []; nextRows = [{}];
  await get('/reports/metrics');
  assert.match(queries[0].sql, /status IN \('paid','processing','ready_to_ship','shipped','delivered'\) THEN total/);
});
test('/worst-products suma sólo ítems de pedidos admitidos (subconsulta filtrada, no filtro en el JOIN)', async () => {
  await get('/reports/worst-products?limit=5');
  const sql = queries[0].sql;
  assert.match(sql, /LEFT JOIN \( SELECT oi\.product_id, SUM\(oi\.quantity\) AS total_sold/);
  assert.match(sql, /JOIN orders o ON o\.id = oi\.order_id WHERE o\.status IN \('paid','processing','ready_to_ship','shipped','delivered'\) GROUP BY oi\.product_id \) s/);
  assert.ok(!/LEFT JOIN orders o ON o\.id = oi\.order_id AND/.test(sql));
});
