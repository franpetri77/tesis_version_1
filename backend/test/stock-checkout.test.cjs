// node --test test/stock-checkout.test.cjs (después de npm run build).
// Dobles en memoria: no se abre MySQL ni se llama a Mercado Pago.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mp = require('mercadopago');

let state, failSql, preferenceFailure, preferenceBody, paymentStatus;
let tail = Promise.resolve();
const pool = {
  query: async (sql, args = []) => query(sql, args),
  getConnection: async () => {
    let unlock, snapshot;
    return {
      async beginTransaction() {
        const previous = tail;
        tail = new Promise(resolve => { unlock = resolve; });
        await previous;
        snapshot = structuredClone(state);
      },
      query: async (sql, args = []) => query(sql, args),
      async commit() { snapshot = null; unlock(); unlock = null; },
      async rollback() { if (snapshot) state = snapshot; snapshot = null; if (unlock) unlock(); unlock = null; },
      release() { assert.equal(unlock, null, 'No liberar una transacción abierta'); },
    };
  },
};
require.cache[require.resolve('../dist/db/database')] = { exports: { __esModule: true, default: pool } };
process.env.JWT_SECRET = 'p2-local-memory-test-only';
delete process.env.MP_WEBHOOK_SECRET;
mp.Preference.prototype.create = async ({ body }) => {
  preferenceBody = body;
  if (preferenceFailure) throw new Error('Fallo de MP controlado');
  return { id: 'memory-preference', sandbox_init_point: 'https://sandbox.invalid/checkout' };
};
mp.Payment.prototype.get = async ({ id }) => ({
  id, external_reference: [...state.orders.keys()][0], status: paymentStatus, transaction_amount: 100,
});
const stock = require('../dist/services/orderStock');
const { recordOrderPayment } = require('../dist/services/orderPayments');
const { paymentsRouter } = require('../dist/routes/payments');
const { webhooksRouter } = require('../dist/routes/webhooks');

function query(rawSql, a) {
  const sql = rawSql.replace(/\s+/g, ' ').trim();
  if (failSql && sql.startsWith(failSql)) { failSql = null; throw new Error('Fallo SQL controlado'); }
  const result = rows => [structuredClone(rows), []];
  if (sql.startsWith('SELECT id, email, first_name')) return result([{ id: 'memory-user', email: 'memory@example.invalid', first_name: 'Prueba', last_name: 'Local' }]);
  if (sql.includes('FROM products WHERE id IN')) return result([...state.products.values()].filter(p => a.includes(p.id)));
  if (sql.includes('FROM products WHERE id = ? FOR UPDATE')) {
    state.locks.push(a[0]);
    return result(state.products.has(a[0]) ? [state.products.get(a[0])] : []);
  }
  if (sql.startsWith('INSERT INTO orders')) {
    state.orders.set(a[0], { id: a[0], user_id: a[2], order_number: a[1], total: a[6], status: 'pending', stock_reserved_at: 'reserved', stock_released_at: null, expires_at: Math.floor(Date.now() / 1000) + 3600 });
    return result([]);
  }
  if (sql.startsWith('INSERT INTO order_items')) {
    state.items.push({ id: a[0], order_id: a[1], product_id: a[2], quantity: a[3], unit_price: a[4] });
    return result([]);
  }
  if (sql.startsWith('UPDATE products SET stock_quantity')) { state.products.get(a[1]).stock_quantity = a[0]; return result([]); }
  if (sql.startsWith('INSERT INTO stock_movements')) {
    state.movements.push({ product_id: a[1], type: sql.includes("'venta'") ? 'venta' : 'ajuste', quantity: a[2], previous_quantity: a[3], new_quantity: a[4], reference_id: a[5] });
    return result([]);
  }
  if (sql.startsWith('SELECT UNIX_TIMESTAMP(payment_expires_at)')) return result([{ expires_at: state.orders.get(a[0]).expires_at }]);
  if (sql.includes('FROM orders WHERE id = ? FOR UPDATE')) {
    const order = state.orders.get(a[0]);
    return result(order ? [{ ...order, expired: Number(order.expires_at <= Date.now() / 1000) }] : []);
  }
  if (sql.startsWith('SELECT product_id, quantity FROM order_items')) return result(state.items.filter(i => i.order_id === a[0]));
  if (sql.startsWith('UPDATE orders SET stock_released_at')) { state.orders.get(a[0]).stock_released_at = 'released'; return result([]); }
  if (sql.startsWith("UPDATE orders SET status = 'cancelled'")) { state.orders.get(a[0]).status = 'cancelled'; return result([]); }
  if (sql.startsWith('UPDATE orders SET status = ?')) { state.orders.get(a[1]).status = a[0]; return result([]); }
  if (sql.startsWith('SELECT id, status FROM payments')) return result(state.payments.filter(p => p.order_id === a[0] && p.mp_payment_id === a[1]));
  if (sql.startsWith('SELECT id FROM payments')) return result(state.payments.filter(p => p.order_id === a[0] && p.mp_payment_id !== a[1] && p.status === 'approved'));
  if (sql.startsWith('INSERT INTO payments')) {
    state.payments.push({ id: a[0], order_id: a[1], mp_payment_id: a[2], status: a[3], amount: a[4] }); return result([]);
  }
  if (sql.startsWith('UPDATE payments SET')) { Object.assign(state.payments.find(p => p.id === a[3]), { status: a[0], amount: a[1] }); return result([]); }
  if (sql.startsWith('SELECT id FROM orders WHERE status')) return result([...state.orders.values()].filter(o => o.status === 'pending' && o.stock_reserved_at && !o.stock_released_at && o.expires_at <= Date.now() / 1000));
  if (sql.includes('FROM orders o JOIN users u')) {
    const o = state.orders.get(a[0]);
    return result(o && o.user_id === a[1] && o.status === 'pending' && o.stock_reserved_at && !o.stock_released_at && o.expires_at > Date.now() / 1000 ? [{ ...o, email: 'memory@example.invalid', first_name: 'Prueba', last_name: 'Local' }] : []);
  }
  if (sql.startsWith('SELECT oi.product_id AS id')) return result(state.items.filter(i => i.order_id === a[0]).map(i => ({ id: i.product_id, title: state.products.get(i.product_id).name, quantity: i.quantity, unit_price: i.unit_price })));
  throw new Error('SQL no previsto en el doble: ' + sql);
}

let server, base;
const token = jwt.sign({ userId: 'memory-user', role: 'customer' }, process.env.JWT_SECRET);
before(async () => {
  const app = express();
  app.use('/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);
  app.use(express.json());
  app.use('/payments', paymentsRouter);
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  state = { products: new Map(['a', 'b'].map(id => [id, { id, name: 'Producto ' + id, price: 100, stock_quantity: 5, is_active: 1 }])), orders: new Map(), items: [], payments: [], movements: [], locks: [] };
  failSql = null; preferenceFailure = false; preferenceBody = null; paymentStatus = 'pending';
});
const body = (items = [{ product_id: 'a', quantity: 1 }]) => ({ items: items.map(i => ({ ...i, unit_price: 1, product: { name: 'Cliente', sku: 'cliente' } })), delivery_method: 'pickup', shipping_address: null, subtotal: 1, discount_amount: 0, shipping_cost: 0, total: 1 });
async function post(path, payload, authenticated = true) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(payload) });
  return { status: response.status, body: await response.json() };
}
async function create(items) { return post('/payments/create-order', body(items)); }
const payment = (status, id = 'memory-payment') => ({ mp_payment_id: id, mp_status: status, amount: 100, raw_response: { status } });

test('descuenta al crear, guarda trazabilidad y usa precio del servidor y vencimiento de 60 minutos', async () => {
  const response = await create();
  assert.equal(response.status, 201);
  assert.equal(state.products.get('a').stock_quantity, 4);
  assert.equal(state.orders.get(response.body.order_id).total, 100);
  assert.deepEqual(state.movements.map(m => [m.type, m.quantity, m.previous_quantity, m.new_quantity, m.reference_id]), [['venta', 1, 5, 4, response.body.order_id]]);
  assert.equal(preferenceBody.items[0].unit_price, 100);
  assert.equal(preferenceBody.expires, true);
  assert.ok(Math.abs(new Date(preferenceBody.expiration_date_to) - Date.now() - 3600000) < 2000);
  assert.ok(preferenceBody.back_urls.pending.includes('/checkout/pendiente?order='));
});
test('dos compras por el último stock: una 201 y otra 409, sin negativo', async () => {
  state.products.get('a').stock_quantity = 1;
  const result = await Promise.all([create(), create()]);
  assert.deepEqual(result.map(r => r.status).sort(), [201, 409]);
  assert.equal(state.products.get('a').stock_quantity, 0);
  assert.equal(state.orders.size, 1);
  assert.equal(state.movements.length, 1);
});
test('suma renglones duplicados antes de validar stock', async () => {
  const result = await create([{ product_id: 'a', quantity: 3 }, { product_id: 'a', quantity: 3 }]);
  assert.equal(result.status, 409);
  assert.match(result.body.error, /Stock insuficiente/);
  assert.equal(state.orders.size, 0);
});
test('consolida duplicados válidos y ordena los bloqueos para carritos invertidos', async () => {
  assert.equal((await create([{ product_id: 'b', quantity: 1 }, { product_id: 'a', quantity: 1 }, { product_id: 'a', quantity: 2 }])).status, 201);
  assert.deepEqual(state.locks, ['a', 'b']);
  assert.equal(state.items.length, 2);
  assert.equal(state.products.get('a').stock_quantity, 2);
});
test('rechaza cantidades no válidas y exceso de entero sin escrituras', async () => {
  for (const quantity of [0, -1, 1.5, 2147483648]) assert.equal((await create([{ product_id: 'a', quantity }])).status, 400);
  assert.equal((await create([{ product_id: 'a', quantity: 2147483647 }, { product_id: 'a', quantity: 1 }])).status, 409);
  assert.equal(state.orders.size, 0);
});
test('el fallo de un movimiento revierte pedido, ítems y todos los descuentos de stock', async () => {
  failSql = 'INSERT INTO stock_movements';
  assert.equal((await create([{ product_id: 'a', quantity: 2 }, { product_id: 'b', quantity: 1 }])).status, 500);
  assert.equal(state.orders.size, 0); assert.equal(state.items.length, 0); assert.equal(state.movements.length, 0);
  assert.equal(state.products.get('a').stock_quantity, 5); assert.equal(state.products.get('b').stock_quantity, 5);
});
test('si falla MP después del commit, cancela y repone inmediatamente', async () => {
  preferenceFailure = true;
  assert.equal((await create()).status, 500);
  assert.equal([...state.orders.values()][0].status, 'cancelled');
  assert.equal(state.products.get('a').stock_quantity, 5);
  assert.deepEqual(state.movements.map(m => m.type), ['venta', 'ajuste']);
});
test('rechazo concurrente repetido repone una vez y registra un solo pago', async () => {
  const { body: { order_id } } = await create();
  await Promise.all(Array.from({ length: 8 }, () => recordOrderPayment(order_id, payment('rejected'))));
  assert.equal(state.products.get('a').stock_quantity, 5); assert.equal(state.movements.length, 2);
  assert.equal(state.orders.get(order_id).status, 'cancelled');
  assert.equal(state.payments.length, 1); assert.equal(state.payments[0].status, 'rejected');
});
test('cancelación explícita y webhook compiten sin doble reposición', async () => {
  const { body: { order_id } } = await create();
  await Promise.all([stock.cancelPendingOrder(order_id), recordOrderPayment(order_id, payment('cancelled'))]);
  assert.equal(state.products.get('a').stock_quantity, 5); assert.equal(state.movements.length, 2);
});
test('avisos pendientes o rechazados demorados no revierten un pago aprobado', async () => {
  const { body: { order_id } } = await create();
  await recordOrderPayment(order_id, payment('approved'));
  await recordOrderPayment(order_id, payment('pending'));
  await recordOrderPayment(order_id, payment('rejected', 'otro-intento'));
  assert.equal(state.orders.get(order_id).status, 'paid'); assert.equal(state.products.get('a').stock_quantity, 4);
  assert.equal(state.payments[0].status, 'approved');
});
test('aprobación tardía conserva el cobro y no reabre una reserva liberada', async () => {
  const { body: { order_id } } = await create();
  await stock.cancelPendingOrder(order_id);
  await recordOrderPayment(order_id, payment('approved'));
  assert.equal(state.orders.get(order_id).status, 'cancelled');
  assert.equal(state.products.get('a').stock_quantity, 5); assert.equal(state.payments[0].status, 'approved');
});
test('reembolso repetido restaura una sola vez y un aviso viejo no lo deshace', async () => {
  const { body: { order_id } } = await create();
  await recordOrderPayment(order_id, payment('approved'));
  await Promise.all([recordOrderPayment(order_id, payment('refunded')), recordOrderPayment(order_id, payment('refunded'))]);
  await recordOrderPayment(order_id, payment('approved'));
  assert.equal(state.orders.get(order_id).status, 'refunded'); assert.equal(state.products.get('a').stock_quantity, 5);
  assert.equal(state.movements.length, 2); assert.equal(state.payments[0].status, 'refunded');
});
test('un error durante la reposición revierte el pago y permite reintentar', async () => {
  const { body: { order_id } } = await create();
  failSql = 'UPDATE orders SET stock_released_at';
  await assert.rejects(recordOrderPayment(order_id, payment('rejected')));
  assert.equal(state.orders.get(order_id).status, 'pending'); assert.equal(state.products.get('a').stock_quantity, 4);
  assert.equal(state.payments.length, 0); assert.equal(state.movements.length, 1);
  await recordOrderPayment(order_id, payment('rejected'));
  assert.equal(state.products.get('a').stock_quantity, 5);
});
test('reembolsar otro intento no repone una compra que conserva un pago aprobado', async () => {
  const { body: { order_id } } = await create();
  await recordOrderPayment(order_id, payment('approved', 'pago-a'));
  await recordOrderPayment(order_id, payment('refunded', 'pago-b'));
  assert.equal(state.orders.get(order_id).status, 'paid'); assert.equal(state.products.get('a').stock_quantity, 4);
  await recordOrderPayment(order_id, payment('refunded', 'pago-a'));
  assert.equal(state.orders.get(order_id).status, 'refunded'); assert.equal(state.products.get('a').stock_quantity, 5);
});
test('un pedido histórico sin reserva puede cancelarse sin inventar stock', async () => {
  const { body: { order_id } } = await create();
  state.orders.get(order_id).stock_reserved_at = null;
  await recordOrderPayment(order_id, payment('rejected'));
  assert.equal(state.products.get('a').stock_quantity, 4); assert.equal(state.movements.length, 1);
});
test('vencimiento: solo reserva pendiente vencida, una vez incluso con dos barridos', async () => {
  const { body: { order_id } } = await create();
  assert.equal(await stock.expirePendingOrders(), 0);
  state.orders.get(order_id).expires_at = 1;
  const results = await Promise.all([stock.expirePendingOrders(), stock.expirePendingOrders()]);
  assert.equal(results.reduce((a, b) => a + b), 1);
  assert.equal(state.orders.get(order_id).status, 'cancelled'); assert.equal(state.products.get('a').stock_quantity, 5);
});
test('el vencimiento no cancela pagos aprobados ni pedidos históricos', async () => {
  const { body: { order_id } } = await create();
  await recordOrderPayment(order_id, payment('approved'));
  state.orders.get(order_id).expires_at = 1;
  assert.equal(await stock.expirePendingOrders(), 0);
  state.orders.get(order_id).status = 'pending'; state.orders.get(order_id).stock_reserved_at = null;
  assert.equal(await stock.expirePendingOrders(), 0);
  assert.equal(state.products.get('a').stock_quantity, 4);
});
test('una reserva con error no detiene el vencimiento de las demás y se recupera en el barrido siguiente', async () => {
  const first = await create(), second = await create();
  state.orders.get(first.body.order_id).expires_at = 1;
  state.orders.get(second.body.order_id).expires_at = 1;
  failSql = 'UPDATE orders SET stock_released_at';
  assert.equal(await stock.expirePendingOrders(), 1);
  assert.equal(state.products.get('a').stock_quantity, 4);
  assert.equal(await stock.expirePendingOrders(), 1);
  assert.equal(state.products.get('a').stock_quantity, 5);
});
test('webhook real repone y devuelve 500 si falla la transacción, luego acepta reintento', async () => {
  await create(); paymentStatus = 'rejected'; failSql = 'INSERT INTO stock_movements';
  assert.equal((await post('/webhooks/mercadopago', { type: 'payment', data: { id: 'memory-payment' } }, false)).status, 500);
  assert.equal(state.products.get('a').stock_quantity, 4);
  assert.equal((await post('/webhooks/mercadopago', { type: 'payment', data: { id: 'memory-payment' } }, false)).status, 200);
  assert.equal(state.products.get('a').stock_quantity, 5);
});
test('el legado exige autenticación, propiedad y reserva vigente; conserva precios y plazo', async () => {
  const { body: { order_id } } = await create();
  const legacy = { order_id, order_number: 'manipulado', items: [{ id: 'a', title: 'Manipulado', quantity: 99, unit_price: 1 }], payer: { email: 'otra@example.invalid', name: 'Otra', surname: 'Persona' } };
  assert.equal((await post('/payments/create-preference', legacy, false)).status, 401);
  const expiry = preferenceBody.expiration_date_to;
  assert.equal((await post('/payments/create-preference', legacy)).status, 200);
  assert.equal(preferenceBody.expiration_date_to, expiry); assert.equal(preferenceBody.items[0].unit_price, 100);
  assert.equal(preferenceBody.items[0].quantity, 1); assert.equal(preferenceBody.payer.email, 'memory@example.invalid');
  state.orders.get(order_id).user_id = 'otro-usuario';
  assert.equal((await post('/payments/create-preference', legacy)).status, 409);
  state.orders.get(order_id).user_id = 'memory-user'; state.orders.get(order_id).expires_at = 1;
  assert.equal((await post('/payments/create-preference', legacy)).status, 409);
});
