/* ============================================================
   Spawner.js — spawns enemies in a ring JUST outside the visible
   camera (never on-screen, never beside the player). PHASE 7.5:
   spawn rate, roster and toughness all follow the Difficulty
   director — variety types unlock by tier, any spawn may roll into
   an ELITE, and periodic mini-boss waves drop an elite pack.
   ============================================================ */

import { CONFIG } from '../config.js';
import { Enemy } from '../entities/Enemy.js';

export class Spawner {
  constructor(scene, group) {
    this.scene = scene;
    this.group = group;
    this.acc = 0;
    this.elapsed = 0;
  }

  /** Types whose `after` tier is unlocked at the current difficulty. */
  _pickType() {
    // PHASE 7.5: biome regions spawn ONLY their exclusive roster.
    const roster = this.scene.regionEnemies;
    if (roster && roster.length) return Phaser.Utils.Array.GetRandom(roster);

    const tier = this.scene.difficulty ? this.scene.difficulty.tier() : 99;
    const pool = [];
    for (const key in CONFIG.enemies.types) {
      const t = CONFIG.enemies.types[key];
      if (t.elite) continue;                 // baseline-elite type comes via elite roll/mini-boss
      if ((t.after || 0) > tier) continue;
      for (let i = 0; i < t.weight; i++) pool.push(key);
    }
    return pool.length ? Phaser.Utils.Array.GetRandom(pool) : 'bat';
  }

  _interval() {
    const s = CONFIG.spawn;
    const t = Math.min(1, this.elapsed / s.rampSeconds);
    return Phaser.Math.Linear(s.baseIntervalMs, s.minIntervalMs, t);
  }

  update(delta, px, py) {
    this.elapsed += delta / 1000;
    // Legacy field kept in sync for anything still reading it.
    this.scene.enemyHpMult = this.scene.difficulty ? this.scene.difficulty.hpMult() : 1;

    // Mini-boss wave: a tight pack of elites drops around the player.
    if (this.scene.difficulty && this.scene.difficulty.miniBossDue()) this._miniBossWave(px, py);

    this.acc += delta;
    const interval = this._interval();
    while (this.acc >= interval) { this.acc -= interval; this._spawnOne(px, py); }
  }

  /** Off-screen ring point around (px,py), clamped to world bounds. */
  _ringPoint(px, py) {
    const s = CONFIG.spawn, cam = this.scene.cameras.main;
    const halfView = Math.hypot(cam.width, cam.height) / (2 * cam.zoom);
    const dist = halfView + Phaser.Math.Between(s.ringMin, s.ringMax);
    const ang = Math.random() * Math.PI * 2;
    return {
      x: Phaser.Math.Clamp(px + Math.cos(ang) * dist, 20, CONFIG.world.width - 20),
      y: Phaser.Math.Clamp(py + Math.sin(ang) * dist, 20, CONFIG.world.height - 20),
    };
  }

  /** Spawn/recycle one enemy of `key` at (x,y), optionally forced elite. */
  spawnAt(key, x, y, elite = false) {
    let e = this.group.getFirstDead(false);
    if (e) { e.enableBody(true, x, y, true, true); e.applyType(key, x, y, { elite }); }
    else { e = new Enemy(this.scene, x, y, key); if (elite) e.applyType(key, x, y, { elite: true }); this.group.add(e); }
    return e;
  }

  _spawnOne(px, py) {
    if (this.countAlive() >= CONFIG.spawn.maxAlive) return;
    const p = this._ringPoint(px, py);
    const key = this._pickType();
    const elite = Math.random() < (this.scene.difficulty ? this.scene.difficulty.eliteChance() : 0);
    this.spawnAt(key, p.x, p.y, elite);
  }

  /** Minions summoned by a summoner enemy (spawn beside it, on-screen OK). */
  spawnMinions(key, n, x, y) {
    for (let i = 0; i < n; i++) {
      if (this.countAlive() >= CONFIG.spawn.maxAlive) return;
      const ang = Math.random() * Math.PI * 2, r = 24 + Math.random() * 30;
      this.spawnAt(key,
        Phaser.Math.Clamp(x + Math.cos(ang) * r, 20, CONFIG.world.width - 20),
        Phaser.Math.Clamp(y + Math.sin(ang) * r, 20, CONFIG.world.height - 20));
    }
  }

  /** A mini-boss wave: 3–5 elites in a ring — a real spike the player must react to. */
  _miniBossWave(px, py) {
    const n = 3 + Math.floor(Math.random() * 3);
    const roster = this.scene.regionEnemies;
    const tier = this.scene.difficulty ? this.scene.difficulty.tier() : 0;
    const key = roster && roster.length ? roster[0] : (tier >= 4 ? 'tank' : 'shadow');
    for (let i = 0; i < n; i++) { const p = this._ringPoint(px, py); this.spawnAt(key, p.x, p.y, true); }
    this.scene.onMiniBossWave?.();
  }

  countAlive() {
    let n = 0;
    this.group.children.iterate((e) => { if (e && e.active && !e.dead) n++; });
    return n;
  }
}
