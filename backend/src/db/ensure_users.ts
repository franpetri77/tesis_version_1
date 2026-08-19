// =============================================
// CUENTAS PERMANENTES DE ACCESO
// Crea (o restaura) las dos cuentas fijas del sistema:
//   - un administrador, para operar el panel
//   - un cliente de prueba, para simular compras
//
// A diferencia del seed, este script es idempotente y NO se detiene
// si la base ya tiene datos: si la cuenta existe, actualiza su
// contraseña y su rol. Sirve entonces para recuperar el acceso en
// cualquier momento, incluso si alguien cambió esos valores.
//
// Uso:
//   npm run db:users
//
// Las credenciales se pueden sobrescribir por entorno:
//   ADMIN_EMAIL, ADMIN_PASSWORD, CLIENTE_EMAIL, CLIENTE_PASSWORD
// =============================================

import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import pool from "./database";
import { initSchema } from "./schema";

const ADMIN = {
  id: "usr-admin-01",
  email: process.env.ADMIN_EMAIL ?? "admin@teleimport.com",
  password: process.env.ADMIN_PASSWORD ?? "TeleImport2026!",
  firstName: "Administrador",
  lastName: "Tele Import",
  role: "admin" as const,
};

const CLIENTE = {
  id: "usr-cliente-demo",
  email: process.env.CLIENTE_EMAIL ?? "cliente@teleimport.com",
  password: process.env.CLIENTE_PASSWORD ?? "Cliente2026!",
  firstName: "Cliente",
  lastName: "De Prueba",
  role: "customer" as const,
};

/**
 * Crea la cuenta si no existe; si ya existe (por email), restaura su
 * contraseña y su rol. Devuelve el id efectivo del usuario.
 */
async function upsertUsuario(u: typeof ADMIN | typeof CLIENTE): Promise<string> {
  const hash = bcrypt.hashSync(u.password, 10);

  const [existentes] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM users WHERE email = ?",
    [u.email]
  );

  if (existentes.length > 0) {
    const id = (existentes[0] as { id: string }).id;
    await pool.query(
      `UPDATE users
          SET password = ?, role = ?, first_name = ?, last_name = ?, email_verified = 1
        WHERE id = ?`,
      [hash, u.role, u.firstName, u.lastName, id]
    );
    console.log(`[Users] Actualizado  ${u.email}  (rol: ${u.role})`);
    return id;
  }

  await pool.query(
    `INSERT INTO users (id, email, password, first_name, last_name, role, email_verified)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [u.id, u.email, hash, u.firstName, u.lastName, u.role]
  );
  console.log(`[Users] Creado       ${u.email}  (rol: ${u.role})`);
  return u.id;
}

/**
 * Asegura que el cliente de prueba tenga una dirección predeterminada,
 * para poder completar el checkout con envío sin cargarla a mano.
 */
async function asegurarDireccion(userId: string): Promise<void> {
  const [existentes] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM addresses WHERE user_id = ?",
    [userId]
  );

  if (existentes.length > 0) {
    console.log("[Users] El cliente de prueba ya tiene dirección cargada.");
    return;
  }

  await pool.query(
    `INSERT INTO addresses
       (id, user_id, street, number, city, province, postal_code, country, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [randomUUID(), userId, "Av. Rafael Núñez", "4800", "Córdoba", "Córdoba", "5009", "Argentina"]
  );
  console.log("[Users] Dirección predeterminada creada para el cliente de prueba.");
}

async function main(): Promise<void> {
  // Garantiza que las tablas existan antes de insertar.
  await initSchema(pool);

  await upsertUsuario(ADMIN);
  const clienteId = await upsertUsuario(CLIENTE);
  await asegurarDireccion(clienteId);

  console.log("\n─────────────────────────────────────────────");
  console.log("  CREDENCIALES DE ACCESO");
  console.log("─────────────────────────────────────────────");
  console.log(`  Administrador : ${ADMIN.email}`);
  console.log(`  Contraseña    : ${ADMIN.password}`);
  console.log("");
  console.log(`  Cliente       : ${CLIENTE.email}`);
  console.log(`  Contraseña    : ${CLIENTE.password}`);
  console.log("─────────────────────────────────────────────\n");

  await pool.end();
}

main().catch(async (err) => {
  console.error("[Users] Error:", err);
  await pool.end().catch(() => {});
  process.exit(1);
});
