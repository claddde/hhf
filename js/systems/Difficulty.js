/* ============================================================
   Difficulty.js — PHASE 7.5 dynamic difficulty director.
   A single `index` rises with time survived and boss kills. Every
   dangerous system reads its multipliers from here so the world
   gets steadily — and fairly — more threatening: tougher, faster,
   smarter enemies, more elites, and periodic mini-boss waves.
   Purely additive; nothing here changes existing balance at index 0.
   ============================================================ */

import { CONFIG } from '../config.js';
import { REGIONS } from '../data/maps.js';

export class Difficulty {
  constructor(scene) {
    this.scene = scene;
    this.d = CONFIG.difficulty;
    this.index = 0;          // grows over the run
    this.elapsed = 0;        // seconds
    this.bossKills = 0;
    this._miniAcc = 0;       // mini-boss wave timer

    // PHASE 7.5: baseline difficulty from the REGION + persistent WORLD LEVEL.
    // Regional tier makes each area's danger match its recommended band;
    // world level lifts the whole universe so early regions stay relevant.
    const reg = REGIONS[scene.regionId];
    this.regionTier = reg ? (reg.tier || 0) : 0;
    const world = window.HOODLUST && window.HOODLUST.worldState;
    this.worldLevel = world ? world.worldLevel : 1;
    // Static floor added to the live index: region tier + a gentle world-level ramp.
    this.baseIndex = this.regionTier * this.d.regionTierWeight + (this.worldLevel - 1) * this.d.worldLevelWeight;
  }

  update(dt) {
    this.elapsed += dt;
    // Live index = region/world baseline + time survived + boss kills.
    this.index = this.baseIndex
      + (this.elapsed / 60) * this.d.perMinute
      + this.bossKills * this.d.perBossKill;
    this._miniAcc += dt;
  }

  onBossKilled() { this.bossKills += 1; }

  // ---- multipliers read by Spawner / Enemy ----
  hpMult()    { return 1 + this.index * this.d.hpPerIndex; }
  speedMult() { return Math.min(this.d.speedCap, 1 + this.index * this.d.speedPerIndex); }
  dmgMult()   { return Math.min(this.d.dmgCap, 1 + this.index * this.d.dmgPerIndex); }
  isSmart()   { return this.index >= this.d.intelAt; }        // predictive aim
  eliteChance() {
    const e = CONFIG.enemies.elite;
    return Math.min(e.maxChance, e.baseChance + this.index * this.d.elitePerIndex);
  }

  /** How "unlocked" the roster is — types with `after <= tier` may spawn. */
  tier() { return Math.floor(this.index); }

  /** True once, each time a mini-boss wave is due. */
  miniBossDue() {
    if (this.index < this.d.miniBossAfterIndex) return false;
    if (this._miniAcc >= this.d.miniBossEvery) { this._miniAcc = 0; return true; }
    return false;
  }

  /** Loot-quality / rare-drop bonus from world level (older regions scale up). */
  lootMult() { return 1 + (this.worldLevel - 1) * (this.d.lootPerWorldLevel || 0.03); }

  /** Short label for the HUD. */
  label() {
    const i = this.index;
    if (i < 2) return 'Calm';
    if (i < 4) return 'Rising';
    if (i < 7) return 'Dangerous';
    if (i < 11) return 'Deadly';
    if (i < 18) return 'Nightmare';
    if (i < 26) return 'Chaos';
    return 'Inferno';
  }
}
