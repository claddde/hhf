/* ============================================================
   Pickup.js — a generic dropped item (coin / heart / key /
   magnet / buff / chest). Coins & keys are magnet-attracted;
   the rest are collected on touch. Chests open on touch.
   ============================================================ */

import { DEPTH } from '../config.js';

const TEX = { coin: 'coin', heart: 'heart', key: 'key', magnet: 'magnet', buff: 'buff', chest: 'chest' };

export class Pickup extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'coin');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.setDepth(DEPTH.GEM);
    this.setActive(false).setVisible(false);
  }

  spawn(kind, x, y, value = 1) {
    this.kind = kind; this.value = value;
    this.setTexture(TEX[kind] || 'coin');
    this.enableBody(true, x, y, true, true);
    this.setActive(true).setVisible(true).setScale(kind === 'chest' ? 1.2 : 1).clearTint();
    this.magnetic = (kind === 'coin' || kind === 'key');
    this._bob = Math.random() * Math.PI * 2;
    // little spawn hop
    this.setVelocity(Phaser.Math.Between(-40, 40), Phaser.Math.Between(-70, -30));
    this.scene.tweens.add({ targets: this, scaleX: this.scaleX * 1.3, yoyo: true, duration: 120 });
  }

  seek(px, py, magnet, dt) {
    if (!this.active) return;
    if (this.magnetic) {
      const d = Phaser.Math.Distance.Between(this.x, this.y, px, py);
      if (d < magnet) {
        const ang = Math.atan2(py - this.y, px - this.x);
        const pull = Phaser.Math.Linear(120, 460, 1 - d / magnet);
        this.setVelocity(Math.cos(ang) * pull, Math.sin(ang) * pull);
        return;
      }
    }
    // settle + bob
    this.setVelocity(this.body.velocity.x * 0.9, this.body.velocity.y * 0.9);
    this._bob += dt * 4;
    this.y += Math.sin(this._bob) * 0.12;
  }

  collect() {
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
  }
}
