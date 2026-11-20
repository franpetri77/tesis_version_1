// node --test test/mailer.test.cjs (después de npm run build).
// T11: correo por la API HTTPS de Brevo (Railway bloquea SMTP en el plan
// Hobby), SMTP como alternativa y registro en el log sin proveedor. fetch
// se reemplaza por un doble: no sale ninguna petición real.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const pool = { query: async () => [[], []] };
require.cache[require.resolve('../dist/db/database')] = { exports: { __esModule: true, default: pool } };
process.env.JWT_SECRET = 't11-local-memory-test-only';
const mailer = require('../dist/services/mailer');
const { authRouter } = require('../dist/routes/auth');
const { resetRateLimits } = require('../dist/services/rateLimit');

const ENV_KEYS = ['BREVO_API_KEY', 'MAIL_FROM', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'MANAGER_EMAIL'];
const realFetch = global.fetch;
let calls, logs, origWarn, origErr, server, base;
before(async () => {
  origWarn = console.warn; origErr = console.error;
  const app = express(); app.use(express.json()); app.use('/auth', authRouter);
  server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { console.warn = origWarn; console.error = origErr; global.fetch = realFetch; await new Promise((r) => server.close(r)); });
beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  calls = []; logs = []; resetRateLimits();
  console.warn = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' '));
  pool.query = async () => [[], []];
});
/** fetch doble: registra las llamadas a Brevo y deja pasar las del propio servidor de prueba. */
function mockBrevo(status = 201, body = '{"messageId":"<m1@brevo>"}') {
  global.fetch = async (url, init) => {
    if (String(url).startsWith(base)) return realFetch(url, init);
    calls.push({ url: String(url), init, body: JSON.parse(init.body) });
    return new Response(body, { status, headers: { 'content-type': 'application/json' } });
  };
}

test('parseSender: "Nombre <correo>", con comillas y sin nombre', () => {
  assert.deepEqual(mailer.parseSender('Tele Import <ventas@example.invalid>'), { name: 'Tele Import', email: 'ventas@example.invalid' });
  assert.deepEqual(mailer.parseSender('"Tele Import S.A." <a@example.invalid>'), { name: 'Tele Import S.A.', email: 'a@example.invalid' });
  assert.deepEqual(mailer.parseSender('<b@example.invalid>'), { email: 'b@example.invalid' });
  assert.deepEqual(mailer.parseSender(' c@example.invalid '), { email: 'c@example.invalid' });
});

test('proveedor: Brevo tiene prioridad sobre SMTP; sin ninguno, null', () => {
  assert.equal(mailer.mailProvider(), null);
  Object.assign(process.env, { SMTP_HOST: 'smtp.example.invalid', SMTP_USER: 'u', SMTP_PASS: 'p' });
  assert.equal(mailer.mailProvider(), 'smtp');
  process.env.BREVO_API_KEY = 'xkeysib-prueba';
  assert.equal(mailer.mailProvider(), 'brevo');
  assert.equal(mailer.isMailerConfigured(), true);
});

test('Brevo: arma la petición HTTPS con remitente, destinatario, asunto, HTML, texto y tiempo máximo', async () => {
  process.env.BREVO_API_KEY = 'xkeysib-prueba';
  process.env.MAIL_FROM = 'Tele Import <ventas@example.invalid>';
  mockBrevo();
  assert.equal(await mailer.sendPasswordResetEmail('ana@example.invalid', 'tok123', 'Ana'), true);
  assert.equal(calls.length, 1);
  const c = calls[0];
  assert.equal(c.url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(c.init.method, 'POST');
  assert.equal(c.init.headers['api-key'], 'xkeysib-prueba');
  assert.ok(c.init.signal, 'lleva una señal de tiempo máximo');
  assert.deepEqual(c.body.sender, { name: 'Tele Import', email: 'ventas@example.invalid' });
  assert.deepEqual(c.body.to, [{ email: 'ana@example.invalid' }]);
  assert.match(c.body.subject, /Restablecé tu contraseña/);
  assert.match(c.body.htmlContent, /restablecer\?token=tok123/);
  assert.match(c.body.textContent, /restablecer\?token=tok123/);
});

test('Brevo: sin MAIL_FROM usa SMTP_FROM como remitente', async () => {
  process.env.BREVO_API_KEY = 'k';
  process.env.SMTP_FROM = 'Tienda <tienda@example.invalid>';
  mockBrevo();
  await mailer.sendVerificationEmail('x@example.invalid', 't', 'X');
  assert.deepEqual(calls[0].body.sender, { name: 'Tienda', email: 'tienda@example.invalid' });
});

test('Brevo: un error del proveedor se lanza con el estado, sin exponer la clave', async () => {
  process.env.BREVO_API_KEY = 'xkeysib-secreta';
  mockBrevo(401, '{"code":"unauthorized","message":"Key not found"}');
  await assert.rejects(mailer.sendVerificationEmail('x@example.invalid', 't'), (e) => {
    assert.match(e.message, /Brevo respondió 401/);
    assert.doesNotMatch(e.message, /xkeysib-secreta/);
    return true;
  });
});

test('avisos (pedido nuevo y chat): un fallo de Brevo devuelve false y queda en el log', async () => {
  process.env.BREVO_API_KEY = 'k'; process.env.MANAGER_EMAIL = 'encargado@example.invalid';
  mockBrevo(500, '{"message":"down"}');
  const ok = await mailer.sendChatEmail({ to: 'encargado@example.invalid', kind: 'staff', name: 'Ana', body: 'Hola <b>', path: '/admin/mensajes' });
  assert.equal(ok, false);
  assert.ok(logs.some((l) => l.includes('No se pudo enviar el aviso de mensaje nuevo')));
  assert.match(calls[0].body.htmlContent, /Hola &lt;b&gt;/, 'el texto del cliente va escapado');
});

test('sin proveedor: no hay petición y el correo queda en el log', async () => {
  mockBrevo();
  assert.equal(await mailer.sendVerificationEmail('x@example.invalid', 't'), false);
  assert.equal(calls.length, 0);
  assert.ok(logs.some((l) => l.includes('Sin proveedor de correo')));
});

test('forgot-password y resend-verification: si el proveedor falla, responden igual que sin cuenta (200)', async () => {
  process.env.BREVO_API_KEY = 'k';
  mockBrevo(503, '{"message":"down"}');
  pool.query = async (sql) => {
    if (/SELECT id, first_name FROM users WHERE email/.test(sql)) return [[{ id: 'u1', first_name: 'Ana' }], []];
    if (/SELECT id, first_name, email_verified FROM users/.test(sql)) return [[{ id: 'u1', first_name: 'Ana', email_verified: 0 }], []];
    return [{ affectedRows: 1 }, []];
  };
  const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const r1 = await post('/auth/forgot-password', { email: 'ana@example.invalid' });
  assert.equal(r1.status, 200); assert.deepEqual(await r1.json(), { data: { sent: true } });
  const r2 = await post('/auth/resend-verification', { email: 'ana@example.invalid' });
  assert.equal(r2.status, 200);
  assert.equal(calls.length, 2, 'se intentó enviar los dos correos');
  assert.ok(logs.some((l) => l.includes('No se pudo enviar el correo de recuperación de contraseña')));
  assert.ok(logs.some((l) => l.includes('No se pudo enviar el correo de verificación')));
});
