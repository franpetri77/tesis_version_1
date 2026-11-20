// node --test test/thread-sync.test.cjs   (desde frontend/, sin compilar antes)
// T9 corrección 1: cursor de entrega del chat (src/lib/chat/threadSync.ts).
// El módulo se transpila en memoria con el TypeScript del proyecto; no hay
// dependencias nuevas. Un "servidor" simulado responde como /chat:
// sin parámetros → últimos 50; ?after= → hasta 200 posteriores; ?before= → 50 anteriores.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const file = path.join(__dirname, '../src/lib/chat/threadSync.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = new Module(file); mod.filename = file; mod.paths = Module._nodeModulePaths(path.dirname(file)); mod._compile(js, file);
const S = mod.exports;

const PAGE = 50, POLL = 200;
function server() {
  const msgs = [];
  const conv = () => ({ id: 'c', status: 'open', unread: 0, other_last_read_id: 0, last_message_at: null });
  return {
    msgs,
    add(role, body) { const m = { id: msgs.length + 1, sender_role: role, sender_name: null, body: body ?? role + ' ' + (msgs.length + 1), created_at: '', product: null }; msgs.push(m); return m; },
    load({ after, before } = {}) {
      if (after !== undefined) { const l = msgs.filter((m) => m.id > after); return { conversation: conv(), messages: l.slice(0, POLL), has_more: l.length > POLL }; }
      const l = msgs.filter((m) => before === undefined || m.id < before);
      return { conversation: conv(), messages: l.slice(-PAGE), has_more: l.length > PAGE };
    },
  };
}
const ids = (s) => s.messages.map((m) => m.id);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
/** Consulta periódica como el hook: ?after=cursor y vaciado de has_more. */
function poll(s, srv) { let st = s; for (;;) { const after = st.cursor; const p = srv.load({ after }); st = S.applyPoll(st, p, after); if (!p.has_more) return st; } }

test('cruce: la respuesta guardada antes que el envío propio llega en la consulta siguiente (personal → cliente)', () => {
  const srv = server(); srv.add('customer', 'Consulta inicial');
  let s = S.applyInitial(S.emptySync(), srv.load());
  srv.add('staff', 'RESPUESTA CRUZADA');            // id 2, guardada mientras el cliente escribía
  const own = srv.add('customer', 'ENVÍO CRUZADO');  // id 3, devuelto por el POST
  s = S.applyOwn(s, own);
  assert.deepEqual(ids(s), [1, 3]);
  assert.equal(s.cursor, 1, 'el POST no mueve el cursor');
  assert.equal(S.readableUpTo(s), 1, 'no se confirma lectura de lo no recibido');
  s = poll(s, srv);
  assert.deepEqual(ids(s), [1, 2, 3]);
  assert.equal(s.cursor, 3);
});

test('cruce en el otro sentido: el mensaje del cliente guardado antes que la respuesta del personal (cliente → personal)', () => {
  const srv = server(); srv.add('customer'); srv.add('staff');
  let s = S.applyInitial(S.emptySync(), srv.load());
  srv.add('customer', 'pregunta mientras el personal redacta'); // id 3
  s = S.applyOwn(s, srv.add('staff', 'respuesta'));             // id 4
  assert.equal(S.readableUpTo(s), 2);
  s = poll(s, srv);
  assert.deepEqual(ids(s), [1, 2, 3, 4]);
});

test('respuestas demoradas: una carga inicial tardía no pisa lo recibido y una consulta vieja no hace retroceder', () => {
  const srv = server(); for (let i = 0; i < 5; i++) srv.add(i % 2 ? 'staff' : 'customer');
  const initialPage = srv.load();                          // pedida al abrir
  let s = S.emptySync();
  s = S.applyOwn(s, srv.add('customer', 'enviado mientras cargaba')); // id 6
  s = S.applyInitial(s, initialPage);                      // llega tarde: no incluye el 6
  assert.deepEqual(ids(s), range(1, 6), 'combina en vez de pisar');
  assert.equal(s.cursor, 5);
  const oldAfter = s.cursor; const late = srv.load({ after: oldAfter }); // consulta que quedará vieja
  srv.add('staff'); s = poll(s, srv);                     // otra consulta adelanta el cursor a 7
  assert.equal(s.cursor, 7);
  s = S.applyPoll(s, late, oldAfter);                     // la vieja llega después
  assert.equal(s.cursor, 7, 'no retrocede');
  assert.deepEqual(ids(s), range(1, 7));
});

test('el orden inverso también: la carga inicial llega antes que cualquier consulta (la consulta espera a la carga)', () => {
  const srv = server(); for (let i = 0; i < 3; i++) srv.add('customer');
  let s = S.emptySync();
  assert.equal(s.ready, false, 'sin carga inicial no hay consulta periódica');
  s = S.applyInitial(s, srv.load());
  srv.add('staff');
  s = poll(s, srv);
  assert.deepEqual(ids(s), range(1, 4));
});

test('historial de 304: sin huecos ni duplicados; los anteriores se recuperan hasta el primero', () => {
  const srv = server(); for (let i = 0; i < 304; i++) srv.add(i % 2 ? 'staff' : 'customer', 'HISTORIAL ' + (i + 1));
  let s = S.applyInitial(S.emptySync(), srv.load());
  assert.deepEqual(ids(s), range(255, 304));
  assert.equal(s.hasOlder, true);
  s = poll(s, srv);                                        // after=304: nada nuevo, no trae los primeros 200
  assert.deepEqual(ids(s), range(255, 304), 'la consulta periódica no mezcla el principio del historial');
  let rounds = 0;
  while (s.hasOlder) { s = S.applyOlder(s, srv.load({ before: s.messages[0].id })); rounds++; }
  assert.equal(rounds, 6);
  assert.deepEqual(ids(s), range(1, 304));
  assert.ok(s.messages.some((m) => m.body === 'HISTORIAL 250'));
});

test('más de 200 nuevos mientras la vista estaba oculta: el vaciado de has_more entrega todo', () => {
  const srv = server(); srv.add('customer');
  let s = S.applyInitial(S.emptySync(), srv.load());
  for (let i = 0; i < 450; i++) srv.add('staff');
  s = poll(s, srv);
  assert.deepEqual(ids(s), range(1, 451));
  assert.equal(s.cursor, 451);
});

test('lectura confirmable: nunca supera el cursor aunque haya mensajes propios más nuevos', () => {
  const srv = server(); srv.add('staff');
  let s = S.applyInitial(S.emptySync(), srv.load());
  s = S.applyOwn(s, srv.add('customer'));
  s = S.applyOwn(s, srv.add('customer'));
  assert.equal(S.readableUpTo(s), 1);
  s = poll(s, srv);
  assert.equal(S.readableUpTo(s), 3);
});
