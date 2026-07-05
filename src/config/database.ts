import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import config from ".";
import logger from "../utils/logger";

// ── Connection Pool ──────────────────────────────────────────────
let pool: Pool;

/**
 * Initialise the MySQL connection pool.
 * Called once at startup — all subsequent queries use the pool.
 */
export const initDB = async (): Promise<void> => {
  pool = mysql.createPool({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
    database: config.dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });

  // Verify connection
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    logger.info(`MySQL Connected: ${config.dbHost}:${config.dbPort}/${config.dbName}`);
  } finally {
    conn.release();
  }
};

/**
 * Get a connection from the pool for transactional operations.
 * Always release via conn.release() in a finally block.
 */
export const getConnection = async (): Promise<PoolConnection> => {
  return pool.getConnection();
};

/**
 * Execute a single query with parameters.
 * Returns rows for SELECT / SHOW, or a ResultSetHeader for INSERT/UPDATE/DELETE.
 */
export const query = async <T extends RowDataPacket[] | ResultSetHeader>(
  sql: string,
  params?: any[],
): Promise<T> => {
  const [rows] = await pool.execute<T>(sql, params);
  return rows;
};

/**
 * Execute a raw query (non-prepared) — for DDL statements like CREATE TABLE.
 */
export const rawQuery = async <T extends RowDataPacket[] | ResultSetHeader>(
  sql: string,
): Promise<T> => {
  const [rows] = await pool.query<T>(sql);
  return rows;
};

/**
 * Graceful shutdown — closes all pool connections.
 */
export const closeDB = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    logger.info("MySQL pool closed");
  }
};

// ── Graceful shutdown handler ────────────────────────────────────
process.on("SIGINT", async () => {
  await closeDB();
  process.exit(0);
});

export default { initDB, getConnection, query, rawQuery, closeDB };
