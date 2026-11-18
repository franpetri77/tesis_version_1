// node --test test/notifications-audit.test.cjs (después de npm run build).
// T5: notificaciones, email al encargado y auditoría. Base sustituida por
// un doble programable; no se abre MySQL ni se envían correos.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

let q, handlers, logs, tx, state, locks;
const N = s => s.replace(/\s+/g, ' ').trim();
const clone = v => JSON.parse(JSON.stringify(v));
const pool = {
  query: async (sql, p = []) => {
    const s = N(sql); q.push({ sql: s, p });
    for (const [match, fn] of handlers) if (match(s)) return [await fn(p, s), []];
    return [[], []];
  },
  // Conexión de transacción: registra BEGIN/COMMIT/ROLLBACK, restaura el
  // estado simulado al revertir y emula el bloqueo de fila de FOR UPDATE.
  getConnection: async () => {
    let saved = null; const held = [];
    const releaseLocks = () => { while (held.length) held.pop()(); };
    return {
      beginTransaction: async () => { tx.push('BEGIN'); q.push({ sql: 'BEGIN', p: [] }); saved = clone(state); },
      query: async (sql, p = []) => {
        const s = N(sql);
        const m = s.match(/^SELECT id FROM products WHERE id = \? FOR UPDATE$/);
        if (m) {
          const key = p[0];
          while (locks.get(key)) await locks.get(key);
          let free; locks.set(key, new Promise(r => { free = r; }));
          held.push(() => { locks.delete(key); free(); });
        }
        return pool.query(sql, p);
      },
      commit: async () => { tx.push('COMMIT'); q.push({ sql: 'COMMIT', p: [] }); releaseLocks(); },
      rollback: async () => { tx.push('ROLLBACK'); if (saved) state = saved; releaseLocks(); },
      release() {},
    };
  },
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
  q = []; handlers = []; logs = []; tx = []; state = {}; locks = new Map();
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

// ── Correcciones de la revisión de Codex (18/11) ────────────────────────────
// Producto simulado con estado: el UPDATE y las imágenes modifican `state`,
// y un ROLLBACK lo restaura, como haría MySQL.
function productStore() {
  state.product = { id: 'p1', name: 'Mouse', slug: 'mouse', sku: 'MOU', price: 10000, compare_price: null, category_id: 'cat',
    stock_quantity: 8, brand: 'Logi', model: 'M1', description: 'Viejo', short_description: 'Corto', is_featured: 0, is_active: 1 };
  state.images = [{ image_url: 'https://img.example.invalid/1.jpg', alt_text: 'uno' }];
  on('INSERT INTO products', (p) => { state.product = { id: p[0], name: p[1], slug: p[2], sku: p[3], price: p[4], compare_price: p[5], category_id: p[6],
    stock_quantity: p[7], brand: p[8], model: p[9], description: p[10], short_description: p[11], is_featured: p[12], is_active: p[13] }; state.images = []; return {}; });
  on('SELECT * FROM products WHERE id = ?', () => state.product ? [{ ...state.product }] : []);
  on('SELECT p.*, c.name AS category_name', () => state.product ? [{ ...state.product }] : []);
  on('SELECT image_url, alt_text FROM product_images', () => state.images.map(i => ({ ...i })));
  on('SELECT * FROM product_images', () => state.images.map((i, k) => ({ ...i, sort_order: k })));
  on('UPDATE products SET name', (p) => {
    const P = state.product, keep = (v, old) => (v === null ? old : v);
    Object.assign(P, { name: keep(p[0], P.name), slug: p[1], sku: keep(p[2], P.sku), price: keep(p[3], P.price), compare_price: p[4],
      category_id: keep(p[5], P.category_id), stock_quantity: keep(p[6], P.stock_quantity), brand: p[7], model: p[8], description: p[9],
      short_description: p[10], is_featured: keep(p[11], P.is_featured), is_active: keep(p[12], P.is_active) });
    return { affectedRows: 1 };
  });
  on('DELETE FROM product_images', () => { state.images = []; return {}; });
  on('INSERT INTO product_images', (p) => { state.images.push({ image_url: p[2], alt_text: p[3] }); return {}; });
}
const failAudit = () => handlers.unshift([s => s.startsWith('INSERT INTO audit_logs'), () => { throw new Error('auditoría caída'); }]);
const storeSnapshot = () => clone({ product: state.product, images: state.images });

test('edición de producto: si falla la auditoría se revierte todo y responde 500', async () => {
  productStore(); failAudit();
  const snap = storeSnapshot();
  const r = await call('PUT', '/admin/products/p1', { price: 9000, images: [{ url: 'https://img.example.invalid/2.jpg' }] });
  assert.equal(r.status, 500);
  assert.deepEqual(tx, ['BEGIN', 'ROLLBACK']);
  assert.deepEqual(storeSnapshot(), snap, 'producto e imágenes quedan como estaban');
});
test('alta de producto: si falla la auditoría no queda el producto y responde 500', async () => {
  productStore(); delete state.product; state.images = []; failAudit();
  const r = await call('POST', '/admin/products', { name: 'Teclado', sku: 'TEC', price: 5000, category_id: 'cat', images: [{ url: 'https://img.example.invalid/t.jpg' }] });
  assert.equal(r.status, 500);
  assert.deepEqual(tx, ['BEGIN', 'ROLLBACK']);
  assert.equal(state.product, undefined);
  assert.deepEqual(state.images, []);
});
test('alta de producto: la auditoría va antes del commit e incluye todos los campos e imágenes', async () => {
  productStore(); delete state.product;
  const r = await call('POST', '/admin/products', { name: 'Teclado', sku: 'TEC', price: 5000, category_id: 'cat', brand: 'Redragon',
    description: 'Mecánico', images: [{ url: 'https://img.example.invalid/t.jpg', alt: 'frente' }] });
  assert.equal(r.status, 201);
  const iAudit = q.findIndex(x => x.sql.startsWith('INSERT INTO audit_logs')), iCommit = q.findIndex(x => x.sql === 'COMMIT');
  assert.ok(iAudit >= 0 && iAudit < iCommit, 'la auditoría se escribe dentro de la transacción');
  const [a] = audits();
  assert.equal(a.action, 'product_create');
  assert.equal(a.next.brand, 'Redragon');
  assert.equal(a.next.description, 'Mecánico');
  assert.deepEqual(a.next.images, [{ url: 'https://img.example.invalid/t.jpg', alt: 'frente' }]);
});
test('edición sólo de marca y descripción: queda auditada aunque nombre, precio y stock no cambien', async () => {
  productStore();
  const r = await call('PUT', '/admin/products/p1', { brand: 'Logitech', description: 'Nuevo texto' });
  assert.equal(r.status, 200);
  assert.deepEqual(tx, ['BEGIN', 'COMMIT']);
  assert.deepEqual(audits().map(a => [a.action, a.prev, a.next]),
    [['product_update', { brand: 'Logi', description: 'Viejo' }, { brand: 'Logitech', description: 'Nuevo texto' }]]);
});
test('edición sólo de imágenes: queda auditada con las imágenes anteriores y nuevas', async () => {
  productStore();
  await call('PUT', '/admin/products/p1', { images: [{ url: 'https://img.example.invalid/2.jpg', alt: 'dos' }] });
  const [a] = audits();
  assert.deepEqual(a.prev, { images: [{ url: 'https://img.example.invalid/1.jpg', alt: 'uno' }] });
  assert.deepEqual(a.next, { images: [{ url: 'https://img.example.invalid/2.jpg', alt: 'dos' }] });
});
test('edición sin cambios reales: no genera auditoría', async () => {
  productStore();
  assert.equal((await call('PUT', '/admin/products/p1', { brand: 'Logi' })).status, 200);
  assert.equal(audits().length, 0);
});
test('rol, activación y reseñas: si falla la auditoría, el cambio se revierte (500)', async () => {
  on('SELECT id, role FROM users WHERE id = ?', () => [{ id: 'c1', role: 'customer' }]);
  on('SELECT id, is_active FROM products', () => [{ id: 'p1', is_active: 1 }]);
  on('SELECT id, is_approved FROM product_reviews', () => [{ id: 'r1', is_approved: 0 }]);
  failAudit();
  for (const [m, path, body] of [['PUT', '/admin/users/c1/role', { role: 'readonly' }], ['PATCH', '/admin/products/p1/toggle'], ['PATCH', '/admin/reviews/r1/approve']]) {
    tx = [];
    assert.equal((await call(m, path, body)).status, 500, path);
    assert.deepEqual(tx, ['BEGIN', 'ROLLBACK'], path);
  }
});
test('stock bajo concurrente: dos llamadas simultáneas generan un solo aviso por producto', async () => {
  on('AND stock_quantity <= ?', () => [{ id: 'p1', name: 'Mouse', stock_quantity: 2 }]);
  // Se lee el estado y recién después se responde: sin bloqueo, ambas llamadas
  // leen "sin aviso" antes de que la otra inserte (la carrera que reprodujo Codex).
  on("type = 'stock_low' AND link = ?", async (p) => {
    const seen = q.some(x => x.sql.startsWith('INSERT INTO notifications') && x.p.includes(p[0]));
    await new Promise(r => setTimeout(r, 15));
    return seen ? [{ id: 'x' }] : [];
  });
  const results = await Promise.all([n.notifyLowStock(['p1']), n.notifyLowStock(['p1'])]);
  assert.deepEqual(results.sort(), [0, 2]);
  assert.equal(inserts().length, 2, 'un aviso por administrador, una sola vez');
});
