// =============================================
// CONEXIÓN A LA BASE DE DATOS MYSQL
// Pool de conexiones singleton para todo el backend.
// Configurado completamente mediante variables de entorno.
// =============================================

import mysql from "mysql2/promise";

// SSL: se activa con DB_SSL=true. Railway y otros proveedores administrados
// cierran la conexión si el cliente no negocia TLS (PROTOCOL_CONNECTION_LOST).
//
// T7: con SSL activo el certificado del servidor SE VERIFICA. Sin verificarlo,
// el cifrado no impide que un intermediario se haga pasar por la base.
//   - DB_SSL_CA: certificado de la autoridad (PEM; acepta "\n" escapados,
//     como queda al pegarlo en una variable de entorno) para proveedores
//     con certificado propio.
//   - DB_SSL_REJECT_UNAUTHORIZED=false: desactiva la verificación. Sólo como
//     decisión explícita y temporal; queda advertido en el log.
// Sin DB_SSL (red privada de Railway, desarrollo local) no cambia nada.
function sslOptions(): { ssl?: { rejectUnauthorized: boolean; ca?: string } } {
  if (process.env.DB_SSL !== "true") return {};
  const verify = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";
  if (!verify) console.warn("[DB] SSL sin verificación de certificado (DB_SSL_REJECT_UNAUTHORIZED=false).");
  const ca = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");
  return { ssl: { rejectUnauthorized: verify, ...(ca ? { ca } : {}) } };
}
const sslConfig = sslOptions();

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
  // Devolver columnas DECIMAL como number. Por defecto mysql2 las entrega como
  // string para preservar precisión, y eso rompía la validación del checkout
  // (price/unit_price llegaban como "189999.00"). DECIMAL(15,2) entra holgado
  // en el rango seguro de Number.
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
