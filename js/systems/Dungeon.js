/* ============================================================
   Dungeon.js — PHASE 7.5 mini-dungeon. A ~5–10 min objective run
   inside a region: randomized enemy waves → a mini-boss → a
   treasure room, then an exit portal home. Reuses the region's
   biome roster + boss art so each dungeon feels native to its
   world, with a random modifier for replayability.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';

const MODIFIERS = [
  { id: 'swarm',   name: 'Elite Swarm',   desc: 'More enemies, more elites', elite: 0.35, count: 1.5, loot: 1.2 },
  { id: 'hoard',   name: 'Treasure Hoard', desc: 'Double loot', elite: 0.1, count: 1.0, loot: 2.2 },
  { id: 'frenzy',  name: 'Blood Frenzy',  desc: 'Faster, fewer, richer', elite: 0.2, count: 0.8, loot: 1.4 },
  { id: 'standard',name: 'Ancient Vault', desc: 'A balanced trial', elite: 0.12, count: 1.0, loot: 1.3 },
];

export class Dungeon {
  constructor(scene) {
    this.scene = scene;
    this.state = 'intro';
    this._t = 0;
    this.wave = 0;
    this.totalWaves = 3 + Math.floor(Math.random() * 3);   // 3–5 waves
    this.mod = Phaser.Utils.Array.GetRandom(MODIFIERS);
    this.rewarded = false;
  }

  build() {
    const s = this.scene;
    this.roster = s.regionEnemies || ['bat', 'spider', 'ghost', 'skeleton'];
    this.banner = s.add.text(s.scale.width / 2, 90, '', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffe08a', align: 'center',
      stroke: '#2a1500', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD);
    this._say(`MINI-DUNGEON\n${this.mod.name} — ${this.mod.desc}`);
    this._t = 2.2;
  }

  _say(msg, hold = 3) { this.banner.setText(msg); this._bannerHold = hold; }

  update(dt) {
    if (this._bannerHold > 0) { this._bannerHold -= dt; if (this._bannerHold <= 0) this.banner.setText(''); }

    switch (this.state) {
      case 'intro':
        this._t -= dt; if (this._t <= 0) { this.state = 'waves'; this.wave = 0; this._startWave(); }
        break;
      case 'waves':
        if (this.scene.spawner.countAlive() <= 0) {
          if (this.wave >= this.totalWaves) { this.state = 'miniboss'; this._startMiniBoss(); }
          else this._startWave();
        }
        break;
      case 'miniboss':
        if (this.scene.bossMgr.active == null && this._bossSpawned) { this.state = 'reward'; this._reward(); }
        break;
      case 'reward':
        break;
    }
  }

  _startWave() {
    this.wave += 1;
    const p = this.scene.player;
    const base = 4 + this.wave * 2;
    const n = Math.max(3, Math.round(base * this.mod.count));
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2, r = 260 + Math.random() * 180;
      const x = Phaser.Math.Clamp(p.x + Math.cos(ang) * r, 40, CONFIG.world.width - 40);
      const y = Phaser.Math.Clamp(p.y + Math.sin(ang) * r, 40, CONFIG.world.height - 40);
      const key = Phaser.Utils.Array.GetRandom(this.roster);
      this.scene.spawner.spawnAt(key, x, y, Math.random() < this.mod.elite);
    }
    this._say(`Wave ${this.wave} / ${this.totalWaves}`, 2);
    this.scene.sfx?.boss?.();
  }

  _startMiniBoss() {
    this._say('MINI-BOSS!', 2.5);
    this.scene.cameras.main.flash(220, 60, 0, 20);
    // Reuse the region boss at reduced HP → a "mini" version.
    this.scene.bossMgr.spawnMiniBoss(this.scene.player, 0.4);
    this._bossSpawned = true;
  }

  _reward() {
    if (this.rewarded) return;
    this.rewarded = true;
    const s = this.scene, p = s.player;
    this._say('DUNGEON CLEARED!\nTreasure Room unlocked', 4);
    // Treasure room burst: chest + coins + big XP + a relic.
    const L = this.mod.loot;
    s.lootMgr.spawn('chest', p.x, p.y - 40, 1);
    for (let i = 0; i < Math.round(10 * L); i++)
      s.lootMgr.spawn('coin', p.x + Phaser.Math.Between(-90, 90), p.y + Phaser.Math.Between(-90, 90), Phaser.Math.Between(3, 8));
    s._dropGem(p.x, p.y, Math.round(60 * L));
    s.lootMgr.spawn('key', p.x + 40, p.y, 1);        // relic / treasure key
    s.ui.windows.showAchievement?.({ icon: '\u{1F3FA}', name: 'Relic obtained: Ancient ' + this.mod.name + ' Sigil' });
    // Exit portal home.
    this._spawnExit();
  }

  _spawnExit() {
    const s = this.scene, p = s.player;
    const x = p.x, y = p.y + 150;
    const ring = s.add.image(x, y, 'glow').setTint(0x7fd0f0).setBlendMode('ADD').setScale(2.6).setDepth(DEPTH.FX);
    s.tweens.add({ targets: ring, scale: 3.1, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
    const gate = s.dungeonExitGroup.create(x, y, 'glow');
    gate.setTint(0x7fd0f0).setScale(1.5).setDepth(DEPTH.FX);
    if (gate.body) gate.body.setAllowGravity(false);
    s.add.text(x, y - 46, '\u21A9 Exit to Region', { fontFamily: 'monospace', fontSize: '13px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5).setDepth(DEPTH.FX + 1);
  }

  destroy() { if (this.banner) this.banner.destroy(); }
}
