// =============================================
// CONEXIÓN A LA BASE DE DATOS MYSQL
// Pool de conexiones singleton para todo el backend.
// Configurado completamente mediante variables de entorno.
// =============================================

import mysql from "mysql2/promise";

// SSL: se activa con DB_SSL=true (requerido por Railway, Aiven, PlanetScale, etc.)
// rejectUnauthorized:false evita tener que embeber el CA del proveedor.
const sslConfig = process.env.DB_SSL === "true"
  ? { ssl: { rejectUnauthorized: false } }
  : {};

// Pool de conexiones reutilizadas (más eficiente que abrir/cerrar conexiones individuales)
const pool = mysql.createPool({
  host:     process.env.DB_HOST     ?? "localhost",
  port:     parseInt(process.env.DB_PORT ?? "3306"),
  user:     process.env.DB_USER     ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME     ?? "tele_import",
  ...sslConfig,
  // Devolver fechas como strings para mantener compatibilidad con código existente
  dateStrings: true,
  // Devolver columnas DECIMAL como number (no string). Por defecto mysql2 las
  // devuelve como string para preservar precisión; eso rompía la validación
  // del checkout (price/unit_price llegaban como "189999.00" en vez de 189999).
  // DECIMAL(15,2) está dentro del rango seguro de Number, así que es seguro.
  decimalNumbers: true,
  // Límite de conexiones simultáneas en el pool
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
  // Codificación para soportar caracteres en español, tildes y emojis
  charset: "utf8mb4",
  // Mantener conexiones vivas para evitar desconexiones silenciosas
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export default pool;
