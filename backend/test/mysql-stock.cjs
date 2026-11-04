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
    const { recordOrderPayment } = require('../dist/services/orderPayments');
    const { initSchema } = require('../dist/db/schema');

    // Esquema anterior: agregar las tres columnas y el índice en una BD con datos.
    await initSchema(pool);
    await pool.query('ALTER TABLE orders DROP INDEX idx_orders_expiry, DROP COLUMN stock_reserved_at, DROP COLUMN stock_released_at, DROP COLUMN payment_expires_at, DROP COLUMN promotion_id, DROP COLUMN promotion_released_at');
    await pool.query('ALTER TABLE payments MODIFY COLUMN amount DECIMAL(15,2) NOT NULL');
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
    const [migrated] = await pool.query('SELECT stock_reserved_at, stock_released_at, payment_expires_at, promotion_id, promotion_released_at FROM orders');
    assert.deepEqual(migrated[0], { stock_reserved_at: null, stock_released_at: null, payment_expires_at: null, promotion_id: null, promotion_released_at: null });
    const [amountColumn] = await pool.query("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'amount'");
    assert.equal(amountColumn[0].IS_NULLABLE, 'YES');
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
          payment_expires_at = DATE_ADD(NOW(), INTERVAL ${expired ? '-11' : '60'} MINUTE) WHERE id = ?`, [orderId]);
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

    await pool.query("UPDATE orders SET status = 'pending', payment_expires_at = DATE_SUB(NOW(), INTERVAL 9 MINUTE) WHERE id = ?", [orderId]);
    assert.equal(await stock.expirePendingOrders(), 0);
    assert.equal(await stock.cancelPendingOrder(orderId, true), false);
    await checkStock(0);
    await pool.query('UPDATE orders SET payment_expires_at = DATE_SUB(NOW(), INTERVAL 11 MINUTE) WHERE id = ?', [orderId]);
    assert.equal(await stock.expirePendingOrders(), 1); await checkStock(1);
    observations.push({ case: 'Margen de diez minutos sin pago registrado', result: 'A los nueve minutos no cancela; a los once cancela y repone' });

    await reserveAgain(true);
    const pending = { mp_payment_id: 'p2-local-pending', mp_status: 'in_process', amount: 0, raw_response: { test: 'revision-pago-en-proceso' } };
    await recordOrderPayment(orderId, pending);
    assert.equal(await stock.expirePendingOrders(), 0);
    assert.equal(await stock.cancelPendingOrder(orderId, true), false);
    await checkStock(0);
    const [beforeRejection] = await pool.query("SELECT COUNT(*) AS n FROM stock_movements WHERE type = 'ajuste'");
    await Promise.all([
      recordOrderPayment(orderId, { ...pending, mp_status: 'rejected' }),
      recordOrderPayment(orderId, { ...pending, mp_status: 'rejected' }),
    ]);
    const [afterRejection] = await pool.query("SELECT COUNT(*) AS n FROM stock_movements WHERE type = 'ajuste'");
    assert.equal(afterRejection[0].n - beforeRejection[0].n, items.length); await checkStock(1);
    observations.push({ case: 'Pago en revisión y rechazo repetido posterior', result: 'El vencimiento lo conserva; el rechazo cancela y repone una vez por producto' });

    await reserveAgain(true);
    const writer = await pool.getConnection();
    let cancelSettled = false;
    let cancellation;
    try {
      await writer.beginTransaction();
      await writer.query('SELECT id FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      cancellation = stock.cancelPendingOrder(orderId, true).then(result => { cancelSettled = true; return result; });
      await new Promise(resolve => setTimeout(resolve, 150));
      assert.equal(cancelSettled, false, 'La cancelación debe esperar el bloqueo del pedido');
      // Pago técnico sólo en la copia descartable; simula la escritura del
      // webhook que obtuvo el bloqueo antes que el barrido.
      await writer.query(`INSERT INTO payments (id, order_id, mp_payment_id, status, amount, currency)
        VALUES ('p2-race-row', ?, 'p2-race-payment', 'pending', 0, 'ARS')`, [orderId]);
      await writer.commit();
      assert.equal(await cancellation, false); await checkStock(0);
    } catch (error) {
      await writer.rollback();
      if (cancellation) await cancellation.catch(() => {});
      throw error;
    } finally { writer.release(); }
    observations.push({ case: 'Pago pendiente se confirma mientras la cancelación espera el bloqueo', result: 'Lectura actual bajo bloqueo ve el pago nuevo y no libera stock' });

    // P3b: sólo un cobro por exactamente orders.total confirma; los pagos técnicos
    // aprobados usan el total del pedido copiado (los rechazos conservan 0).
    const orderTotal = async () => {
      const [rows] = await pool.query('SELECT total FROM orders WHERE id = ?', [orderId]);
      return Number(rows[0].total);
    };
    await recordOrderPayment(orderId, { mp_payment_id: 'p2-race-payment', mp_status: 'approved', amount: await orderTotal(), raw_response: { test: 'aprobacion-posterior' } });
    const [approved] = await pool.query('SELECT status FROM orders WHERE id = ?', [orderId]);
    assert.equal(approved[0].status, 'paid'); await checkStock(0);
    assert.equal(await stock.expirePendingOrders(), 0);
    observations.push({ case: 'Aprobación posterior al vencimiento de preferencia con pago ya pendiente', result: 'Pedido pagado y stock reservado conservado, sin conciliación tardía' });

    // Se reutiliza siempre el único pedido copiado; sólo se agregan pagos
    // técnicos en el esquema descartable, sin nuevas ventas ni clientes.
    const technicalPayment = (id, status, amount = 0) => ({ mp_payment_id: id, mp_status: status, amount, raw_response: { test: 'reintento-checkout', status } });
    const adjustmentCount = async () => {
      const [rows] = await pool.query("SELECT COUNT(*) AS n FROM stock_movements WHERE type = 'ajuste'");
      return rows[0].n;
    };
    const orderStatus = async () => {
      const [rows] = await pool.query('SELECT status FROM orders WHERE id = ?', [orderId]);
      return rows[0].status;
    };
    await recordOrderPayment(orderId, technicalPayment('p2-race-payment', 'refunded'));
    await reserveAgain(false);
    const beforeRetry = await adjustmentCount();
    await recordOrderPayment(orderId, technicalPayment('p2-retry-a', 'rejected'));
    assert.equal(await orderStatus(), 'pending'); await checkStock(0);
    await recordOrderPayment(orderId, technicalPayment('p2-retry-b', 'approved', await orderTotal()));
    assert.equal(await orderStatus(), 'paid'); await checkStock(0);
    assert.equal(await adjustmentCount(), beforeRetry);
    observations.push({ case: 'Rechazo A seguido de aprobación B dentro del plazo', result: 'Pedido pagado y stock descontado una vez; sin reposición intermedia' });

    await recordOrderPayment(orderId, technicalPayment('p2-retry-b', 'refunded'));
    await reserveAgain(false);
    const beforeAbandonment = await adjustmentCount();
    await recordOrderPayment(orderId, technicalPayment('p2-only-rejection', 'rejected'));
    assert.equal(await orderStatus(), 'pending'); await checkStock(0);
    assert.equal(await stock.expirePendingOrders(), 0);
    await pool.query('UPDATE orders SET payment_expires_at = DATE_SUB(NOW(), INTERVAL 9 MINUTE) WHERE id = ?', [orderId]);
    assert.equal(await stock.expirePendingOrders(), 0); await checkStock(0);
    await pool.query('UPDATE orders SET payment_expires_at = DATE_SUB(NOW(), INTERVAL 11 MINUTE) WHERE id = ?', [orderId]);
    const abandoned = await Promise.all([stock.expirePendingOrders(), stock.expirePendingOrders()]);
    assert.equal(abandoned.reduce((a, b) => a + b), 1);
    assert.equal(await orderStatus(), 'cancelled'); await checkStock(1);
    assert.equal(await adjustmentCount() - beforeAbandonment, items.length);
    observations.push({ case: 'Rechazo único y abandono del checkout', result: 'Mantiene reserva vigente y margen; luego dos barridos reponen una sola vez' });

    await reserveAgain(true);
    const beforeLateRejection = await adjustmentCount();
    await Promise.all(Array.from({ length: 3 }, () => recordOrderPayment(orderId, technicalPayment('p2-late-rejection', 'rejected'))));
    assert.equal(await orderStatus(), 'cancelled'); await checkStock(1);
    assert.equal(await adjustmentCount() - beforeLateRejection, items.length);
    observations.push({ case: 'Rechazo después de vencer reserva y margen, con avisos repetidos', result: 'Cancela inmediatamente y repone una vez por producto' });

    await reserveAgain(true);
    await recordOrderPayment(orderId, technicalPayment('p2-open-attempt', 'in_process'));
    await recordOrderPayment(orderId, technicalPayment('p2-other-failed', 'rejected'));
    assert.equal(await orderStatus(), 'pending'); await checkStock(0);
    assert.equal(await stock.expirePendingOrders(), 0);
    await recordOrderPayment(orderId, technicalPayment('p2-open-attempt', 'approved', await orderTotal()));
    assert.equal(await orderStatus(), 'paid'); await checkStock(0);
    observations.push({ case: 'Rechazo vencido de un intento mientras otro sigue en revisión', result: 'Conserva el pedido y el stock hasta la aprobación del otro intento' });

    await recordOrderPayment(orderId, technicalPayment('p2-open-attempt', 'refunded', await orderTotal()));
    await reserveAgain(true);
    await recordOrderPayment(orderId, technicalPayment('p3b-short', 'approved', 1));
    assert.equal(await orderStatus(), 'pending'); await checkStock(0);
    const [shortRow] = await pool.query("SELECT status, amount FROM payments WHERE mp_payment_id = 'p3b-short'");
    assert.deepEqual([shortRow[0].status, Number(shortRow[0].amount)], ['approved', 1]);
    assert.equal(await stock.expirePendingOrders(), 0);
    assert.equal(await stock.cancelPendingOrder(orderId, true), false);
    await recordOrderPayment(orderId, technicalPayment('p3b-other-failed', 'rejected'));
    assert.equal(await orderStatus(), 'pending'); await checkStock(0);
    await recordOrderPayment(orderId, technicalPayment('p3b-missing', 'approved', null));
    const [missingRow] = await pool.query("SELECT amount FROM payments WHERE mp_payment_id = 'p3b-missing'");
    assert.equal(missingRow[0].amount, null);
    assert.equal(await orderStatus(), 'pending');
    observations.push({ case: 'P3b: cobro aprobado por importe distinto o ausente', result: 'Se guarda el importe recibido (NULL si falta), el pedido no se confirma y la reserva se conserva ante barrido y rechazos' });
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
