/* ============================================================
   Boss.js — timed boss with large HP, unique movement, multiple
   attack phases (charge / nova / spiral / summon) and a death
   effect. Hurtable like an enemy (projectiles overlap it).
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';

export class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def, hp, dmg) {
    super(scene, x, y, def.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.maxHP = hp; this.hp = hp;
    this.contactDmg = dmg;
    this.baseSpeed = def.speed;
    this.dead = false;
    this.isBoss = true;

    this.setScale(def.scale);
    if (def.tint) this.setTint(def.tint);
    this.setDepth(DEPTH.ENEMY + 5);
    this.setOrigin(0.5, 0.85);
    this.body.setSize(this.width * 0.6, this.height * 0.55);
    this.body.setOffset(this.width * 0.2, this.height * 0.3);

    this.phaseIdx = 0;
    this.state2 = 'chase';
    this.attackCd = 2600;
    this.chargeT = 0;
    this.chargeVec = new Phaser.Math.Vector2();
    this.hitFlash = 0;
  }

  hurt(amount, fromX, fromY) {
    if (this.dead) return false;
    this.hp -= amount;
    this.hitFlash = 0.06; this.setTintFill(0xffffff);
    this.scene.updateBossBar(this.hp / this.maxHP);
    // Phase transitions by HP fraction.
    const frac = this.hp / this.maxHP;
    while (this.phaseIdx < this.def.phases.length - 1 && frac <= this.def.phases[this.phaseIdx + 1].at) {
      this.phaseIdx += 1;
      this.scene.cameras.main.flash(200, 80, 0, 30);
    }
    if (this.hp <= 0) { this.die(); return true; }
    return false;
  }

  die() {
    if (this.dead) return;
    this.dead = true; this.body.enable = false;
    this.scene.onBossDefeated(this);
    this.scene.tweens.add({ targets: this, scale: this.scale * 1.4, alpha: 0, angle: 40, duration: 700, ease: 'Quad.easeIn', onComplete: () => this.destroy() });
  }

  think(dt, player) {
    if (this.dead) return;
    if (this.hitFlash > 0) { this.hitFlash -= dt; if (this.hitFlash <= 0) { this.clearTint(); if (this.def.tint) this.setTint(this.def.tint); } }

    const px = player.x, py = player.y;
    if (this.state2 === 'charge') {
      this.chargeT -= dt;
      if (this.chargeT <= 0) { this.state2 = 'chase'; this.setVelocity(0, 0); }
      return;
    }

    // Chase.
    const ang = Math.atan2(py - this.y, px - this.x);
    this.setVelocity(Math.cos(ang) * this.baseSpeed, Math.sin(ang) * this.baseSpeed);
    this.setFlipX(px < this.x);

    // Attack timer.
    this.attackCd -= dt * 1000;
    if (this.attackCd <= 0) {
      this.attackCd = Phaser.Math.Between(2200, 3400);
      const set = this.def.phases[this.phaseIdx].attacks;
      const type = Phaser.Utils.Array.GetRandom(set);
      this._attack(type, player);
    }
  }

  _attack(type, player) {
    const scene = this.scene;
    if (type === 'charge') {
      const ang = Math.atan2(player.y - this.y, player.x - this.x);
      this.state2 = 'charge'; this.chargeT = 0.55;
      this.setVelocity(Math.cos(ang) * this.baseSpeed * 5.5, Math.sin(ang) * this.baseSpeed * 5.5);
      scene.sfx?.hitboss();
    } else if (type === 'nova') {
      const n = 16;
      for (let i = 0; i < n; i++) scene.spawnBossHazard(this.x, this.y, (i / n) * Math.PI * 2, this.contactDmg);
      scene.sfx?.explode();
    } else if (type === 'spiral') {
      let step = 0;
      const ev = scene.time.addEvent({ delay: 90, repeat: 11, callback: () => {
        if (this.dead) { ev.remove(); return; }
        for (let k = 0; k < 3; k++) scene.spawnBossHazard(this.x, this.y, step + k * (Math.PI * 2 / 3), this.contactDmg);
        step += 0.5;
      } });
    } else if (type === 'summon') {
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * Math.PI * 2, d = 60;
        scene.spawnMinion(this.x + Math.cos(a) * d, this.y + Math.sin(a) * d);
      }
      scene.sfx?.boss();
    }
  }
}
