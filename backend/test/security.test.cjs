// node --test test/security.test.cjs (después de npm run build).
// T7: rol de solo lectura, último administrador, Zod en auth, límite de
// intentos, secreto JWT obligatorio en producción y SSL de la base.
// Base sustituida por un doble programable; no se abre MySQL ni se envían correos.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

let q, handlers, tx;
const N = s => s.replace(/\s+/g, ' ').trim();
const pool = {
  query: async (sql, p = []) => {
    const s = N(sql); q.push({ sql: s, p });
    for (const [match, fn] of handlers) if (match(s)) return [await fn(p, s), []];
    return [[], []];
  },
  getConnection: async () => ({
    beginTransaction: async () => { tx.push('BEGIN'); },
    query: pool.query,
    commit: async () => { tx.push('COMMIT'); },
    rollback: async () => { tx.push('ROLLBACK'); },
    release() {},
  }),
};
require.cache[require.resolve('../dist/db/database')] = { exports: { __esModule: true, default: pool } };
process.env.JWT_SECRET = 't7-local-memory-test-only';
delete process.env.SMTP_HOST;
const { adminRouter } = require('../dist/routes/admin');
const { reportsRouter } = require('../dist/routes/reports');
const { quotesRouter } = require('../dist/routes/quotes');
const { authRouter } = require('../dist/routes/auth');
const { resetRateLimits, LIMITS } = require('../dist/services/rateLimit');

const on = (needle, fn) => handlers.push([s => s.includes(needle), fn]);
const sign = (role, userId = 'u-' + role) => jwt.sign({ userId, role }, process.env.JWT_SECRET);
let server, base, origErr, origWarn, origLog;
before(async () => {
  const app = express();
  app.set('trust proxy', 1); // las pruebas simulan IPs distintas con X-Forwarded-For
  app.use(express.json());
  app.use('/admin', adminRouter); app.use('/reports', reportsRouter);
  app.use('/quotes', quotesRouter); app.use('/auth', authRouter);
  server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
  origErr = console.error; origWarn = console.warn; origLog = console.log;
});
after(async () => { console.error = origErr; console.warn = origWarn; console.log = origLog; await new Promise(r => server.close(r)); });
beforeEach(() => {
  q = []; handlers = []; tx = []; resetRateLimits();
  console.error = () => {}; console.warn = () => {}; console.log = () => {};
});
const call = async (method, url, { token, body, ip } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  if (ip) headers['X-Forwarded-For'] = ip;
  const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
};

// ── Rol de solo lectura ─────────────────────────────────────────────────────
test('solo lectura: consulta /admin, /reports y /quotes', async () => {
  on('SELECT COUNT(*)', () => [{ total: 0 }]);
  const ro = sign('readonly');
  for (const url of ['/admin/users', '/admin/audit-logs', '/reports/users', '/quotes']) {
    assert.equal((await call('GET', url, { token: ro })).status, 200, url);
  }
});
test('solo lectura: toda escritura responde 403 sin tocar la base', async () => {
  const ro = sign('readonly');
  const writes = [
    ['POST', '/admin/products', { name: 'X', sku: 'X', price: 1, category_id: 'c' }],
    ['PUT', '/admin/products/p1', { price: 1 }],
    ['PATCH', '/admin/products/p1/toggle'],
    ['DELETE', '/admin/products/p1'],
    ['PUT', '/admin/users/u1/role', { role: 'admin' }],
    ['DELETE', '/admin/users/u1'],
    ['PATCH', '/admin/orders/o1/status', { status: 'processing' }],
    ['PATCH', '/admin/reviews/r1/approve'],
    ['POST', '/reports/stock-movement', { product_id: 'p1', type: 'ingreso', quantity: 1 }],
    ['PATCH', '/quotes/q1/status', { status: 'contactado' }],
  ];
  for (const [m, url, body] of writes) {
    const r = await call(m, url, { token: ro, body });
    assert.equal(r.status, 403, `${m} ${url}`);
    assert.match(r.body.error, /solo lectura/);
  }
  assert.equal(q.length, 0, 'ninguna consulta a la base');
});
test('cliente: sin acceso al panel ni para leer; sin token: 401', async () => {
  for (const url of ['/admin/users', '/reports/users', '/quotes']) {
    assert.equal((await call('GET', url, { token: sign('customer') })).status, 403, url);
    assert.equal((await call('GET', url)).status, 401, url);
  }
  assert.equal(q.length, 0);
});

// ── Último administrador ────────────────────────────────────────────────────
const admin = sign('admin', 'a1');
test('último admin: no se le puede quitar el rol (409, rollback, sin auditoría)', async () => {
  on("WHERE role = 'admin' FOR UPDATE", () => [{ id: 'a1' }]);
  on('SELECT id, role FROM users WHERE id = ?', () => [{ id: 'a1', role: 'admin' }]);
  const r = await call('PUT', '/admin/users/a1/role', { token: admin, body: { role: 'customer' } });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /único administrador/);
  assert.deepEqual(tx, ['BEGIN', 'ROLLBACK']);
  assert.ok(!q.some(x => x.sql.startsWith('UPDATE users')));
  assert.ok(!q.some(x => x.sql.startsWith('INSERT INTO audit_logs')));
});
test('último admin: no se puede eliminar (409)', async () => {
  on("WHERE role = 'admin' FOR UPDATE", () => [{ id: 'a2' }]);
  on('SELECT id, email, role FROM users WHERE id = ?', () => [{ id: 'a2', email: 'x@example.invalid', role: 'admin' }]);
  const r = await call('DELETE', '/admin/users/a2', { token: admin });
  assert.equal(r.status, 409);
  assert.ok(!q.some(x => x.sql.startsWith('DELETE FROM users')));
});
test('con otro admin disponible, el cambio procede; el conjunto de admins se bloquea antes que el usuario', async () => {
  on("WHERE role = 'admin' FOR UPDATE", () => [{ id: 'a1' }, { id: 'a2' }]);
  on('SELECT id, role FROM users WHERE id = ?', () => [{ id: 'a2', role: 'admin' }]);
  on('SELECT id, email, first_name', () => [{ id: 'a2', role: 'readonly' }]);
  const r = await call('PUT', '/admin/users/a2/role', { token: admin, body: { role: 'readonly' } });
  assert.equal(r.status, 200);
  const iAdmins = q.findIndex(x => x.sql.includes("WHERE role = 'admin' FOR UPDATE"));
  const iTarget = q.findIndex(x => x.sql.startsWith('SELECT id, role FROM users WHERE id = ?'));
  assert.ok(iAdmins >= 0 && iAdmins < iTarget, 'orden fijo de bloqueos');
  assert.deepEqual(tx, ['BEGIN', 'COMMIT']);
});
test('promover o tocar a un no-admin no depende de cuántos admins haya', async () => {
  on("WHERE role = 'admin' FOR UPDATE", () => [{ id: 'a1' }]);
  on('SELECT id, role FROM users WHERE id = ?', () => [{ id: 'c1', role: 'customer' }]);
  on('SELECT id, email, first_name', () => [{ id: 'c1', role: 'admin' }]);
  assert.equal((await call('PUT', '/admin/users/c1/role', { token: admin, body: { role: 'admin' } })).status, 200);
});

// ── Zod en auth ─────────────────────────────────────────────────────────────
test('login con tipos inválidos responde 400 (antes 500) sin consultar la base', async () => {
  for (const body of [{ email: 123, password: 'x' }, { email: 'a@b.co' }, {}, { email: ['a'], password: 'x' }]) {
    assert.equal((await call('POST', '/auth/login', { body })).status, 400, JSON.stringify(body));
  }
  assert.equal(q.length, 0);
});
test('registro: mismos mensajes que antes para nombre, email y contraseña', async () => {
  const ok = { first_name: 'Ana', last_name: 'Paz', email: 'ana@example.invalid', password: 'clave1234' };
  const cases = [
    [{ ...ok, first_name: '  ' }, 'Nombre y apellido son requeridos'],
    [{ ...ok, last_name: undefined }, 'Nombre y apellido son requeridos'],
    [{ ...ok, email: 'no-es-email' }, 'El email no tiene un formato válido'],
    [{ ...ok, password: 'corta1' }, 'La contraseña debe tener al menos 8 caracteres'],
    [{ ...ok, password: 'sololetras' }, 'La contraseña debe incluir al menos un número'],
    [{ ...ok, phone: '1'.repeat(51) }, 'El teléfono es demasiado largo'],
  ];
  for (const [body, msg] of cases) {
    const r = await call('POST', '/auth/register', { body });
    assert.equal(r.status, 400); assert.equal(r.body.error, msg);
  }
  assert.equal(q.length, 0);
});
test('restablecer contraseña: token con formato inválido responde 400 sin consultar', async () => {
  const r = await call('POST', '/auth/reset-password', { body: { token: "' OR 1=1 --", password: 'clave1234' } });
  assert.equal(r.status, 400); assert.equal(r.body.error, 'Token inválido');
  assert.equal(q.length, 0);
});
test('perfil: nombre vacío o tipos inválidos responden 400', async () => {
  const t = sign('customer', 'c1');
  assert.equal((await call('PATCH', '/auth/me', { token: t, body: { first_name: '', last_name: 'Paz' } })).status, 400);
  assert.equal((await call('PATCH', '/auth/me', { token: t, body: { first_name: 1, last_name: 'Paz' } })).status, 400);
});

// ── Límite de intentos ──────────────────────────────────────────────────────
const HASH = bcrypt.hashSync('correcta1', 4);
const user = { id: 'c1', email: 'ana@example.invalid', password: HASH, role: 'customer', first_name: 'Ana', last_name: 'Paz' };
test('login: tras 5 fallos la cuenta se bloquea desde esa IP (429 con Retry-After) sin consultar la base', async () => {
  on('SELECT * FROM users WHERE email = ?', () => [user]);
  const ip = '203.0.113.10';
  for (let i = 0; i < LIMITS.account; i++) {
    assert.equal((await call('POST', '/auth/login', { ip, body: { email: user.email, password: 'mala' } })).status, 401);
  }
  q = [];
  const blocked = await call('POST', '/auth/login', { ip, body: { email: user.email, password: 'correcta1' } });
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.equal(q.length, 0, 'bloqueado antes de consultar');
  // Desde otra IP la misma cuenta sigue pudiendo entrar: nadie bloquea a otro a propósito
  assert.equal((await call('POST', '/auth/login', { ip: '198.51.100.7', body: { email: user.email, password: 'correcta1' } })).status, 200);
});
test('login: un acceso correcto limpia los fallos previos de esa cuenta e IP', async () => {
  on('SELECT * FROM users WHERE email = ?', () => [user]);
  const ip = '203.0.113.11';
  for (let i = 0; i < LIMITS.account - 1; i++) await call('POST', '/auth/login', { ip, body: { email: user.email, password: 'mala' } });
  assert.equal((await call('POST', '/auth/login', { ip, body: { email: user.email, password: 'correcta1' } })).status, 200);
  for (let i = 0; i < LIMITS.account - 1; i++) {
    assert.equal((await call('POST', '/auth/login', { ip, body: { email: user.email, password: 'mala' } })).status, 401);
  }
});
test('login: cuenta inexistente también cuenta como fallo y responde igual', async () => {
  const ip = '203.0.113.12';
  const r = await call('POST', '/auth/login', { ip, body: { email: 'nadie@example.invalid', password: 'x' } });
  assert.equal(r.status, 401); assert.equal(r.body.error, 'Credenciales incorrectas');
});
test('login: límite por IP contra el barrido de muchas cuentas', async () => {
  const ip = '203.0.113.13';
  for (let i = 0; i < LIMITS.ip; i++) await call('POST', '/auth/login', { ip, body: { email: `u${i}@example.invalid`, password: 'x' } });
  assert.equal((await call('POST', '/auth/login', { ip, body: { email: 'otra@example.invalid', password: 'x' } })).status, 429);
});
test('recuperar contraseña: 3 pedidos por email e IP; el 4.º responde 429 exista o no la cuenta', async () => {
  const ip = '203.0.113.14';
  for (let i = 0; i < LIMITS.emailRequest; i++) {
    assert.equal((await call('POST', '/auth/forgot-password', { ip, body: { email: 'nadie@example.invalid' } })).status, 200);
  }
  assert.equal((await call('POST', '/auth/forgot-password', { ip, body: { email: 'nadie@example.invalid' } })).status, 429);
});

// ── Configuración: secreto JWT y SSL ────────────────────────────────────────
const dist = path.join(__dirname, '..', 'dist');
const runNode = (code, env) => spawnSync(process.execPath, ['-e', code], {
  env: { ...process.env, ...env }, encoding: 'utf8', cwd: path.join(__dirname, '..'),
});
test('producción sin JWT_SECRET o con el valor de desarrollo: el servidor no arranca', () => {
  const load = `require(${JSON.stringify(path.join(dist, 'config', 'jwt.js'))})`;
  for (const secret of [undefined, 'tele-import-dev-secret-2024']) {
    const env = { NODE_ENV: 'production', JWT_SECRET: secret ?? '' };
    const r = runNode(load, env);
    assert.notEqual(r.status, 0, `debe fallar con JWT_SECRET=${secret}`);
    assert.match(r.stderr, /JWT_SECRET/);
  }
  assert.equal(runNode(load, { NODE_ENV: 'production', JWT_SECRET: 'un-secreto-largo-de-produccion' }).status, 0);
  assert.equal(runNode(load, { NODE_ENV: 'development', JWT_SECRET: '' }).status, 0, 'en desarrollo sigue funcionando');
});
test('SSL de la base: con DB_SSL verifica el certificado; desactivarlo es explícito; acepta CA en una línea', () => {
  const show = `const p=require(${JSON.stringify(path.join(dist, 'db', 'database.js'))}).default;` +
    `console.log(JSON.stringify(p.pool.config.connectionConfig.ssl ?? null));process.exit(0)`;
  const ssl = (env) => JSON.parse(runNode(show, env).stdout.trim().split('\n').pop());
  assert.ok(!ssl({ DB_SSL: '' }), 'sin DB_SSL no hay SSL (red privada)');
  assert.equal(ssl({ DB_SSL: 'true' }).rejectUnauthorized, true);
  assert.equal(ssl({ DB_SSL: 'true', DB_SSL_REJECT_UNAUTHORIZED: 'false' }).rejectUnauthorized, false);
  assert.equal(ssl({ DB_SSL: 'true', DB_SSL_CA: '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----' }).ca,
    '-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----');
});
