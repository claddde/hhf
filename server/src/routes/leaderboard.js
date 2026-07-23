/* routes/leaderboard.js — score submission (server-validated) + reads.
   Submitting broadcasts a live update over WebSocket. */
import { Router } from 'express';
import { query } from '../db/pool.js';
import { auth, notBanned, maintenanceGate } from '../middleware/auth.js';
import { validateRun, recordViolation } from '../services/anticheat.js';
import { weekKey, monthKey, nextWeeklyResetMs } from '../util/time.js';
import { broadcast } from '../ws.js';
import { recordRunStats } from '../services/analytics.js';
import { log } from '../logger.js';

export const leaderboardRouter = Router();

// ---- public reads (no auth needed to view) ----
leaderboardRouter.get('/:scope', async (req, res) => {
  const scope = ['week', 'month', 'all'].includes(req.params.scope) ? req.params.scope : 'all';
  const rows = await topBoard(scope, 100);
  res.json({ scope, resetInMs: nextWeeklyResetMs(), board: rows });
});

async function topBoard(scope, limit) {
  const wk = weekKey(), mo = monthKey();
  const where = scope === 'week' ? 'week_key=$1' : scope === 'month' ? 'month_key=$1' : 'TRUE';
  const params = scope === 'all' ? [limit] : [scope === 'week' ? wk : mo, limit];
  const sql =
    `SELECT DISTINCT ON (player_id) player_id, wallet, character, score
       FROM scores WHERE ${where}
       ORDER BY player_id, score DESC`;
  // Wrap to rank the per-player best.
  const wrapped = `SELECT * FROM (${sql}) t ORDER BY score DESC LIMIT $${params.length}`;
  const { rows } = await query(wrapped, params);
  return rows.map((r, i) => ({ rank: i + 1, wallet: r.wallet, character: r.character, score: r.score }));
}

// ---- authenticated submit ----
leaderboardRouter.post('/submit', auth(true), notBanned, maintenanceGate, async (req, res) => {
  const stats = req.body.stats || {};
  const v = validateRun(stats);
  if (!v.ok) {
    await recordViolation(req.user.pid, req.user.wallet, v.reason, stats);
    return res.status(400).json({ error: 'REJECTED', reason: v.reason });
  }
  // Optional: reject if the client-claimed score disagrees with the server score.
  if (req.body.clientScore !== undefined && Math.abs(req.body.clientScore - v.score) > 5) {
    await recordViolation(req.user.pid, req.user.wallet, 'SCORE_MISMATCH', { client: req.body.clientScore, server: v.score });
    return res.status(400).json({ error: 'REJECTED', reason: 'SCORE_MISMATCH' });
  }

  await query(
    `INSERT INTO scores(player_id, wallet, score, character, kills, level, bosses, duration, week_key, month_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [req.user.pid, req.user.wallet, v.score, stats.character || null,
     stats.kills || 0, stats.level || 1, stats.bosses || 0, stats.duration || 0, weekKey(), monthKey()]
  );
  await recordRunStats(req.user.pid, stats);
  await log.event('leaderboard', req.user.wallet, { score: v.score });

  // Live update to all connected clients.
  const board = await topBoard('week', 20);
  broadcast({ type: 'leaderboard', scope: 'week', board });

  const { rows } = await query(
    `SELECT count(*)+1 AS rank FROM (SELECT DISTINCT ON (player_id) player_id, max(score) score
       FROM scores WHERE week_key=$1 GROUP BY player_id) t WHERE score > $2`, [weekKey(), v.score]);
  res.json({ ok: true, score: v.score, weeklyRank: parseInt(rows[0].rank, 10) });
});
