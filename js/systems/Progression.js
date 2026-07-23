/* ============================================================
   Progression.js — run stats, XP/levels, coins, global modifier
   bag (mods) used by Phase-3 weapons, and active temp buffs.
   Phase-2 field names in `stats` are preserved so the Phase-2
   auto-attack (WeaponSystem = Rose Bolt) keeps working untouched.
   ============================================================ */

import { CONFIG } from '../config.js';

export class Progression {
  constructor(save = null) {
    const w = CONFIG.weapon, s = CONFIG.survival;

    // --- Phase 2 stat bag (Rose Bolt + survival). DO NOT rename. ---
    this.stats = {
      damage: w.damage, cooldownMs: w.cooldownMs,
      critChance: w.critChance, critMult: w.critMult,
      projSpeed: w.projSpeed, projSize: w.projSize, projCount: w.projCount,
      projLifeMs: w.projLifeMs, pierce: w.pierce, range: w.range,
      moveMult: 1, magnet: s.baseMagnet, maxHP: s.maxHP, regen: 0, healQueued: 0,
    };

    // --- Phase 3 global modifier bag (extra weapons read these) ---
    this.mods = {
      dmgMult: 1, cdMult: 1, projCountAdd: 0, critChanceAdd: 0, critDmgAdd: 0,
      pierceAdd: 0, projSpeedMult: 1, projSizeMult: 1, lifeSteal: 0, luck: 0, magnetMult: 1,
    };

    this.level = 1; this.xp = 0; this.xpToNext = CONFIG.level.baseXP;
    this.kills = 0; this.coins = 0; this.chests = 0; this.bosses = 0;
    this.roseLevel = 1;
    this.buffs = [];           // active temp buffs: {id,name,t,...}
    this.buffDmg = 1; this.buffMove = 1; this.buffCdMult = 1;
    this.coinGain = 1;         // permanent coin multiplier (shop)
    this.revives = 0;
    this.passivesTaken = {};   // id -> count (for inventory display)

    if (save) this._applyPermanent(save);
  }

  /** Apply permanent shop upgrades bought with coins. */
  _applyPermanent(save) {
    const lv = save.perm || {};
    this.stats.maxHP += (lv.hp || 0) * 15;
    this.mods.dmgMult *= 1 + (lv.dmg || 0) * 0.06;
    this.stats.damage *= 1 + (lv.dmg || 0) * 0.06;
    this.stats.moveMult *= 1 + (lv.speed || 0) * 0.04;
    this.mods.luck += (lv.luck || 0) * 0.10;
    this.stats.magnet *= 1 + (lv.magnet || 0) * 0.12;
    this.coinGain += (lv.greed || 0) * 0.10;
    this.revives = lv.revive || 0;
  }

  addCoins(n) { const g = Math.round(n * this.coinGain); this.coins += g; return g; }

  _gainCore(v) {
    this.xp += v; let ups = 0;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext; this.level += 1;
      this.xpToNext = Math.round(this.xpToNext * CONFIG.level.growth); ups += 1;
    }
    return ups;
  }

  totalLuck() { return this.mods.luck; }
}
