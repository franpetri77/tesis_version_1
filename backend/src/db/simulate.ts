// =============================================
// SIMULACION DE DATOS PARA REPORTING
// Genera datos sinteticos (clientes, ordenes, items, pagos, visitas y
// movimientos de stock) distribuidos en un rango de fechas, para poblar
// los reportes del panel durante la validacion y la defensa.
//
// Uso:
//   npm run db:simulate
//   npm run db:simulate -- --orders=200 --views=3000 --months=8
//   npm run db:simulate:clean
//
// Todo lo generado se marca como sintetico:
//   - pedidos  -> order_number con prefijo "SIM-"
//   - clientes -> correos bajo el dominio @sim.teleimport.test
//   - visitas  -> ip_address en el rango de prueba 203.0.113.0/24
//   - stock    -> reason con la etiqueta "SIMULACION"
// De modo que --clean puede borrarlo sin tocar los datos reales.
// =============================================

import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { initSchema } from "./schema";

function argNum(flag: string, def: number): number {
  const arg = process.argv.find((value) => value.startsWith(`--${flag}=`));
  const parsed = arg ? Number(arg.split("=")[1]) : def;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : def;
}

const CLEAN = process.argv.includes("--clean");
const N_ORDERS = argNum("orders", 120);
const N_VIEWS = argNum("views", 1500);
const N_MONTHS = argNum("months", 6);
const N_CUSTOMERS = Math.max(1, argNum("customers", 20));
const N_STOCK_MOVES = argNum("stock", 30);

const SIM_EMAIL_DOMAIN = "@sim.teleimport.test";
const SIM_ORDER_PREFIX = "SIM-";
const SIM_VIEW_IP_PREFIX = "203.0.113.";
const SIM_STOCK_TAG = "SIMULACION";

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "3306", 10),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "tele_import",
  dateStrings: true,
  decimalNumbers: true,
  charset: "utf8mb4",
  connectionLimit: 5,
});

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = <T>(arr: T[]): T => arr[randInt(0, arr.length - 1)];

function weightedPick<T>(items: { value: T; weight: number }[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item.value;
  }

  return items[items.length - 1].value;
}

function randomDateTime(months: number): string {
  const now = Date.now();
  const from = now - months * 30 * 24 * 60 * 60 * 1000;
  const date = new Date(randInt(from, now));
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const STATUS_WEIGHTS = [
  { value: "delivered", weight: 50 },
  { value: "shipped", weight: 12 },
  { value: "paid", weight: 12 },
  { value: "processing", weight: 8 },
  { value: "pending", weight: 8 },
  { value: "cancelled", weight: 6 },
  { value: "refunded", weight: 4 },
];

const SOLD = new Set(["paid", "processing", "shipped", "delivered"]);
const PAYMENT_METHODS = ["account_money", "credit_card", "debit_card", "ticket"];
const STOCK_TYPES = ["ingreso", "egreso", "ajuste"];

interface ProductRow extends mysql.RowDataPacket {
  id: string;
  price: number;
  stock_quantity: number;
  is_featured: number;
}

async function clean(): Promise<void> {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [simOrders] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT id FROM orders WHERE order_number LIKE ?",
      [`${SIM_ORDER_PREFIX}%`]
    );
    const orderIds = simOrders.map((row) => row.id as string);

    if (orderIds.length > 0) {
      await conn.query("DELETE FROM order_items WHERE order_id IN (?)", [orderIds]);
      await conn.query("DELETE FROM payments WHERE order_id IN (?)", [orderIds]);
      await conn.query("DELETE FROM orders WHERE id IN (?)", [orderIds]);
    }

    await conn.query("DELETE FROM stock_movements WHERE reason LIKE ?", [`%${SIM_STOCK_TAG}%`]);
    await conn.query("DELETE FROM product_views WHERE ip_address LIKE ?", [`${SIM_VIEW_IP_PREFIX}%`]);
    await conn.query("DELETE FROM users WHERE email LIKE ?", [`%${SIM_EMAIL_DOMAIN}`]);

    await conn.commit();
    console.log("[Sim] Datos simulados eliminados correctamente.");
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

async function ensureCustomers(conn: mysql.PoolConnection): Promise<string[]> {
  const password = bcrypt.hashSync("cliente123", 10);
  const ids: string[] = [];

  for (let i = 1; i <= N_CUSTOMERS; i++) {
    const id = `sim-usr-${String(i).padStart(3, "0")}`;
    const email = `sim.cliente${String(i).padStart(3, "0")}${SIM_EMAIL_DOMAIN}`;

    await conn.query(
      `INSERT INTO users (id, email, password, first_name, last_name, role)
       VALUES (?, ?, ?, ?, ?, 'customer')
       ON DUPLICATE KEY UPDATE id = id`,
      [id, email, password, "Cliente", `Simulado ${i}`]
    );

    ids.push(id);
  }

  return ids;
}

async function generateOrders(
  conn: mysql.PoolConnection,
  customers: string[],
  products: ProductRow[]
): Promise<void> {
  const stamp = Date.now().toString(36);

  for (let i = 1; i <= N_ORDERS; i++) {
    const createdAt = randomDateTime(N_MONTHS);
    const status = weightedPick(STATUS_WEIGHTS);
    const userId = pick(customers);
    const chosen = new Set<ProductRow>();
    const itemCount = Math.min(randInt(1, 4), products.length);

    while (chosen.size < itemCount) {
      chosen.add(pick(products));
    }

    const items = [...chosen].map((product) => {
      const qty = randInt(1, 3);
      const unit = Number(product.price);
      return {
        productId: product.id,
        qty,
        unit,
        total: round2(qty * unit),
      };
    });

    const subtotal = round2(items.reduce((sum, item) => sum + item.total, 0));
    const discount = Math.random() < 0.2 ? round2(subtotal * 0.1) : 0;
    const delivery = Math.random() < 0.7 ? "shipping" : "pickup";
    const shipping = delivery === "pickup" ? 0 : pick([0, 4999, 8999, 12999]);
    const total = round2(Math.max(0, subtotal - discount + shipping));

    const orderId = randomUUID();
    const orderNumber = `${SIM_ORDER_PREFIX}${stamp}-${String(i).padStart(4, "0")}`;

    await conn.query(
      `INSERT INTO orders
         (id, order_number, user_id, status, subtotal, discount_amount,
          shipping_cost, total, delivery_method, shipping_address, notes,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        orderNumber,
        userId,
        status,
        subtotal,
        discount,
        shipping,
        total,
        delivery,
        delivery === "shipping" ? "Direccion de prueba 123, Cordoba" : null,
        "Pedido generado por simulacion",
        createdAt,
        createdAt,
      ]
    );

    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [randomUUID(), orderId, item.productId, item.qty, item.unit, item.total]
      );
    }

    if (SOLD.has(status) || status === "refunded") {
      const paymentStatus = status === "refunded" ? "refunded" : "approved";

      await conn.query(
        `INSERT INTO payments
           (id, order_id, mp_payment_id, mp_preference_id, status, amount,
            currency, payment_method, raw_response, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ARS', ?, ?, ?, ?)`,
        [
          randomUUID(),
          orderId,
          String(randInt(10 ** 9, 9 * 10 ** 9)),
          `pref-${randomUUID().slice(0, 8)}`,
          paymentStatus,
          total,
          pick(PAYMENT_METHODS),
          '{"simulated":true}',
          createdAt,
          createdAt,
        ]
      );
    }
  }

  console.log(`[Sim] ${N_ORDERS} ordenes generadas con items y pagos.`);
}

async function generateViews(
  conn: mysql.PoolConnection,
  customers: string[],
  products: ProductRow[]
): Promise<void> {
  const weighted = products.map((product) => ({
    value: product,
    weight: product.is_featured ? 3 : 1,
  }));

  const rows: (string | null)[][] = [];

  for (let i = 0; i < N_VIEWS; i++) {
    const product = weightedPick(weighted);
    const anonymous = Math.random() < 0.6;

    rows.push([
      randomUUID(),
      product.id,
      anonymous ? null : pick(customers),
      `${SIM_VIEW_IP_PREFIX}${randInt(1, 254)}`,
      randomDateTime(N_MONTHS),
    ]);
  }

  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const batch = rows.slice(i, i + chunkSize);
    const placeholders = batch.map(() => "(?, ?, ?, ?, ?)").join(", ");

    await conn.query(
      `INSERT INTO product_views (id, product_id, user_id, ip_address, created_at)
       VALUES ${placeholders}`,
      batch.flat()
    );
  }

  console.log(`[Sim] ${N_VIEWS} visitas de producto generadas.`);
}

async function generateStockMovements(
  conn: mysql.PoolConnection,
  products: ProductRow[]
): Promise<void> {
  for (let i = 0; i < N_STOCK_MOVES; i++) {
    const product = pick(products);
    const type = pick(STOCK_TYPES);
    const qty = randInt(1, 20);
    const previous = Number(product.stock_quantity);
    const next =
      type === "ingreso"
        ? previous + qty
        : type === "egreso"
          ? Math.max(0, previous - qty)
          : qty;

    await conn.query(
      `INSERT INTO stock_movements
         (id, product_id, type, quantity, previous_quantity, new_quantity,
          reason, reference_id, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?)`,
      [
        randomUUID(),
        product.id,
        type,
        qty,
        previous,
        next,
        `${SIM_STOCK_TAG}: movimiento de prueba`,
        randomDateTime(N_MONTHS),
      ]
    );
  }

  console.log(`[Sim] ${N_STOCK_MOVES} movimientos de stock generados.`);
}

async function main(): Promise<void> {
  await initSchema(pool);

  if (CLEAN) {
    await clean();
    await pool.end();
    return;
  }

  const [products] = await pool.query<ProductRow[]>(
    "SELECT id, price, stock_quantity, is_featured FROM products WHERE is_active = 1"
  );

  if (products.length === 0) {
    console.error("[Sim] No hay productos. Ejecuta primero: npm run db:seed");
    await pool.end();
    return;
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const customers = await ensureCustomers(conn);
    console.log(`[Sim] ${customers.length} clientes de prueba asegurados.`);

    await generateOrders(conn, customers, products);
    await generateViews(conn, customers, products);
    await generateStockMovements(conn, products);

    await conn.commit();
    console.log(
      `\n[Sim] Simulacion completada sobre los ultimos ${N_MONTHS} meses. ` +
      "Ejecuta con --clean para revertir."
    );
  } catch (error) {
    await conn.rollback();
    console.error("[Sim] Error, se revirtieron los cambios:", error);
    throw error;
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
