// node --test test/order-status.test.cjs (después de npm run build).
// T3: gestión de estados del pedido. Base en memoria con transacciones
// serializadas; no se abre MySQL.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

let state, tail = Promise.resolve();
const N = s => s.replace(/\s+/g, ' ').trim();
function query(raw, a = []) {
  const sql = N(raw);
  const r = rows => [structuredClone(rows), []];
  if (sql.startsWith('SELECT id, status, delivery_method FROM orders WHERE id = ? FOR UPDATE')) { const o = state.orders.get(a[0]); return r(o ? [o] : []); }
  if (sql.startsWith("SELECT id FROM payments WHERE order_id = ? AND status IN ('pending', 'approved')")) return r(state.payments.filter(p => p.order_id === a[0] && ['pending', 'approved'].includes(p.status)));
  if (sql.includes('FROM orders WHERE id = ? FOR UPDATE') && sql.includes('stock_reserved_at')) { const o = state.orders.get(a[0]); return r(o ? [{ ...o, expired: 0 }] : []); }
  if (sql.startsWith('SELECT product_id, quantity FROM order_items')) return r(state.items.filter(i => i.order_id === a[0]));
  if (sql.startsWith('SELECT id, stock_quantity FROM products WHERE id = ? FOR UPDATE')) return r([state.products.get(a[0])]);
  if (sql.startsWith('UPDATE products SET stock_quantity')) { state.products.get(a[1]).stock_quantity = a[0]; return r([]); }
  if (sql.startsWith('INSERT INTO stock_movements')) { state.movements.push({ product_id: a[1], quantity: a[2], reference_id: a[5] }); return r([]); }
  if (sql.startsWith('UPDATE orders SET stock_released_at')) { state.orders.get(a[0]).stock_released_at = 'x'; return r([]); }
  if (sql.startsWith('UPDATE promotions SET current_uses = GREATEST')) { state.promotions.get(a[0]).current_uses--; return r([]); }
  if (sql.startsWith('UPDATE orders SET promotion_released_at')) { state.orders.get(a[0]).promotion_released_at = 'x'; return r([]); }
  if (sql.startsWith('UPDATE orders SET status = ?')) { state.orders.get(a[1]).status = a[0]; return r([]); }
  if (sql.startsWith('INSERT INTO audit_logs')) { state.audit.push({ entity_id: a[1], user_id: a[2], previous_value: a[3], new_value: a[4] }); return r([]); }
  if (sql.includes('FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?')) { const o = state.orders.get(a[0]); return r(o ? [{ ...o, user_email: 'cliente@example.invalid', shipping_address: o.shipping_address ?? null }] : []); }
  if (sql.includes('FROM order_items oi LEFT JOIN products p')) return r(state.items.filter(i => i.order_id === a[0]));
  if (sql.startsWith('SELECT id, mp_payment_id, status, amount')) return r(state.payments.filter(p => p.order_id === a[0]));
  if (sql.includes("FROM audit_logs a LEFT JOIN users u")) return r(state.audit.filter(x => x.entity_id === a[0]).map((x, k) => ({ id: 'a' + k, previous_value: x.previous_value, new_value: x.new_value, created_at: '2026-11-16 10:00:00', email: 'admin@example.invalid', first_name: 'Admin', last_name: 'Demo' })));
  throw new Error('SQL no previsto: ' + sql);
}
const pool = {
  query: async (s, a) => query(s, a),
  getConnection: async () => {
    let unlock, snap;
    return {
      async beginTransaction() { const prev = tail; tail = new Promise(r => { unlock = r; }); await prev; snap = structuredClone(state); },
      query: async (s, a) => query(s, a),
      async commit() { snap = null; unlock(); unlock = null; },
      async rollback() { if (snap) state = snap; snap = null; if (unlock) unlock(); unlock = null; },
      release() { assert.equal(unlock, null, 'transacción abierta al liberar'); },
    };
  },
};
require.cache[require.resolve('../dist/db/database')] = { exports: { __esModule: true, default: pool } };
process.env.JWT_SECRET = 't3-local-memory-test-only';
const svc = require('../dist/services/orderStatus');
const { adminRouter } = require('../dist/routes/admin');

let server, base;
const admin = jwt.sign({ userId: 'u-admin', role: 'admin' }, process.env.JWT_SECRET);
const customer = jwt.sign({ userId: 'u-c', role: 'customer' }, process.env.JWT_SECRET);
before(async () => {
  const app = express(); app.use(express.json()); app.use('/admin', adminRouter);
  server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(r => server.close(r)); });
function order(id, status, delivery = 'shipping', extra = {}) {
  state.orders.set(id, { id, order_number: 'TI-' + id, status, delivery_method: delivery, total: 100, stock_reserved_at: 'r', stock_released_at: null, promotion_id: null, promotion_released_at: null, ...extra });
}
beforeEach(() => {
  state = { orders: new Map(), payments: [], items: [], products: new Map([['p1', { id: 'p1', stock_quantity: 3 }]]), promotions: new Map([['CUP', { id: 'CUP', current_uses: 1 }]]), movements: [], audit: [] };
});
const patch = async (id, body, token = admin) => {
  const res = await fetch(`${base}/admin/orders/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};

test('transiciones permitidas según estado y método de entrega', () => {
  assert.deepEqual(svc.allowedTransitions('pending', 'shipping'), ['cancelled']);
  assert.deepEqual(svc.allowedTransitions('paid', 'shipping'), ['processing']);
  assert.deepEqual(svc.allowedTransitions('processing', 'pickup'), ['ready_to_ship']);
  assert.deepEqual(svc.allowedTransitions('ready_to_ship', 'shipping'), ['shipped']);
  assert.deepEqual(svc.allowedTransitions('ready_to_ship', 'pickup'), ['delivered']);
  assert.deepEqual(svc.allowedTransitions('shipped', 'shipping'), ['delivered']);
  for (const s of ['delivered', 'cancelled', 'refunded']) assert.deepEqual(svc.allowedTransitions(s, 'shipping'), []);
});
test('circuito completo con envío: pagado → preparación → listo → enviado → entregado, con auditoría', async () => {
  order('o1', 'paid');
  for (const next of ['processing', 'ready_to_ship', 'shipped', 'delivered']) assert.equal((await patch('o1', { status: next })).status, 200, next);
  assert.equal(state.orders.get('o1').status, 'delivered');
  assert.deepEqual(state.audit.map(a => [JSON.parse(a.previous_value).status, JSON.parse(a.new_value).status, a.user_id]),
    [['paid', 'processing', 'u-admin'], ['processing', 'ready_to_ship', 'u-admin'], ['ready_to_ship', 'shipped', 'u-admin'], ['shipped', 'delivered', 'u-admin']]);
});
test('retiro en el local: de listo pasa directo a entregado; no puede marcarse enviado', async () => {
  order('o2', 'ready_to_ship', 'pickup');
  assert.equal((await patch('o2', { status: 'shipped' })).status, 409);
  assert.equal((await patch('o2', { status: 'delivered', note: 'Retiró en sucursal' })).status, 200);
  assert.equal(JSON.parse(state.audit[0].new_value).note, 'Retiró en sucursal');
});
test('no se saltean pasos ni se retrocede; estado inexistente → 400; pedido inexistente → 404', async () => {
  order('o3', 'paid');
  assert.equal((await patch('o3', { status: 'shipped' })).status, 409);
  order('o4', 'shipped');
  assert.equal((await patch('o4', { status: 'processing' })).status, 409);
  assert.equal((await patch('o3', { status: 'en_camino' })).status, 400);
  assert.equal((await patch('nada', { status: 'processing' })).status, 404);
  assert.equal((await patch('o3', { note: 'sin estado' })).status, 400);
  assert.equal(state.audit.length, 0);
});
test('un pedido pagado no se cancela desde el panel: indica reembolsar en Mercado Pago', async () => {
  order('o5', 'processing');
  const r = await patch('o5', { status: 'cancelled' });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /reembolsándolo desde Mercado Pago/);
  assert.equal(state.orders.get('o5').status, 'processing');
});
test('cancelar un pendiente sin pagos repone stock y devuelve el cupón una vez', async () => {
  order('o6', 'pending', 'shipping', { promotion_id: 'CUP' });
  state.items.push({ order_id: 'o6', product_id: 'p1', quantity: 2 });
  const [a, b] = await Promise.all([patch('o6', { status: 'cancelled' }), patch('o6', { status: 'cancelled' })]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  assert.equal(state.orders.get('o6').status, 'cancelled');
  assert.equal(state.products.get('p1').stock_quantity, 5);
  assert.equal(state.movements.length, 1);
  assert.equal(state.promotions.get('CUP').current_uses, 0);
  assert.equal(state.audit.length, 1);
});
test('un pedido histórico pendiente (sin reserva) se cancela sin inventar stock', async () => {
  order('o7', 'pending', 'pickup', { stock_reserved_at: null });
  state.items.push({ order_id: 'o7', product_id: 'p1', quantity: 2 });
  assert.equal((await patch('o7', { status: 'cancelled' })).status, 200);
  assert.equal(state.products.get('p1').stock_quantity, 3);
  assert.equal(state.movements.length, 0);
});
test('con un pago en proceso o a conciliar no se cancela', async () => {
  for (const st of ['pending', 'approved']) {
    order('o8' + st, 'pending');
    state.payments.push({ order_id: 'o8' + st, status: st });
    const r = await patch('o8' + st, { status: 'cancelled' });
    assert.equal(r.status, 409, st);
    assert.equal(state.orders.get('o8' + st).status, 'pending');
  }
});
test('el cambio de estado exige rol admin', async () => {
  order('o9', 'paid');
  assert.equal((await patch('o9', { status: 'processing' }, customer)).status, 403);
  assert.equal(state.orders.get('o9').status, 'paid');
});
test('detalle del pedido: ítems, pagos, historial y transiciones disponibles', async () => {
  order('o10', 'paid', 'shipping', { shipping_address: JSON.stringify({ city: 'Córdoba' }) });
  state.items.push({ order_id: 'o10', product_id: 'p1', product_name: 'Auriculares', quantity: 1, unit_price: 100 });
  state.payments.push({ order_id: 'o10', status: 'approved', amount: 100 });
  await patch('o10', { status: 'processing', note: 'Armando' });
  const res = await fetch(`${base}/admin/orders/o10`, { headers: { Authorization: 'Bearer ' + admin } });
  const { data } = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.shipping_address.city, 'Córdoba');
  assert.equal(data.items.length, 1);
  assert.equal(data.payments.length, 1);
  assert.deepEqual(data.history.map(h => [h.from, h.to, h.note]), [['paid', 'processing', 'Armando']]);
  assert.deepEqual(data.allowed_transitions, [{ status: 'ready_to_ship', label: 'Listo para enviar o retirar' }]);
  assert.equal((await fetch(`${base}/admin/orders/nada`, { headers: { Authorization: 'Bearer ' + admin } })).status, 404);
});
