/* auth.js (middleware) — JWT issue/verify + admin + holder guards.
   Also enforces maintenance mode and ban checks on protected routes. */
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';
import { query } from '../db/pool.js';
import { getSetting } from '../services/settings.js';

export function issueToken(player, wallet) {
  return jwt.sign(
    { pid: player.id, wallet, admin: !!player.is_admin },
    CONFIG.jwtSecret,
    { expiresIn: CONFIG.jwtTtl }
  );
}

export function auth(required = true) {
  return (req, res, next) => {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) { if (required) return res.status(401).json({ error: 'NO_TOKEN' }); req.user = null; return next(); }
    try { req.user = jwt.verify(token, CONFIG.jwtSecret); next(); }
    catch (_) { return res.status(401).json({ error: 'BAD_TOKEN' }); }
  };
}

export function adminOnly(req, res, next) {
  if (!req.user || !req.user.admin) return res.status(403).json({ error: 'FORBIDDEN' });
  next();
}

/** Reject banned players on protected routes. */
export async function notBanned(req, res, next) {
  if (!req.user) return next();
  const { rows } = await query('SELECT banned, ban_until FROM players WHERE id=$1', [req.user.pid]);
  const p = rows[0];
  if (p && p.banned && (!p.ban_until || new Date(p.ban_until) > new Date()))
    return res.status(403).json({ error: 'BANNED', until: p.ban_until });
  next();
}

/** During maintenance, only admins and already-authenticated sessions pass
    through; new logins are blocked in the auth route itself. */
export async function maintenanceGate(req, res, next) {
  const on = await getSetting('maintenance', CONFIG.maintenance);
  if (on && !(req.user && req.user.admin)) return res.status(503).json({ error: 'MAINTENANCE' });
  next();
}
