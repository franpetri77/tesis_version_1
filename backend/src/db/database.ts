// =============================================
// CONEXIÓN A LA BASE DE DATOS MYSQL
// Pool de conexiones singleton para todo el backend.
// Configurado completamente mediante variables de entorno.
// =============================================

import mysql from "mysql2/promise";

// Pool de conexiones reutilizadas (más eficiente que abrir/cerrar conexiones individuales)
const pool = mysql.createPool({
  host:     process.env.DB_HOST     ?? "localhost",
  port:     parseInt(process.env.DB_PORT ?? "3306"),
  user:     process.env.DB_USER     ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME     ?? "tele_import",
  // Devolver fechas como strings para mantener compatibilidad con código existente
  dateStrings: true,
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
