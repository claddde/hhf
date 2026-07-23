/* ============================================================
   WeaponSystem.js — the auto-attack. On a cooldown it finds the
   nearest living enemy in range and fires a fan of rose bolts.
   No attack button; fully automatic.
   ============================================================ */

import { CONFIG } from '../config.js';
import { Projectile } from '../entities/Projectile.js';

export class WeaponSystem {
  constructor(scene, projGroup, progression) {
    this.scene = scene;
    this.group = projGroup;
    this.prog = progression;
    this.cd = 0; // ms until next shot
  }

  update(delta, player, enemyGroup) {
    // Advance live projectiles.
    this.group.children.iterate((p) => { if (p && p.active) p.update(delta); });

    this.cd -= delta;
    if (this.cd > 0) return;

    const target = this._nearestEnemy(player.x, player.y, enemyGroup, this.prog.stats.range);
    if (!target) return; // idle until something is in range

    this._fireVolley(player.x, player.y, target);
    this.cd = this.prog.stats.cooldownMs;
  }

  _nearestEnemy(x, y, group, range) {
    let best = null, bestD = range * range;
    group.children.iterate((e) => {
      if (!e || !e.active || e.dead) return;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    });
    return best;
  }

  _fireVolley(x, y, target) {
    const s = this.prog.stats;
    const base = Math.atan2(target.y - y, target.x - x);
    const n = s.projCount;
    const spread = Phaser.Math.DegToRad(CONFIG.weapon.spreadDeg);

    for (let i = 0; i < n; i++) {
      const offset = n === 1 ? 0 : Phaser.Math.Linear(-spread, spread, i / (n - 1));
      let p = this.group.getFirstDead(false);
      if (!p) { p = new Projectile(this.scene, x, y); this.group.add(p); }
      p.fire(x, y, base + offset, s);
    }
  }
}
