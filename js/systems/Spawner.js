/* ============================================================
   Spawner.js — continuously spawns enemies in a ring just
   OUTSIDE the visible camera (never on-screen, never beside the
   player). Difficulty ramps: faster spawns + tougher enemies
   over time; elites join after a threshold.
   ============================================================ */

import { CONFIG } from '../config.js';
import { Enemy } from '../entities/Enemy.js';

export class Spawner {
  constructor(scene, group) {
    this.scene = scene;
    this.group = group;
    this.acc = 0;              // ms accumulator
    this.elapsed = 0;          // seconds survived
    this._weighted = this._buildWeights();
  }

  _buildWeights() {
    const list = [];
    for (const key in CONFIG.enemies.types) {
      const t = CONFIG.enemies.types[key];
      for (let i = 0; i < t.weight; i++) list.push(key);
    }
    return list;
  }

  /** Current spawn interval, shrinking toward minInterval. */
  _interval() {
    const s = CONFIG.spawn;
    const t = Math.min(1, this.elapsed / s.rampSeconds);
    return Phaser.Math.Linear(s.baseIntervalMs, s.minIntervalMs, t);
  }

  update(delta, px, py) {
    this.elapsed += delta / 1000;
    // Enemy HP scales with time (read by Enemy on construction).
    this.scene.enemyHpMult = 1 + (this.elapsed / 60) * CONFIG.spawn.hpGrowthPerMin;

    this.acc += delta;
    const interval = this._interval();
    while (this.acc >= interval) {
      this.acc -= interval;
      this._spawnOne(px, py);
    }
  }

  _pickType() {
    const s = CONFIG.spawn;
    let key = Phaser.Utils.Array.GetRandom(this._weighted);
    // Suppress elites early.
    if (CONFIG.enemies.types[key].elite && this.elapsed < s.eliteAfterSec) {
      key = 'bat';
    }
    return key;
  }

  _spawnOne(px, py) {
    const s = CONFIG.spawn;
    if (this.countAlive() >= s.maxAlive) return;

    const cam = this.scene.cameras.main;
    // Half-diagonal of the view + a random ring offset → always off-screen.
    const halfView = Math.hypot(cam.width, cam.height) / (2 * cam.zoom);
    const dist = halfView + Phaser.Math.Between(s.ringMin, s.ringMax);
    const ang = Math.random() * Math.PI * 2;

    let x = px + Math.cos(ang) * dist;
    let y = py + Math.sin(ang) * dist;
    // Keep inside world bounds (wrap the angle-based point back in).
    x = Phaser.Math.Clamp(x, 20, CONFIG.world.width - 20);
    y = Phaser.Math.Clamp(y, 20, CONFIG.world.height - 20);

    const key = this._pickType();
    let e = this.group.getFirstDead(false);
    if (e) {
      // Reuse a recycled enemy.
      e.typeKey = key; e.def = CONFIG.enemies.types[key];
      e.setTexture(e.def.key);
      e.maxHP = e.def.hp * (this.scene.enemyHpMult || 1);
      e.hp = e.maxHP; e.speed = e.def.speed; e.contactDmg = e.def.dmg;
      e.xpValue = e.def.xp; e.isElite = !!e.def.elite; e.dead = false;
      e.setScale(e.def.scale).setAlpha(1).clearTint();
      e.enableBody(true, x, y, true, true);
    } else {
      e = new Enemy(this.scene, x, y, key);
      e.setScale(e.def.scale);
      this.group.add(e);
    }
  }

  countAlive() {
    let n = 0;
    this.group.children.iterate((e) => { if (e && e.active && !e.dead) n++; });
    return n;
  }
}
