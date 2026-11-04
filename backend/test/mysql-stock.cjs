// Prueba explícita: node test/mysql-stock.cjs --local-docker
// Nunca lee .env. Sólo mysql-tele en loopback; copia registros YA existentes
// a un esquema descartable. No crea clientes ni pedidos nuevos.
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const mysql = require('mysql2/promise');

async function main() {
  assert.ok(process.argv.includes('--local-docker'), 'Requiere --local-docker');
  const [container] = JSON.parse(cp.execFileSync('docker', ['inspect', 'mysql-tele'], { encoding: 'utf8' }));
  const vars = Object.fromEntries(container.Config.Env.map(entry => { const i = entry.indexOf('='); return [entry.slice(0, i), entry.slice(i + 1)]; }));
  const binding = container.NetworkSettings.Ports['3306/tcp']?.[0];
  assert.ok(binding, 'Puerto MySQL local no publicado');
  const cfg = { host: '127.0.0.1', port: Number(binding.HostPort), user: 'root', password: vars.MYSQL_ROOT_PASSWORD, decimalNumbers: true, dateStrings: true };
  const source = vars.MYSQL_DATABASE || 'tele_import';
  const schema = 'p2_stock_check_' + process.pid + '_' + Date.now();
  assert.match(schema, /^p2_stock_check_\d+_\d+$/);
  const admin = await mysql.createConnection(cfg);
  const readonly = await mysql.createConnection({ ...cfg, database: source });
  await readonly.query('SET SESSION TRANSACTION READ ONLY');
  let pool;
  const observations = [];
  const quote = mysql.escapeId;
  async function fingerprint() {
    const [tables] = await readonly.query('SHOW TABLES');
    const snapshot = {};
    for (const row of tables) {
      const table = Object.values(row)[0];
      const [counts] = await readonly.query('SELECT COUNT(*) AS n FROM ' + quote(table));
      const [checksum] = await readonly.query('CHECKSUM TABLE ' + quote(table));
      snapshot[table] = { count: counts[0].n, checksum: checksum[0].Checksum };
    }
    return snapshot;
  }
  const before = await fingerprint();
  try {
    await admin.query('CREATE DATABASE ' + quote(schema) + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    pool = mysql.createPool({ ...cfg, database: schema, connectionLimit: 6 });
    require.cache[require.resolve('../dist/db/database')] = { exports: { __esModule: true, default: pool } };
    const stock = require('../dist/services/orderStock');
    const { initSchema } = require('../dist/db/schema');

    // Esquema anterior: agregar las tres columnas y el índice en una BD con datos.
    await initSchema(pool);
    await pool.query('ALTER TABLE orders DROP INDEX idx_orders_expiry, DROP COLUMN stock_reserved_at, DROP COLUMN stock_released_at, DROP COLUMN payment_expires_at');
    const [existing] = await readonly.query("SELECT id, user_id FROM orders WHERE status = 'pending' AND EXISTS (SELECT 1 FROM order_items WHERE order_id = orders.id) LIMIT 1");
    assert.ok(existing[0], 'Se requiere un pedido local preexistente con ítems; no se genera uno');
    const orderId = existing[0].id, userId = existing[0].user_id;
    for (const table of ['users', 'categories', 'products', 'orders', 'order_items']) {
      const [cols] = await readonly.query('SHOW COLUMNS FROM ' + quote(table));
      const columns = cols.map(c => quote(c.Field)).join(', ');
      let condition = '';
      let args = [];
      if (table === 'users') { condition = ' WHERE id = ?'; args = [userId]; }
      if (table === 'orders') { condition = ' WHERE id = ?'; args = [orderId]; }
      if (table === 'order_items') { condition = ' WHERE order_id = ?'; args = [orderId]; }
      await pool.query('INSERT INTO ' + quote(table) + ' (' + columns + ') SELECT ' + columns + ' FROM ' + quote(source) + '.' + quote(table) + condition, args);
    }
    await initSchema(pool);
    await initSchema(pool);
    const [migrated] = await pool.query('SELECT stock_reserved_at, stock_released_at, payment_expires_at FROM orders');
    assert.deepEqual(migrated[0], { stock_reserved_at: null, stock_released_at: null, payment_expires_at: null });
    observations.push({ case: 'Migración sobre esquema anterior con datos, ejecutada dos veces', result: 'OK; registros históricos sin reserva' });

    const [originalItems] = await pool.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
    const items = stock.consolidateStockItems(originalItems);
    const quantities = new Map(items.map(i => [i.product_id, i.quantity]));
    const checkStock = async (multiplier) => {
      for (const item of items) {
        const [rows] = await pool.query('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
        assert.equal(rows[0].stock_quantity, quantities.get(item.product_id) * multiplier);
      }
    };
    for (const item of items) await pool.query('UPDATE products SET stock_quantity = ?, is_active = 1 WHERE id = ?', [item.quantity, item.product_id]);

    const a = await pool.getConnection(), b = await pool.getConnection();
    let settled = false;
    try {
      await a.beginTransaction();
      const products = await stock.lockStockProducts(a, items);
      await b.beginTransaction();
      // Atar el rechazo inmediatamente evita promesas rechazadas sin manejador.
      const blocked = stock.lockStockProducts(b, [...items]).then(
        () => { settled = true; return 'admitida'; },
        error => { settled = true; assert.ok(error instanceof stock.CheckoutConflict); return error.status; }
      );
      await new Promise(resolve => setTimeout(resolve, 150));
      assert.equal(settled, false, 'La segunda conexión debe esperar el bloqueo real de MySQL');
      await stock.deductOrderStock(a, orderId, userId, items, products);
      await a.query('UPDATE orders SET stock_reserved_at = NOW(), payment_expires_at = DATE_ADD(NOW(), INTERVAL 60 MINUTE) WHERE id = ?', [orderId]);
      await a.commit();
      assert.equal(await blocked, 409);
      await b.rollback();
    } catch (error) {
      await a.rollback(); await b.rollback(); throw error;
    } finally { a.release(); b.release(); }
    await checkStock(0);
    observations.push({ case: 'Dos conexiones por el último stock', result: 'La segunda esperó el bloqueo y recibió 409; stock final 0' });

    const cancellations = await Promise.all([stock.cancelPendingOrder(orderId), stock.cancelPendingOrder(orderId)]);
    assert.equal(cancellations.filter(Boolean).length, 1);
    await checkStock(1);
    const [moves] = await pool.query('SELECT type, COUNT(*) AS n FROM stock_movements GROUP BY type ORDER BY type');
    assert.deepEqual(moves, [{ type: 'ajuste', n: items.length }, { type: 'venta', n: items.length }]);
    observations.push({ case: 'Dos cancelaciones concurrentes', result: 'Una sola reposición por producto; stock vuelve al inicial' });

    // Rollback real: una transacción ya descontó todos los productos, pero falla
    // el registro del movimiento. El pedido copiado se mantiene; no se inserta otro.
    await pool.query("CREATE TRIGGER p2_fail_movement BEFORE INSERT ON stock_movements FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fallo de prueba controlado'");
    const failing = await pool.getConnection();
    try {
      await failing.beginTransaction();
      const products = await stock.lockStockProducts(failing, items);
      await assert.rejects(stock.deductOrderStock(failing, orderId, userId, items, products), error => error.sqlState === '45000');
      await failing.rollback();
    } finally { failing.release(); await pool.query('DROP TRIGGER p2_fail_movement'); }
    await checkStock(1);
    observations.push({ case: 'Error SQL al registrar el descuento', result: 'Rollback real; stock y movimientos sin cambios' });

    async function reserveAgain(expired) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const products = await stock.lockStockProducts(conn, items);
        await stock.deductOrderStock(conn, orderId, userId, items, products);
        await conn.query(`UPDATE orders SET status = 'pending', stock_reserved_at = NOW(), stock_released_at = NULL,
          payment_expires_at = DATE_ADD(NOW(), INTERVAL ${expired ? '-1' : '60'} MINUTE) WHERE id = ?`, [orderId]);
        await conn.commit();
      } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
    }
    await reserveAgain(true);
    await pool.query("CREATE TRIGGER p2_fail_restore BEFORE INSERT ON stock_movements FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fallo de reposición controlado'");
    try { await assert.rejects(stock.cancelPendingOrder(orderId), error => error.sqlState === '45000'); }
    finally { await pool.query('DROP TRIGGER p2_fail_restore'); }
    await checkStock(0);
    const [rolledBack] = await pool.query('SELECT status, stock_released_at FROM orders WHERE id = ?', [orderId]);
    assert.equal(rolledBack[0].status, 'pending'); assert.equal(rolledBack[0].stock_released_at, null);
    observations.push({ case: 'Error SQL durante la reposición', result: 'Rollback real; pedido pendiente, sin marcador ni stock repuesto' });

    const expirations = await Promise.all([stock.expirePendingOrders(), stock.expirePendingOrders()]);
    assert.equal(expirations.reduce((a, b) => a + b), 1);
    await checkStock(1);
    observations.push({ case: 'Dos barridos de vencimiento concurrentes', result: 'Una cancelación y una reposición por producto' });
    await reserveAgain(false);
    assert.equal(await stock.expirePendingOrders(), 0);
    await pool.query("UPDATE orders SET status = 'paid', payment_expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ?", [orderId]);
    assert.equal(await stock.expirePendingOrders(), 0); await checkStock(0);
    observations.push({ case: 'Reserva vigente y pedido pagado vencido', result: 'Ambos excluidos del barrido' });
  } finally {
    if (pool) await pool.end();
    // El nombre proviene exclusivamente del prefijo fijo y números de este proceso.
    assert.match(schema, /^p2_stock_check_\d+_\d+$/);
    await admin.query('DROP DATABASE IF EXISTS ' + quote(schema));
    const after = await fingerprint();
    assert.deepEqual(after, before, 'La base local original debe conservar filas y checksums');
    await readonly.end(); await admin.end();
  }
  console.log(JSON.stringify({ environment: 'MySQL Docker local en loopback; esquema descartable eliminado', sourceTablesUnchanged: Object.keys(before).length, copiedExistingCustomers: 1, copiedExistingOrders: 1, newCustomers: 0, newOrders: 0, observations }, null, 2));
}
main().catch(error => { console.error('Prueba MySQL fallida:', error.code || error.message); process.exitCode = 1; });
