/* ============================================================
   VFX.js — pixel particle effects: hits, crits, explosions,
   boss death, chest opening, level-up burst, weapon glow.
   Uses the 'spark' / 'smoke' textures loaded in BootScene.
   ============================================================ */

import { DEPTH } from '../config.js';

export class VFX {
  constructor(scene) { this.scene = scene; }

  _burst(x, y, texture, count, { speed = 120, scale = 1, tint = 0xffffff, life = 380, gravity = 0 } = {}) {
    const p = this.scene.add.particles(x, y, texture, {
      speed: { min: speed * 0.4, max: speed },
      angle: { min: 0, max: 360 },
      scale: { start: scale, end: 0 },
      lifespan: life, quantity: count, gravityY: gravity,
      tint, blendMode: 'ADD', emitting: false,
    }).setDepth(DEPTH.FX);
    p.explode(count);
    this.scene.time.delayedCall(life + 60, () => p.destroy());
  }

  hit(x, y, crit) {
    this._burst(x, y, 'spark', crit ? 8 : 4, { speed: crit ? 170 : 110, scale: crit ? 0.9 : 0.6, tint: crit ? 0xf2d16b : 0xffffff, life: 300 });
    if (crit) {
      const t = this.scene.add.text(x, y - 24, 'CRIT!', {
        fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#f2d16b', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(DEPTH.FX);
      this.scene.tweens.add({ targets: t, y: y - 42, alpha: 0, duration: 520, onComplete: () => t.destroy() });
    }
  }

  explode(x, y, tint = 0xff8a3a) {
    this._burst(x, y, 'spark', 12, { speed: 200, scale: 1.1, tint, life: 420 });
    this._burst(x, y, 'smoke', 6, { speed: 70, scale: 1.4, tint: 0x333333, life: 520 });
  }

  bossDeath(x, y) {
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 120, () => this.explode(x + Phaser.Math.Between(-40, 40), y + Phaser.Math.Between(-40, 40), 0xff5a8a));
    }
    this.scene.cameras.main.flash(400, 120, 0, 40);
  }

  chestOpen(x, y) {
    this._burst(x, y, 'spark', 20, { speed: 160, scale: 1.0, tint: 0xf2c033, life: 620 });
  }

  levelup(x, y) {
    this._burst(x, y, 'spark', 16, { speed: 150, scale: 0.9, tint: 0x7fe0ff, life: 520 });
  }

  pickup(x, y, tint) {
    this._burst(x, y, 'spark', 4, { speed: 80, scale: 0.5, tint, life: 240 });
  }
}
