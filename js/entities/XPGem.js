/* ============================================================
   XPGem.js — dropped on enemy death. Pulled toward the player
   inside the magnet radius; collected on touch.
   ============================================================ */

import { DEPTH } from '../config.js';

export class XPGem extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'gem');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.GEM);
    this.body.setAllowGravity(false);
    this.setActive(false).setVisible(false);
    this.value = 1;
  }

  spawn(x, y, value) {
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true);
    this.value = value;
    this.setScale(value >= 4 ? 1.4 : 1);
    this.setTint(value >= 8 ? 0xf2d16b : value >= 4 ? 0xb98cff : 0xffffff);
    this._bob = Math.random() * Math.PI * 2;
    // little pop when spawned
    this.scene.tweens.add({ targets: this, scaleX: this.scaleX * 1.4, yoyo: true, duration: 120 });
  }

  /** Home toward the player when within magnet range. */
  seek(px, py, magnet, dt) {
    if (!this.active) return;
    const d = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    if (d < magnet) {
      const ang = Math.atan2(py - this.y, px - this.x);
      const pull = Phaser.Math.Linear(90, 420, 1 - d / magnet);
      this.setVelocity(Math.cos(ang) * pull, Math.sin(ang) * pull);
    } else {
      this.setVelocity(0, 0);
      this._bob += dt * 4;
      this.y += Math.sin(this._bob) * 0.15;
    }
  }

  collect() {
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
    this.clearTint();
  }
}
