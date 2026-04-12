// =============================================
// CONEXIÓN A LA BASE DE DATOS SQLITE
// Módulo singleton que expone una única instancia
// de la base de datos para todo el backend.
// =============================================

import Database from "better-sqlite3";
import path from "path";
import { initSchema } from "./schema";

// Ruta absoluta al archivo de base de datos (en la raíz del backend)
const DB_PATH = process.env.DB_PATH
	? path.resolve(process.env.DB_PATH)
	: path.resolve(process.cwd(), "tele_import.db");

// Crear instancia singleton
const db = new Database(DB_PATH);

// Configuraciones de rendimiento recomendadas para SQLite
db.pragma("journal_mode = WAL");   // Write-Ahead Logging mejora concurrencia
db.pragma("foreign_keys = ON");    // Activar integridad referencial

// Inicializar el esquema si las tablas no existen
initSchema(db);

export default db;
