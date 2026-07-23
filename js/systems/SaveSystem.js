/* ============================================================
   SaveSystem.js — persistent meta-progression in localStorage.
   Coins, unlocked weapons, permanent (shop) upgrades, best time,
   highest level, bosses defeated, achievements. Auto-saves.
   ============================================================ */

const KEY = 'hoodlust-save-v1';

const DEFAULT = {
  coins: 0,
  unlockedWeapons: ['rose_bolt', 'magic_wand'],
  perm: {},              // shop upgrade levels {id: level}
  bestTime: 0,
  highestLevel: 1,
  bosses: 0,
  achievements: [],      // unlocked achievement ids
  totalKills: 0,
  runs: 0,
  bestScore: 0,          // Phase 5: lifetime best score
  exclusive: [],         // Phase 5: exclusive rewards earned
  titles: [],            // Phase 5: earned titles
};

export class SaveSystem {
  constructor() { this.data = this._load(); }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign({}, DEFAULT, JSON.parse(raw));
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT));
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (_) {}
  }

  // ---- coins ----
  addCoins(n) { this.data.coins += n; this.save(); }
  spend(n) { if (this.data.coins < n) return false; this.data.coins -= n; this.save(); return true; }

  // ---- weapons ----
  unlockWeapon(id) {
    if (!this.data.unlockedWeapons.includes(id)) { this.data.unlockedWeapons.push(id); this.save(); return true; }
    return false;
  }
  isUnlocked(id) { return this.data.unlockedWeapons.includes(id); }

  // ---- shop ----
  buyLevel(id) { this.data.perm[id] = (this.data.perm[id] || 0) + 1; this.save(); }
  permLevel(id) { return this.data.perm[id] || 0; }

  // ---- achievements ----
  hasAchievement(id) { return this.data.achievements.includes(id); }
  unlockAchievement(id) {
    if (!this.hasAchievement(id)) { this.data.achievements.push(id); this.save(); return true; }
    return false;
  }

  // ---- end-of-run record ----
  recordRun(stats) {
    this.data.runs += 1;
    this.data.totalKills += stats.kills || 0;
    this.data.coins += stats.coins || 0;
    if ((stats.time || 0) > this.data.bestTime) this.data.bestTime = Math.floor(stats.time);
    if ((stats.level || 1) > this.data.highestLevel) this.data.highestLevel = stats.level;
    this.data.bosses += stats.bossesThisRun || 0;
    this.save();
  }

  reset() { this.data = JSON.parse(JSON.stringify(DEFAULT)); this.save(); }
}
