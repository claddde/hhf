/* events.js — server-side live events (double XP, double coins, boss rush,
   special maps, holiday). Clients fetch the active multipliers and the
   server is the source of truth; admins toggle them from the dashboard. */
import { query } from '../db/pool.js';

export async function activeEvents() {
  const { rows } = await query(
    `SELECT id,name,type,config,starts_at,ends_at FROM live_events
     WHERE enabled=true AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>=now())`);
  return rows;
}

/** Aggregate multipliers/flags the client applies (never affects fairness of
    validation — the server recomputes scores using the same event context). */
export async function eventContext() {
  const evs = await activeEvents();
  const ctx = { xpMult: 1, coinMult: 1, bossRush: false, specialMap: null, names: [] };
  for (const e of evs) {
    ctx.names.push(e.name);
    if (e.type === 'double_xp') ctx.xpMult *= (e.config.mult || 2);
    if (e.type === 'double_coins') ctx.coinMult *= (e.config.mult || 2);
    if (e.type === 'boss_rush') ctx.bossRush = true;
    if (e.type === 'special_map') ctx.specialMap = e.config.map || null;
  }
  return ctx;
}

export async function listEvents() { return (await query('SELECT * FROM live_events ORDER BY id')).rows; }
export async function upsertEvent(ev) {
  if (ev.id) {
    await query(`UPDATE live_events SET name=$2,type=$3,config=$4,enabled=$5,starts_at=$6,ends_at=$7 WHERE id=$1`,
      [ev.id, ev.name, ev.type, JSON.stringify(ev.config || {}), !!ev.enabled, ev.starts_at || null, ev.ends_at || null]);
    return ev.id;
  }
  const { rows } = await query(`INSERT INTO live_events(name,type,config,enabled,starts_at,ends_at)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [ev.name, ev.type, JSON.stringify(ev.config || {}), !!ev.enabled, ev.starts_at || null, ev.ends_at || null]);
  return rows[0].id;
}
export async function setEventEnabled(id, enabled) { await query('UPDATE live_events SET enabled=$2 WHERE id=$1', [id, !!enabled]); }
