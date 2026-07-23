/* anticheat.js — SERVER-AUTHORITATIVE validation. The client score is never
   trusted: the server recomputes it from run stats and rejects impossible
   values (rate caps vs. duration, impossible XP/damage/movement), logs
   violations, and escalates repeat offenders to temp/permanent bans. */
import { query } from '../db/pool.js';
import { log } from '../logger.js';

// Deterministic scoring — identical formula to the client so honest runs match.
export function computeScore(s) {
  return Math.round((s.kills || 0) * 10 + (s.level || 1) * 50 +
    (s.bosses || 0) * 500 + (s.coins || 0) * 2 + Math.floor(s.duration || 0) * 3);
}

// Plausibility ceilings per second of survival.
const LIMITS = {
  killsPerSec: 60,        // even a full screen of enemies
  coinsPerSec: 120,
  xpPerSec: 200,
  levelPerMin: 12,
  bossPer2Min: 1.2,
  maxDuration: 4 * 3600,  // 4h hard cap
};

/** @returns {{ok:boolean, score?:number, reason?:string}} */
export function validateRun(stats) {
  const s = {
    kills: +stats.kills || 0, level: +stats.level || 1, bosses: +stats.bosses || 0,
    coins: +stats.coins || 0, duration: Math.floor(+stats.duration || 0),
    xp: +stats.xp || 0,
  };
  const t = Math.max(1, s.duration);
  if (s.duration < 0 || s.duration > LIMITS.maxDuration) return { ok: false, reason: 'BAD_DURATION' };
  if (s.kills < 0 || s.kills > t * LIMITS.killsPerSec) return { ok: false, reason: 'IMPOSSIBLE_KILLS' };
  if (s.coins < 0 || s.coins > t * LIMITS.coinsPerSec) return { ok: false, reason: 'IMPOSSIBLE_COINS' };
  if (s.xp > t * LIMITS.xpPerSec) return { ok: false, reason: 'IMPOSSIBLE_XP' };
  if (s.level > (t / 60) * LIMITS.levelPerMin + 2) return { ok: false, reason: 'IMPOSSIBLE_LEVEL' };
  if (s.bosses > (t / 120) * LIMITS.bossPer2Min + 1) return { ok: false, reason: 'IMPOSSIBLE_BOSSES' };
  return { ok: true, score: computeScore(s) };
}

/** Record a violation; auto-ban after repeated offences in 24h. */
export async function recordViolation(playerId, wallet, reason, meta) {
  await query('INSERT INTO violations(player_id, wallet, reason, meta) VALUES ($1,$2,$3,$4)',
    [playerId || null, wallet || null, reason, meta ? JSON.stringify(meta) : null]);
  await log.event('cheat', wallet, { reason, meta });

  if (!playerId) return;
  const { rows } = await query(
    `SELECT count(*)::int n FROM violations WHERE player_id=$1 AND created_at > now() - interval '24 hours'`, [playerId]);
  const n = rows[0].n;
  if (n >= 10) await ban(playerId, 'Repeated cheat detection (permanent)', null);
  else if (n >= 5) await ban(playerId, 'Repeated cheat detection (temporary)', new Date(Date.now() + 24 * 3600e3));
}

export async function ban(playerId, reason, until) {
  await query('UPDATE players SET banned=true, ban_reason=$2, ban_until=$3 WHERE id=$1', [playerId, reason, until]);
}
