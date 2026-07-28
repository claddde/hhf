/* routes/admin.js — secure admin dashboard API. Every route requires an
   admin JWT. Covers players, bans, leaderboard reset, weapon/achievement
   grants, global notifications, server status, online players, error &
   reward logs, live events and maintenance mode. All actions are audited. */
import { Router } from 'express';
import { query } from '../db/pool.js';
import { auth, adminOnly } from '../middleware/auth.js';
import { metrics } from '../services/analytics.js';
import { listEvents, upsertEvent, setEventEnabled } from '../services/events.js';
import { processWeeklyRewards } from '../services/rewards.js';
import { getSetting, setSetting } from '../services/settings.js';
import { ban } from '../services/anticheat.js';
import { onlineCount, broadcast, sendToPlayer } from '../ws.js';
import { log } from '../logger.js';

export const adminRouter = Router();
adminRouter.use(auth(true), adminOnly);

const audit = (req, action, detail) => log.event('admin', req.user.wallet, { action, ...detail });

// ---- players ----
adminRouter.get('/players', async (req, res) => {
  const s = `%${String(req.query.q || '').toLowerCase()}%`;
  const { rows } = await query(
    `SELECT p.id, p.name, p.banned, p.ban_until, p.is_admin, p.last_login,
            (SELECT string_agg(address, ',') FROM wallets w WHERE w.player_id=p.id) AS wallets
     FROM players p
     WHERE lower(p.name) LIKE $1 OR EXISTS (SELECT 1 FROM wallets w WHERE w.player_id=p.id AND w.address LIKE $1)
     ORDER BY p.last_login DESC NULLS LAST LIMIT 100`, [s]);
  res.json({ players: rows });
});

adminRouter.post('/ban', async (req, res) => {
  const { playerId, reason, days } = req.body;
  const until = days ? new Date(Date.now() + days * 86400e3) : null;
  await ban(playerId, reason || 'Admin ban', until);
  await audit(req, 'ban', { playerId, days });
  res.json({ ok: true });
});
adminRouter.post('/unban', async (req, res) => {
  await query('UPDATE players SET banned=false, ban_reason=NULL, ban_until=NULL WHERE id=$1', [req.body.playerId]);
  await audit(req, 'unban', { playerId: req.body.playerId });
  res.json({ ok: true });
});

// ---- grants ----
adminRouter.post('/grant-weapon', async (req, res) => {
  await query('INSERT INTO player_weapons(player_id, weapon_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.body.playerId, req.body.weaponId]);
  await query(`INSERT INTO notifications(player_id, kind, title, body) VALUES ($1,'reward','Weapon Granted',$2)`, [req.body.playerId, req.body.weaponId]);
  await audit(req, 'grant-weapon', req.body); res.json({ ok: true });
});
adminRouter.post('/remove-weapon', async (req, res) => {
  await query('DELETE FROM player_weapons WHERE player_id=$1 AND weapon_id=$2', [req.body.playerId, req.body.weaponId]);
  await audit(req, 'remove-weapon', req.body); res.json({ ok: true });
});
adminRouter.post('/grant-achievement', async (req, res) => {
  await query('INSERT INTO player_achievements(player_id, achievement_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.body.playerId, req.body.achievementId]);
  await audit(req, 'grant-achievement', req.body); res.json({ ok: true });
});

// ---- leaderboard ----
adminRouter.post('/reset-weekly', async (req, res) => {
  // Process pending rewards for the finished week, then clear the current week.
  const result = await processWeeklyRewards({ force: !!req.body.force, targetWeek: req.body.week || null });
  await audit(req, 'reset-weekly', { result });
  res.json({ ok: true, result });
});
adminRouter.post('/process-rewards', async (req, res) => {
  const result = await processWeeklyRewards({ force: true, targetWeek: req.body.week || null });
  await audit(req, 'process-rewards', { result }); res.json({ ok: true, result });
});
adminRouter.get('/reward-rules', async (req, res) => res.json({ rules: (await query('SELECT * FROM reward_rules ORDER BY min_rank')).rows }));
adminRouter.put('/reward-rules', async (req, res) => {
  const rules = Array.isArray(req.body.rules) ? req.body.rules : [];
  await query('DELETE FROM reward_rules');
  for (const r of rules)
    await query('INSERT INTO reward_rules(min_rank,max_rank,type,item_id,rarity,title) VALUES ($1,$2,$3,$4,$5,$6)',
      [r.min_rank, r.max_rank, r.type, r.item_id, r.rarity, r.title]);
  await audit(req, 'reward-rules', { count: rules.length }); res.json({ ok: true });
});

// ---- notifications ----
adminRouter.post('/announce', async (req, res) => {
  const { title, body } = req.body;
  await query(`INSERT INTO notifications(player_id, kind, title, body) VALUES (NULL,'announcement',$1,$2)`, [title, body || '']);
  broadcast({ type: 'notification', kind: 'announcement', title, body });
  await audit(req, 'announce', { title }); res.json({ ok: true });
});

// ---- server status / logs ----
adminRouter.get('/status', async (req, res) => {
  const m = await metrics();
  res.json({
    online: onlineCount(), uptimeSec: Math.floor(process.uptime()),
    maintenance: await getSetting('maintenance', false),
    memoryMB: Math.round(process.memoryUsage().rss / 1048576), metrics: m,
  });
});
adminRouter.get('/errors', async (req, res) => res.json({ errors: (await query('SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 100')).rows }));
adminRouter.get('/rewards-log', async (req, res) => res.json({ rewards: (await query('SELECT * FROM rewards ORDER BY created_at DESC LIMIT 200')).rows }));
adminRouter.get('/violations', async (req, res) => res.json({ violations: (await query('SELECT * FROM violations ORDER BY created_at DESC LIMIT 200')).rows }));

// ---- live events ----
adminRouter.get('/events', async (req, res) => res.json({ events: await listEvents() }));
adminRouter.put('/events', async (req, res) => { const id = await upsertEvent(req.body.event || {}); await audit(req, 'event-upsert', { id }); res.json({ ok: true, id }); });
adminRouter.post('/events/toggle', async (req, res) => { await setEventEnabled(req.body.id, req.body.enabled); broadcast({ type: 'event', id: req.body.id, enabled: !!req.body.enabled }); await audit(req, 'event-toggle', req.body); res.json({ ok: true }); });

// ---- maintenance ----
adminRouter.post('/maintenance', async (req, res) => {
  const on = !!req.body.enabled;
  await setSetting('maintenance', on);
  broadcast({ type: 'notification', kind: 'maintenance', title: on ? 'Maintenance starting' : 'Maintenance ended', body: on ? 'New sessions are paused. Finish your current run.' : 'Server is back online.' });
  await audit(req, 'maintenance', { on }); res.json({ ok: true, maintenance: on });
});
