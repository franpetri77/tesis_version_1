// T6b: importar y exportar productos en CSV. Sin MySQL ni datos reales:
// doble de base en memoria con transacciones, índices únicos y auditoría.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express'), jwt = require('jsonwebtoken');

let db, queries, tx, failAuditOn, beforeInsertProduct, dispatched, server, base;
const clone = (v) => structuredClone(v);
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const money = (v) => (v === null || v === undefined ? null : Number(v).toFixed(2));
const dup = () => Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });

function seed() {
  db = {
    categories: [{ id: 'c-acc', slug: 'accesorios', name: 'Accesorios' }, { id: 'c-aud', slug: 'audio', name: 'Audio y video' }],
    products: new Map(), images: [], tags: new Map(), maps: [], audits: [],
  };
  const add = (p) => db.products.set(p.id, { compare_price: null, brand: null, model: null, description: null, short_description: null, is_featured: 0, is_active: 1, metadata: '{}', weight: null, ...p, price: money(p.price), compare_price: money(p.compare_price) });
  add({ id: 'p1', sku: 'HUB-1', name: 'Hub USB-C', slug: 'hub-usb-c', price: 45999, compare_price: 52999, category_id: 'c-acc', stock_quantity: 14, brand: 'Ugreen', short_description: 'Siete puertos', metadata: '{"Puertos":"7","Incluye funda":true}' });
  add({ id: 'p2', sku: 'MOU-1', name: 'Mouse "Silent"', slug: 'mouse-silent', price: 18999.5, category_id: 'c-acc', stock_quantity: 3, description: 'Línea 1\nLínea 2; con separador' });
  add({ id: 'p3', sku: 'ABC-1', name: '=Fórmula peligrosa', slug: 'formula', price: 100, category_id: 'c-aud', stock_quantity: 0, is_active: 0 });
  db.images.push({ id: 'i1', product_id: 'p1', image_url: 'https://img.example/hub-1.jpg', alt_text: 'Hub frente', sort_order: 0 });
  db.images.push({ id: 'i2', product_id: 'p1', image_url: 'https://img.example/hub-2.jpg', alt_text: 'Hub lateral', sort_order: 1 });
  db.tags.set('usb-c', { id: 't1', name: 'USB-C', slug: 'usb-c' });
  db.tags.set('oficina', { id: 't2', name: 'Oficina', slug: 'oficina' });
  db.maps.push({ product_id: 'p1', tag_id: 't1' }, { product_id: 'p1', tag_id: 't2' }, { product_id: 'p2', tag_id: 't2' });
}
const tagById = (id) => [...db.tags.values()].find((t) => t.id === id);
const isWrite = (s) => /^(INSERT|UPDATE|DELETE)/.test(s);

async function query(raw, a = []) {
  const s = norm(raw); queries.push({ s, a });
  if (s.includes('AS panel_role')) return [[{ panel_role: { 'u-admin': 'admin', 'u-ro': 'readonly', 'u-cust': 'customer' }[a[0]] }], []];
  // Plan
  if (s.startsWith('SELECT * FROM products WHERE sku IN')) return [[...db.products.values()].filter((p) => a[0].includes(p.sku.toLowerCase())).sort((x, y) => x.sku.localeCompare(y.sku)).map(clone), []];
  if (s.startsWith('SELECT product_id, image_url, alt_text FROM product_images WHERE product_id IN')) return [db.images.filter((i) => a[0].includes(i.product_id)).sort((x, y) => x.product_id.localeCompare(y.product_id) || x.sort_order - y.sort_order).map(clone), []];
  if (s.startsWith('SELECT m.product_id, t.slug FROM product_tag_map')) return [db.maps.filter((m) => a[0].includes(m.product_id)).map((m) => ({ product_id: m.product_id, slug: tagById(m.tag_id).slug })).sort((x, y) => x.slug.localeCompare(y.slug)), []];
  if (s.startsWith('SELECT id, slug, name FROM categories')) return [clone(db.categories), []];
  if (s.startsWith('SELECT id, sku, slug FROM products WHERE slug IN')) return [[...db.products.values()].filter((p) => a[0].includes(p.slug)).map(({ id, sku, slug }) => ({ id, sku, slug })), []];
  // Exportación
  if (s.startsWith('SELECT p.*, c.slug AS category_slug')) return [[...db.products.values()].sort((x, y) => x.sku.localeCompare(y.sku)).map((p) => ({ ...clone(p), category_slug: db.categories.find((c) => c.id === p.category_id)?.slug })), []];
  if (s.startsWith('SELECT product_id, image_url FROM product_images ORDER BY')) return [[...db.images].sort((x, y) => x.product_id.localeCompare(y.product_id) || x.sort_order - y.sort_order).map(clone), []];
  if (s.startsWith('SELECT m.product_id, t.name FROM product_tag_map')) return [db.maps.map((m) => ({ product_id: m.product_id, name: tagById(m.tag_id).name, slug: tagById(m.tag_id).slug })).sort((x, y) => x.product_id.localeCompare(y.product_id) || x.slug.localeCompare(y.slug)), []];
  // Escrituras de la importación
  if (s.startsWith('INSERT INTO products')) {
    if (beforeInsertProduct) { const f = beforeInsertProduct; beforeInsertProduct = null; f(); }
    const [id, name, slug, sku, price, compare_price, category_id, stock_quantity, brand, model, description, short_description, is_featured, is_active] = a;
    for (const p of db.products.values()) if (p.sku.toLowerCase() === sku.toLowerCase() || p.slug === slug) throw dup();
    db.products.set(id, { id, name, slug, sku, price: money(price), compare_price: money(compare_price), category_id, stock_quantity, brand, model, description, short_description, is_featured, is_active, metadata: null, weight: null });
    return [{ affectedRows: 1 }, []];
  }
  if (s.startsWith('UPDATE products SET name = ?, slug = ?')) {
    const [name, slug, price, compare_price, category_id, stock_quantity, brand, model, description, short_description, is_featured, is_active, id] = a;
    for (const p of db.products.values()) if (p.id !== id && p.slug === slug) throw dup();
    Object.assign(db.products.get(id), { name, slug, price: money(price), compare_price: money(compare_price), category_id, stock_quantity, brand, model, description, short_description, is_featured, is_active });
    return [{ affectedRows: 1 }, []];
  }
  if (s.startsWith('DELETE FROM product_images WHERE product_id')) { db.images = db.images.filter((i) => i.product_id !== a[0]); return [{}, []]; }
  if (s.startsWith('INSERT INTO product_images')) { db.images.push({ id: a[0], product_id: a[1], image_url: a[2], alt_text: a[3], sort_order: a[4] }); return [{}, []]; }
  if (s.startsWith('UPDATE products SET metadata')) { db.products.get(a[1]).metadata = a[0]; return [{}, []]; }
  if (s.startsWith('DELETE FROM product_tag_map')) { db.maps = db.maps.filter((m) => m.product_id !== a[0]); return [{}, []]; }
  if (s.startsWith('INSERT INTO product_tags')) { if (!db.tags.has(a[2])) db.tags.set(a[2], { id: a[0], name: a[1], slug: a[2] }); return [{}, []]; }
  if (s.startsWith('SELECT id FROM product_tags WHERE slug')) return [[{ id: db.tags.get(a[0]).id }], []];
  if (s.startsWith('INSERT INTO product_tag_map')) { db.maps.push({ product_id: a[0], tag_id: a[1] }); return [{}, []]; }
  // Foto de auditoría
  if (s.startsWith('SELECT * FROM products WHERE id')) return [[clone(db.products.get(a[0]))].filter(Boolean), []];
  if (s.startsWith('SELECT image_url, alt_text FROM product_images WHERE product_id')) return [db.images.filter((i) => i.product_id === a[0]).sort((x, y) => x.sort_order - y.sort_order).map(clone), []];
  if (s.startsWith('SELECT t.id, t.name, t.slug FROM product_tags t')) return [db.maps.filter((m) => m.product_id === a[0]).map((m) => clone(tagById(m.tag_id))).sort((x, y) => x.slug.localeCompare(y.slug)), []];
  if (s.startsWith('INSERT INTO audit_logs')) {
    if (failAuditOn && a[1] === failAuditOn) throw new Error('audit blocked');
    db.audits.push({ action: a[1], entity_id: a[3], user_id: a[4], previous: a[5] && JSON.parse(a[5]), next: a[6] && JSON.parse(a[6]) });
    return [{}, []];
  }
  throw new Error('Consulta no prevista en el doble: ' + s.slice(0, 120));
}
const connection = { query, async beginTransaction() { tx = clone(db); }, async commit() { tx = null; }, async rollback() { db = tx; tx = null; }, release() {} };
const pool = { query, getConnection: async () => connection };
require.cache[require.resolve('../dist/db/database')] = { exports: { __esModule: true, default: pool } };
require.cache[require.resolve('../dist/services/notifications')] = { exports: {
  dispatch(label) { dispatched.push(label); }, notifyLowStock: async () => 0, notifyNewProduct: async () => 0, notifyPriceDrop: async () => 0,
} };
process.env.JWT_SECRET = 'csv-import-local-only-test';
const { parseCsv, toCsv, detectDelimiter, unprotectCell, CsvError } = require('../dist/services/csv');
const { parseDecimal, parseBoolean, MAX_IMPORT_ROWS } = require('../dist/services/productImport');
const { adminRouter } = require('../dist/routes/admin');

before(async () => {
  const app = express(); app.use(express.json({ limit: '5mb' })); app.use('/admin', adminRouter);
  server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  base = 'http://127.0.0.1:' + server.address().port;
});
after(() => new Promise((r) => server.close(r)));
beforeEach(() => { seed(); queries = []; tx = null; failAuditOn = null; beforeInsertProduct = null; dispatched = []; });

const token = (userId) => 'Bearer ' + jwt.sign({ userId, role: 'admin' }, process.env.JWT_SECRET);
async function call(method, path, body, user = 'u-admin') {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: token(user) } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: r.status, body: json, text, headers: r.headers };
}
const preview = (csv) => call('POST', '/admin/products/import/preview', { csv });
async function importCsv(csv) {
  const p = await preview(csv);
  assert.equal(p.status, 200, JSON.stringify(p.body));
  return call('POST', '/admin/products/import', { csv, hash: p.body.data.hash, signature: p.body.data.signature, file_name: 'prueba.csv' });
}
const writes = () => queries.filter((q) => isWrite(q.s) && !q.s.startsWith('INSERT INTO audit_logs'));
const bySku = (sku) => [...db.products.values()].find((p) => p.sku === sku);
const tagsOf = (id) => db.maps.filter((m) => m.product_id === id).map((m) => tagById(m.tag_id).slug).sort();

// -----------------------------------------------
test('CSV: comillas, saltos de línea, comillas dobladas, BOM y detección del separador', () => {
  const text = '﻿sku;nombre;descripcion\r\nA;"Hub ""7 en 1""";"línea 1\nlínea 2; sigue"\r\n\r\nB;Mouse;\r\n';
  assert.equal(detectDelimiter(text.slice(1)), ';');
  assert.equal(detectDelimiter('a,b,"c;d"\n'), ',');
  assert.equal(detectDelimiter('a\tb\tc'), '\t');
  const rows = parseCsv(text);
  assert.deepEqual(rows.map((r) => r.cells), [['sku', 'nombre', 'descripcion'], ['A', 'Hub "7 en 1"', 'línea 1\nlínea 2; sigue'], ['B', 'Mouse', '']]);
  assert.deepEqual(rows.map((r) => r.line), [1, 2, 5], 'la fila B empieza en la línea 5 del archivo');
  assert.throws(() => parseCsv('a;b\n"sin cerrar;x'), CsvError);
  assert.deepEqual(parseCsv('a;b\nx"y";{"k":"v"}')[1].cells, ['x"y"', '{"k":"v"}'], 'comillas en medio de un campo: texto literal');
  assert.throws(() => parseCsv('a;b\n"x"y;z'), CsvError);
});

test('CSV: la exportación neutraliza fórmulas y el ciclo exportar/leer conserva cada celda', () => {
  const cells = [['=SUMA(A1)', '+54 351', '-5', '@usuario', 'normal', ' con espacios ', 'a;b', 'comilla "x"', 'salto\nlínea', "'=ya protegido"]];
  const csv = toCsv(cells);
  assert.ok(csv.startsWith('﻿'));
  assert.match(csv, /^﻿'=SUMA\(A1\);'\+54 351;'-5;'@usuario;normal;" con espacios ";"a;b";"comilla ""x""";"salto\nlínea"/);
  const back = parseCsv(csv)[0].cells.map(unprotectCell);
  assert.deepEqual(back, cells[0], 'todas las celdas, incluida la que ya empezaba con apóstrofo');
});

test('CSV: el escape es reversible con apóstrofos originales delante de =, +, -, @, tabulación o CR', () => {
  const originals = ["'=Nombre literal", "''=doble", "'+54", "'-5", "'@x", "'\tcon tab", "'normal", "''", "'", 'sin nada', "=x"];
  const csv = toCsv([originals]);
  assert.match(csv, /^﻿''=Nombre literal;'''=doble;''\+54;''-5;''@x;''\tcon tab;'normal;'';';sin nada;'=x\r\n$/);
  assert.deepEqual(parseCsv(csv)[0].cells.map(unprotectCell), originals);
  for (const cell of parseCsv(csv)[0].cells) assert.doesNotMatch(cell, /^[=+\-@\t\r]/, 'ninguna celda exportada empieza como fórmula');
});

test('números y sí/no: coma o punto solo para centavos; "45.999" es ambiguo y se rechaza', () => {
  assert.equal(parseDecimal('45999'), 45999); assert.equal(parseDecimal('45999,5'), 45999.5); assert.equal(parseDecimal('45999.50'), 45999.5);
  for (const v of ['45.999', '45.999,00', '1,234.5', '-3', 'abc', '', '12,345']) assert.equal(parseDecimal(v), null, v);
  for (const v of ['sí', 'SI', 'Sí', 'true', '1', 'x']) assert.equal(parseBoolean(v), true, v);
  for (const v of ['no', 'NO', 'false', '0']) assert.equal(parseBoolean(v), false, v);
  assert.equal(parseBoolean('quizás'), null);
});

test('exportación: CSV para planillas en castellano, con etiquetas, especificaciones e imágenes; readonly puede exportar', async () => {
  const r = await call('GET', '/admin/products/export', null, 'u-ro');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/csv/);
  assert.match(r.headers.get('content-disposition'), /attachment; filename="productos-\d{4}-\d{2}-\d{2}\.csv"/);
  const rows = parseCsv(r.text).map((x) => x.cells.map(unprotectCell));
  assert.deepEqual(rows[0], ['sku', 'nombre', 'slug', 'categoria', 'marca', 'modelo', 'precio', 'precio_anterior', 'stock', 'activo', 'destacado', 'descripcion_corta', 'descripcion', 'etiquetas', 'especificaciones', 'imagenes']);
  const [abc, hub, mouse] = rows.slice(1);
  assert.deepEqual(hub.slice(0, 11), ['HUB-1', 'Hub USB-C', 'hub-usb-c', 'accesorios', 'Ugreen', '', '45999,00', '52999,00', '14', 'sí', 'no']);
  assert.equal(hub[13], 'Oficina, USB-C');
  assert.deepEqual(JSON.parse(hub[14]), { Puertos: '7', 'Incluye funda': true });
  assert.equal(hub[15], 'https://img.example/hub-1.jpg | https://img.example/hub-2.jpg');
  assert.equal(mouse[6], '18999,50'); assert.equal(mouse[12], 'Línea 1\nLínea 2; con separador');
  assert.equal(abc[9], 'no');
  assert.match(r.text, /;'=Fórmula peligrosa;/, 'la celda que empieza con = sale protegida');
  const t = await call('GET', '/admin/products/export?plantilla=1');
  assert.equal(parseCsv(t.text).length, 1); assert.match(t.headers.get('content-disposition'), /plantilla-productos\.csv/);
});

test('ida y vuelta: importar el mismo CSV exportado no cambia nada ni escribe', async () => {
  const csv = (await call('GET', '/admin/products/export')).text;
  queries = [];
  const p = await preview(csv);
  assert.equal(p.status, 200);
  assert.deepEqual(p.body.data.summary, { total: 3, create: 0, update: 0, unchanged: 3, error: 0 });
  assert.equal(writes().length, 0);
  const before = clone(db);
  const c = await call('POST', '/admin/products/import', { csv, hash: p.body.data.hash, signature: p.body.data.signature });
  assert.equal(c.status, 200);
  assert.deepEqual([...db.products.values()], [...before.products.values()]);
  assert.deepEqual(db.audits.map((a) => a.action), ['product_import'], 'solo queda el registro resumen');
});

test('ida y vuelta HTTP con apóstrofos originales en textos: sin cambios', async () => {
  Object.assign(db.products.get('p1'), { name: "'=Nombre literal", brand: "''+Marca", short_description: "'-corta" });
  Object.assign(db.products.get('p2'), { model: "'@modelo", description: "'normal" });
  const before = clone(db);
  const csv = (await call('GET', '/admin/products/export')).text;
  const p = await preview(csv);
  assert.deepEqual(p.body.data.summary, { total: 3, create: 0, update: 0, unchanged: 3, error: 0 }, JSON.stringify(p.body.data.rows));
  const c = await call('POST', '/admin/products/import', { csv, hash: p.body.data.hash, signature: p.body.data.signature });
  assert.equal(c.status, 200);
  assert.deepEqual([...db.products.values()], [...before.products.values()]);
  assert.equal(bySku('HUB-1').name, "'=Nombre literal");
});

test('firma: dos vistas previas que llevan el mismo SKU a precios distintos; la segunda confirmación es obsoleta (409)', async () => {
  const a = 'sku;precio\nHUB-1;100', b = 'sku;precio\nHUB-1;200';
  const pa = await preview(a), pb = await preview(b);
  assert.deepEqual(pa.body.data.rows[0].changes, ['precio']);
  assert.deepEqual(pb.body.data.rows[0].changes, ['precio']);
  assert.notEqual(pa.body.data.signature, pb.body.data.signature, 'mismo SKU, acción y columna, pero otro destino');
  const ra = await call('POST', '/admin/products/import', { csv: a, hash: pa.body.data.hash, signature: pa.body.data.signature });
  assert.equal(ra.status, 200);
  queries = [];
  const rb = await call('POST', '/admin/products/import', { csv: b, hash: pb.body.data.hash, signature: pb.body.data.signature });
  assert.equal(rb.status, 409); assert.match(rb.body.error, /cambiaron desde la vista previa/);
  assert.equal(bySku('HUB-1').price, money(100), 'no pisa el cambio confirmado después de su vista previa');
  assert.equal(writes().length, 0);
  assert.equal(rb.body.data.rows[0].action, 'update', 'la nueva vista previa sigue proponiendo el cambio, para revisarlo');
});

test('firma: un cambio intermedio de precio o stock que no coincide con el destino invalida la vista previa (409)', async () => {
  for (const [csv, change] of [
    ['sku;precio\nHUB-1;30000', (p) => { p.price = money(40000); }],
    ['sku;stock\nHUB-1;50', (p) => { p.stock_quantity = 20; }],
  ]) {
    seed(); queries = [];
    const p = await preview(csv);
    change(db.products.get('p1')); // otra sesión editó el producto después de la vista previa
    const r = await call('POST', '/admin/products/import', { csv, hash: p.body.data.hash, signature: p.body.data.signature });
    assert.equal(r.status, 409, csv); assert.match(r.body.error, /cambiaron desde la vista previa/);
    assert.equal(writes().length, 0); assert.equal(db.audits.length, 0);
  }
  // Un cambio en otro campo del mismo producto (etiquetas) también
  const csv = 'sku;precio\nHUB-1;30000';
  const p = await preview(csv);
  db.maps = db.maps.filter((m) => !(m.product_id === 'p1' && m.tag_id === 't1'));
  const r = await call('POST', '/admin/products/import', { csv, hash: p.body.data.hash, signature: p.body.data.signature });
  assert.equal(r.status, 409);
});

test('vista previa: errores por fila con línea y columna, sin escribir en la base', async () => {
  const csv = [
    'sku;nombre;categoria;precio;stock;etiquetas;especificaciones;imagenes',
    'NEW-1;Teclado mecánico;accesorios;25999,90;10;Gamer, USB-C;{"Switch":"Red"};https://img.example/k.jpg',
    'HUB-1;;accesorios;45.999;3;;;',
    'NEW-2;Parlante;inexistente;abc;-1;!!!;{"a":{"b":1}};ftp://x',
    'NEW-1;Duplicado;audio;10;1;;;',
    'NEW-3;Sin precio;audio;;1;;no-json;',
  ].join('\n');
  const r = await preview(csv);
  assert.equal(r.status, 200);
  const rows = r.body.data.rows;
  assert.deepEqual(r.body.data.summary, { total: 5, create: 1, update: 0, unchanged: 0, error: 4 });
  assert.deepEqual(rows.map((x) => [x.line, x.action]), [[2, 'create'], [3, 'error'], [4, 'error'], [5, 'error'], [6, 'error']]);
  const cols = (line) => rows.find((x) => x.line === line).errors.map((e) => e.column).sort();
  assert.deepEqual(cols(3), ['nombre', 'precio'].sort());
  assert.deepEqual(cols(4), ['categoria', 'especificaciones', 'etiquetas', 'imagenes', 'precio', 'stock'].sort());
  assert.match(rows[3].errors[0].message, /SKU repetido: ya aparece en la línea 2/);
  assert.deepEqual(cols(6), ['especificaciones', 'precio']);
  assert.match(rows[1].errors.find((e) => e.column === 'precio').message, /coma o punto/);
  assert.ok(rows.flatMap((x) => x.errors).every((e) => /[áéíóúñ]|[a-z]/.test(e.message) && !/String must|Expected/.test(e.message)), 'mensajes en castellano');
  assert.equal(writes().length, 0);
});

test('errores de archivo: sin columna sku, encabezado repetido, sin filas, demasiadas filas, comillas sin cerrar', async () => {
  assert.match((await preview('nombre;precio\nX;1')).body.data.fileErrors[0], /Falta la columna "sku"/);
  assert.match((await preview('sku;SKU\nA;B')).body.data.fileErrors[0], /repetida/);
  assert.match((await preview('sku;nombre\n')).body.data.fileErrors[0], /no tiene productos/);
  const many = 'sku;precio\n' + Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `S${i};1`).join('\n');
  assert.match((await preview(many)).body.data.fileErrors[0], /máximo por importación es 1000/);
  assert.match((await preview('sku;nombre\nA;"abierta')).body.data.fileErrors[0], /falta cerrar las comillas/);
  const ignored = await preview('sku;precio;Color favorito\nHUB-1;45999;azul');
  assert.deepEqual(ignored.body.data.ignoredColumns, ['Color favorito']);
  assert.equal(writes().length, 0);
});

test('confirmación: crea y actualiza en una transacción, con auditoría por producto y un resumen', async () => {
  const csv = [
    'sku;nombre;categoria;precio;precio_anterior;stock;activo;marca;etiquetas;especificaciones;imagenes',
    'NEW-1;Teclado mecánico;Accesorios;25999,90;;10;sí;Redragon;Gamer, usb c;{"Switch":"Red"};https://img.example/k.jpg',
    'HUB-1;Hub USB-C 7 en 1;accesorios;39999;52999;2;sí;;USB-C;{"Puertos":"7","Incluye funda":true};https://img.example/hub-1.jpg | https://img.example/hub-2.jpg',
  ].join('\n');
  const p = await preview(csv);
  assert.deepEqual(p.body.data.rows.map((r) => [r.action, r.changes]), [['create', []], ['update', ['nombre', 'marca', 'precio', 'stock', 'etiquetas']]]);
  const r = await call('POST', '/admin/products/import', { csv, hash: p.body.data.hash, signature: p.body.data.signature, file_name: 'lista.csv' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.data.summary, { total: 2, create: 1, update: 1, unchanged: 0, error: 0 });
  const created = bySku('NEW-1');
  assert.equal(created.slug, 'teclado-mecanico'); assert.equal(created.category_id, 'c-acc'); assert.equal(created.price, '25999.90');
  assert.deepEqual(tagsOf(created.id), ['gamer', 'usb-c'], 'reutiliza la etiqueta existente por slug');
  assert.deepEqual(JSON.parse(created.metadata), { Switch: 'Red' });
  const hub = db.products.get('p1');
  assert.equal(hub.name, 'Hub USB-C 7 en 1'); assert.equal(hub.brand, null, 'celda vacía en columna presente vacía el valor');
  assert.equal(hub.price, '39999.00'); assert.equal(hub.stock_quantity, 2); assert.deepEqual(tagsOf('p1'), ['usb-c']);
  assert.deepEqual(db.images.filter((i) => i.product_id === 'p1').map((i) => i.alt_text), ['Hub frente', 'Hub lateral'], 'imágenes iguales: no se tocan y conservan el texto alternativo');
  assert.deepEqual(db.audits.map((a) => a.action), ['product_create', 'product_update', 'product_import']);
  const upd = db.audits[1];
  assert.deepEqual(Object.keys(upd.next).sort(), ['brand', 'name', 'price', 'stock_quantity', 'tags']);
  assert.deepEqual(upd.previous.tags, ['oficina', 'usb-c']); assert.deepEqual(upd.next.tags, ['usb-c']);
  assert.deepEqual(db.audits[2].next, { archivo: 'lista.csv', creados: 1, actualizados: 1, sin_cambios: 0 });
  assert.equal(db.audits[0].user_id, 'u-admin');
  assert.deepEqual(dispatched.sort(), ['baja de precio p1', `producto nuevo ${created.id}`, 'stock bajo (importación)'].sort());
});

test('columna ausente conserva; solo sku y precio cambia el precio sin tocar etiquetas, imágenes ni textos', async () => {
  const r = await importCsv('sku,precio\nHUB-1,44999.5\nmou-1,18999.50');
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.summary, { total: 2, create: 0, update: 1, unchanged: 1, error: 0 }, 'el SKU en minúsculas encuentra MOU-1 sin cambios');
  const hub = db.products.get('p1');
  assert.equal(hub.price, '44999.50'); assert.equal(hub.brand, 'Ugreen'); assert.equal(hub.short_description, 'Siete puertos');
  assert.deepEqual(tagsOf('p1'), ['oficina', 'usb-c']); assert.equal(db.images.filter((i) => i.product_id === 'p1').length, 2);
  assert.ok(!queries.some((q) => q.s.startsWith('DELETE FROM product_tag_map') || q.s.startsWith('DELETE FROM product_images') || q.s.startsWith('UPDATE products SET metadata')));
});

test('columnas vaciables: etiquetas, especificaciones e imágenes vacías los quitan', async () => {
  const r = await importCsv('sku;etiquetas;especificaciones;imagenes\nHUB-1;;;');
  assert.equal(r.status, 200);
  assert.deepEqual(tagsOf('p1'), []); assert.equal(db.products.get('p1').metadata, '{}');
  assert.equal(db.images.filter((i) => i.product_id === 'p1').length, 0);
});

test('slug: repetido en el archivo o tomado por otro producto es un error de la fila', async () => {
  const r = await preview('sku;nombre;slug;categoria;precio\nN1;Uno;mouse-silent;audio;1\nN2;Dos;nuevo;audio;1\nN3;Tres;nuevo;audio;1\nN4;Cuatro;Mal Slug;audio;1');
  const errs = Object.fromEntries(r.body.data.rows.map((x) => [x.sku, x.errors.map((e) => e.message).join(' | ')]));
  assert.match(errs.N1, /ya lo usa el producto MOU-1/);
  assert.equal(errs.N2, '');
  assert.match(errs.N3, /ya lo usa la línea 3/);
  assert.match(errs.N4, /minúsculas, números y guiones/);
});

test('rechazos de la confirmación: con errores 422, otro archivo 409, productos cambiados 409; nada se escribe', async () => {
  const bad = 'sku;precio\nHUB-1;abc';
  const pb = await preview(bad);
  const r1 = await call('POST', '/admin/products/import', { csv: bad, hash: pb.body.data.hash, signature: pb.body.data.signature });
  assert.equal(r1.status, 422); assert.equal(r1.body.data.summary.error, 1);

  const good = 'sku;precio\nHUB-1;40000';
  const pg = await preview(good);
  const r2 = await call('POST', '/admin/products/import', { csv: good + '\nMOU-1;1', hash: pg.body.data.hash, signature: pg.body.data.signature });
  assert.equal(r2.status, 409); assert.match(r2.body.error, /no es el mismo/);

  db.products.get('p1').price = money(40000); // otro admin cambió el precio después de la vista previa
  const r3 = await call('POST', '/admin/products/import', { csv: good, hash: pg.body.data.hash, signature: pg.body.data.signature });
  assert.equal(r3.status, 409); assert.match(r3.body.error, /cambiaron desde la vista previa/);
  assert.equal(r3.body.data.rows[0].action, 'unchanged');
  assert.equal(writes().length, 0); assert.equal(db.audits.length, 0);
});

test('todo o nada: si falla la auditoría a mitad del archivo se revierte cada producto', async () => {
  failAuditOn = 'product_update';
  const r = await importCsv('sku;nombre;categoria;precio\nNEW-1;Nuevo;audio;10\nHUB-1;Hub cambiado;accesorios;45999');
  assert.equal(r.status, 500); assert.match(r.body.error, /No se guardó ningún cambio/);
  assert.equal(bySku('NEW-1'), undefined); assert.equal(db.products.get('p1').name, 'Hub USB-C');
  assert.equal(db.audits.length, 0); assert.deepEqual(dispatched, []);
});

test('carrera: si otro usuario crea el mismo SKU durante la confirmación responde 409 y revierte', async () => {
  const csv = 'sku;nombre;categoria;precio\nNEW-1;Primero;audio;10\nNEW-2;Segundo;audio;20';
  const p = await preview(csv);
  // El segundo producto choca con uno creado "por otro usuario" entre la vista previa y el INSERT
  const realQuery = connection.query;
  connection.query = async (raw, a) => {
    if (norm(raw).startsWith('INSERT INTO products') && a[3] === 'NEW-2') db.products.set('otro', { id: 'otro', sku: 'NEW-2', slug: 'otro', name: 'Otro', price: '1.00', category_id: 'c-aud', stock_quantity: 0, is_active: 1, is_featured: 0, metadata: '{}' });
    return realQuery(raw, a);
  };
  try {
    const r = await call('POST', '/admin/products/import', { csv, hash: p.body.data.hash, signature: p.body.data.signature });
    assert.equal(r.status, 409); assert.match(r.body.error, /mismo SKU o slug/);
  } finally { connection.query = realQuery; }
  assert.equal(bySku('NEW-1'), undefined, 'el primero también se revierte');
});

test('bloqueo: la confirmación lee los productos con FOR UPDATE antes que cualquier otra consulta', async () => {
  const p = await preview('sku;precio\nHUB-1;40000');
  queries = [];
  await call('POST', '/admin/products/import', { csv: 'sku;precio\nHUB-1;40000', hash: p.body.data.hash, signature: p.body.data.signature });
  const data = queries.filter((q) => !q.s.includes('AS panel_role'));
  assert.match(data[0].s, /^SELECT \* FROM products WHERE sku IN \(\?\) ORDER BY sku FOR UPDATE$/);
  assert.deepEqual(data[0].a[0], ['hub-1']);
  const previewQueries = (await (async () => { queries = []; await preview('sku;precio\nHUB-1;1'); return queries; })()).filter((q) => q.s.startsWith('SELECT * FROM products WHERE sku IN'));
  assert.ok(!previewQueries[0].s.endsWith('FOR UPDATE'), 'la vista previa no bloquea');
});

test('permisos: readonly y cliente no importan (403), sin sesión 401; cuerpo inválido 400', async () => {
  assert.equal((await call('POST', '/admin/products/import/preview', { csv: 'sku\nA' }, 'u-ro')).status, 403);
  assert.equal((await call('POST', '/admin/products/import', { csv: 'sku\nA', hash: 'a'.repeat(64), signature: 'a'.repeat(64) }, 'u-ro')).status, 403);
  assert.equal((await call('GET', '/admin/products/export', null, 'u-cust')).status, 403);
  assert.equal((await call('GET', '/admin/products/export', null, null)).status, 401);
  assert.equal((await call('POST', '/admin/products/import/preview', { csv: 5 })).status, 400);
  assert.equal((await call('POST', '/admin/products/import', { csv: 'sku\nA', hash: 'x', signature: 'y' })).status, 400);
  assert.equal(writes().length, 0);
});
