// node --test test/faq.test.cjs   (desde frontend/, sin compilar antes)
// T10: contenido del asistente de preguntas frecuentes (src/lib/chat/faq.ts).
// Se transpila en memoria con el TypeScript del proyecto; sin dependencias nuevas.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const file = path.join(__dirname, '../src/lib/chat/faq.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = new Module(file); mod.filename = file; mod._compile(js, file);
const { FAQ, BOT_GREETING, faqById } = mod.exports;

/** ¿Existe una página de Next para esta ruta? Busca page.tsx en app/, ignorando los grupos (carpeta). */
function routeExists(href) {
  const app = path.join(__dirname, '../src/app');
  const parts = href.split('?')[0].split('/').filter(Boolean);
  const walk = (dir, rest) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
    if (rest.length === 0) {
      if (fs.existsSync(path.join(dir, 'page.tsx'))) return true;
      return entries.some((e) => e.name.startsWith('(') && walk(path.join(dir, e.name), rest));
    }
    return entries.some((e) => (e.name === rest[0] && walk(path.join(dir, e.name), rest.slice(1))) || (e.name.startsWith('(') && walk(path.join(dir, e.name), rest)));
  };
  return walk(app, parts);
}

test('cada consulta tiene id único, pregunta y respuesta en párrafos', () => {
  assert.ok(FAQ.length >= 6 && FAQ.length <= 10, 'un menú corto, como los de WhatsApp');
  assert.equal(new Set(FAQ.map((f) => f.id)).size, FAQ.length);
  for (const f of FAQ) {
    assert.match(f.id, /^[a-z-]+$/);
    assert.ok(f.question.endsWith('?'), f.id + ': la pregunta termina en "?"');
    assert.ok(f.question.length <= 45, f.id + ': entra en un botón');
    assert.ok(f.answer.length >= 1 && f.answer.every((p) => p.trim().length > 20), f.id + ': respuesta completa');
    assert.equal(faqById(f.id), f);
  }
  assert.ok(BOT_GREETING.length >= 1);
});

test('los accesos directos apuntan a páginas internas que existen', () => {
  const links = FAQ.flatMap((f) => (f.links ?? []).map((l) => ({ id: f.id, ...l })));
  assert.ok(links.length > 0);
  for (const l of links) {
    assert.match(l.href, /^\/[a-z/-]*$/, l.id + ': ruta interna');
    assert.ok(routeExists(l.href), l.id + ': no existe la página ' + l.href);
  }
});

test('sólo datos que ya publica el sitio: horario y correo coinciden con el pie de página', () => {
  const footer = fs.readFileSync(path.join(__dirname, '../src/components/layout/Footer.tsx'), 'utf8');
  assert.ok(footer.includes('ventas@teleimport.com.ar'));
  assert.match(footer, /Lunes a viernes 9.18hs/);
  const all = FAQ.flatMap((f) => f.answer).join(' ');
  assert.match(all, /ventas@teleimport\.com\.ar/);
  assert.match(all, /lunes a viernes de 9 a 18 h/);
});
