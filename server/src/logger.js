/* logger.js — tiny structured logger that also persists important events
   to the admin_logs / error_logs tables (best-effort, never throws). */
import { query } from './db/pool.js';

function ts() { return new Date().toISOString(); }

export const log = {
  info(msg, meta) { console.log(`[${ts()}] INFO  ${msg}`, meta ?? ''); },
  warn(msg, meta) { console.warn(`[${ts()}] WARN  ${msg}`, meta ?? ''); },
  error(msg, meta) { console.error(`[${ts()}] ERROR ${msg}`, meta ?? ''); this.persistError(msg, meta); },

  async persistError(message, meta) {
    try { await query('INSERT INTO error_logs(message, meta) VALUES ($1,$2)', [String(message), meta ? JSON.stringify(meta) : null]); }
    catch (_) { /* logging must never crash the request path */ }
  },

  /** Audit trail for security-relevant events (login, verify, rewards, cheat, admin). */
  async event(category, wallet, detail) {
    try { await query('INSERT INTO admin_logs(category, wallet, detail) VALUES ($1,$2,$3)', [category, wallet || null, detail ? JSON.stringify(detail) : null]); }
    catch (_) {}
  },
};
