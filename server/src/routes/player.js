/* routes/player.js — cloud save/load + profile. Cloud save is authoritative
   server-side; restored on every login. Weapons/achievements/inventory sync. */
import { Router } from 'express';
import { query, tx } from '../db/pool.js';
import { auth, notBanned, maintenanceGate } from '../middleware/auth.js';
import { safeJson } from '../middleware/validate.js';
import { log } from '../logger.js';

export const playerRouter = Router();
playerRouter.use(auth(true), notBanned, maintenanceGate);

// ---- cloud save (full progress) ----
playerRouter.put('/save', async (req, res) => {
  try {
    const pid = req.user.pid;
    const data = safeJson(req.body.data || {});
    const coins = Math.max(0, parseInt(req.body.coins || 0, 10) || 0);
    const xp = Math.max(0, parseInt(req.body.xp || 0, 10) || 0);
    const level = Math.max(1, parseInt(req.body.highestLevel || 1, 10) || 1);

    await tx(async (c) => {
      // Monotonic merge: never let a save decrease persistent currency/level.
      await c.query(
        `INSERT INTO cloud_saves(player_id, coins, xp, highest_level, data, updated_at)
         VALUES ($1,$2,$3,$4,$5, now())
         ON CONFLICT (player_id) DO UPDATE SET
           coins=GREATEST(cloud_saves.coins,$2),
           xp=GREATEST(cloud_saves.xp,$3),
           highest_level=GREATEST(cloud_saves.highest_level,$4),
           data=$5, updated_at=now()`,
        [pid, coins, xp, level, JSON.stringify(data)]
      );
      // Sync unlocked weapons.
      for (const w of (data.unlockedWeapons || [])) {
        await c.query(`INSERT INTO player_weapons(player_id, weapon_id) VALUES ($1,$2)
                       ON CONFLICT DO NOTHING`, [pid, w]).catch(() => {});
      }
      for (const a of (data.achievements || [])) {
        await c.query(`INSERT INTO player_achievements(player_id, achievement_id) VALUES ($1,$2)
                       ON CONFLICT DO NOTHING`, [pid, a]).catch(() => {});
      }
    });
    res.json({ ok: true });
  } catch (e) { log.error('player.save', { err: e.message }); res.status(500).json({ error: 'SERVER_ERROR' }); }
});

playerRouter.get('/save', async (req, res) => {
  const pid = req.user.pid;
  const { rows } = await query('SELECT coins, xp, highest_level, data, updated_at FROM cloud_saves WHERE player_id=$1', [pid]);
  if (!rows[0]) return res.json({ blob: null });
  const s = rows[0];
  res.json({ blob: { coins: s.coins, xp: s.xp, highestLevel: s.highest_level, ...s.data }, updatedAt: s.updated_at });
});

// ---- profile ----
playerRouter.get('/profile', async (req, res) => {
  const pid = req.user.pid;
  const [p, weapons, achs, save, notif] = await Promise.all([
    query('SELECT id,name,created_at,is_admin FROM players WHERE id=$1', [pid]),
    query('SELECT weapon_id, level FROM player_weapons WHERE player_id=$1', [pid]),
    query('SELECT achievement_id FROM player_achievements WHERE player_id=$1', [pid]),
    query('SELECT coins,xp,highest_level FROM cloud_saves WHERE player_id=$1', [pid]),
    query('SELECT id,kind,title,body,created_at FROM notifications WHERE (player_id=$1 OR player_id IS NULL) AND read=false ORDER BY created_at DESC LIMIT 20', [pid]),
  ]);
  res.json({
    player: p.rows[0], wallet: req.user.wallet,
    weapons: weapons.rows, achievements: achs.rows.map(r => r.achievement_id),
    save: save.rows[0] || null, notifications: notif.rows,
  });
});

playerRouter.post('/name', async (req, res) => {
  const name = String(req.body.name || '').slice(0, 24).replace(/[<>]/g, '');
  await query('UPDATE players SET name=$2 WHERE id=$1', [req.user.pid, name]);
  res.json({ ok: true, name });
});

playerRouter.post('/notifications/read', async (req, res) => {
  await query('UPDATE notifications SET read=true WHERE player_id=$1', [req.user.pid]);
  res.json({ ok: true });
});
