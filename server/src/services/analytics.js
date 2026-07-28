/* analytics.js — records run stats and computes dashboard metrics:
   DAU/WAU, avg session length, weapon usage, boss defeat rate,
   retention and map popularity. */
import { query } from '../db/pool.js';

export async function recordRunStats(playerId, stats) {
  const rows = [];
  if (stats.duration) rows.push(['session', null, +stats.duration]);
  if (stats.character) rows.push(['map_play', stats.map || 'unknown', 1]);
  (stats.weaponsUsed || []).forEach(w => rows.push(['weapon_use', w, 1]));
  if (stats.bosses) rows.push(['boss_kill', 'boss', +stats.bosses]);
  for (const [kind, key, value] of rows)
    await query('INSERT INTO game_stats(player_id, kind, key, value) VALUES ($1,$2,$3,$4)', [playerId, kind, key, value]);
}

export async function metrics() {
  const q = (sql, p) => query(sql, p).then(r => r.rows);
  const [dau, wau, sess, weapons, maps, bosses, retention] = await Promise.all([
    q(`SELECT count(DISTINCT player_id)::int n FROM game_stats WHERE created_at > now() - interval '1 day'`),
    q(`SELECT count(DISTINCT player_id)::int n FROM game_stats WHERE created_at > now() - interval '7 day'`),
    q(`SELECT coalesce(avg(value),0)::int s FROM game_stats WHERE kind='session' AND created_at > now() - interval '7 day'`),
    q(`SELECT key, sum(value)::int n FROM game_stats WHERE kind='weapon_use' GROUP BY key ORDER BY n DESC LIMIT 10`),
    q(`SELECT key, sum(value)::int n FROM game_stats WHERE kind='map_play' GROUP BY key ORDER BY n DESC`),
    q(`SELECT sum(value)::int kills FROM game_stats WHERE kind='boss_kill'`),
    q(`SELECT count(DISTINCT player_id)::int n FROM game_stats WHERE kind='session'
        AND player_id IN (SELECT id FROM players WHERE created_at < now() - interval '7 day')
        AND created_at > now() - interval '7 day'`),
  ]);
  return {
    dailyActive: dau[0].n, weeklyActive: wau[0].n, avgSessionSec: sess[0].s,
    topWeapons: weapons, mapPopularity: maps, bossKills: bosses[0].kills || 0,
    retainedWeekly: retention[0].n,
  };
}
