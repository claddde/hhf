/* time.js — UTC week/month keys + weekly reset math (mirrors the client). */
export function weekKey(ts = Date.now()) {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7;                 // Mon=0
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  return 'W' + Math.floor(monday / 86400000);
}
export function monthKey(ts = Date.now()) {
  const d = new Date(ts);
  return 'M' + d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1);
}
export function nextWeeklyResetMs(ts = Date.now()) {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7;
  const nextMon = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day + 7);
  return nextMon - ts;
}
