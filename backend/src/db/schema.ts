// =============================================
// ESQUEMA DE LA BASE DE DATOS - MYSQL
// Crea todas las tablas e índices si no existen.
// Se ejecuta al iniciar el servidor antes de aceptar requests.
//
// Diferencias clave respecto a SQLite:
//   - IDs como VARCHAR(50): soporta tanto los IDs cortos del seed
//     ("cat-tv") como UUIDs generados en la app (crypto.randomUUID)
//   - TINYINT(1) reemplaza INTEGER para booleanos
//   - DECIMAL(15,2) reemplaza REAL para precios (evita imprecisión flotante)
//   - DATETIME con DEFAULT CURRENT_TIMESTAMP reemplaza TEXT con datetime('now')
//   - ENUM reemplaza CHECK constraints para columnas de valores acotados
//   - Claves foráneas declaradas explícitamente con CONSTRAINT ... FOREIGN KEY
// =============================================

import type { Pool } from "mysql2/promise";

export async function initSchema(pool: Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    // Desactivar FK checks durante la creación para evitar problemas de orden
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");

    // -----------------------------------------------
    // TABLA: users (clientes y administradores)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          VARCHAR(50)   NOT NULL,
        email       VARCHAR(255)  NOT NULL,
        password    VARCHAR(255)  NOT NULL,
        first_name  VARCHAR(100)  NOT NULL,
        last_name   VARCHAR(100)  NOT NULL,
        phone       VARCHAR(50)   NULL,
        role        ENUM('admin','customer','readonly') NOT NULL DEFAULT 'customer',
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: categories (árbol de categorías de productos)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id          VARCHAR(50)   NOT NULL,
        name        VARCHAR(255)  NOT NULL,
        slug        VARCHAR(255)  NOT NULL,
        description TEXT          NULL,
        image_url   TEXT          NULL,
        parent_id   VARCHAR(50)   NULL,
        sort_order  INT           NOT NULL DEFAULT 0,
        is_active   TINYINT(1)    NOT NULL DEFAULT 1,
        PRIMARY KEY (id),
        UNIQUE KEY uq_categories_slug (slug),
        CONSTRAINT fk_categories_parent
          FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: products (catálogo de productos)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS products (
        id                VARCHAR(50)    NOT NULL,
        name              VARCHAR(255)   NOT NULL,
        slug              VARCHAR(255)   NOT NULL,
        description       TEXT           NULL,
        short_description TEXT           NULL,
        sku               VARCHAR(100)   NOT NULL,
        price             DECIMAL(15,2)  NOT NULL,
        compare_price     DECIMAL(15,2)  NULL,
        category_id       VARCHAR(50)    NOT NULL,
        stock_quantity    INT            NOT NULL DEFAULT 0,
        is_active         TINYINT(1)     NOT NULL DEFAULT 1,
        is_featured       TINYINT(1)     NOT NULL DEFAULT 0,
        brand             VARCHAR(100)   NULL,
        model             VARCHAR(100)   NULL,
        weight            DOUBLE         NULL,
        metadata          TEXT           NULL,
        created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_products_slug (slug),
        UNIQUE KEY uq_products_sku (sku),
        KEY idx_products_category (category_id),
        KEY idx_products_featured (is_featured),
        CONSTRAINT fk_products_category
          FOREIGN KEY (category_id) REFERENCES categories(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: product_images (imágenes de cada producto)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_images (
        id          VARCHAR(50)   NOT NULL,
        product_id  VARCHAR(50)   NOT NULL,
        image_url   TEXT          NOT NULL,
        alt_text    VARCHAR(255)  NULL,
        sort_order  INT           NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        CONSTRAINT fk_product_images_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: product_tags (etiquetas para búsqueda y filtros)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_tags (
        id    VARCHAR(50)   NOT NULL,
        name  VARCHAR(100)  NOT NULL,
        slug  VARCHAR(100)  NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_product_tags_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_tag_map (
        product_id  VARCHAR(50)  NOT NULL,
        tag_id      VARCHAR(50)  NOT NULL,
        PRIMARY KEY (product_id, tag_id),
        CONSTRAINT fk_ptm_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT fk_ptm_tag
          FOREIGN KEY (tag_id) REFERENCES product_tags(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: addresses (domicilios de entrega)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id          VARCHAR(50)   NOT NULL,
        user_id     VARCHAR(50)   NOT NULL,
        street      VARCHAR(255)  NOT NULL,
        number      VARCHAR(20)   NOT NULL,
        floor       VARCHAR(20)   NULL,
        apartment   VARCHAR(20)   NULL,
        city        VARCHAR(100)  NOT NULL,
        province    VARCHAR(100)  NOT NULL,
        postal_code VARCHAR(20)   NOT NULL,
        country     VARCHAR(100)  NOT NULL DEFAULT 'Argentina',
        is_default  TINYINT(1)    NOT NULL DEFAULT 0,
        -- created_at permite ordenar por orden de inserción (reemplaza el rowid de SQLite)
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_addresses_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: orders (pedidos)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id               VARCHAR(50)    NOT NULL,
        order_number     VARCHAR(50)    NOT NULL,
        user_id          VARCHAR(50)    NOT NULL,
        status           ENUM('pending','paid','processing','ready_to_ship','shipped','delivered','cancelled','refunded')
                         NOT NULL DEFAULT 'pending',
        subtotal         DECIMAL(15,2)  NOT NULL,
        discount_amount  DECIMAL(15,2)  NOT NULL DEFAULT 0,
        shipping_cost    DECIMAL(15,2)  NOT NULL DEFAULT 0,
        total            DECIMAL(15,2)  NOT NULL,
        delivery_method  ENUM('pickup','shipping') NOT NULL DEFAULT 'shipping',
        shipping_address TEXT           NULL,
        notes            TEXT           NULL,
        created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_orders_number (order_number),
        KEY idx_orders_user   (user_id),
        KEY idx_orders_status (status),
        CONSTRAINT fk_orders_user
          FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: order_items (ítems de cada pedido)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id          VARCHAR(50)    NOT NULL,
        order_id    VARCHAR(50)    NOT NULL,
        product_id  VARCHAR(50)    NOT NULL,
        quantity    INT            NOT NULL,
        unit_price  DECIMAL(15,2)  NOT NULL,
        total_price DECIMAL(15,2)  NOT NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_order_items_order
          FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
        CONSTRAINT fk_order_items_product
          FOREIGN KEY (product_id) REFERENCES products(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: payments (registros de pagos con Mercado Pago)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                VARCHAR(50)    NOT NULL,
        order_id          VARCHAR(50)    NOT NULL,
        mp_payment_id     VARCHAR(100)   NULL,
        mp_preference_id  VARCHAR(100)   NULL,
        status            ENUM('pending','approved','rejected','cancelled','refunded')
                          NOT NULL DEFAULT 'pending',
        amount            DECIMAL(15,2)  NOT NULL,
        currency          VARCHAR(10)    NOT NULL DEFAULT 'ARS',
        payment_method    VARCHAR(100)   NULL,
        raw_response      TEXT           NULL,
        created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_payments_order
          FOREIGN KEY (order_id) REFERENCES orders(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: promotions (cupones y descuentos)
    // Nota: valid_from/valid_until se guardan como VARCHAR('YYYY-MM-DD')
    // para mantener compatibilidad con comparaciones de string del código existente.
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS promotions (
        id                VARCHAR(50)    NOT NULL,
        code              VARCHAR(50)    NOT NULL,
        name              VARCHAR(255)   NOT NULL,
        description       TEXT           NULL,
        type              ENUM('percentage','fixed_amount','free_shipping') NOT NULL,
        value             DECIMAL(15,2)  NOT NULL,
        min_order_amount  DECIMAL(15,2)  NULL,
        max_uses          INT            NULL,
        current_uses      INT            NOT NULL DEFAULT 0,
        is_active         TINYINT(1)     NOT NULL DEFAULT 1,
        valid_from        VARCHAR(20)    NOT NULL,
        valid_until       VARCHAR(20)    NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_promotions_code (code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: stock_movements (historial de movimientos de stock)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id                VARCHAR(50)   NOT NULL,
        product_id        VARCHAR(50)   NOT NULL,
        type              ENUM('ingreso','egreso','ajuste','venta','devolucion') NOT NULL,
        quantity          INT           NOT NULL,
        previous_quantity INT           NOT NULL,
        new_quantity      INT           NOT NULL,
        reason            TEXT          NULL,
        reference_id      VARCHAR(50)   NULL,
        user_id           VARCHAR(50)   NULL,
        created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_stock_movements_product (product_id),
        CONSTRAINT fk_stock_movements_product
          FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_stock_movements_user
          FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: audit_logs (auditoría de acciones del sistema)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id             VARCHAR(50)   NOT NULL,
        action         VARCHAR(100)  NOT NULL,
        entity_type    VARCHAR(100)  NOT NULL,
        entity_id      VARCHAR(50)   NOT NULL,
        user_id        VARCHAR(50)   NULL,
        previous_value TEXT          NULL,
        new_value      TEXT          NULL,
        ip_address     VARCHAR(45)   NULL,
        created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_audit_logs_user
          FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: notifications (notificaciones del sistema)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         VARCHAR(50)   NOT NULL,
        user_id    VARCHAR(50)   NOT NULL,
        type       ENUM('order_new','order_status','stock_low','review_new') NOT NULL,
        title      VARCHAR(255)  NOT NULL,
        message    TEXT          NOT NULL,
        is_read    TINYINT(1)    NOT NULL DEFAULT 0,
        link       VARCHAR(500)  NULL,
        created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_notifications_user (user_id),
        CONSTRAINT fk_notifications_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // -----------------------------------------------
    // TABLA: product_reviews (reseñas de productos)
    // -----------------------------------------------
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id          VARCHAR(50)   NOT NULL,
        product_id  VARCHAR(50)   NOT NULL,
        user_id     VARCHAR(50)   NOT NULL,
        rating      TINYINT       NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title       VARCHAR(255)  NULL,
        body        TEXT          NOT NULL,
        is_approved TINYINT(1)    NOT NULL DEFAULT 0,
        created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        CONSTRAINT fk_reviews_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_user
          FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Restaurar verificación de claves foráneas
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("[DB] Esquema MySQL inicializado correctamente.");
  } finally {
    conn.release();
  }
}
