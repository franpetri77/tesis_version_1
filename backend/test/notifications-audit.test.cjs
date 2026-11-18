// node --test test/notifications-audit.test.cjs (después de npm run build).
// T5: notificaciones, email al encargado y auditoría. Base sustituida por
// un doble programable; no se abre MySQL ni se envían correos.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

let q, handlers, logs;
const N = s => s.replace(/\s+/g, ' ').trim();
const pool = {
  query: async (sql, p = []) => {
    const s = N(sql); q.push({ sql: s, p });
    for (const [match, fn] of handlers) if (match(s)) return [fn(p, s), []];
    return [[], []];
  },
  getConnection: async () => ({ beginTransaction: async () => {}, query: pool.query, commit: async () => {}, rollback: async () => {}, release() {} }),
};
require.cache[require.resolve('../dist/db/database')] = { exports: { __esModule: true, default: pool } };
process.env.JWT_SECRET = 't5-local-memory-test-only';
delete process.env.SMTP_HOST; delete process.env.MANAGER_EMAIL;
const n = require('../dist/services/notifications');
const { diffFields } = require('../dist/services/audit');
const { adminRouter } = require('../dist/routes/admin');

const inserts = () => q.filter(x => x.sql.startsWith('INSERT INTO notifications')).flatMap(x => {
  const out = []; for (let k = 0; k < x.p.length; k += 6) out.push({ user: x.p[k + 1], type: x.p[k + 2], title: x.p[k + 3], message: x.p[k + 4], link: x.p[k + 5] }); return out;
});
const audits = () => q.filter(x => x.sql.startsWith('INSERT INTO audit_logs')).map(x => ({ action: x.p[1], type: x.p[2], id: x.p[3], user: x.p[4], prev: x.p[5] && JSON.parse(x.p[5]), next: x.p[6] && JSON.parse(x.p[6]) }));
const on = (needle, fn) => handlers.push([s => s.includes(needle), fn]);
let server, base, origWarn, origErr;
const admin = jwt.sign({ userId: 'u-admin', role: 'admin' }, process.env.JWT_SECRET);
before(async () => {
  const app = express(); app.use(express.json()); app.use('/admin', adminRouter);
  server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
  origWarn = console.warn; origErr = console.error;
});
after(async () => { console.warn = origWarn; console.error = origErr; await new Promise(r => server.close(r)); });
beforeEach(() => {
  q = []; handlers = []; logs = [];
  console.warn = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' '));
  on("SELECT id FROM users WHERE role = 'admin'", () => [{ id: 'a1' }, { id: 'a2' }]);
});
const call = async (method, path, body) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + admin }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};
const order = { id: 'o1', order_number: 'TI-1', user_id: 'c1', total: 99800, delivery_method: 'pickup', shipping_address: null, first_name: 'Ana', last_name: 'Paz', email: 'ana@example.invalid', phone: null };

test('pedido pagado: aviso al cliente, a cada admin, email al encargado (log sin MANAGER_EMAIL) y stock bajo', async () => {
  on('o.user_id, o.total', () => [order]);
  on('FROM order_items oi LEFT JOIN products p', () => [{ product_id: 'p1', quantity: 2, total_price: 99800, name: 'Auriculares', sku: 'AUR' }]);
  on('AND stock_quantity <= ?', () => [{ id: 'p1', name: 'Auriculares', stock_quantity: 1 }]);
  await n.notifyOrderPaid('o1');
  const rows = inserts();
  assert.deepEqual(rows.map(r => [r.user, r.type]), [['c1', 'order_status'], ['a1', 'order_new'], ['a2', 'order_new'], ['a1', 'stock_low'], ['a2', 'stock_low']]);
  assert.equal(rows[0].message, 'Recibimos tu pago. Vamos a preparar tu pedido.');
  assert.match(rows[1].message, /Ana Paz · \$99\.800 · retiro en el local/);
  assert.equal(rows[1].link, '/admin/pedidos/o1');
  assert.equal(rows[3].message, 'Quedan 1 unidades.');
  assert.ok(logs.some(l => l.includes('MANAGER_EMAIL no configurado') && l.includes('TI-1')));
});
test('email al encargado: con MANAGER_EMAIL y sin SMTP queda registrado en el log con el detalle del pedido', async () => {
  process.env.MANAGER_EMAIL = 'encargado@example.invalid';
  try {
    on('o.user_id, o.total', () => [{ ...order, delivery_method: 'shipping', shipping_address: JSON.stringify({ street: 'Colón', number: '1', city: 'Córdoba', postal_code: '5000' }) }]);
    on('FROM order_items oi LEFT JOIN products p', () => [{ product_id: 'p1', quantity: 1, total_price: 99800, name: 'Auriculares', sku: 'AUR' }]);
    await n.notifyOrderPaid('o1');
    const log = logs.find(l => l.includes('SMTP no configurado'));
    assert.ok(log, 'debe registrar el correo no enviado');
    assert.match(log, /encargado@example\.invalid/);
    assert.match(log, /Nuevo pedido TI-1/);
    assert.match(log, /envío a Colón 1, Córdoba \(5000\)/);
  } finally { delete process.env.MANAGER_EMAIL; }
});
test('estado del pedido: mensaje según retiro o envío; estados sin mensaje no generan aviso', async () => {
  on('o.user_id, o.total', () => [order]);
  await n.notifyOrderStatus('o1', 'ready_to_ship');
  await n.notifyOrderStatus('o1', 'pending');
  assert.deepEqual(inserts().map(r => [r.user, r.message, r.link]), [['c1', 'Tu pedido está listo para retirar en el local.', '/perfil/pedidos/o1']]);
});
test('stock bajo: no repite el aviso del mismo producto dentro de 24 h', async () => {
  on('AND stock_quantity <= ?', () => [{ id: 'p1', name: 'A', stock_quantity: 0 }, { id: 'p2', name: 'B', stock_quantity: 3 }]);
  on("type = 'stock_low' AND link = ?", (p) => p[0] === '/admin/stock?producto=p1' ? [{ id: 'x' }] : []);
  assert.equal(await n.notifyLowStock(['p1', 'p2']), 2);
  assert.deepEqual(inserts().map(r => [r.user, r.title]), [['a1', 'Stock bajo: B'], ['a2', 'Stock bajo: B']]);
  q = [];
  assert.equal(await n.notifyLowStock([]), 0);
  assert.equal(q.length, 0);
});
test('producto nuevo: aviso personalizado a quienes compraron o miraron la categoría', async () => {
  on('WHERE p.id = ? AND p.is_active = 1 AND c.is_active = 1', () => [{ id: 'p9', name: 'Parlante', slug: 'parlante', price: 25000, category_id: 'audio', category_name: 'Audio' }]);
  on('SELECT DISTINCT u.id FROM users u', () => [{ id: 'c1' }, { id: 'c2' }]);
  assert.equal(await n.notifyNewProduct('p9'), 2);
  const aud = q.find(x => x.sql.startsWith('SELECT DISTINCT u.id FROM users u'));
  assert.deepEqual(aud.p, ['audio', 'audio']);
  assert.match(aud.sql, /product_views v/); assert.match(aud.sql, /INTERVAL 365 DAY/); assert.match(aud.sql, /LIMIT 500/);
  assert.deepEqual(inserts().map(r => [r.user, r.type, r.title, r.link]), [['c1', 'product_new', 'Nuevo en Audio', '/producto/parlante'], ['c2', 'product_new', 'Nuevo en Audio', '/producto/parlante']]);
});
test('producto inactivo o de categoría inactiva: no avisa', async () => {
  assert.equal(await n.notifyNewProduct('p9'), 0);
  assert.equal(inserts().length, 0);
});
test('baja de precio: sólo si baja, a quienes miraron el producto', async () => {
  on('SELECT id, name, slug FROM products', () => [{ id: 'p1', name: 'Mouse', slug: 'mouse' }]);
  on('SELECT DISTINCT v.user_id FROM product_views v', () => [{ user_id: 'c3' }]);
  assert.equal(await n.notifyPriceDrop('p1', 10000, 12000), 0);
  assert.equal(await n.notifyPriceDrop('p1', 10000, 8000), 1);
  assert.deepEqual(inserts().map(r => [r.user, r.type, r.message]), [['c3', 'price_drop', 'Antes $10.000, ahora $8.000.']]);
});
test('reseña nueva: aviso de moderación a los administradores', async () => {
  assert.equal(await n.notifyNewReview('Mouse'), 2);
  assert.deepEqual(inserts().map(r => [r.user, r.type, r.link]), [['a1', 'review_new', '/admin/resenas'], ['a2', 'review_new', '/admin/resenas']]);
});
test('diffFields: sólo los campos que cambiaron', () => {
  assert.deepEqual(diffFields({ price: 100, name: 'A', stock: 3 }, { price: 90, name: 'A', stock: undefined }), { previous: { price: 100 }, next: { price: 90 } });
  assert.equal(diffFields({ price: 100 }, { price: '100' }), null);
});

// ── Auditoría en rutas de administración ────────────────────────────────────
test('cambio de rol: audita rol anterior y nuevo, con el admin que lo hizo', async () => {
  on('SELECT id, role FROM users WHERE id = ?', () => [{ id: 'c1', role: 'customer' }]);
  on('SELECT id, email, first_name', () => [{ id: 'c1', role: 'readonly' }]);
  assert.equal((await call('PUT', '/admin/users/c1/role', { role: 'readonly' })).status, 200);
  assert.deepEqual(audits(), [{ action: 'user_role', type: 'user', id: 'c1', user: 'u-admin', prev: { role: 'customer' }, next: { role: 'readonly' } }]);
});
test('activar/desactivar producto y eliminarlo quedan auditados', async () => {
  on('SELECT id, is_active FROM products', () => [{ id: 'p1', is_active: 1 }]);
  on('SELECT id, name, sku FROM products', () => [{ id: 'p1', name: 'Mouse', sku: 'MOU' }]);
  await call('PATCH', '/admin/products/p1/toggle');
  await call('DELETE', '/admin/products/p1');
  assert.deepEqual(audits().map(a => [a.action, a.prev, a.next]), [['product_toggle', { is_active: true }, { is_active: false }], ['product_delete', { name: 'Mouse', sku: 'MOU' }, null]]);
});
test('moderación de reseñas: aprobar y eliminar quedan auditados', async () => {
  on('SELECT id, is_approved FROM product_reviews', () => [{ id: 'r1', is_approved: 0 }]);
  on('SELECT id, product_id, rating FROM product_reviews', () => [{ id: 'r1', product_id: 'p1', rating: 4 }]);
  await call('PATCH', '/admin/reviews/r1/approve');
  await call('DELETE', '/admin/reviews/r1');
  assert.deepEqual(audits().map(a => a.action), ['review_approve', 'review_delete']);
});
test('eliminar un usuario con registros asociados responde 409 en lugar de 500', async () => {
  on('SELECT id, email, role FROM users WHERE id = ?', () => [{ id: 'c1', email: 'c@example.invalid', role: 'customer' }]);
  handlers.unshift([s => s.startsWith('DELETE FROM users'), () => { const e = new Error('fk'); e.code = 'ER_ROW_IS_REFERENCED_2'; throw e; }]);
  const r = await call('DELETE', '/admin/users/c1');
  assert.equal(r.status, 409);
  assert.equal(audits().length, 0);
});
test('consulta de auditoría: filtros por usuario, entidad y fechas inclusivas; 400 con fecha inválida', async () => {
  on('SELECT COUNT(*) AS total', () => [{ total: 0 }]);
  await call('GET', '/admin/audit-logs?user_id=u-admin&entity_type=order&entity_id=o1&from=2026-11-01&to=2026-11-18');
  const sel = q.find(x => x.sql.includes('FROM audit_logs al LEFT JOIN users u'));
  assert.deepEqual(sel.p.slice(0, 5), ['order', 'u-admin', 'o1', '2026-11-01', '2026-11-18']);
  assert.match(sel.sql, /al\.created_at < DATE_ADD\(\?, INTERVAL 1 DAY\)/);
  assert.match(sel.sql, /LEFT JOIN orders o ON o\.id = al\.entity_id AND al\.entity_type = 'order'/);
  q = [];
  assert.equal((await call('GET', '/admin/audit-logs?from=18/11/2026')).status, 400);
  assert.equal(q.length, 0);
});
