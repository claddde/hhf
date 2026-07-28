/* ============================================================
   Enemy.js — placeholder-sprite enemies with a behaviour-driven AI
   (PHASE 7.5). Types declare a `behavior`; think() branches on it:
   chase, exploder, ranged, invisible, teleport, healer, buffer,
   summoner, shielded. Any spawn may be promoted to a buffed ELITE.
   Stats scale off the run's Difficulty director. Earlier phases
   (seek/separate/knockback/die) are preserved.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, typeKey) {
    const def = CONFIG.enemies.types[typeKey];
    super(scene, x, y, def.key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.ENEMY);
    this.setOrigin(0.5, 0.9);
    this.setCollideWorldBounds(false);
    this.applyType(typeKey, x, y);
  }

  /** (Re)initialise this enemy for a given type — used by the pool + spawner. */
  applyType(typeKey, x, y, { elite = false } = {}) {
    const def = CONFIG.enemies.types[typeKey];
    const diff = this.scene.difficulty;
    const hpMult = diff ? diff.hpMult() : (this.scene.enemyHpMult || 1);
    const spdMult = diff ? diff.speedMult() : 1;
    const dmgMult = diff ? diff.dmgMult() : 1;

    this.typeKey = typeKey;
    this.def = def;
    this.behavior = def.behavior || 'chase';
    this.setTexture(def.key);

    // Elite promotion (random, difficulty-gated) OR a type that is always elite.
    this.isElite = elite || !!def.elite;
    const E = CONFIG.enemies.elite;
    const em = this.isElite && !def.elite ? E : null;

    this.maxHP = def.hp * hpMult * (em ? em.hpMult : 1);
    this.hp = this.maxHP;
    this.speed = def.speed * spdMult * (em ? em.speedMult : 1);
    this.baseSpeed = this.speed;
    this.contactDmg = def.dmg * dmgMult * (em ? em.dmgMult : 1);
    this.xpValue = def.xp * (em ? em.xpMult : 1);

    // Visuals: base type tint, or an elite colour + slight upscale.
    const scale = def.scale * (em ? em.scaleMult : 1);
    this.setScale(scale).setAlpha(1).clearTint();
    if (em) this.setTint(Phaser.Utils.Array.GetRandom(E.tints));
    else if (def.tint) this.setTint(def.tint);

    // Body sized per type.
    const r = def.radius * (em ? em.scaleMult : 1);
    this.body.setSize(r * 2, r * 2);
    this.body.setOffset(this.width / 2 - r, this.height * 0.9 - r * 2);

    // Behaviour state.
    this.knockT = 0; this.hitFlash = 0; this.dead = false;
    this._cd = Math.random() * 1.2;     // generic ability cooldown
    this._fuse = -1;                    // exploder fuse
    this._buffedT = 0;                  // speed-buff-from-warlock timer
    this.shieldHits = def.behavior === 'shielded' ? (def.shieldHits || 3) : 0;
    this._shieldRing = null;
    this._auraT = 0;
    return this;
  }

  hurt(amount, fromX, fromY) {
    if (this.dead) return false;

    // Shielded: absorb whole hits until the shield breaks (chip damage only).
    if (this.shieldHits > 0) {
      this.shieldHits -= 1;
      this.hp -= amount * 0.15;
      this._flash(0x8ff0d0);
      if (this.shieldHits <= 0) this.clearTint();
      if (this.hp > 0) return false;
    }

    this.hp -= amount;
    this._flash(0xffffff);

    const ang = Math.atan2(this.y - fromY, this.x - fromX);
    const k = CONFIG.enemies.knockback / (this.isElite ? 2.4 : 1) / (this.behavior === 'chase' ? 1 : 1.3);
    this.setVelocity(Math.cos(ang) * k, Math.sin(ang) * k);
    this.knockT = 0.14;

    if (this.hp <= 0) { this.die(); return true; }
    return false;
  }

  _flash(color) { this.hitFlash = 0.09; this.setTintFill(color); }

  die() {
    if (this.dead) return;
    this.dead = true;
    this.body.enable = false;

    // Exploders detonate on death: AoE burst around them.
    if (this.behavior === 'exploder') this.scene.enemyExplode?.(this.x, this.y, this.def.explodeR, this.def.explodeDmg);

    this.scene.events.emit('enemy-died', this);

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

    if (this.hitFlash > 0) { this.hitFlash -= dt; if (this.hitFlash <= 0) { this.clearTint(); if (this.def.tint && this.shieldHits <= 0) this.setTint(this.def.tint); } }
    if (this.knockT > 0) { this.knockT -= dt; return; }

    // Temporary speed buff granted by a nearby warlock.
    const spd = this.speed * (this._buffedT > 0 ? 1.4 : 1);
    if (this._buffedT > 0) this._buffedT -= dt;
    this._cd -= dt;

    switch (this.behavior) {
      case 'ranged':    this._thinkRanged(dt, px, py, sep, spd); break;
      case 'exploder':  this._thinkExploder(dt, px, py, sep, spd); break;
      case 'invisible': this._thinkInvisible(dt, px, py, sep, spd); break;
      case 'teleport':  this._thinkTeleport(dt, px, py, sep, spd); break;
      case 'healer':    this._thinkAura(dt, px, py, sep, spd, 'heal'); break;
      case 'buffer':    this._thinkAura(dt, px, py, sep, spd, 'buff'); break;
      case 'summoner':  this._thinkSummoner(dt, px, py, sep, spd); break;
      default:          this._chase(px, py, sep, spd); break;
    }
  }

  // ---- steering helpers ----
  _aim(px, py) {
    // Smarter AI leads the target using the player's velocity.
    const smart = this.scene.difficulty && this.scene.difficulty.isSmart();
    const pl = this.scene.player;
    if (smart && pl && pl.body) {
      const d = Math.hypot(px - this.x, py - this.y);
      const t = Math.min(0.5, d / (this.speed + 1));
      return { x: px + pl.body.velocity.x * t, y: py + pl.body.velocity.y * t };
    }
    return { x: px, y: py };
  }
  _chase(px, py, sep, spd) {
    const a = this._aim(px, py);
    const ang = Math.atan2(a.y - this.y, a.x - this.x);
    const vx = Math.cos(ang) * spd + sep.x, vy = Math.sin(ang) * spd + sep.y;
    this.setVelocity(vx, vy);
    this._face(vx);
  }
  _face(vx) { if (vx < -2) this.setFlipX(true); else if (vx > 2) this.setFlipX(false); }

  // ---- behaviours ----
  _thinkRanged(dt, px, py, sep, spd) {
    const d = Math.hypot(px - this.x, py - this.y);
    const keep = this.def.keepDist || 220;
    let ang = Math.atan2(py - this.y, px - this.x);
    if (d < keep * 0.8) ang += Math.PI;                 // back away (kiting)
    else if (d < keep) { this.setVelocity(sep.x, sep.y); }  // hold ground
    if (d < keep * 0.8 || d > keep) { const vx = Math.cos(ang) * spd * 0.7 + sep.x, vy = Math.sin(ang) * spd * 0.7 + sep.y; this.setVelocity(vx, vy); this._face(px - this.x); }
    if (this._cd <= 0 && d < keep * 1.6) {
      this._cd = this.def.shootCd || 1.7;
      const a = this._aim(px, py);
      this.scene.spawnEnemyBullet?.(this.x, this.y - 8, a.x, a.y, this.def.bulletSpd || 240, this.def.bulletDmg || 10, this.getTint?.());
    }
  }

  _thinkExploder(dt, px, py, sep, spd) {
    const d = Math.hypot(px - this.x, py - this.y);
    if (this._fuse < 0 && d < (this.def.explodeR || 90) * 0.55) { this._fuse = 0.55; }  // arm
    if (this._fuse >= 0) {
      this._fuse -= dt;
      // Blink faster as the fuse burns down.
      this.setTintFill((Math.floor(this._fuse * 12) % 2) ? 0xffffff : 0xff5a2a);
      this._chase(px, py, sep, spd * 1.15);
      if (this._fuse <= 0) this.die();
      return;
    }
    this._chase(px, py, sep, spd);
  }

  _thinkInvisible(dt, px, py, sep, spd) {
    const d = Math.hypot(px - this.x, py - this.y);
    const reveal = this.def.revealDist || 150;
    this.setAlpha(d < reveal ? 0.9 : 0.16);
    this._chase(px, py, sep, spd);
  }

  _thinkTeleport(dt, px, py, sep, spd) {
    this._chase(px, py, sep, spd * 0.7);
    if (this._cd <= 0) {
      this._cd = this.def.blinkCd || 3.2;
      const range = this.def.blinkRange || 220;
      const ang = Math.random() * Math.PI * 2, r = range * (0.55 + Math.random() * 0.45);
      const nx = Phaser.Math.Clamp(px + Math.cos(ang) * r, 20, CONFIG.world.width - 20);
      const ny = Phaser.Math.Clamp(py + Math.sin(ang) * r, 20, CONFIG.world.height - 20);
      this.scene.vfx?.hit(this.x, this.y, false);
      this.setPosition(nx, ny);
      this.scene.vfx?.hit(nx, ny, false);
    }
  }

  _thinkAura(dt, px, py, sep, spd, mode) {
    this._chase(px, py, sep, spd * 0.9);
    this._auraT -= dt;
    if (this._auraT > 0) return;
    this._auraT = 0.5;
    const R = (mode === 'heal' ? this.def.healR : this.def.buffR) || 150, R2 = R * R;
    this.scene.enemies?.children.iterate((o) => {
      if (!o || !o.active || o.dead || o === this) return;
      const dx = o.x - this.x, dy = o.y - this.y;
      if (dx * dx + dy * dy > R2) return;
      if (mode === 'heal') { o.hp = Math.min(o.maxHP, o.hp + (this.def.healRate || 10) * 0.5); }
      else { o._buffedT = 0.8; }
    });
  }

  _thinkSummoner(dt, px, py, sep, spd) {
    this._chase(px, py, sep, spd * 0.8);
    if (this._cd <= 0) {
      this._cd = this.def.summonCd || 4.5;
      this.scene.spawnMinions?.(this.def.summonKey || 'spider', this.def.summonN || 2, this.x, this.y);
    }
  }
}
