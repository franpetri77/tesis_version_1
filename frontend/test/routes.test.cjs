const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const file = path.join(__dirname, '../src/lib/routes.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const mod = new Module(file); mod.filename = file; mod._compile(js, file);
const { safeInternalRedirect } = mod.exports;
const origin = 'https://teleimport.vercel.app';

test('el retorno de login conserva ruta, filtros y fragmento dentro del sitio', () => {
  for (const target of ['/checkout', '/carrito', '/catalogo?buscar=audio#productos']) {
    const result = safeInternalRedirect(target, origin);
    assert.equal(result, target);
    assert.equal(new URL(result, origin).origin, origin);
  }
});

test('el retorno de login rechaza destinos externos y separadores interpretables como host', () => {
  for (const target of [null, '', 'https://external.invalid', '//external.invalid', '/\\external.invalid', '/\n/external.invalid', '/\t/external.invalid', 'javascript:alert(1)']) {
    const result = safeInternalRedirect(target, origin);
    assert.equal(result, '/', JSON.stringify(target));
    assert.equal(new URL(result, origin).origin, origin);
  }
});
