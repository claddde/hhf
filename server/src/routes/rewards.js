/* routes/rewards.js — player-facing reward history + unclaimed notifications. */
import { Router } from 'express';
import { query } from '../db/pool.js';
import { auth, notBanned } from '../middleware/auth.js';
import { nextWeeklyResetMs } from '../util/time.js';

export const rewardsRouter = Router();
rewardsRouter.use(auth(true), notBanned);

rewardsRouter.get('/history', async (req, res) => {
  const { rows } = await query(
    'SELECT week_key, rank, type, item_id, rarity, title, created_at FROM rewards WHERE player_id=$1 ORDER BY created_at DESC',
    [req.user.pid]);
  res.json({ rewards: rows, resetInMs: nextWeeklyResetMs() });
});

// Mark reward notifications as seen (winners are notified on login).
rewardsRouter.post('/seen', async (req, res) => {
  await query('UPDATE rewards SET notified=true WHERE player_id=$1', [req.user.pid]);
  res.json({ ok: true });
});
