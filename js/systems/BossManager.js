/* ============================================================
   BossManager.js — schedules bosses on a timer, shows the Win95
   boss-warning dialog, spawns the boss (HP/damage scaling with
   count), drives the top-of-screen boss health bar, and handles
   rewards on defeat.
   ============================================================ */

import { CONFIG } from '../config.js';
import { BOSSES } from '../data/gamedata.js';
import { Boss } from '../entities/Boss.js';

export class BossManager {
  constructor(scene) {
    this.scene = scene;
    this.p3 = CONFIG.phase3;
    this.nextAt = this.p3.bossFirstSec;
    this.spawnedCount = 0;
    this.active = null;
    this.warned = false;
  }

  update(dt, elapsed, player) {
    if (this.active) {
      if (!this.active.active || this.active.dead) this.active = null;
      else this.active.think(dt, player);
      return;
    }

    if (elapsed >= this.nextAt - this.p3.bossWarnSec && !this.warned) {
      this.warned = true;
      const def = BOSSES[Math.min(this.spawnedCount, BOSSES.length - 1)];
      this.scene.ui.windows.showBossWarning(def.name);
      this.scene.sfx?.boss();
    }
    if (elapsed >= this.nextAt) {
      this._spawn(player);
      this.nextAt = elapsed + this.p3.bossIntervalSec;
      this.warned = false;
    }
  }

  _spawn(player) {
    const def = BOSSES[Math.min(this.spawnedCount, BOSSES.length - 1)];
    const growth = 1 + this.spawnedCount * this.p3.bossHpGrowth;
    const hp = Math.round(def.hp * growth * (1 + this.spawnedCount * 0.15));
    const dmg = Math.round(def.dmg * (1 + this.spawnedCount * this.p3.bossDmgGrowth));

    // Spawn just off-screen, then it charges in.
    const cam = this.scene.cameras.main;
    const ang = Math.random() * Math.PI * 2;
    const dist = Math.hypot(cam.width, cam.height) / 2 + 120;
    const x = Phaser.Math.Clamp(player.x + Math.cos(ang) * dist, 40, CONFIG.world.width - 40);
    const y = Phaser.Math.Clamp(player.y + Math.sin(ang) * dist, 40, CONFIG.world.height - 40);

    this.active = new Boss(this.scene, x, y, def, hp, dmg);
    this.scene.bossGroup.add(this.active);
    this.spawnedCount += 1;
    this.scene.showBossBar(def.name);
    this.scene.updateBossBar(1);
  }

  reset() { if (this.active) { this.active.destroy(); this.active = null; } }
}
