/* ============================================================
   Ambient.js — friendly, non-combat life that makes the world
   feel alive: butterflies, fireflies, birds, a wandering cat and
   a floating ghost pet. Purely decorative — no collision, no
   gameplay effect. Spawns from the map's creature list.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';

export class Ambient {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.things = [];
    this._t = 0;
  }

  build() {
    const list = this.map.creatures || [];
    // Duplicate the list a couple of times for a lively density.
    const spawn = [...list, ...list];
    for (const kind of spawn) this._spawn(kind);
  }

  _spawn(kind) {
    const s = this.scene, W = CONFIG.world.width, H = CONFIG.world.height;
    const x = 100 + Math.random() * (W - 200);
    const y = 100 + Math.random() * (H - 200);
    let spr;

    if (kind === 'firefly') {
      spr = s.add.image(x, y, 'glow').setTint(0xfff2a0).setBlendMode('ADD').setScale(0.35).setAlpha(0.8);
      spr._kind = 'firefly';
    } else if (kind === 'butterfly') {
      spr = s.add.image(x, y, 'butterfly0'); spr._kind = 'butterfly'; spr._frame = 0; spr._ft = 0;
    } else if (kind === 'bird') {
      spr = s.add.image(x, y, 'bird0'); spr._kind = 'bird'; spr._frame = 0; spr._ft = 0;
    } else if (kind === 'cat') {
      spr = s.add.image(x, y, 'cat'); spr._kind = 'cat';
    } else if (kind === 'ghostpet') {
      spr = s.add.image(x, y, 'ghostpet').setAlpha(0.75); spr._kind = 'ghostpet';
    } else return;

    spr.setDepth(kind === 'firefly' ? DEPTH.FX - 1 : y);
    spr._ang = Math.random() * Math.PI * 2;
    spr._spd = kind === 'bird' ? 60 : kind === 'cat' ? 24 : 34;
    spr._turn = 0;
    spr._bob = Math.random() * Math.PI * 2;
    this.things.push(spr);
  }

  update(dt) {
    this._t += dt;
    const W = CONFIG.world.width, H = CONFIG.world.height;
    for (const o of this.things) {
      // Wander: slowly steer the heading.
      o._turn -= dt;
      if (o._turn <= 0) { o._turn = 0.6 + Math.random() * 1.4; o._ang += (Math.random() - 0.5) * 1.6; }
      o.x += Math.cos(o._ang) * o._spd * dt;
      o.y += Math.sin(o._ang) * o._spd * dt;
      // Bounce off world edges.
      if (o.x < 40 || o.x > W - 40) { o._ang = Math.PI - o._ang; o.x = Phaser.Math.Clamp(o.x, 40, W - 40); }
      if (o.y < 40 || o.y > H - 40) { o._ang = -o._ang; o.y = Phaser.Math.Clamp(o.y, 40, H - 40); }

      if (o._kind === 'firefly') {
        o._bob += dt * 3;
        o.setAlpha(0.5 + Math.sin(o._bob) * 0.4);
      } else if (o._kind === 'butterfly' || o._kind === 'bird') {
        o._ft += dt;
        if (o._ft > 0.14) { o._ft = 0; o._frame ^= 1; o.setTexture(o._kind + o._frame); }
        o.setFlipX(Math.cos(o._ang) < 0);
        if (o._kind !== 'firefly') o.setDepth(o.y);
      } else {
        o.setFlipX(Math.cos(o._ang) < 0);
        o.setDepth(o.y);
        o._bob += dt * 2;
        if (o._kind === 'ghostpet') o.y += Math.sin(o._bob) * 0.2;
      }
    }
  }

  destroy() { this.things.forEach(o => o.destroy()); this.things = []; }
}
