/* routes/ecosystem.js — Phase 7 live-ecosystem API: seasons, battle pass,
   missions, cosmetics, clans, friends, global chat and feature flags.
   All progression/cosmetic — never gameplay balance. Auth required except
   public reads (season info, feature flags, clan leaderboard). */
import { Router } from 'express';
import { query, tx } from '../db/pool.js';
import { auth, notBanned } from '../middleware/auth.js';
import { broadcast } from '../ws.js';

export const ecosystemRouter = Router();

// ---------------- public ----------------
ecosystemRouter.get('/season', async (req, res) => {
  const { rows } = await query('SELECT * FROM seasons WHERE archived=false ORDER BY starts_at DESC LIMIT 1');
  res.json({ season: rows[0] || null });
});
ecosystemRouter.get('/flags', async (req, res) => {
  const { rows } = await query('SELECT key, enabled, value FROM feature_flags');
  res.json({ flags: Object.fromEntries(rows.map(r => [r.key, { enabled: r.enabled, value: r.value }])) });
});
ecosystemRouter.get('/clans/leaderboard', async (req, res) => {
  const { rows } = await query('SELECT id,name,tag,logo,clan_score FROM clans ORDER BY clan_score DESC LIMIT 50');
  res.json({ clans: rows.map((c, i) => ({ rank: i + 1, ...c })) });
});

// ---------------- authed ----------------
ecosystemRouter.use(auth(true), notBanned);

// Battle pass / season progress
ecosystemRouter.get('/progress/:seasonId', async (req, res) => {
  const { rows } = await query('SELECT * FROM season_progress WHERE season_id=$1 AND player_id=$2', [req.params.seasonId, req.user.pid]);
  res.json({ progress: rows[0] || { bp_xp: 0, premium: false, claimed: { free: [], premium: [] } } });
});
ecosystemRouter.post('/battlepass/xp', async (req, res) => {
  const add = Math.max(0, Math.min(100000, parseInt(req.body.xp || 0, 10)));   // clamp
  const sid = req.body.seasonId || 'S1';
  const { rows } = await query(
    `INSERT INTO season_progress(season_id, player_id, bp_xp, updated_at)
     VALUES ($1,$2,$3, now())
     ON CONFLICT (season_id, player_id) DO UPDATE SET bp_xp = season_progress.bp_xp + $3, updated_at=now()
     RETURNING bp_xp`, [sid, req.user.pid, add]);
  res.json({ bpXp: rows[0].bp_xp });
});
ecosystemRouter.post('/battlepass/premium', async (req, res) => {
  // NOTE: a real purchase verifies an on-chain payment / receipt server-side.
  const sid = req.body.seasonId || 'S1';
  await query(`INSERT INTO season_progress(season_id, player_id, premium) VALUES ($1,$2,true)
               ON CONFLICT (season_id, player_id) DO UPDATE SET premium=true`, [sid, req.user.pid]);
  res.json({ ok: true });
});
ecosystemRouter.post('/battlepass/claim', async (req, res) => {
  const { seasonId = 'S1', tier, track } = req.body;
  const r = await query('SELECT bp_xp, premium, claimed FROM season_progress WHERE season_id=$1 AND player_id=$2', [seasonId, req.user.pid]);
  const p = r.rows[0]; if (!p) return res.status(400).json({ error: 'NO_PROGRESS' });
  const curTier = Math.floor(p.bp_xp / 1000);
  if (tier > curTier) return res.status(400).json({ error: 'TIER_LOCKED' });
  if (track === 'premium' && !p.premium) return res.status(403).json({ error: 'PREMIUM_REQUIRED' });
  const claimed = p.claimed || { free: [], premium: [] };
  if (claimed[track].includes(tier)) return res.status(400).json({ error: 'ALREADY_CLAIMED' });
  claimed[track].push(tier);
  await query('UPDATE season_progress SET claimed=$3 WHERE season_id=$1 AND player_id=$2', [seasonId, req.user.pid, JSON.stringify(claimed)]);
  res.json({ ok: true, claimed });
});

// Missions
ecosystemRouter.get('/missions', async (req, res) => {
  const { rows } = await query('SELECT * FROM player_missions WHERE player_id=$1 AND (scope=$2 OR scope=$3)',
    [req.user.pid, 'daily', 'weekly']);
  res.json({ missions: rows });
});
ecosystemRouter.post('/missions/progress', async (req, res) => {
  // Server clamps + marks done; claiming grants coins/xp.
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  for (const it of items) {
    await query(
      `UPDATE player_missions SET progress=LEAST(goal, progress + $4),
         done = (progress + $4) >= goal
       WHERE player_id=$1 AND scope=$2 AND mission_id=$3 AND period_key=$5`,
      [req.user.pid, it.scope, it.missionId, Math.max(0, it.add || 0), it.periodKey]);
  }
  res.json({ ok: true });
});

// Cosmetics
ecosystemRouter.get('/cosmetics', async (req, res) => {
  const { rows } = await query(
    `SELECT c.id, c.kind, c.name, pc.equipped FROM player_cosmetics pc JOIN cosmetics c ON c.id=pc.cosmetic_id WHERE pc.player_id=$1`,
    [req.user.pid]);
  res.json({ cosmetics: rows });
});
ecosystemRouter.post('/cosmetics/equip', async (req, res) => {
  const id = req.body.cosmeticId;
  await tx(async (c) => {
    const kind = (await c.query('SELECT kind FROM cosmetics WHERE id=$1', [id])).rows[0]?.kind;
    if (kind) await c.query(`UPDATE player_cosmetics pc SET equipped=false FROM cosmetics c
      WHERE pc.cosmetic_id=c.id AND pc.player_id=$1 AND c.kind=$2`, [req.user.pid, kind]);
    await c.query('UPDATE player_cosmetics SET equipped=true WHERE player_id=$1 AND cosmetic_id=$2', [req.user.pid, id]);
  });
  res.json({ ok: true });
});
// Grant NFT-holder cosmetics (server verifies count via nft_verifications).
ecosystemRouter.post('/cosmetics/nft-claim', async (req, res) => {
  const v = await query('SELECT nft_count FROM nft_verifications WHERE address=$1', [req.user.wallet]);
  const n = v.rows[0]?.nft_count || 0;
  if (n <= 0) return res.status(403).json({ error: 'NOT_HOLDER' });
  const gifts = ['frame:holder', 'aura:gold', 'banner:hoodlust', ...(n >= 3 ? ['pet:shadow', 'spawnfx:portal'] : [])];
  for (const g of gifts) await query('INSERT INTO player_cosmetics(player_id, cosmetic_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.pid, g]);
  res.json({ ok: true, granted: gifts });
});

// Clans
ecosystemRouter.post('/clans', async (req, res) => {
  const { name, tag, logo } = req.body;
  try {
    const clan = await tx(async (c) => {
      const cl = (await c.query('INSERT INTO clans(name, tag, logo, owner_id) VALUES ($1,$2,$3,$4) RETURNING *', [name, (tag || '').slice(0, 5), logo || null, req.user.pid])).rows[0];
      await c.query('INSERT INTO clan_members(clan_id, player_id, role) VALUES ($1,$2,$3)', [cl.id, req.user.pid, 'owner']);
      return cl;
    });
    res.json({ ok: true, clan });
  } catch (e) { res.status(400).json({ error: 'CLAN_EXISTS' }); }
});
ecosystemRouter.post('/clans/:id/join', async (req, res) => {
  await query('INSERT INTO clan_members(clan_id, player_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.id, req.user.pid]);
  res.json({ ok: true });
});
ecosystemRouter.get('/clans/:id/chat', async (req, res) => {
  const { rows } = await query('SELECT player_id, body, created_at FROM clan_chat WHERE clan_id=$1 ORDER BY created_at DESC LIMIT 50', [req.params.id]);
  res.json({ messages: rows.reverse() });
});
ecosystemRouter.post('/clans/:id/chat', async (req, res) => {
  const body = String(req.body.body || '').slice(0, 200).replace(/[<>]/g, '');
  await query('INSERT INTO clan_chat(clan_id, player_id, body) VALUES ($1,$2,$3)', [req.params.id, req.user.pid, body]);
  broadcast({ type: 'clan_chat', clanId: req.params.id });
  res.json({ ok: true });
});

// Friends
ecosystemRouter.get('/friends', async (req, res) => {
  const { rows } = await query(
    `SELECT p.id, p.name, p.last_login, f.status FROM friendships f JOIN players p ON p.id=f.friend_id WHERE f.player_id=$1`, [req.user.pid]);
  res.json({ friends: rows });
});
ecosystemRouter.post('/friends/add', async (req, res) => {
  await query(`INSERT INTO friendships(player_id, friend_id, status) VALUES ($1,$2,'pending') ON CONFLICT DO NOTHING`, [req.user.pid, req.body.friendId]);
  res.json({ ok: true });
});
ecosystemRouter.post('/friends/remove', async (req, res) => {
  await query('DELETE FROM friendships WHERE player_id=$1 AND friend_id=$2', [req.user.pid, req.body.friendId]);
  res.json({ ok: true });
});

// Global chat
ecosystemRouter.get('/chat', async (req, res) => {
  const { rows } = await query('SELECT player_id, body, created_at FROM chat_global ORDER BY created_at DESC LIMIT 60');
  res.json({ messages: rows.reverse() });
});
ecosystemRouter.post('/chat', async (req, res) => {
  const body = String(req.body.body || '').slice(0, 200).replace(/[<>]/g, '');
  if (!body) return res.status(400).json({ error: 'EMPTY' });
  await query('INSERT INTO chat_global(player_id, body) VALUES ($1,$2)', [req.user.pid, body]);
  broadcast({ type: 'chat', body });
  res.json({ ok: true });
});
