/* ============================================================
   AntiCheat.js — validates scores and save integrity before any
   leaderboard submission or reward claim.
     • Score sanity: bounded by elapsed run time (impossible-rate).
     • Save integrity: checksum so hand-edited saves are rejected.
     • Reward dedupe: one claim per (wallet, reward period).
   All client-side checks are a first line of defence; authoritative
   validation must also run on the backend in production.
   ============================================================ */

// Max plausible score per second of survival (kills*… + coins). Generous
// but finite so absurd values are rejected.
const MAX_SCORE_PER_SEC = 400;
const MAX_ABS_SCORE = 5_000_000;

export const AntiCheat = {
  // ---- score validation ----
  computeScore(stats) {
    // Deterministic scoring the server can recompute.
    return Math.round((stats.kills || 0) * 10 + (stats.level || 1) * 50 +
      (stats.bossesThisRun || 0) * 500 + (stats.coins || 0) * 2 + Math.floor(stats.time || 0) * 3);
  },

  validateScore(score, stats) {
    if (!Number.isFinite(score) || score < 0 || score > MAX_ABS_SCORE) return false;
    const t = Math.max(1, stats.time || 0);
    if (score > t * MAX_SCORE_PER_SEC + 1000) return false;
    // Recompute and allow a tiny tolerance.
    const expected = this.computeScore(stats);
    if (Math.abs(expected - score) > 5) return false;
    return true;
  },

  // ---- save integrity ----
  checksum(obj) {
    const str = JSON.stringify(obj) + '::hoodlust-salt-v1';
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16);
  },
  sign(data) { const copy = { ...data }; delete copy._sig; return this.checksum(copy); },
  verifySave(data) {
    if (!data || !data._sig) return false;
    return data._sig === this.sign(data);
  },

  // ---- reward dedupe ----
  alreadyClaimed(history, periodKey, rank) {
    return (history || []).some(r => r.period === periodKey && r.rank === rank);
  },
};
