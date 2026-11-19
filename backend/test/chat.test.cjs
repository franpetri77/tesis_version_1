// node --test test/chat.test.cjs (después de npm run build).
// T9: mensajería cliente ↔ tienda. Base sustituida por un doble con estado
// (conversaciones, mensajes, punteros de lectura, transacciones); no se abre
// MySQL ni se envían correos. Las consultas reales se prueban en MySQL 8
// con el script de la entrega (t9-mysql.cjs).
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');

const N = (s) => s.replace(/\s+/g, ' ').trim();
const clone = (v) => JSON.parse(JSON.stringify(v));
let state, q, failOn;

const USERS = {
  c1: { id: 'c1', role: 'customer', first_name: 'Ana', last_name: 'Paz', email: 'ana@example.invalid' },
  c2: { id: 'c2', role: 'customer', first_name: 'Beto', last_name: 'Ruiz', email: 'beto@example.invalid' },
  a1: { id: 'a1', role: 'admin', first_name: 'Fran', last_name: 'Admin', email: 'admin@example.invalid' },
  r1: { id: 'r1', role: 'readonly', first_name: 'Lu', last_name: 'Lectura', email: 'lector@example.invalid' },
};
const PRODUCTS = { p1: { id: 'p1', name: 'Auriculares BT', slug: 'auriculares-bt', price: 45999, is_active: 1 }, p2: { id: 'p2', name: 'Viejo', slug: 'viejo', price: 1, is_active: 0 } };

const convByUser = (u) => state.convs.find((c) => c.user_id === u);
const convById = (id) => state.convs.find((c) => c.id === id);
const msgRow = (m) => {
  const u = USERS[m.sender_id]; const p = m.product_id && PRODUCTS[m.product_id];
  return { id: m.id, sender_role: m.sender_role, body: m.body, created_at: '2026-11-19T12:00:00.000Z', product_id: m.product_id,
    sender_first_name: u?.first_name ?? null, product_name: p?.name ?? null, product_slug: p?.slug ?? null,
    product_price: p?.price ?? null, product_active: p?.is_active ?? null, product_image: null };
};
const unread = (c, reader) => state.msgs.filter((m) => m.conversation_id === c.id && m.sender_role !== reader && m.id > (reader === 'customer' ? c.customer_last_read_id : c.staff_last_read_id)).length;

function run(s, p) {
  if (failOn && s.includes(failOn)) throw Object.assign(new Error('falla simulada'), { code: 'ER_SIMULATED' });
  if (s.includes('AS panel_role')) return [USERS[p[0]] ? { panel_role: USERS[p[0]].role } : null].filter(Boolean);
  q.push({ sql: s, p });
  if (s.startsWith('SELECT role FROM users WHERE id = ?')) return USERS[p[0]] ? [{ role: USERS[p[0]].role }] : [];
  if (s.startsWith('INSERT INTO chat_conversations')) {
    if (!convByUser(p[1])) state.convs.push({ id: p[0], user_id: p[1], status: 'open', customer_last_read_id: 0, staff_last_read_id: 0, last_message_at: null, created_at: 'x' });
    return { affectedRows: 1 };
  }
  if (s.startsWith('SELECT *, UNIX_TIMESTAMP(last_message_at) AS last_ts FROM chat_conversations WHERE user_id = ?')) return [convByUser(p[0])].filter(Boolean).map(clone);
  if (s.startsWith('SELECT *, UNIX_TIMESTAMP(last_message_at) AS last_ts FROM chat_conversations WHERE id = ?')) return [convById(p[0])].filter(Boolean).map(clone);
  if (s.startsWith('SELECT id FROM chat_conversations WHERE user_id = ?')) return [convByUser(p[0])].filter(Boolean).map((c) => ({ id: c.id }));
  if (s.startsWith('SELECT id FROM products WHERE id = ? AND is_active = 1')) return PRODUCTS[p[0]]?.is_active ? [{ id: p[0] }] : [];
  if (s.startsWith('SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id = ? AND sender_role = ? AND id > ?'))
    return [{ n: state.msgs.filter((m) => m.conversation_id === p[0] && m.sender_role === p[1] && m.id > p[2]).length }];
  if (s.startsWith('SELECT COUNT(*) AS n FROM chat_conversations c JOIN chat_messages m')) { const c = convByUser(p[0]); return [{ n: c ? unread(c, 'customer') : 0 }]; }
  if (s.startsWith('INSERT INTO chat_messages')) {
    const id = ++state.seq; state.msgs.push({ id, conversation_id: p[0], sender_role: p[1], sender_id: p[2], body: p[3], product_id: p[4] }); return { insertId: id };
  }
  if (s.includes('FROM chat_messages m LEFT JOIN users u')) {
    let list = state.msgs.filter((m) => m.conversation_id === p[0]);
    if (s.includes('AND m.id = ?')) list = list.filter((m) => m.id === p[1]);
    else if (s.includes('AND m.id > ?')) list = list.filter((m) => m.id > p[1]).sort((a, b) => a.id - b.id);
    else { if (s.includes('AND m.id < ?')) list = list.filter((m) => m.id < p[1]); list = list.sort((a, b) => b.id - a.id); }
    const limit = Number((s.match(/LIMIT (\d+)$/) || [])[1] ?? 1e9);
    return list.slice(0, limit).map(msgRow);
  }
  if (s.startsWith("UPDATE chat_conversations SET status = 'open'")) {
    const c = convById(p[1]); c.status = 'open'; c.last_message_at = 'now';
    const col = s.includes('customer_last_read_id = GREATEST') ? 'customer_last_read_id' : 'staff_last_read_id';
    c[col] = Math.max(c[col], p[0]); return { affectedRows: 1 };
  }
  if (s.startsWith('UPDATE chat_conversations c SET')) {
    const c = convById(p[1]); if (!c) return { affectedRows: 0 };
    const col = s.includes('SET customer_last_read_id') ? 'customer_last_read_id' : 'staff_last_read_id';
    const max = Math.max(0, ...state.msgs.filter((m) => m.conversation_id === c.id).map((m) => m.id));
    c[col] = Math.max(c[col], Math.min(p[0], max)); return { affectedRows: 1 };
  }
  if (s.startsWith('UPDATE chat_conversations SET status = ?')) { convById(p[1]).status = p[0]; return { affectedRows: 1 }; }
  if (s.includes('FROM chat_conversations c JOIN users u')) {
    return state.convs.filter((c) => c.last_message_at && (s.includes('c.status = ?') ? c.status === p[0] : true)).map((c) => {
      const u = USERS[c.user_id]; const last = state.msgs.filter((m) => m.conversation_id === c.id).at(-1);
      return { id: c.id, status: c.status, last_message_at: 'now', created_at: 'x', user_id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email,
        unread: unread(c, 'staff'), last_body: last?.body ?? null, last_sender: last?.sender_role ?? null };
    });
  }
  if (s.startsWith('SELECT COUNT(DISTINCT c.id) AS conversations')) {
    const per = state.convs.map((c) => unread(c, 'staff'));
    return [{ conversations: per.filter(Boolean).length, messages: per.reduce((a, b) => a + b, 0) }];
  }
  if (s.startsWith('SELECT id, first_name, last_name, email, phone, created_at FROM users')) return [{ ...USERS[p[0]], phone: null, created_at: 'x' }];
  if (s.startsWith('SELECT id, order_number, status, total, created_at FROM orders')) return [];
  // Avisos (services/notifications.ts)
  if (s.startsWith("SELECT id FROM users WHERE role = 'admin'")) return [{ id: 'a1' }];
  if (s.startsWith('SELECT first_name, last_name, email FROM users WHERE id = ?')) return [USERS[p[0]]];
  if (s.startsWith("SELECT first_name, email FROM users WHERE id = ? AND role = 'customer'")) return USERS[p[0]]?.role === 'customer' ? [USERS[p[0]]] : [];
  if (s.startsWith('INSERT INTO notifications')) {
    for (let k = 0; k < p.length; k += 6) state.notifs.push({ user: p[k + 1], type: p[k + 2], title: p[k + 3], message: p[k + 4], link: p[k + 5] });
    return { affectedRows: p.length / 6 };
  }
  throw new Error('SQL no esperado en el doble: ' + s);
}

const pool = {
  query: async (sql, p = []) => [run(N(sql), p), []],
  getConnection: async () => {
    let saved = null;
    return {
      beginTransaction: async () => { q.push({ sql: 'BEGIN' }); saved = clone(state); },
      query: async (sql, p = []) => [run(N(sql), p), []],
      commit: async () => { q.push({ sql: 'COMMIT' }); },
      rollback: async () => { q.push({ sql: 'ROLLBACK' }); if (saved) state = saved; },
      release() {},
    };
  },
};
require.cache[require.resolve('../dist/db/database')] = { exports: { __esModule: true, default: pool } };
process.env.JWT_SECRET = 't9-local-memory-test-only';
for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MANAGER_EMAIL']) delete process.env[k];
const { chatRouter, CHAT_LIMIT } = require('../dist/routes/chat');
const { adminRouter } = require('../dist/routes/admin');
const { cleanBody } = require('../dist/services/chat');
const { resetRateLimits } = require('../dist/services/rateLimit');

let server, base, logs, origWarn, origErr;
const T = Object.fromEntries(Object.values(USERS).map((u) => [u.id, jwt.sign({ userId: u.id, role: u.role }, process.env.JWT_SECRET)]));
before(async () => {
  const app = express(); app.use(express.json()); app.use('/chat', chatRouter); app.use('/admin', adminRouter);
  server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
  origWarn = console.warn; origErr = console.error;
});
after(async () => { console.warn = origWarn; console.error = origErr; await new Promise((r) => server.close(r)); });
beforeEach(() => {
  state = { convs: [], msgs: [], notifs: [], seq: 0 }; q = []; failOn = null; logs = []; resetRateLimits();
  console.warn = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' '));
});
const call = async (who, method, path, body) => {
  const headers = { 'Content-Type': 'application/json' };
  if (who) headers.Authorization = 'Bearer ' + T[who];
  const res = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};
const tick = () => new Promise((r) => setTimeout(r, 30));

test('cleanBody: quita controles e invisibles, normaliza saltos y recorta', () => {
  assert.equal(cleanBody('  Hola\u0007 \r\n\r\n\r\n\r\nchau‮  '), 'Hola\n\nchau');
  assert.equal(cleanBody('a\tb\nc'), 'a\tb\nc');
  assert.equal(cleanBody('​ \n '), '');
});

test('cliente: primer mensaje crea la conversación en una transacción y avisa al personal una sola vez por tanda', async () => {
  assert.equal((await call('c1', 'GET', '/chat')).body.data.conversation, null);
  q = [];
  let r = await call('c1', 'POST', '/chat/messages', { body: 'Hola, ¿tienen stock?' });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.sender_role, 'customer'); assert.equal(r.body.data.sender_name, 'Ana');
  const sqls = q.map((x) => x.sql);
  assert.equal(sqls[1], 'BEGIN'); assert.ok(sqls.indexOf('COMMIT') > sqls.findIndex((s) => s.startsWith('INSERT INTO chat_messages')));
  assert.ok(sqls.some((s) => s.startsWith('SELECT *, UNIX_TIMESTAMP(last_message_at) AS last_ts FROM chat_conversations WHERE user_id = ? FOR UPDATE')), 'bloquea la conversación');
  await tick();
  assert.deepEqual(state.notifs.map((n) => [n.user, n.type, n.title, n.link]), [['a1', 'chat_message', 'Mensaje de Ana Paz', `/admin/mensajes?c=${state.convs[0].id}`]]);
  assert.ok(logs.some((l) => l.includes('MANAGER_EMAIL no configurado')));
  r = await call('c1', 'POST', '/chat/messages', { body: 'Es para regalo' });
  assert.equal(r.status, 201); await tick();
  assert.equal(state.notifs.length, 1, 'el segundo mensaje sin leer no repite el aviso');
  assert.equal(state.convs.length, 1);
});

test('cliente: validación del texto y del producto adjunto', async () => {
  assert.equal((await call('c1', 'POST', '/chat/messages', {})).status, 400);
  assert.equal((await call('c1', 'POST', '/chat/messages', { body: ' \n ' })).body.error, 'Escribí un mensaje');
  assert.equal((await call('c1', 'POST', '/chat/messages', { body: 'x'.repeat(2001) })).status, 400);
  assert.equal((await call('c1', 'POST', '/chat/messages', { body: 'x'.repeat(2000) })).status, 201);
  const r = await call('c1', 'POST', '/chat/messages', { body: '¿Y este?', product_id: 'p2' });
  assert.equal(r.status, 422); assert.match(r.body.error, /ya no está disponible/);
  assert.ok(q.some((x) => x.sql === 'ROLLBACK'));
  assert.equal(state.msgs.length, 1, 'el rechazo no guarda nada');
  const ok = await call('c1', 'POST', '/chat/messages', { body: 'Este', product_id: 'p1' });
  assert.equal(ok.body.data.product.slug, 'auriculares-bt');
});

test('cliente: límite de mensajes por ventana → 429 con Retry-After', async () => {
  for (let k = 0; k < CHAT_LIMIT.messages; k++) assert.equal((await call('c2', 'POST', '/chat/messages', { body: 'm' + k })).status, 201);
  const res = await fetch(base + '/chat/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + T.c2 }, body: JSON.stringify({ body: 'uno más' }) });
  assert.equal(res.status, 429); assert.ok(Number(res.headers.get('retry-after')) > 0);
  assert.equal((await call('c1', 'POST', '/chat/messages', { body: 'otro cliente' })).status, 201, 'el cupo es por cliente');
});

test('permisos: /chat sólo para clientes; /admin/chat lectura para readonly y escritura sólo admin', async () => {
  assert.equal((await call(null, 'GET', '/chat')).status, 401);
  assert.equal((await call('a1', 'GET', '/chat')).status, 403);
  assert.equal((await call('r1', 'POST', '/chat/messages', { body: 'hola' })).status, 403);
  assert.equal((await call('c1', 'GET', '/admin/chat/conversations')).status, 403);
  await call('c1', 'POST', '/chat/messages', { body: 'Hola' });
  const id = state.convs[0].id;
  assert.equal((await call('r1', 'GET', '/admin/chat/conversations')).status, 200);
  assert.equal((await call('r1', 'GET', '/admin/chat/conversations/' + id)).status, 200);
  for (const [m, p, b] of [['POST', `/admin/chat/conversations/${id}/messages`, { body: 'x' }], ['POST', `/admin/chat/conversations/${id}/read`, { up_to: 1 }], ['PATCH', `/admin/chat/conversations/${id}`, { status: 'closed' }]])
    assert.equal((await call('r1', m, p, b)).status, 403, `${m} ${p}`);
  assert.equal(state.convs[0].staff_last_read_id, 0, 'la lectura del readonly no marca como leído');
});

test('personal: bandeja, respuesta, un aviso por tanda al cliente y punteros de lectura', async () => {
  await call('c1', 'POST', '/chat/messages', { body: 'Hola' });
  await call('c1', 'POST', '/chat/messages', { body: '¿Hay envío a Córdoba?' });
  const id = state.convs[0].id;
  assert.deepEqual((await call('a1', 'GET', '/admin/chat/unread')).body.data, { conversations: 1, messages: 2 });
  const list = (await call('a1', 'GET', '/admin/chat/conversations')).body.data;
  assert.equal(list[0].unread, 2); assert.equal(list[0].customer.name, 'Ana Paz'); assert.equal(list[0].last_message.body, '¿Hay envío a Córdoba?');
  const detail = (await call('a1', 'GET', '/admin/chat/conversations/' + id)).body.data;
  assert.equal(detail.customer.email, 'ana@example.invalid'); assert.equal(detail.messages.length, 2);

  let r = await call('a1', 'POST', `/admin/chat/conversations/${id}/messages`, { body: 'Sí, enviamos a todo el país.' });
  assert.equal(r.status, 201); assert.equal(r.body.data.sender_name, 'Fran');
  assert.equal(state.convs[0].staff_last_read_id, r.body.data.id, 'responder marca como leído lo anterior');
  await call('a1', 'POST', `/admin/chat/conversations/${id}/messages`, { body: 'Cualquier duda, escribinos.' });
  await tick();
  const toCustomer = state.notifs.filter((n) => n.user === 'c1');
  assert.deepEqual(toCustomer.map((n) => [n.type, n.title, n.link]), [['chat_message', 'Te respondimos', '/perfil/mensajes']]);
  assert.equal((await call('c1', 'GET', '/chat/unread')).body.data.unread, 2);

  const after = state.msgs[1].id;
  const poll = (await call('c1', 'GET', '/chat?after=' + after)).body.data;
  assert.deepEqual(poll.messages.map((m) => m.sender_role), ['staff', 'staff']);
  assert.equal(poll.conversation.unread, 2);
  assert.equal((await call('c1', 'POST', '/chat/read', { up_to: 10 ** 9 })).status, 200);
  assert.equal(state.convs[0].customer_last_read_id, state.seq, 'no pasa del último mensaje');
  assert.equal((await call('c1', 'GET', '/chat/unread')).body.data.unread, 0);
  const staffPoll = (await call('a1', 'GET', `/admin/chat/conversations/${id}?after=${state.seq}`)).body.data;
  assert.equal(staffPoll.conversation.other_last_read_id, state.seq, 'el panel ve que el cliente leyó');
  assert.equal(staffPoll.customer, null);
});

test('personal: resolver y reabrir; un mensaje nuevo del cliente reabre y vuelve a avisar', async () => {
  await call('c1', 'POST', '/chat/messages', { body: 'Hola' });
  const id = state.convs[0].id;
  await call('a1', 'POST', `/admin/chat/conversations/${id}/messages`, { body: 'Hola Ana' });
  assert.equal((await call('a1', 'PATCH', `/admin/chat/conversations/${id}`, { status: 'resuelta' })).status, 400);
  assert.equal((await call('a1', 'PATCH', `/admin/chat/conversations/${id}`, { status: 'closed' })).status, 200);
  assert.equal(state.convs[0].status, 'closed');
  assert.equal((await call('a1', 'GET', '/admin/chat/conversations')).body.data.length, 0);
  assert.equal((await call('a1', 'GET', '/admin/chat/conversations?status=closed')).body.data.length, 1);
  await call('c1', 'POST', '/chat/messages', { body: 'Otra consulta' });
  await tick();
  assert.equal(state.convs[0].status, 'open');
  assert.equal(state.notifs.filter((n) => n.user === 'a1').length, 2);
  assert.equal((await call('a1', 'PATCH', '/admin/chat/conversations/no-existe', { status: 'closed' })).status, 404);
  assert.equal((await call('a1', 'POST', '/admin/chat/conversations/no-existe/messages', { body: 'x' })).status, 404);
});

test('un fallo dentro de la transacción revierte el mensaje y no avisa', async () => {
  failOn = 'UPDATE chat_conversations SET status';
  const r = await call('c1', 'POST', '/chat/messages', { body: 'Hola' });
  assert.equal(r.status, 500); assert.equal(r.body.error, 'No se pudo enviar el mensaje');
  await tick();
  assert.equal(state.msgs.length, 0); assert.equal(state.convs.length, 0); assert.equal(state.notifs.length, 0);
});

test('parámetros de lectura inválidos → 400', async () => {
  assert.equal((await call('c1', 'GET', '/chat?after=-1')).status, 400);
  assert.equal((await call('c1', 'GET', '/chat?after=1&before=5')).status, 400);
  assert.equal((await call('c1', 'POST', '/chat/read', { up_to: 'x' })).status, 400);
  assert.equal((await call('a1', 'GET', '/admin/chat/conversations?status=todas')).status, 400);
});
