// =============================================
// ESQUEMA DE LA BASE DE DATOS
// Crea todas las tablas si no existen.
// Se ejecuta al iniciar el servidor.
// =============================================

import type { Database } from "better-sqlite3";

export function initSchema(db: Database): void {
  db.exec(`
    -- -----------------------------------------------
    -- TABLA: users (clientes y administradores)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email       TEXT    NOT NULL UNIQUE,
      password    TEXT    NOT NULL,
      first_name  TEXT    NOT NULL,
      last_name   TEXT    NOT NULL,
      phone       TEXT,
      role        TEXT    NOT NULL DEFAULT 'customer'
                          CHECK(role IN ('admin', 'customer', 'readonly')),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- -----------------------------------------------
    -- TABLA: categories (árbol de categorías de productos)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS categories (
      id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name        TEXT    NOT NULL,
      slug        TEXT    NOT NULL UNIQUE,
      description TEXT,
      image_url   TEXT,
      parent_id   TEXT    REFERENCES categories(id),
      sort_order  INTEGER NOT NULL DEFAULT 0,
      is_active   INTEGER NOT NULL DEFAULT 1
    );

    -- -----------------------------------------------
    -- TABLA: products (catálogo de productos)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS products (
      id                TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name              TEXT    NOT NULL,
      slug              TEXT    NOT NULL UNIQUE,
      description       TEXT,
      short_description TEXT,
      sku               TEXT    NOT NULL UNIQUE,
      price             REAL    NOT NULL,
      compare_price     REAL,
      category_id       TEXT    NOT NULL REFERENCES categories(id),
      stock_quantity    INTEGER NOT NULL DEFAULT 0,
      is_active         INTEGER NOT NULL DEFAULT 1,
      is_featured       INTEGER NOT NULL DEFAULT 0,
      brand             TEXT,
      model             TEXT,
      weight            REAL,
      metadata          TEXT,   -- JSON serializado
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- -----------------------------------------------
    -- TABLA: product_images (imágenes de cada producto)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS product_images (
      id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      product_id  TEXT    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url   TEXT    NOT NULL,
      alt_text    TEXT,
      sort_order  INTEGER NOT NULL DEFAULT 0
    );

    -- -----------------------------------------------
    -- TABLA: product_tags (etiquetas para búsqueda y filtros)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS product_tags (
      id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name       TEXT NOT NULL,
      slug       TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS product_tag_map (
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      tag_id     TEXT NOT NULL REFERENCES product_tags(id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, tag_id)
    );

    -- -----------------------------------------------
    -- TABLA: addresses (domicilios de entrega)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS addresses (
      id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      street      TEXT    NOT NULL,
      number      TEXT    NOT NULL,
      floor       TEXT,
      apartment   TEXT,
      city        TEXT    NOT NULL,
      province    TEXT    NOT NULL,
      postal_code TEXT    NOT NULL,
      country     TEXT    NOT NULL DEFAULT 'Argentina',
      is_default  INTEGER NOT NULL DEFAULT 0
    );

    -- -----------------------------------------------
    -- TABLA: orders (pedidos)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS orders (
      id               TEXT  PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      order_number     TEXT  NOT NULL UNIQUE,
      user_id          TEXT  NOT NULL REFERENCES users(id),
      status           TEXT  NOT NULL DEFAULT 'pending'
                             CHECK(status IN ('pending','paid','processing','ready_to_ship','shipped','delivered','cancelled','refunded')),
      subtotal         REAL  NOT NULL,
      discount_amount  REAL  NOT NULL DEFAULT 0,
      shipping_cost    REAL  NOT NULL DEFAULT 0,
      total            REAL  NOT NULL,
      delivery_method  TEXT  NOT NULL DEFAULT 'shipping'
                             CHECK(delivery_method IN ('pickup','shipping')),
      shipping_address TEXT,  -- JSON serializado de la dirección
      notes            TEXT,
      created_at       TEXT  NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT  NOT NULL DEFAULT (datetime('now'))
    );

    -- -----------------------------------------------
    -- TABLA: order_items (ítems de cada pedido)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS order_items (
      id          TEXT  PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      order_id    TEXT  NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id  TEXT  NOT NULL REFERENCES products(id),
      quantity    INTEGER NOT NULL,
      unit_price  REAL    NOT NULL,
      total_price REAL    NOT NULL
    );

    -- -----------------------------------------------
    -- TABLA: payments (registros de pagos con MP)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS payments (
      id                TEXT  PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      order_id          TEXT  NOT NULL REFERENCES orders(id),
      mp_payment_id     TEXT,
      mp_preference_id  TEXT,
      status            TEXT  NOT NULL DEFAULT 'pending'
                              CHECK(status IN ('pending','approved','rejected','cancelled','refunded')),
      amount            REAL  NOT NULL,
      currency          TEXT  NOT NULL DEFAULT 'ARS',
      payment_method    TEXT,
      raw_response      TEXT,  -- JSON serializado de la respuesta de MP
      created_at        TEXT  NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT  NOT NULL DEFAULT (datetime('now'))
    );

    -- -----------------------------------------------
    -- TABLA: promotions (cupones y descuentos)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS promotions (
      id                TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      code              TEXT    NOT NULL UNIQUE,
      name              TEXT    NOT NULL,
      description       TEXT,
      type              TEXT    NOT NULL CHECK(type IN ('percentage','fixed_amount','free_shipping')),
      value             REAL    NOT NULL,
      min_order_amount  REAL,
      max_uses          INTEGER,
      current_uses      INTEGER NOT NULL DEFAULT 0,
      is_active         INTEGER NOT NULL DEFAULT 1,
      valid_from        TEXT    NOT NULL,
      valid_until       TEXT
    );

    -- -----------------------------------------------
    -- TABLA: stock_movements (historial de movimientos de stock)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS stock_movements (
      id                TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      product_id        TEXT    NOT NULL REFERENCES products(id),
      type              TEXT    NOT NULL CHECK(type IN ('ingreso','egreso','ajuste','venta','devolucion')),
      quantity          INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity      INTEGER NOT NULL,
      reason            TEXT,
      reference_id      TEXT,
      user_id           TEXT    REFERENCES users(id),
      created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- -----------------------------------------------
    -- TABLA: audit_logs (auditoría de acciones)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS audit_logs (
      id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      action         TEXT NOT NULL,
      entity_type    TEXT NOT NULL,
      entity_id      TEXT NOT NULL,
      user_id        TEXT REFERENCES users(id),
      previous_value TEXT,  -- JSON
      new_value      TEXT,  -- JSON
      ip_address     TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- -----------------------------------------------
    -- TABLA: notifications (notificaciones del sistema)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       TEXT    NOT NULL CHECK(type IN ('order_new','order_status','stock_low','review_new')),
      title      TEXT    NOT NULL,
      message    TEXT    NOT NULL,
      is_read    INTEGER NOT NULL DEFAULT 0,
      link       TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- -----------------------------------------------
    -- TABLA: product_reviews (reseñas de productos)
    -- -----------------------------------------------
    CREATE TABLE IF NOT EXISTS product_reviews (
      id          TEXT    PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      product_id  TEXT    NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id     TEXT    NOT NULL REFERENCES users(id),
      rating      INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      title       TEXT,
      body        TEXT    NOT NULL,
      is_approved INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- -----------------------------------------------
    -- ÍNDICES para mejorar rendimiento de consultas frecuentes
    -- -----------------------------------------------
    CREATE INDEX IF NOT EXISTS idx_products_category    ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_slug        ON products(slug);
    CREATE INDEX IF NOT EXISTS idx_products_featured    ON products(is_featured);
    CREATE INDEX IF NOT EXISTS idx_orders_user          ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_prod ON stock_movements(product_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
  `);
}
