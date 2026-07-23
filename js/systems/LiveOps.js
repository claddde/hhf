/* ============================================================
   LiveOps.js — Phase 7 Web3 live-ecosystem engine (client side).
   Seasons, Battle Pass (free + premium), and daily / weekly
   missions. Purely progression + COSMETIC rewards — never touches
   gameplay balance (no pay-to-win). Works fully in local mode
   (localStorage); when ONLINE.mode==='remote' the same shapes are
   synced to the backend. Cosmetics unlocked by holding HoodLust
   NFTs are additive on top.
   ============================================================ */

const LKEY = 'hoodlust-liveops-v1';

// ---- season config (duration configurable) ----
const SEASON = {
  id: 'S1',
  name: 'Season 1 — Neon Gothic',
  durationDays: 60,
  startUTC: Date.UTC(2026, 6, 1),        // 1 Jul 2026
  // battle-pass tiers: each tier costs BP_XP_PER_TIER battle-pass XP.
  tiers: 40,
};
const BP_XP_PER_TIER = 1000;

// Cosmetic reward tables (cosmetic only). f=free, p=premium.
function bpReward(tier) {
  const f = ['coins:200', 'frame:bronze', 'coins:300', 'banner:forest', 'title:Rookie', 'aura:green',
             'coins:400', 'pet:firefly', 'frame:silver', 'coins:500'][tier % 10];
  const p = ['skin:crimson', 'spawnfx:warp', 'victoryfx:confetti', 'frame:gold', 'banner:crystal',
             'aura:violet', 'pet:ghost', 'title:Ascendant', 'skin:midnight', 'frame:mythic'][tier % 10];
  return { free: f, premium: p };
}

// ---- mission pools ----
const DAILY_POOL = [
  { id: 'd_login', name: 'Daily Login', metric: 'login', goal: 1, xp: 150, coins: 100 },
  { id: 'd_kills', name: 'Slay 150 enemies', metric: 'kills', goal: 150, xp: 250, coins: 150 },
  { id: 'd_boss', name: 'Defeat 1 boss', metric: 'bosses', goal: 1, xp: 300, coins: 200 },
  { id: 'd_coins', name: 'Collect 300 coins', metric: 'coins', goal: 300, xp: 200, coins: 0 },
  { id: 'd_xp', name: 'Earn 500 XP', metric: 'xp', goal: 500, xp: 150, coins: 100 },
  { id: 'd_survive', name: 'Survive 5 minutes', metric: 'time', goal: 300, xp: 300, coins: 150 },
  { id: 'd_chest', name: 'Open 2 chests', metric: 'chests', goal: 2, xp: 200, coins: 150 },
];
const WEEKLY_POOL = [
  { id: 'w_kills', name: 'Slay 2000 enemies', metric: 'kills', goal: 2000, xp: 1500, coins: 1000 },
  { id: 'w_boss', name: 'Defeat 10 bosses', metric: 'bosses', goal: 10, xp: 2000, coins: 1200 },
  { id: 'w_survive', name: 'Survive 45 minutes total', metric: 'time', goal: 2700, xp: 1800, coins: 1000 },
  { id: 'w_runs', name: 'Complete 15 runs', metric: 'runs', goal: 15, xp: 1500, coins: 800 },
];

function todayKey() { return new Date().toISOString().slice(0, 10); }
function weekKey() {
  const d = new Date(); const day = (d.getUTCDay() + 6) % 7;
  const mon = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  return 'W' + Math.floor(mon / 86400000);
}
function pick(pool, n, seed) {
  const arr = [...pool]; const out = [];
  let s = seed;
  while (arr.length && out.length < n) { s = (s * 1103515245 + 12345) & 0x7fffffff; out.push(arr.splice(s % arr.length, 1)[0]); }
  return out;
}

export class LiveOps {
  constructor(save) {
    this.save = save;
    this.state = this._load();
    this._refreshMissions();
  }

  _load() {
    let s;
    try { s = JSON.parse(localStorage.getItem(LKEY)); } catch (_) {}
    return s || {
      season: SEASON.id,
      bpXp: 0, bpPremium: false, bpClaimed: { free: [], premium: [] },
      cosmetics: [], equipped: { frame: null, banner: null, aura: null, pet: null, spawnfx: null, victoryfx: null },
      daily: { key: '', missions: [] }, weekly: { key: '', missions: [] },
      seasonHistory: [],
    };
  }
  _save() { try { localStorage.setItem(LKEY, JSON.stringify(this.state)); } catch (_) {} }

  // ---- season ----
  season() { return SEASON; }
  seasonDaysLeft() {
    const end = SEASON.startUTC + SEASON.durationDays * 86400000;
    return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
  }
  seasonProgress() { return Math.min(1, (Date.now() - SEASON.startUTC) / (SEASON.durationDays * 86400000)); }

  // ---- battle pass ----
  bpTier() { return Math.min(SEASON.tiers, Math.floor(this.state.bpXp / BP_XP_PER_TIER)); }
  bpTierProgress() { return (this.state.bpXp % BP_XP_PER_TIER) / BP_XP_PER_TIER; }
  isPremium() { return !!this.state.bpPremium; }
  activatePremium() { this.state.bpPremium = true; this._save(); }   // real purchase would verify on-chain/backend
  addBattleXp(n) {
    const before = this.bpTier();
    this.state.bpXp += n; this._save();
    const after = this.bpTier();
    return after - before; // tiers gained
  }
  bpTable() {
    const rows = [];
    for (let t = 1; t <= SEASON.tiers; t++) rows.push({ tier: t, ...bpReward(t - 1) });
    return rows;
  }
  claimBp(tier, track) {
    if (tier > this.bpTier()) return false;
    if (track === 'premium' && !this.isPremium()) return false;
    const claimed = this.state.bpClaimed[track];
    if (claimed.includes(tier)) return false;
    claimed.push(tier);
    const reward = bpReward(tier - 1)[track];
    this._grant(reward);
    this._save();
    return reward;
  }

  _grant(reward) {
    const [kind, val] = reward.split(':');
    if (kind === 'coins') { this.save.addCoins(parseInt(val, 10) || 0); return; }
    if (kind === 'title') { this.save.data.titles = this.save.data.titles || []; if (!this.save.data.titles.includes(val)) this.save.data.titles.push(val); this.save.save(); return; }
    // everything else is a cosmetic id "kind:val"
    if (!this.state.cosmetics.includes(reward)) this.state.cosmetics.push(reward);
  }

  // ---- cosmetics (cosmetic only) ----
  ownedCosmetics() { return this.state.cosmetics.slice(); }
  equip(reward) {
    const [kind] = reward.split(':');
    if (this.state.equipped[kind] === undefined) return false;
    if (!this.state.cosmetics.includes(reward)) return false;
    this.state.equipped[kind] = reward; this._save(); return true;
  }
  /** NFT-holders get bonus cosmetics (cosmetic only). Called after verify. */
  grantNftCosmetics(nftCount) {
    if (nftCount <= 0) return;
    const gifts = ['frame:holder', 'aura:gold', 'banner:hoodlust'];
    if (nftCount >= 3) gifts.push('pet:shadow', 'spawnfx:portal');
    let added = false;
    for (const g of gifts) if (!this.state.cosmetics.includes(g)) { this.state.cosmetics.push(g); added = true; }
    if (added) this._save();
  }

  // ---- missions ----
  _refreshMissions() {
    const dk = todayKey(), wk = weekKey();
    if (this.state.daily.key !== dk) {
      const seed = parseInt(dk.replace(/-/g, ''), 10);
      this.state.daily = { key: dk, missions: pick(DAILY_POOL, 4, seed).map(m => ({ ...m, progress: 0, done: false, claimed: false })) };
      // auto-complete the login mission
      const login = this.state.daily.missions.find(m => m.metric === 'login');
      if (login) { login.progress = 1; login.done = true; }
    }
    if (this.state.weekly.key !== wk) {
      const seed = parseInt(wk.slice(1), 10);
      this.state.weekly = { key: wk, missions: pick(WEEKLY_POOL, 3, seed).map(m => ({ ...m, progress: 0, done: false, claimed: false })) };
    }
    this._save();
  }
  missions() { this._refreshMissions(); return { daily: this.state.daily.missions, weekly: this.state.weekly.missions }; }

  /** Feed run metrics; advances any matching missions. Returns newly completed. */
  trackRun(metrics) {
    this._refreshMissions();
    const completed = [];
    const apply = (list) => list.forEach(m => {
      if (m.done) return;
      const add = metrics[m.metric] || 0;
      if (!add && m.metric !== 'runs') return;
      m.progress = Math.min(m.goal, m.progress + (m.metric === 'runs' ? 1 : add));
      if (m.progress >= m.goal) { m.done = true; completed.push(m); }
    });
    apply(this.state.daily.missions);
    apply(this.state.weekly.missions);
    this._save();
    return completed;
  }
  claimMission(id) {
    const all = [...this.state.daily.missions, ...this.state.weekly.missions];
    const m = all.find(x => x.id === id);
    if (!m || !m.done || m.claimed) return false;
    m.claimed = true;
    if (m.coins) this.save.addCoins(m.coins);
    if (m.xp) this.addBattleXp(m.xp);
    this._save();
    return m;
  }
}
