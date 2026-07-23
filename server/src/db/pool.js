/* pool.js — PostgreSQL connection pool + query helpers. */
import pg from 'pg';
import { CONFIG } from '../config.js';

export const pool = new pg.Pool({
  connectionString: CONFIG.databaseUrl,
  ssl: CONFIG.pgSsl ? { rejectUnauthorized: false } : false,
  max: 20,                 // tuned for many concurrent players
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('[pg] idle client error', err.message));

/** Parameterized query (always use $1,$2… — never string-concat inputs). */
export function query(text, params) { return pool.query(text, params); }

/** Run a set of statements in a transaction. */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
