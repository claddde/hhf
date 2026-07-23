/* ============================================================
   WeaponManager.js — modular multi-weapon framework (Phase 3).
   Holds the extra weapons (Rose Bolt stays on the untouched
   Phase-2 WeaponSystem). Each weapon has its own stats, level
   and fire pattern; global passives apply via progression.mods.
   Non-projectile hits are dealt through scene.dealHit().
   ============================================================ */

import { WEAPONS, weaponStats } from '../data/gamedata.js';
import { Projectile } from '../entities/Projectile.js';
import { DEPTH } from '../config.js';

export const MAX_SLOTS = 6; // includes Rose Bolt (slot 0)

export class WeaponManager {
  constructor(scene, projGroup, progression) {
    this.scene = scene;
    this.group = projGroup;
    this.prog = progression;
    this.owned = new Map(); // id -> runtime entry
  }

  countAll() { return 1 + this.owned.size; } // +1 for Rose Bolt
  hasSlot() { return this.countAll() < MAX_SLOTS; }
  has(id) { return this.owned.has(id); }

  add(id) {
    if (id === 'rose_bolt' || this.owned.has(id) || !this.hasSlot()) return false;
    const def = WEAPONS[id];
    const e = { def, level: 1, cd: 0, tick: 0, sprites: [], aura: null };
    this._initRuntime(e);
    this.owned.set(id, e);
    return true;
  }

  levelUp(id, amount = 1) {
    const e = this.owned.get(id);
    if (!e) return false;
    e.level = Math.min(e.def.maxLevel, e.level + amount);
    this._initRuntime(e); // rebuild orbit sprite count etc.
    return true;
  }

  /** Weapons list for the inventory (excludes Rose Bolt). */
  list() { return [...this.owned.values()].map(e => ({ id: e.def.id, name: e.def.name, icon: e.def.icon, level: e.level, rarity: e.def.rarity })); }

  // ---- effective stats with global mods + buffs applied ----
  _eff(e) {
    const b = weaponStats(e.def, e.level), m = this.prog.mods, p = this.prog;
    return {
      damage: b.damage * m.dmgMult * p.buffDmg,
      cooldownMs: b.cooldownMs * m.cdMult * p.buffCdMult,
      tickMs: (b.tickMs || 250) * m.cdMult * p.buffCdMult,
      critChance: Math.min(0.95, b.critChance + m.critChanceAdd),
      critMult: b.critMult + m.critDmgAdd,
      projSpeed: b.projSpeed * m.projSpeedMult,
      projSize: b.projSize * m.projSizeMult,
      pierce: b.pierce + m.pierceAdd,
      count: b.count + (this._countBased(e.def.pattern) ? m.projCountAdd : 0),
      range: b.range, life: b.life, arc: b.arc, radius: b.radius,
      orbitR: b.orbitR, orbitSpeed: b.orbitSpeed, knockback: b.knockback || 1,
    };
  }
  _countBased(p) { return p === 'nearest' || p === 'spread' || p === 'nova' || p === 'orbit'; }

  _initRuntime(e) {
    const eff = this._eff(e);
    if (e.def.pattern === 'orbit') {
      // (Re)create orbit sprites to match count.
      e.sprites.forEach(s => s.destroy());
      e.sprites = [];
      for (let i = 0; i < eff.count; i++) {
        const s = this.scene.add.image(0, 0, e.def.texture).setDepth(DEPTH.PROJ).setScale(eff.projSize);
        s.orbA = (i / eff.count) * Math.PI * 2;
        e.sprites.push(s);
      }
    }
    if (e.def.pattern === 'aura' && !e.aura) {
      e.aura = this.scene.add.image(0, 0, e.def.texture).setDepth(DEPTH.FX - 2).setAlpha(0.16).setTint(0x8affc0);
    }
  }

  // ---- per-frame update ----
  update(delta, player, targets) {
    this.owned.forEach((e) => this._runWeapon(e, delta, player, targets));
  }

  _runWeapon(e, delta, player, targets) {
    const eff = this._eff(e);
    const px = player.x, py = player.y;

    switch (e.def.pattern) {
      case 'orbit': {
        e.tick -= delta;
        const doDmg = e.tick <= 0;
        if (doDmg) e.tick = eff.tickMs;
        e.sprites.forEach((s) => {
          s.orbA += (eff.orbitSpeed) * (delta / 1000);
          s.x = px + Math.cos(s.orbA) * eff.orbitR;
          s.y = py + Math.sin(s.orbA) * eff.orbitR;
          s.setScale(eff.projSize).setRotation(s.orbA);
          if (doDmg) this._radialHit(s.x, s.y, 18 * eff.projSize, eff, targets);
        });
        break;
      }
      case 'aura': {
        e.aura.setPosition(px, py);
        e.aura.setDisplaySize(eff.radius * 2, eff.radius * 2);
        e.aura.setAlpha(0.12 + Math.sin(this.scene.time.now / 200) * 0.04);
        e.tick -= delta;
        if (e.tick <= 0) { e.tick = eff.tickMs; this._radialHit(px, py, eff.radius, eff, targets); }
        break;
      }
      case 'melee': {
        e.cd -= delta;
        if (e.cd <= 0) {
          e.cd = eff.cooldownMs;
          const t = this._nearest(px, py, targets, 9999);
          const ang = t ? Math.atan2(t.y - py, t.x - px) : (player.flipX ? Math.PI : 0);
          this._meleeSwing(px, py, ang, eff, e.def.texture, targets);
        }
        break;
      }
      case 'nova': {
        e.cd -= delta;
        if (e.cd <= 0) {
          e.cd = eff.cooldownMs;
          for (let i = 0; i < eff.count; i++) this._shoot(px, py, (i / eff.count) * Math.PI * 2, eff, e.def.texture);
        }
        break;
      }
      case 'spread': {
        e.cd -= delta;
        if (e.cd <= 0) {
          const t = this._nearest(px, py, targets, eff.range);
          if (t) {
            e.cd = eff.cooldownMs;
            const base = Math.atan2(t.y - py, t.x - px);
            const spread = Phaser.Math.DegToRad(e.def.base.spread || 30);
            for (let i = 0; i < eff.count; i++) {
              const off = eff.count === 1 ? 0 : Phaser.Math.Linear(-spread, spread, i / (eff.count - 1));
              this._shoot(px, py, base + off, eff, e.def.texture);
            }
          }
        }
        break;
      }
      default: { // 'nearest'
        e.cd -= delta;
        if (e.cd <= 0) {
          const t = this._nearest(px, py, targets, eff.range);
          if (t) {
            e.cd = eff.cooldownMs;
            const base = Math.atan2(t.y - py, t.x - px);
            const spread = Phaser.Math.DegToRad(10);
            for (let i = 0; i < eff.count; i++) {
              const off = eff.count === 1 ? 0 : Phaser.Math.Linear(-spread, spread, i / (eff.count - 1));
              this._shoot(px, py, base + off, eff, e.def.texture);
            }
          }
        }
      }
    }
  }

  _nearest(x, y, targets, range) {
    let best = null, bestD = range * range;
    for (const t of targets) {
      if (!t || !t.active || t.dead) continue;
      const d = (t.x - x) ** 2 + (t.y - y) ** 2;
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }

  _shoot(x, y, angle, eff, texture) {
    let p = this.group.getFirstDead(false);
    if (!p) { p = new Projectile(this.scene, x, y); this.group.add(p); }
    p.fire(x, y, angle, {
      damage: eff.damage, critChance: eff.critChance, critMult: eff.critMult,
      projSize: eff.projSize, pierce: eff.pierce, projSpeed: eff.projSpeed, projLifeMs: eff.life || 900,
    });
    p.setTexture(texture);
    const now = performance.now();
    if (now - (this._snd || 0) > 90) { this.scene.sfx?.shoot(); this._snd = now; }
  }

  _radialHit(x, y, r, eff, targets) {
    const r2 = r * r;
    for (const t of targets) {
      if (!t || !t.active || t.dead) continue;
      if ((t.x - x) ** 2 + (t.y - y) ** 2 <= r2) {
        const crit = Math.random() < eff.critChance;
        const dmg = eff.damage * (crit ? eff.critMult : 1);
        this.scene.dealHit(t, dmg, crit, x, y);
      }
    }
  }

  _meleeSwing(x, y, ang, eff, texture, targets) {
    // Visual sweep.
    const s = this.scene.add.image(x, y, texture).setDepth(DEPTH.PROJ).setScale(eff.projSize * 1.6);
    s.setRotation(ang - 1.2);
    this.scene.tweens.add({ targets: s, rotation: ang + 1.2, alpha: 0, duration: eff.life || 220, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
    // Arc damage (once per swing).
    const half = Phaser.Math.DegToRad((eff.arc || 130) / 2);
    const r2 = (eff.range || 120) ** 2;
    for (const t of targets) {
      if (!t || !t.active || t.dead) continue;
      const dx = t.x - x, dy = t.y - y;
      if (dx * dx + dy * dy > r2) continue;
      let da = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - ang));
      if (da <= half) {
        const crit = Math.random() < eff.critChance;
        const dmg = eff.damage * (crit ? eff.critMult : 1);
        this.scene.dealHit(t, dmg, crit, x, y);
      }
    }
  }

  destroyAll() {
    this.owned.forEach((e) => { e.sprites.forEach(s => s.destroy()); if (e.aura) e.aura.destroy(); });
    this.owned.clear();
  }
}
