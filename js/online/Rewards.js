/* ============================================================
   Rewards.js — weekly reward rules + admin module. Rules are DATA
   (persisted, admin-editable) so distribution changes without any
   game-logic edits. Determines the top players from weekly scores
   and grants exclusive weapons / skins / titles once per period.
   ============================================================ */

import { weekKey, nextWeeklyResetMs } from './Backend.js';

const RULES_KEY = 'hoodlust-reward-rules-v1';

// Default, admin-configurable rules. Each rule maps a rank range to a reward.
const DEFAULT_RULES = [
  { minRank: 1, maxRank: 1, type: 'weapon',  id: 'ice_crystal',  rarity: 'mythic',    title: 'Champion of the Week' },
  { minRank: 2, maxRank: 3, type: 'weapon',  id: 'shadow_blade', rarity: 'legendary', title: 'Elite Survivor' },
  { minRank: 4, maxRank: 10, type: 'skin',   id: 'crimson_glow', rarity: 'epic',      title: 'Top 10' },
];

export class Rewards {
  constructor(backend, save) {
    this.backend = backend;
    this.save = save;
    this.rules = this._loadRules();
  }

  _loadRules() {
    try { const r = JSON.parse(localStorage.getItem(RULES_KEY)); if (Array.isArray(r)) return r; } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_RULES));
  }
  saveRules(rules) { this.rules = rules; localStorage.setItem(RULES_KEY, JSON.stringify(rules)); }

  msToReset() { return nextWeeklyResetMs(); }
  countdownText() {
    let ms = this.msToReset();
    const d = Math.floor(ms / 86400000); ms -= d * 86400000;
    const h = Math.floor(ms / 3600000); ms -= h * 3600000;
    const m = Math.floor(ms / 60000);
    return `${d}d ${h}h ${m}m`;
  }

  ruleForRank(rank) {
    return this.rules.find(r => rank >= r.minRank && rank <= r.maxRank) || null;
  }

  /** Check the wallet's current weekly rank and grant any owed reward once. */
  async processWeekly(wallet, anticheat) {
    if (!wallet) return null;
    const rank = await this.backend.playerRank(wallet, 'week');
    if (!rank) return null;
    const rule = this.ruleForRank(rank);
    if (!rule) return null;

    const period = weekKey();
    const history = await this.backend.rewardHistory(wallet);
    if (anticheat.alreadyClaimed(history, period, rank)) return null; // dedupe

    const reward = { period, rank, type: rule.type, id: rule.id, rarity: rule.rarity, title: rule.title };
    await this.backend.grantReward(wallet, reward);

    // Persist to the local save so it shows on the profile + unlocks weapon.
    this.save.data.exclusive = this.save.data.exclusive || [];
    this.save.data.exclusive.push(reward);
    if (rule.type === 'weapon') this.save.unlockWeapon(rule.id);
    if (rule.title) { this.save.data.titles = this.save.data.titles || []; if (!this.save.data.titles.includes(rule.title)) this.save.data.titles.push(rule.title); }
    this.save.save();
    return reward;
  }
}
