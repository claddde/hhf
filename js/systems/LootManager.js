/* ============================================================
   LootManager.js — rolls enemy drops (coins, hearts, keys,
   magnets, buffs, chests) scaled by luck, pools Pickups, and
   resolves collection effects. XP gems stay on the Phase-2 path.
   ============================================================ */

import { CONFIG } from '../config.js';
import { LOOT } from '../data/gamedata.js';
import { Pickup } from '../entities/Pickup.js';

export class LootManager {
  constructor(scene, group, progression) {
    this.scene = scene;
    this.group = group;
    this.prog = progression;
    this.keys = 0;
  }

  /** Roll drops for a slain enemy at (x,y). */
  roll(x, y, luck = 0, bonus = 1) {
    for (const d of LOOT.drops) {
      const chance = d.chance * (1 + luck) * bonus;
      if (Math.random() < chance) {
        if (d.type === 'coin') this.spawn('coin', x, y, Phaser.Math.Between(d.min, d.max));
        else this.spawn(d.type, x, y, 1);
      }
    }
  }

  spawn(kind, x, y, value = 1) {
    let p = this.group.getFirstDead(false);
    if (!p) { p = new Pickup(this.scene, x, y); this.group.add(p); }
    p.spawn(kind, x + Phaser.Math.Between(-6, 6), y + Phaser.Math.Between(-6, 6), value);
    return p;
  }

  update(dt, px, py, magnet) {
    this.group.children.iterate((p) => { if (p && p.active) p.seek(px, py, magnet, dt); });
  }

  /** Resolve a collected pickup. Returns a label for HUD/toast if any. */
  collect(p) {
    const scene = this.scene, prog = this.prog, kind = p.kind, val = p.value;
    p.collect();
    switch (kind) {
      case 'coin': {
        const g = prog.addCoins(val * CONFIG.phase3.coinValue);
        scene.sfx?.coin(); scene.vfx.pickup(p.x, p.y, 0xf2c033);
        scene.floatText(px2(p), py2(p), '+' + g, '#f2c033'); break;
      }
      case 'heart': {
        prog.stats.healQueued += 0; // handled directly:
        scene.playerHP = Math.min(prog.stats.maxHP, scene.playerHP + CONFIG.phase3.healAmount);
        scene.sfx?.heal(); scene.vfx.pickup(p.x, p.y, 0xe0405f);
        scene.floatText(px2(p), py2(p), '+' + CONFIG.phase3.healAmount + 'HP', '#e0405f'); break;
      }
      case 'key': {
        this.keys += 1; prog.addCoins(3); scene.sfx?.coin();
        scene.floatText(px2(p), py2(p), 'KEY', '#f2d16b'); break;
      }
      case 'magnet': {
        scene.vacuumAll(); scene.sfx?.rare(); scene.vfx.pickup(p.x, p.y, 0xc0303a);
        scene.floatText(px2(p), py2(p), 'MAGNET', '#ff8a8a'); break;
      }
      case 'buff': {
        const b = Phaser.Utils.Array.GetRandom(LOOT.buffs);
        scene.applyBuff(b); scene.sfx?.rare();
        scene.floatText(px2(p), py2(p), b.name.toUpperCase(), '#b98cff'); break;
      }
      case 'chest': {
        scene.openChest(); break;
      }
    }
  }
}

function px2(p) { return p.x; }
function py2(p) { return p.y - 14; }
