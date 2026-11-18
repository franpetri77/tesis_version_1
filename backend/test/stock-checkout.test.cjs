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
  if (sql.includes('FROM products WHERE id IN')) return result([...state.products.values()].filter(p => a.some(id => id.toLowerCase() === p.id.toLowerCase())));
  if (sql.includes('FROM products WHERE id = ? FOR UPDATE')) {
    state.locks.push(a[0]);
    return result(state.products.has(a[0]) ? [state.products.get(a[0])] : []);
  }
  if (sql.startsWith('INSERT INTO orders')) {
    state.orders.set(a[0], { id: a[0], user_id: a[2], order_number: a[1], subtotal: a[3], discount_amount: a[4], shipping_cost: a[5], total: a[6], status: 'pending', stock_reserved_at: 'reserved', stock_released_at: null, promotion_id: a[10] ?? null, promotion_released_at: null, expires_at: Math.floor(Date.now() / 1000) + 3600 });
    return result([]);
  }
  if (sql.startsWith('INSERT INTO order_items')) {
    state.items.push({ id: a[0], order_id: a[1], product_id: a[2], quantity: a[3], unit_price: a[4] });
    return result([]);
  }
  if (sql.startsWith('UPDATE products SET stock_quantity')) { state.products.get(a[1].toLowerCase()).stock_quantity = a[0]; return result([]); }
  if (sql.startsWith('INSERT INTO stock_movements')) {
    state.movements.push({ product_id: a[1], type: sql.includes("'venta'") ? 'venta' : 'ajuste', quantity: a[2], previous_quantity: a[3], new_quantity: a[4], reference_id: a[5] });
    return result([]);
  }
  if (sql.startsWith('SELECT UNIX_TIMESTAMP(payment_expires_at)')) return result([{ expires_at: state.orders.get(a[0]).expires_at }]);
  if (sql.includes('FROM orders WHERE id = ? FOR UPDATE')) {
    const order = state.orders.get(a[0]);
    const grace = sql.includes('DATE_SUB') ? 600 : 0;
    return result(order ? [{ ...order, expired: Number(order.expires_at <= Date.now() / 1000 - grace) }] : []);
  }
  if (sql.startsWith('SELECT product_id, quantity FROM order_items')) return result(state.items.filter(i => i.order_id === a[0]));
  if (sql.startsWith('SELECT * FROM promotions WHERE code = ?')) return result([...state.promotions.values()].filter(p => p.code === a[0] && p.is_active).map(p => state.stalePromotionRead ? { ...p, current_uses: 0 } : p));
  if (sql.startsWith('UPDATE promotions SET current_uses = current_uses + 1')) {
    const p = state.promotions.get(a[0]);
    const ok = p && p.is_active && (p.max_uses === null || p.current_uses < p.max_uses);
    if (ok) p.current_uses++;
    return [{ affectedRows: ok ? 1 : 0 }, []];
  }
  if (sql.startsWith('UPDATE promotions SET current_uses = GREATEST')) { const p = state.promotions.get(a[0]); p.current_uses = Math.max(p.current_uses - 1, 0); state.promotionReleases++; return result([]); }
  if (sql.startsWith('UPDATE orders SET promotion_released_at')) { state.orders.get(a[0]).promotion_released_at = 'released'; return result([]); }
  if (sql.startsWith('UPDATE orders SET stock_released_at')) { state.orders.get(a[0]).stock_released_at = 'released'; return result([]); }
  if (sql.startsWith("UPDATE orders SET status = 'cancelled'")) { state.orders.get(a[0]).status = 'cancelled'; return result([]); }
  if (sql.startsWith('UPDATE orders SET status = ?')) { state.orders.get(a[1]).status = a[0]; return result([]); }
  if (sql.startsWith('SELECT id, status FROM payments')) return result(state.payments.filter(p => p.order_id === a[0] && p.mp_payment_id === a[1]));
  if (sql.startsWith('SELECT id FROM payments')) {
    if (sql.includes("status IN ('pending', 'approved')")) return result(state.payments.filter(p => p.order_id === a[0] && (p.status === 'pending' || p.status === 'approved')));
    return result(state.payments.filter(p => p.order_id === a[0] && p.mp_payment_id !== a[1] && p.status === 'approved'));
  }
  if (sql.startsWith('INSERT INTO payments')) {
    state.payments.push({ id: a[0], order_id: a[1], mp_payment_id: a[2], status: a[3], amount: a[4] }); return result([]);
  }
  if (sql.startsWith('UPDATE payments SET')) { Object.assign(state.payments.find(p => p.id === a[3]), { status: a[0], amount: a[1] }); return result([]); }
  if (sql.startsWith('SELECT id FROM orders WHERE status')) {
    const grace = sql.includes('DATE_SUB') ? 600 : 0;
    return result([...state.orders.values()].filter(o => o.status === 'pending' && o.stock_reserved_at && !o.stock_released_at && o.expires_at <= Date.now() / 1000 - grace &&
      (!sql.includes('NOT EXISTS') || !state.payments.some(p => p.order_id === o.id && (sql.includes("IN ('pending', 'approved')") ? ['pending', 'approved'].includes(p.status) : p.status === 'pending')))));
  }
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
  state = { products: new Map(['a', 'b'].map(id => [id, { id, name: 'Producto ' + id, price: 100, stock_quantity: 5, is_active: 1 }])), orders: new Map(), items: [], payments: [], movements: [], locks: [], promotions: new Map(), promotionReleases: 0 };
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
test('la preferencia excluye efectivo y cajero en ambos endpoints', async () => {
  const { body: { order_id } } = await create();
  const expected = [{ id: 'ticket' }, { id: 'atm' }];
  assert.deepEqual(preferenceBody.payment_methods?.excluded_payment_types, expected);
  const legacy = { order_id, order_number: 'ignorado', items: [{ id: 'a', title: 'Producto', quantity: 1, unit_price: 100 }], payer: { email: 'memory@example.invalid', name: 'Prueba', surname: 'Local' } };
  assert.equal((await post('/payments/create-preference', legacy)).status, 200);
  assert.deepEqual(preferenceBody.payment_methods.excluded_payment_types, expected);
});
test('el ítem conserva el id canónico de la base aunque el cliente envíe otra capitalización', async () => {
  state.products.get('a').id = 'A';
  assert.equal((await create([{ product_id: 'a', quantity: 1 }])).status, 201);
  assert.equal(state.items[0].product_id, 'A');
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
test('rechazo concurrente repetido con reserva vencida repone una vez y registra un solo pago', async () => {
  const { body: { order_id } } = await create();
  state.orders.get(order_id).expires_at = 1;
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
  state.orders.get(order_id).expires_at = 1;
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
test('un rechazo de un pedido sin reserva no inventa stock', async () => {
  const { body: { order_id } } = await create();
  state.orders.get(order_id).stock_reserved_at = null;
  await recordOrderPayment(order_id, payment('rejected'));
  assert.equal(state.products.get('a').stock_quantity, 4); assert.equal(state.movements.length, 1);
  assert.equal(state.orders.get(order_id).stock_released_at, null);
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
test('pagos pending, in_process y authorized conservan la reserva y el rechazo posterior repone una vez', async () => {
  for (const status of ['pending', 'in_process', 'authorized']) {
    const { body: { order_id } } = await create();
    await recordOrderPayment(order_id, payment(status));
    state.orders.get(order_id).expires_at = 1;
    assert.equal(await stock.expirePendingOrders(), 0);
    assert.equal(await stock.cancelPendingOrder(order_id, true), false);
    assert.equal(state.orders.get(order_id).status, 'pending');
    assert.equal(state.products.get('a').stock_quantity, 4);
    await Promise.all([recordOrderPayment(order_id, payment('rejected')), recordOrderPayment(order_id, payment('rejected'))]);
    assert.equal(state.orders.get(order_id).status, 'cancelled');
    assert.equal(state.products.get('a').stock_quantity, 5);
    assert.equal(state.movements.filter(m => m.reference_id === order_id && m.type === 'ajuste').length, 1);
  }
});
test('el pago en revisión puede aprobarse después de vencer la preferencia y mantiene el stock descontado', async () => {
  const { body: { order_id } } = await create();
  await recordOrderPayment(order_id, payment('in_process'));
  state.orders.get(order_id).expires_at = 1;
  assert.equal(await stock.expirePendingOrders(), 0);
  await recordOrderPayment(order_id, payment('approved'));
  assert.equal(state.orders.get(order_id).status, 'paid');
  assert.equal(state.products.get('a').stock_quantity, 4);
  assert.equal(await stock.expirePendingOrders(), 0);
});
test('si el pago pendiente llega después de seleccionar candidatos, se revalida bajo bloqueo', async () => {
  const { body: { order_id } } = await create();
  state.orders.get(order_id).expires_at = 1;
  const originalQuery = pool.query;
  pool.query = async (sql, args = []) => {
    const candidates = query(sql, args);
    if (sql.replace(/\s+/g, ' ').trim().startsWith('SELECT id FROM orders WHERE status')) {
      await recordOrderPayment(order_id, payment('in_process'));
    }
    return candidates;
  };
  try { assert.equal(await stock.expirePendingOrders(), 0); }
  finally { pool.query = originalQuery; }
  assert.equal(state.orders.get(order_id).status, 'pending');
  assert.equal(state.products.get('a').stock_quantity, 4);
});
test('sin pago, el vencimiento respeta el margen de diez minutos tanto en barrido como en cancelación directa', async () => {
  const realNow = Date.now;
  const fixedNow = realNow();
  Date.now = () => fixedNow;
  try {
    const { body: { order_id } } = await create();
    state.orders.get(order_id).expires_at = fixedNow / 1000 - 599;
    assert.equal(await stock.expirePendingOrders(), 0);
    assert.equal(await stock.cancelPendingOrder(order_id, true), false);
    state.orders.get(order_id).expires_at = fixedNow / 1000 - 600;
    assert.equal(await stock.expirePendingOrders(), 1);
    assert.equal(state.products.get('a').stock_quantity, 5);
    assert.equal(await stock.cancelPendingOrder(order_id, true), false);
  } finally { Date.now = realNow; }
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
  [...state.orders.values()][0].expires_at = 1;
  assert.equal((await post('/webhooks/mercadopago', { type: 'payment', data: { id: 'memory-payment' } }, false)).status, 500);
  assert.equal(state.products.get('a').stock_quantity, 4);
  assert.equal((await post('/webhooks/mercadopago', { type: 'payment', data: { id: 'memory-payment' } }, false)).status, 200);
  assert.equal(state.products.get('a').stock_quantity, 5);
});
test('intento rechazado o cancelado seguido de otra aprobación conserva el pedido y el stock, sin conciliación', async () => {
  for (const status of ['rejected', 'cancelled']) {
    const stockBefore = state.products.get('a').stock_quantity;
    const { body: { order_id } } = await create();
    const originalError = console.error;
    const errors = [];
    console.error = (...args) => errors.push(args.join(' '));
    try {
      await recordOrderPayment(order_id, payment(status, 'intento-a'));
      assert.equal(state.orders.get(order_id).status, 'pending');
      assert.equal(state.products.get('a').stock_quantity, stockBefore - 1);
      await Promise.all([
        recordOrderPayment(order_id, payment('approved', 'intento-b')),
        recordOrderPayment(order_id, payment(status, 'intento-a')),
      ]);
    } finally { console.error = originalError; }
    assert.equal(state.orders.get(order_id).status, 'paid');
    assert.equal(state.products.get('a').stock_quantity, stockBefore - 1);
    assert.equal(state.payments.filter(p => p.order_id === order_id).length, 2);
    const movements = state.movements.filter(m => m.reference_id === order_id);
    assert.deepEqual(movements.map(m => m.type), ['venta']);
    assert.equal(errors.some(message => message.includes('Conciliación requerida')), false);
  }
});
test('un rechazo solo conserva la reserva hasta el vencimiento con margen y el barrido repone una vez', async () => {
  const realNow = Date.now;
  try {
    const { body: { order_id } } = await create();
    const expiry = state.orders.get(order_id).expires_at;
    await recordOrderPayment(order_id, payment('rejected'));
    assert.equal(state.orders.get(order_id).status, 'pending');
    assert.equal(state.products.get('a').stock_quantity, 4);
    assert.equal(state.payments[0].status, 'rejected');
    assert.equal(await stock.expirePendingOrders(), 0);
    Date.now = () => (expiry + 599) * 1000;
    assert.equal(await stock.expirePendingOrders(), 0);
    assert.equal(state.products.get('a').stock_quantity, 4);
    Date.now = () => (expiry + 600) * 1000;
    assert.equal(await stock.expirePendingOrders(), 1);
    assert.equal(await stock.expirePendingOrders(), 0);
    assert.equal(state.orders.get(order_id).status, 'cancelled');
    assert.equal(state.products.get('a').stock_quantity, 5);
    assert.deepEqual(state.movements.map(m => m.type), ['venta', 'ajuste']);
  } finally { Date.now = realNow; }
});
test('rechazo o cancelación después del margen cancela inmediatamente y repone una sola vez', async () => {
  for (const status of ['rejected', 'cancelled']) {
    const { body: { order_id } } = await create();
    state.orders.get(order_id).expires_at = 1;
    await Promise.all(Array.from({ length: 3 }, () => recordOrderPayment(order_id, payment(status))));
    assert.equal(state.orders.get(order_id).status, 'cancelled');
    assert.equal(state.products.get('a').stock_quantity, 5);
    assert.deepEqual(state.movements.filter(m => m.reference_id === order_id).map(m => m.type), ['venta', 'ajuste']);
    assert.equal(await stock.expirePendingOrders(), 0);
  }
});
test('un rechazo vencido de otro intento no libera la reserva de un pago todavía en revisión', async () => {
  const { body: { order_id } } = await create();
  await recordOrderPayment(order_id, payment('in_process', 'intento-b'));
  state.orders.get(order_id).expires_at = 1;
  await recordOrderPayment(order_id, payment('rejected', 'intento-a'));
  assert.equal(state.orders.get(order_id).status, 'pending');
  assert.equal(state.products.get('a').stock_quantity, 4);
  assert.equal(await stock.expirePendingOrders(), 0);
  await recordOrderPayment(order_id, payment('approved', 'intento-b'));
  assert.equal(state.orders.get(order_id).status, 'paid');
  assert.equal(state.products.get('a').stock_quantity, 4);
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

// ── P3: firma del webhook ────────────────────────────────────────────────
const crypto = require('node:crypto');
const { buildSignatureManifest, verifyWebhookSignature } = require('../dist/routes/webhooks');
const SECRET = 'p3-local-signature-secret';
function sign({ id = '123456', requestId = 'req-1', ts = '1762270000', secret = SECRET, manifest } = {}) {
  const text = manifest ?? `id:${id};request-id:${requestId};ts:${ts};`;
  return `ts=${ts},v1=${crypto.createHmac('sha256', secret).update(text).digest('hex')}`;
}
async function notify({ query = 'data.id=123456&type=payment', headers = {}, payload = { type: 'payment', data: { id: '123456' } } } = {}) {
  const response = await fetch(`${base}/webhooks/mercadopago?${query}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload),
  });
  return response.status;
}
async function withEnv(vars, fn) {
  const saved = Object.fromEntries(Object.keys(vars).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(vars)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  try { return await fn(); } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

test('P3: firma válida sobre el data.id de la URL procesa el pago', async () => {
  await create();
  const status = await withEnv({ MP_WEBHOOK_SECRET: SECRET }, () =>
    notify({ headers: { 'x-signature': sign(), 'x-request-id': 'req-1' } }));
  assert.equal(status, 200);
  assert.equal(state.payments.length, 1);
  assert.equal(state.payments[0].mp_payment_id, '123456');
});
test('P3: la plantilla anterior (request-id en lugar de data.id) se rechaza', async () => {
  await create();
  const old = sign({ manifest: 'id:req-1;request-id:req-1;ts:1762270000;' });
  const status = await withEnv({ MP_WEBHOOK_SECRET: SECRET }, () =>
    notify({ headers: { 'x-signature': old, 'x-request-id': 'req-1' } }));
  assert.equal(status, 401);
  assert.equal(state.payments.length, 0);
});
test('P3: ts, request-id, data.id o secreto alterados invalidan la firma', async () => {
  await create();
  await withEnv({ MP_WEBHOOK_SECRET: SECRET }, async () => {
    const good = sign();
    assert.equal(await notify({ headers: { 'x-signature': good.replace('ts=1762270000', 'ts=1762270001'), 'x-request-id': 'req-1' } }), 401);
    assert.equal(await notify({ headers: { 'x-signature': good, 'x-request-id': 'req-2' } }), 401);
    assert.equal(await notify({ query: 'data.id=999&type=payment', payload: { type: 'payment', data: { id: '999' } }, headers: { 'x-signature': good, 'x-request-id': 'req-1' } }), 401);
    assert.equal(await notify({ headers: { 'x-signature': sign({ secret: 'otro' }), 'x-request-id': 'req-1' } }), 401);
  });
  assert.equal(state.payments.length, 0);
});
test('P3: sin encabezado o con encabezado malformado responde 401, no 500', async () => {
  await create();
  await withEnv({ MP_WEBHOOK_SECRET: SECRET }, async () => {
    assert.equal(await notify(), 401);
    assert.equal(await notify({ headers: { 'x-signature': 'basura', 'x-request-id': 'req-1' } }), 401);
    assert.equal(await notify({ headers: { 'x-signature': 'ts=1,v1=zz', 'x-request-id': 'req-1' } }), 401);
  });
  assert.equal(state.payments.length, 0);
});
test('P3: data.id distinto entre URL y cuerpo, o sólo en el cuerpo con firma activa, se rechaza', async () => {
  await create();
  await withEnv({ MP_WEBHOOK_SECRET: SECRET }, async () => {
    const headers = { 'x-signature': sign(), 'x-request-id': 'req-1' };
    assert.equal(await notify({ headers, payload: { type: 'payment', data: { id: '777' } } }), 401);
    const bodyOnly = { 'x-signature': sign({ manifest: 'request-id:req-1;ts:1762270000;' }), 'x-request-id': 'req-1' };
    assert.equal(await notify({ query: 'type=payment', headers: bodyOnly }), 401);
  });
  assert.equal(state.payments.length, 0);
});
test('P3: sin secreto se rechaza en producción y se omite sólo en desarrollo', async () => {
  await create();
  assert.equal(await withEnv({ MP_WEBHOOK_SECRET: undefined, NODE_ENV: 'production' }, () => notify()), 401);
  assert.equal(state.payments.length, 0);
  assert.equal(await withEnv({ MP_WEBHOOK_SECRET: undefined, NODE_ENV: 'development' }, () => notify()), 200);
  assert.equal(state.payments.length, 1);
});
test('P3: notificaciones que no son de pago se confirman sin consultar MP', async () => {
  await create();
  const original = mp.Payment.prototype.get; let called = false;
  mp.Payment.prototype.get = async (...args) => { called = true; return original(...args); };
  try {
    const status = await withEnv({ MP_WEBHOOK_SECRET: SECRET, NODE_ENV: 'production' }, () =>
      notify({ query: 'topic=merchant_order&id=1', payload: { resource: 'x', topic: 'merchant_order' } }));
    assert.equal(status, 200);
  } finally { mp.Payment.prototype.get = original; }
  assert.equal(called, false);
  assert.equal(state.payments.length, 0);
});
test('P3: la plantilla pasa a minúsculas los id alfanuméricos y omite valores ausentes', () => {
  assert.equal(buildSignatureManifest('ABC123', 'r', '9'), 'id:abc123;request-id:r;ts:9;');
  assert.equal(buildSignatureManifest(undefined, undefined, '9'), 'ts:9;');
  const xSignature = sign({ manifest: 'id:abc123;request-id:r;ts:9;', ts: '9' });
  assert.equal(verifyWebhookSignature({ dataId: 'ABC123', xRequestId: 'r', xSignature, secret: SECRET }), 'valid');
  assert.equal(verifyWebhookSignature({ dataId: 'abc124', xRequestId: 'r', xSignature, secret: SECRET }), 'mismatch');
});

// ── P3b: importes de la preferencia y devolución de cupones ─────────────
const { buildPaymentItems } = require('../dist/routes/payments');
const address = { street: 'Calle', number: '1', city: 'Córdoba', province: 'Córdoba', postal_code: '5000' };
function promo(code, type, value, extra = {}) {
  state.promotions.set(code, { id: code, code, type, value, valid_from: '2026-01-01', valid_until: null, max_uses: null, current_uses: 0, min_order_amount: null, is_active: 1, ...extra });
}
async function order({ items, coupon, shipping = false } = {}) {
  const payload = body(items);
  if (coupon) payload.coupon_code = coupon;
  if (shipping) { payload.delivery_method = 'shipping'; payload.shipping_address = address; }
  return post('/payments/create-order', payload);
}
const cents = v => Math.round(v * 100);
const charged = () => preferenceBody.items.reduce((acc, i) => acc + cents(i.unit_price) * i.quantity, 0);

async function atInstant(iso, job) {
  const RealDate = global.Date;
  const timestamp = new RealDate(iso).getTime();
  global.Date = class extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(timestamp); }
    static now() { return timestamp; }
  };
  try { return await job(); } finally { global.Date = RealDate; }
}

test('cupones: entre 21:00 y 23:59 de Córdoba no vencen ni se activan al cambiar el día UTC', async () => {
  for (const instant of ['2026-11-19T00:00:00Z', '2026-11-19T02:59:59Z']) {
    await atInstant(instant, async () => {
      promo('ULTIMO-DIA', 'percentage', 10, { valid_from:'2026-11-18', valid_until:'2026-11-18' });
      promo('MANANA', 'percentage', 10, { valid_from:'2026-11-19' });
      const valid = await post('/payments/validate-coupon', {code:'ULTIMO-DIA',subtotal:100});
      assert.equal(valid.body.valid, true, instant);
      assert.equal((await order({coupon:'ULTIMO-DIA'})).status, 201, instant);
      assert.equal((await post('/payments/validate-coupon', {code:'MANANA',subtotal:100})).body.valid, false, instant);
      assert.equal((await order({coupon:'MANANA'})).status, 400, instant);
    });
  }
});

test('cupones: a las 00:00 de Córdoba vencimiento e inicio cambian juntos en ambos endpoints', async () => {
  await atInstant('2026-11-19T03:00:00Z', async () => {
    promo('AYER', 'percentage', 10, {valid_until:'2026-11-18'});
    promo('HOY', 'percentage', 10, {valid_from:'2026-11-19'});
    assert.equal((await post('/payments/validate-coupon',{code:'AYER',subtotal:100})).body.valid,false);
    assert.equal((await order({coupon:'AYER'})).status,400);
    assert.equal((await post('/payments/validate-coupon',{code:'HOY',subtotal:100})).body.valid,true);
    assert.equal((await order({coupon:'HOY'})).status,201);
  });
});

test('P3b: sin cupón detalla productos y envío, y la suma es exactamente orders.total', async () => {
  const r = await order({ items: [{ product_id: 'a', quantity: 2 }, { product_id: 'b', quantity: 1 }], shipping: true });
  assert.equal(r.status, 201);
  const o = state.orders.get(r.body.order_id);
  assert.equal(o.total, 3800);
  assert.deepEqual(preferenceBody.items.map(i => [i.id, i.quantity, i.unit_price]), [['a', 2, 100], ['b', 1, 100], ['envio', 1, 3500]]);
  assert.equal(charged(), cents(o.total));
});
test('P3b: cupón porcentual con redondeo cobra un único renglón por orders.total', async () => {
  state.products.get('a').price = 333.33;
  promo('QUINCE', 'percentage', 15);
  const r = await order({ items: [{ product_id: 'a', quantity: 3 }], coupon: 'QUINCE', shipping: true });
  assert.equal(r.status, 201);
  const o = state.orders.get(r.body.order_id);
  assert.equal(o.subtotal, 999.99); assert.equal(o.discount_amount, 150); assert.equal(o.total, 4349.99);
  assert.equal(preferenceBody.items.length, 1);
  assert.equal(preferenceBody.items[0].quantity, 1);
  assert.equal(charged(), cents(o.total));
  assert.match(preferenceBody.items[0].title, /^Pedido .+ · Tele Import$/);
});
test('P3b: cupón de monto fijo y envío gratis también cobran exactamente el total', async () => {
  promo('FIJO', 'fixed_amount', 50);
  const fixed = await order({ items: [{ product_id: 'a', quantity: 2 }], coupon: 'FIJO', shipping: true });
  assert.equal(state.orders.get(fixed.body.order_id).total, 3650);
  assert.equal(charged(), 365000);
  promo('ENVIO', 'free_shipping', 0);
  const free = await order({ items: [{ product_id: 'b', quantity: 1 }], coupon: 'ENVIO', shipping: true });
  const o = state.orders.get(free.body.order_id);
  assert.equal(o.shipping_cost, 0); assert.equal(o.total, 100);
  assert.deepEqual(preferenceBody.items.map(i => i.id), ['b']);
  assert.equal(charged(), cents(o.total));
});
test('P3b: un total de cero se rechaza antes de reservar stock o consumir el cupón', async () => {
  promo('TODO', 'fixed_amount', 1000);
  const r = await order({ coupon: 'TODO' });
  assert.equal(r.status, 400);
  assert.equal(state.orders.size, 0);
  assert.equal(state.products.get('a').stock_quantity, 5);
  assert.equal(state.promotions.get('TODO').current_uses, 0);
  assert.throws(() => buildPaymentItems({ orderNumber: 'X', lines: [], discount: 0, shipping: 0, total: 0 }), /mayor a cero/);
});
test('P3b: el último uso del cupón no se supera con dos compras simultáneas', async () => {
  promo('UNO', 'percentage', 10, { max_uses: 1 });
  const results = await Promise.all([order({ coupon: 'UNO' }), order({ coupon: 'UNO' })]);
  assert.equal(results.filter(r => r.status === 201).length, 1);
  assert.ok(results.some(r => r.status === 400 || r.status === 409));
  assert.equal(state.promotions.get('UNO').current_uses, 1);
  assert.equal(state.orders.size, 1);
  assert.equal(state.products.get('a').stock_quantity, 4);
});
test('P3b: si la validación previa leyó un uso viejo, la transacción rechaza con 409 y no deja pedido ni stock', async () => {
  promo('UNO', 'percentage', 10, { max_uses: 1, current_uses: 1 });
  state.stalePromotionRead = true;
  const r = await order({ coupon: 'UNO' });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /límite de usos/);
  assert.equal(state.orders.size, 0);
  assert.equal(state.items.length, 0);
  assert.equal(state.products.get('a').stock_quantity, 5);
  assert.equal(state.promotions.get('UNO').current_uses, 1);
});
test('P3b: el vencimiento devuelve el uso del cupón una sola vez', async () => {
  promo('DIEZ', 'percentage', 10);
  const { body: { order_id } } = await order({ coupon: 'DIEZ' });
  assert.equal(state.orders.get(order_id).promotion_id, 'DIEZ');
  assert.equal(state.promotions.get('DIEZ').current_uses, 1);
  state.orders.get(order_id).expires_at = 1;
  await Promise.all([stock.expirePendingOrders(), stock.expirePendingOrders()]);
  await stock.cancelPendingOrder(order_id);
  assert.equal(state.orders.get(order_id).status, 'cancelled');
  assert.equal(state.promotions.get('DIEZ').current_uses, 0);
  assert.equal(state.promotionReleases, 1);
});
test('P3b: un rechazo con la reserva vigente conserva el cupón; el barrido posterior lo devuelve una vez', async () => {
  promo('DIEZ', 'percentage', 10);
  const { body: { order_id } } = await order({ coupon: 'DIEZ' });
  await recordOrderPayment(order_id, payment('rejected'));
  assert.equal(state.orders.get(order_id).status, 'pending');
  assert.equal(state.promotions.get('DIEZ').current_uses, 1);
  state.orders.get(order_id).expires_at = 1;
  await stock.expirePendingOrders();
  await recordOrderPayment(order_id, payment('rejected', 'otro'));
  assert.equal(state.promotions.get('DIEZ').current_uses, 0);
  assert.equal(state.promotionReleases, 1);
});
test('P3b: un rechazo después del margen cancela y devuelve el cupón una vez, aun repetido', async () => {
  promo('DIEZ', 'percentage', 10);
  const { body: { order_id } } = await order({ coupon: 'DIEZ' });
  state.orders.get(order_id).expires_at = 1;
  await Promise.all([recordOrderPayment(order_id, payment('rejected')), recordOrderPayment(order_id, payment('cancelled', 'b'))]);
  assert.equal(state.orders.get(order_id).status, 'cancelled');
  assert.equal(state.promotions.get('DIEZ').current_uses, 0);
  assert.equal(state.promotionReleases, 1);
});
test('P3b: un reembolso o un pago aprobado no devuelven el cupón', async () => {
  promo('DIEZ', 'percentage', 10);
  const { body: { order_id } } = await order({ coupon: 'DIEZ' });
  await recordOrderPayment(order_id, { ...payment('approved'), amount: 90 });
  assert.equal(state.orders.get(order_id).status, 'paid');
  await recordOrderPayment(order_id, { ...payment('refunded'), amount: 90 });
  assert.equal(state.orders.get(order_id).status, 'refunded');
  assert.equal(state.promotions.get('DIEZ').current_uses, 1);
  assert.equal(state.promotionReleases, 0);
});
test('P3b: si MP falla después del commit, se cancela y el cupón vuelve', async () => {
  promo('DIEZ', 'percentage', 10);
  preferenceFailure = true;
  const r = await order({ coupon: 'DIEZ' });
  assert.equal(r.status, 500);
  assert.equal(state.promotions.get('DIEZ').current_uses, 0);
  assert.equal(state.products.get('a').stock_quantity, 5);
});
test('P3b: un pedido sin cupón o histórico no toca promociones al cancelarse', async () => {
  const { body: { order_id } } = await order();
  assert.equal(state.orders.get(order_id).promotion_id, null);
  await stock.cancelPendingOrder(order_id);
  assert.equal(state.promotionReleases, 0);
});
test('P3b: el legado cobra el total guardado del pedido, con descuento y envío', async () => {
  promo('QUINCE', 'percentage', 15);
  const { body: { order_id } } = await order({ items: [{ product_id: 'a', quantity: 2 }], coupon: 'QUINCE', shipping: true });
  const o = state.orders.get(order_id);
  preferenceBody = null;
  const legacy = { order_id, order_number: 'ignorado', items: [{ id: 'a', title: 'x', quantity: 2, unit_price: 1 }], payer: { email: 'memory@example.invalid', name: 'Prueba', surname: 'Local' } };
  assert.equal((await post('/payments/create-preference', legacy)).status, 200);
  assert.equal(charged(), cents(o.total));
  assert.equal(o.total, 3670);
});
test('P3b: un pago aprobado por un importe distinto de orders.total queda registrado para conciliar', async () => {
  const { body: { order_id } } = await order();
  const logs = []; const original = console.error;
  console.error = (...args) => { logs.push(args.join(' ')); };
  try {
    await recordOrderPayment(order_id, { ...payment('approved'), amount: 99.99 });
  } finally { console.error = original; }
  assert.ok(logs.some(l => l.includes('Conciliación requerida') && l.includes('99.99')));
  const second = await order();
  const quiet = []; console.error = (...args) => { quiet.push(args.join(' ')); };
  try { await recordOrderPayment(second.body.order_id, { ...payment('approved', 'p2'), amount: 100 }); } finally { console.error = original; }
  assert.equal(quiet.length, 0);
});

// ── P3b, corrección 1 (hallazgos 1 y 2 de Codex): validar el importe cobrado ──
async function quietly(fn) {
  const logs = []; const original = console.error;
  console.error = (...args) => { logs.push(args.join(' ')); };
  try { await fn(); } finally { console.error = original; }
  return logs;
}
test('P3b-c1: un cobro aprobado por exactamente orders.total confirma el pedido', async () => {
  promo('REVISION', 'percentage', 10);
  const { body: { order_id } } = await order({ coupon: 'REVISION', shipping: true });
  const o = state.orders.get(order_id);
  assert.equal(o.total, 3590);
  const logs = await quietly(() => recordOrderPayment(order_id, { ...payment('approved'), amount: 3590 }));
  assert.equal(o.status, 'paid');
  assert.equal(state.payments[0].amount, 3590);
  assert.equal(logs.length, 0);
});
test('P3b-c1: un cobro menor o mayor al total no confirma el pedido y conserva el importe recibido', async () => {
  promo('REVISION', 'percentage', 10);
  for (const amount of [1, 3589.99, 3590.01, 5000]) {
    const { body: { order_id } } = await order({ coupon: 'REVISION', shipping: true });
    const logs = await quietly(() => recordOrderPayment(order_id, { ...payment('approved', 'p-' + amount), amount }));
    const o = state.orders.get(order_id);
    const p = state.payments.find(x => x.mp_payment_id === 'p-' + amount);
    assert.equal(o.status, 'pending', `importe ${amount}`);
    assert.equal(p.status, 'approved');
    assert.equal(p.amount, amount);
    assert.ok(logs.some(l => l.includes('Conciliación requerida') && l.includes('no se confirmó')));
    assert.equal(o.stock_released_at, null);
  }
  assert.equal(state.promotions.get('REVISION').current_uses, 4);
});
test('P3b-c1: importe cero se guarda como 0; ausente o no finito se guarda NULL; ninguno confirma', async () => {
  for (const [id, amount, stored] of [['cero', 0, 0], ['nulo', null, null], ['nan', NaN, null], ['inf', Infinity, null], ['negativo', -100, -100]]) {
    const { body: { order_id } } = await order();
    await quietly(() => recordOrderPayment(order_id, { ...payment('approved', id), amount }));
    const p = state.payments.find(x => x.mp_payment_id === id);
    assert.equal(p.amount, stored, id);
    assert.equal(state.orders.get(order_id).status, 'pending', id);
  }
});
test('P3b-c1: el webhook sin transaction_amount guarda NULL y no confirma', async () => {
  const { body: { order_id } } = await order();
  const original = mp.Payment.prototype.get;
  mp.Payment.prototype.get = async ({ id }) => ({ id, external_reference: order_id, status: 'approved' });
  try {
    const logs = await quietly(async () => assert.equal(await notify(), 200));
    assert.ok(logs.some(l => l.includes('importe ausente')));
  } finally { mp.Payment.prototype.get = original; }
  assert.equal(state.payments[0].amount, null);
  assert.equal(state.orders.get(order_id).status, 'pending');
});
test('P3b-c1: un cobro discrepante retiene stock y cupón ante el barrido, la cancelación por vencimiento y otro rechazo', async () => {
  promo('REVISION', 'percentage', 10);
  const { body: { order_id } } = await order({ coupon: 'REVISION' });
  await quietly(() => recordOrderPayment(order_id, { ...payment('approved', 'corto'), amount: 1 }));
  state.orders.get(order_id).expires_at = 1;
  assert.equal(await stock.expirePendingOrders(), 0);
  assert.equal(await stock.cancelPendingOrder(order_id, true), false);
  await recordOrderPayment(order_id, payment('rejected', 'otro-intento'));
  const o = state.orders.get(order_id);
  assert.equal(o.status, 'pending');
  assert.equal(o.stock_released_at, null);
  assert.equal(state.products.get('a').stock_quantity, 4);
  assert.equal(state.promotions.get('REVISION').current_uses, 1);
  assert.equal(state.promotionReleases, 0);
});
test('P3b-c1: duplicados del cobro discrepante no lo confirman; un intento correcto posterior sí', async () => {
  const { body: { order_id } } = await order();
  await quietly(async () => {
    await recordOrderPayment(order_id, { ...payment('approved', 'corto'), amount: 1 });
    await Promise.all([1, 100, 100].map(amount => recordOrderPayment(order_id, { ...payment('approved', 'corto'), amount })));
  });
  assert.equal(state.orders.get(order_id).status, 'pending');
  assert.equal(state.payments.find(p => p.mp_payment_id === 'corto').amount, 1);
  await recordOrderPayment(order_id, { ...payment('approved', 'correcto'), amount: 100 });
  assert.equal(state.orders.get(order_id).status, 'paid');
  assert.equal(state.movements.length, 1);
});
test('P3b-c1: el reembolso del cobro discrepante cierra el pedido y repone una vez, sin devolver el cupón', async () => {
  promo('REVISION', 'percentage', 10);
  const { body: { order_id } } = await order({ coupon: 'REVISION' });
  await quietly(() => recordOrderPayment(order_id, { ...payment('approved', 'corto'), amount: 1 }));
  await recordOrderPayment(order_id, { ...payment('refunded', 'corto'), amount: 1 });
  await recordOrderPayment(order_id, { ...payment('refunded', 'corto'), amount: 1 });
  assert.equal(state.orders.get(order_id).status, 'refunded');
  assert.equal(state.products.get('a').stock_quantity, 5);
  assert.equal(state.movements.filter(m => m.type === 'ajuste').length, 1);
  assert.equal(state.promotions.get('REVISION').current_uses, 1);
});
