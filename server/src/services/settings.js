/* settings.js — runtime key/value settings (maintenance mode, etc.),
   cached in memory and persisted to the settings table. */
import { query } from '../db/pool.js';

const cache = new Map();

export async function getSetting(key, dflt = null) {
  if (cache.has(key)) return cache.get(key);
  const { rows } = await query('SELECT value FROM settings WHERE key=$1', [key]);
  const val = rows[0] ? rows[0].value : dflt;
  cache.set(key, val);
  return val;
}

export async function setSetting(key, value) {
  await query(
    `INSERT INTO settings(key,value) VALUES ($1,$2)
     ON CONFLICT (key) DO UPDATE SET value=$2`,
    [key, JSON.stringify(value)]
  );
  cache.set(key, value);
  return value;
}
