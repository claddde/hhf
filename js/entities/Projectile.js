/* ============================================================
   Projectile.js — the auto-attack "rose bolt". Pooled via the
   scene's projectile group. Carries damage/crit info, a lifetime
   and a pierce counter.
   ============================================================ */

import { DEPTH } from '../config.js';

export class Projectile extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'bolt');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.PROJ);
    this.body.setAllowGravity(false);
    this.setActive(false).setVisible(false);
    this.hitSet = new Set(); // enemies already struck (for pierce)
  }

  fire(x, y, angle, stats) {
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.setScale(stats.projSize);
    this.setRotation(angle);
    this.damage = stats.damage;
    this.crit = Math.random() < stats.critChance;
    if (this.crit) this.damage *= stats.critMult;
    this.pierceLeft = stats.pierce;
    this.hitSet.clear();
    this.setVelocity(Math.cos(angle) * stats.projSpeed, Math.sin(angle) * stats.projSpeed);
    this.life = stats.projLifeMs;
  }

  update(dt) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) this.kill();
  }

  kill() {
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
  }
}
