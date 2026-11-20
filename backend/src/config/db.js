import mysql from 'mysql2/promise';
import { getEnvConfig } from './env.js';

let activePool = null;

/**
 * Crea o devuelve el pool de conexiones mysql2/promise hacia MySQL 8.0.16+.
 * Permite inyectar un pool alternativo durante las pruebas automatizadas.
 */
export function getDbPool() {
  if (activePool) {
    return activePool;
  }

  const { db } = getEnvConfig();
  activePool = mysql.createPool({
    host: db.host,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z',
    dateStrings: true,
    decimalNumbers: true
  });

  return activePool;
}

export function setDbPool(customPool) {
  activePool = customPool;
}

export async function closeDbPool() {
  if (activePool && typeof activePool.end === 'function') {
    await activePool.end();
  }
  activePool = null;
}

/**
 * Ejecuta una función dentro de una transacción atómica de MySQL.
 * Si ocurre cualquier excepción, revierte (ROLLBACK) toda la transacción.
 */
export async function withTransaction(pool, callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignorar fallo secundario en rollback
    }
    throw error;
  } finally {
    connection.release();
  }
}
