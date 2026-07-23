/* ============================================================
   Enemy.js — placeholder-sprite enemies with simple, robust AI:
   seek the player, separate from neighbours (anti-stick), take
   damage, knockback, and die. Stats come from CONFIG.enemies.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, typeKey) {
    const def = CONFIG.enemies.types[typeKey];
    super(scene, x, y, def.key);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.typeKey = typeKey;
    this.def = def;
    this.maxHP = def.hp * (scene.enemyHpMult || 1);
    this.hp = this.maxHP;
    this.speed = def.speed;
    this.contactDmg = def.dmg;
    this.xpValue = def.xp;
    this.isElite = !!def.elite;

    this.setDepth(DEPTH.ENEMY);
    this.setOrigin(0.5, 0.9);
    // Circular-ish body sized per type.
    const r = def.radius;
    this.body.setSize(r * 2, r * 2);
    this.body.setOffset(this.width / 2 - r, this.height * 0.9 - r * 2);
    this.setCollideWorldBounds(false);

    this.knockT = 0;         // remaining knockback time (s)
    this.hitFlash = 0;       // white-flash timer
    this.dead = false;
  }

  hurt(amount, fromX, fromY) {
    if (this.dead) return false;
    this.hp -= amount;
    this.hitFlash = 0.09;
    this.setTintFill(0xffffff);

    // Knockback impulse away from the source.
    const ang = Math.atan2(this.y - fromY, this.x - fromX);
    const k = CONFIG.enemies.knockback / (this.isElite ? 2.4 : 1);
    this.setVelocity(Math.cos(ang) * k, Math.sin(ang) * k);
    this.knockT = 0.14;

    if (this.hp <= 0) { this.die(); return true; }
    return false;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.body.enable = false;
    this.scene.events.emit('enemy-died', this);

    // Quick squash + fade "death animation", then release.
    this.setTint(0x66203a);
    this.scene.tweens.add({
      targets: this, scaleY: this.scaleY * 0.2, scaleX: this.scaleX * 1.3,
      alpha: 0, duration: 180, ease: 'Quad.easeIn',
      onComplete: () => this.recycle(),
    });
  }

  recycle() {
    this.disableBody(true, true);
    this.setActive(false).setVisible(false);
    this.clearTint(); this.setAlpha(1);
  }

  /** @param {number} dt seconds @param {Phaser.Math.Vector2} sep separation vector */
  think(dt, px, py, sep) {
    if (this.dead || !this.active) return;

    // Hit flash decay.
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      if (this.hitFlash <= 0) this.clearTint();
    }

    // While knocked back, coast; otherwise steer to the player.
    if (this.knockT > 0) { this.knockT -= dt; return; }

    const ang = Math.atan2(py - this.y, px - this.x);
    let vx = Math.cos(ang) * this.speed + sep.x;
    let vy = Math.sin(ang) * this.speed + sep.y;
    this.setVelocity(vx, vy);

    if (vx < -2) this.setFlipX(true);
    else if (vx > 2) this.setFlipX(false);
  }
}
