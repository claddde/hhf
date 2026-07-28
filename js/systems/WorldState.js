/* ============================================================
   WorldState.js — PHASE 7.5 connected-world progression.
   Tracks which regions the player has DISCOVERED (reached
   physically), the current region, and a World Level that makes
   the whole universe scale as the player advances. Persists to the
   save so discovery + fast-travel destinations are permanent.
   ============================================================ */

import { REGIONS, REGION_IDS, START_REGION, PROGRESSION_ORDER } from '../data/maps.js';

export class WorldState {
  constructor(save) {
    this.save = save;
    const w = save.data.world || {};
    this.discovered = new Set(w.discovered && w.discovered.length ? w.discovered : [START_REGION]);
    // Safe towns are always available as fast-travel destinations.
    for (const id of REGION_IDS) if (REGIONS[id].town) this.discovered.add(id);
    this.current = w.current && REGIONS[w.current] ? w.current : START_REGION;
    this.worldLevel = w.worldLevel || 1;
    this.bossesCleared = new Set(w.bossesCleared || []);
    this._persist();
  }

  _persist() {
    this.save.data.world = {
      discovered: [...this.discovered], current: this.current,
      worldLevel: this.worldLevel, bossesCleared: [...this.bossesCleared],
    };
    this.save.save();
  }

  isDiscovered(id) { return this.discovered.has(id); }

  /** Mark a region found (first physical arrival). Returns true if new. */
  discover(id) {
    if (!REGIONS[id] || this.discovered.has(id)) return false;
    this.discovered.add(id);
    this._persist();
    return true;
  }

  setCurrent(id) { if (REGIONS[id]) { this.current = id; this.discover(id); this._persist(); } }

  /** Regions reachable from the current one (for in-world portals). */
  neighbours(id = this.current) { return (REGIONS[id]?.links || []).map(l => ({ ...l, region: REGIONS[l.to] })); }

  /** World Level rises with regions discovered + bosses cleared + player level. */
  recompute(playerHighestLevel = 1) {
    const lvl = 1 + (this.discovered.size - 1) * 2 + this.bossesCleared.size * 3 + Math.floor(playerHighestLevel / 10);
    if (lvl > this.worldLevel) { this.worldLevel = lvl; this._persist(); }
    return this.worldLevel;
  }

  markBossCleared(regionId) { if (regionId) { this.bossesCleared.add(regionId); this._persist(); } }
  isCleared(id) { return this.bossesCleared.has(id); }

  /** PHASE 7.6 DEMO — sequential map progression. A region is unlocked when it
      is the first in the chain, or the previous chain region's boss is cleared.
      (Safe towns are always unlocked.) */
  isUnlocked(id) {
    if (REGIONS[id] && REGIONS[id].town) return true;
    const i = PROGRESSION_ORDER.indexOf(id);
    if (i <= 0) return true;                       // first region (or not in chain) is open
    return this.bossesCleared.has(PROGRESSION_ORDER[i - 1]);
  }
  /** The next locked region in the chain (for "unlock next" messaging). */
  nextLocked() { return PROGRESSION_ORDER.find(id => !this.isUnlocked(id)) || null; }

  /** Is a region above the player's recommended band? (for the warning). */
  isOverLevel(id, playerLevel) { const r = REGIONS[id]; return r ? playerLevel < r.rec[0] : false; }

  progress() { return { found: this.discovered.size, total: REGION_IDS.length }; }
}
