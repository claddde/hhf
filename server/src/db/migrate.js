/* migrate.js — applies schema.sql and seeds catalogue rows. Run: npm run migrate */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, query } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Keep these in sync with the client tables (js/data/gamedata.js).
const WEAPONS = [
  ['rose_bolt', 'Rose Bolt', 'common', false], ['magic_wand', 'Magic Wand', 'common', false],
  ['fire_orb', 'Fire Orb', 'uncommon', false], ['dark_scythe', 'Dark Scythe', 'rare', false],
  ['bone_shot', 'Bone Shot', 'uncommon', false], ['shadow_blade', 'Shadow Blade', 'epic', false],
  ['pixel_laser', 'Pixel Laser', 'rare', false], ['ghost_flame', 'Ghost Flame', 'epic', false],
  ['ice_crystal', 'Ice Crystal', 'legendary', true],
];
const ACHIEVEMENTS = [
  ['first_blood', 'First Blood'], ['slayer', 'Slayer (100)'], ['reaper', 'Reaper (500)'],
  ['level10', 'Ascendant (Lv10)'], ['boss1', 'Boss Slayer'], ['chest1', 'Treasure Hunter'],
  ['rich', 'Coin Baron (1000)'], ['survivor', 'Survivor (10min)'],
];
const RULES = [
  [1, 1, 'weapon', 'ice_crystal', 'mythic', 'Champion of the Week'],
  [2, 3, 'weapon', 'shadow_blade', 'legendary', 'Elite Survivor'],
  [4, 10, 'skin', 'crimson_glow', 'epic', 'Top 10'],
];

async function main() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await query(sql);
  // Phase 7 ecosystem migration (idempotent).
  try { await query(readFileSync(join(__dirname, 'migrations', '002_ecosystem.sql'), 'utf8')); }
  catch (e) { console.warn('[migrate] 002_ecosystem skipped:', e.message); }
  for (const w of WEAPONS) await query('INSERT INTO weapons(id,name,rarity,exclusive) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING', w);
  for (const a of ACHIEVEMENTS) await query('INSERT INTO achievements(id,name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING', a);
  const { rows } = await query('SELECT count(*)::int n FROM reward_rules');
  if (rows[0].n === 0) for (const r of RULES) await query('INSERT INTO reward_rules(min_rank,max_rank,type,item_id,rarity,title) VALUES ($1,$2,$3,$4,$5,$6)', r);
  console.log('[migrate] schema applied + catalogue seeded.');
  await pool.end();
}
main().catch((e) => { console.error('[migrate] failed', e); process.exit(1); });
