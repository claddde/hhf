/* rewards.js (service) — automatic weekly cycle:
   • detect the end of a week (previous week not yet processed)
   • freeze that week's leaderboard
   • compute winners from weekly best scores
   • assign rewards per admin-editable rules (dedupe via UNIQUE constraint)
   • grant the weapon/title, log it, and queue a login notification
   Runs on an interval from index.js; also callable by admin on demand. */
import { query, tx } from '../db/pool.js';
import { weekKey } from '../util/time.js';
import { broadcast } from '../ws.js';
import { log } from '../logger.js';

function previousWeekKey() {
  const n = parseInt(weekKey().slice(1), 10); // days-since-epoch of this Monday
  return 'W' + (n - 7);
}

export async function processWeeklyRewards({ force = false, targetWeek = null } = {}) {
  const wk = targetWeek || previousWeekKey();

  const already = await query('SELECT processed FROM reward_periods WHERE week_key=$1', [wk]);
  if (already.rows[0]?.processed && !force) return { processed: false, reason: 'ALREADY' };

  const rules = (await query('SELECT * FROM reward_rules ORDER BY min_rank')).rows;
  if (!rules.length) return { processed: false, reason: 'NO_RULES' };

  // Freeze: snapshot the week's per-player best, ranked.
  const winners = (await query(
    `SELECT * FROM (
       SELECT DISTINCT ON (player_id) player_id, wallet, max(score) OVER (PARTITION BY player_id) AS best, score
       FROM scores WHERE week_key=$1
     ) t ORDER BY score DESC`, [wk])).rows;

  const granted = [];
  await tx(async (c) => {
    await c.query(`INSERT INTO reward_periods(week_key, frozen_at) VALUES ($1, now())
                   ON CONFLICT (week_key) DO UPDATE SET frozen_at=now()`, [wk]);
    // De-dupe winners to one row each (already DISTINCT ON), assign ranks.
    const seen = new Set();
    let rank = 0;
    for (const w of winners) {
      if (seen.has(w.player_id)) continue; seen.add(w.player_id); rank += 1;
      const rule = rules.find(r => rank >= r.min_rank && rank <= r.max_rank);
      if (!rule) continue;
      // UNIQUE(player_id, week_key, rank) prevents duplicate grants.
      const ins = await c.query(
        `INSERT INTO rewards(player_id, wallet, week_key, rank, type, item_id, rarity, title)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (player_id, week_key, rank) DO NOTHING RETURNING id`,
        [w.player_id, w.wallet, wk, rank, rule.type, rule.item_id, rule.rarity, rule.title]);
      if (!ins.rows[0]) continue;
      if (rule.type === 'weapon' && rule.item_id)
        await c.query('INSERT INTO player_weapons(player_id, weapon_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [w.player_id, rule.item_id]);
      await c.query(`INSERT INTO notifications(player_id, kind, title, body)
                     VALUES ($1,'reward',$2,$3)`,
        [w.player_id, 'Weekly Reward', `Rank #${rank}: ${rule.title || rule.item_id}`]);
      granted.push({ wallet: w.wallet, rank, item: rule.item_id, title: rule.title });
    }
    await c.query('UPDATE reward_periods SET processed=true, processed_at=now() WHERE week_key=$1', [wk]);
  });

  await log.event('reward', null, { week: wk, granted: granted.length });
  broadcast({ type: 'rewards_processed', week: wk, count: granted.length });
  return { processed: true, week: wk, granted };
}
