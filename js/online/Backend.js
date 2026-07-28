/* ============================================================
   Backend.js — pluggable online service for cloud save,
   leaderboard, player stats and reward history.

   Default implementation is LocalBackend (localStorage), so the
   game is fully functional offline / on static hosting. To go
   live, implement the same async methods against your server and
   set ONLINE.mode = 'remote' with ONLINE.baseUrl — NO game logic
   changes required.
   ============================================================ */

export const ONLINE = {
  mode: 'local',                 // 'local' | 'remote'
  baseUrl: '',                   // e.g. 'https://your-backend.example' (no trailing slash)
  token: null,                   // JWT set after wallet sign-in (remote mode)
};

export function setAuthToken(t) { ONLINE.token = t; }

// ---- week/month helpers (UTC, week starts Monday) ----
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

class LocalBackend {
  constructor() { this.KEY = 'hoodlust-online-v1'; this.data = this._load(); }
  _load() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (_) { return {}; }
    }
  _save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (_) {} }

  async cloudSave(wallet, blob) {
    this.data.saves = this.data.saves || {};
    this.data.saves[wallet] = { blob, ts: Date.now() };
    this._save(); return { ok: true };
  }
  async cloudLoad(wallet) {
    return (this.data.saves && this.data.saves[wallet]) ? this.data.saves[wallet].blob : null;
  }

  async submitScore(entry) {
    // entry: {wallet, name, score, character, ts}
    this.data.scores = this.data.scores || [];
    this.data.scores.push(entry);
    // keep it bounded
    if (this.data.scores.length > 5000) this.data.scores = this.data.scores.slice(-5000);
    this._save(); return { ok: true };
  }

  async leaderboard(scope = 'all') {
    const scores = this.data.scores || [];
    const wk = weekKey(), mo = monthKey();
    const filt = scores.filter(s => scope === 'all' ? true : scope === 'week' ? weekKey(s.ts) === wk : monthKey(s.ts) === mo);
    // best score per wallet
    const best = {};
    for (const s of filt) {
      if (!best[s.wallet] || s.score > best[s.wallet].score) best[s.wallet] = s;
    }
    return Object.values(best).sort((a, b) => b.score - a.score).slice(0, 100);
  }

  async playerRank(wallet, scope = 'all') {
    const board = await this.leaderboard(scope);
    const idx = board.findIndex(e => e.wallet === wallet);
    return idx < 0 ? null : idx + 1;
  }

  async rewardHistory(wallet) {
    return (this.data.rewards && this.data.rewards[wallet]) || [];
  }
  async grantReward(wallet, reward) {
    this.data.rewards = this.data.rewards || {};
    this.data.rewards[wallet] = this.data.rewards[wallet] || [];
    this.data.rewards[wallet].push({ ...reward, ts: Date.now() });
    this._save(); return { ok: true };
  }
}

// Talks to the Phase-6 Node/Express/PostgreSQL backend. Method names/shapes
// match LocalBackend so game code is backend-agnostic.
class RemoteBackend {
  constructor(base) { this.base = base.replace(/\/$/, ''); }
  _headers() { return { 'Content-Type': 'application/json', ...(ONLINE.token ? { Authorization: 'Bearer ' + ONLINE.token } : {}) }; }
  async _post(path, body) { const r = await fetch(this.base + path, { method: 'POST', headers: this._headers(), body: JSON.stringify(body) }); return r.json(); }
  async _put(path, body) { const r = await fetch(this.base + path, { method: 'PUT', headers: this._headers(), body: JSON.stringify(body) }); return r.json(); }
  async _get(path) { const r = await fetch(this.base + path, { headers: this._headers() }); return r.json(); }

  cloudSave(_w, blob) {
    return this._put('/api/player/save', { data: blob, coins: blob.coins || 0, xp: blob.xp || 0, highestLevel: blob.highestLevel || 1 });
  }
  cloudLoad() { return this._get('/api/player/save').then(r => r.blob || null); }

  // entry carries {score, character, stats}. Server re-validates from stats.
  submitScore(entry) { return this._post('/api/leaderboard/submit', { stats: { ...(entry.stats || {}), character: entry.character }, clientScore: entry.score }); }

  leaderboard(scope) {
    const s = scope === 'week' ? 'week' : scope === 'month' ? 'month' : 'all';
    return this._get('/api/leaderboard/' + s).then(r => (r.board || []).map(e => ({ wallet: e.wallet, character: e.character, score: e.score })));
  }
  async playerRank(_w, scope) {
    // Rank is returned by submit; for reads, derive from the board position.
    const board = await this.leaderboard(scope);
    const me = ONLINE._meWallet;
    const i = board.findIndex(e => e.wallet === me);
    return i < 0 ? null : i + 1;
  }
  rewardHistory() { return this._get('/api/rewards/history').then(r => r.rewards || []); }
  grantReward() { return Promise.resolve({ ok: true }); } // server-authoritative; no client grants
}

export function makeBackend() {
  return ONLINE.mode === 'remote' && ONLINE.baseUrl ? new RemoteBackend(ONLINE.baseUrl) : new LocalBackend();
}
