/* ============================================================
   Town.js — PHASE 7.5 Safe Town. A peaceful, enemy-free hub built
   inside a region flagged `town`. Places interactive stations the
   player walks up to (merchant, blacksmith, bank/profile, healing
   fountain, fast-travel portal, quest board, leaderboard, training
   area). Each station opens an existing Windows-95 window or fires
   an action. No combat pressure — HP stays topped up.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';

export class Town {
  constructor(scene) {
    this.scene = scene;
    this.stations = [];
    this.group = scene.physics.add.staticGroup();
    this._dummyT = 0;
  }

  _ui() { return window.HOODLUST.ui; }

  build() {
    const s = this.scene, W = CONFIG.world.width, H = CONFIG.world.height;
    const cx = W / 2, cy = H / 2;

    // Welcome banner.
    s.add.text(cx, cy - 300, 'HOODLUST HAVEN\nSafe Zone — no enemies here',
      { fontFamily: 'monospace', fontSize: '22px', color: '#ffe4a0', align: 'center', stroke: '#3a2a10', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(DEPTH.FX);

    // Stations arranged in a ring around the spawn.
    const defs = [
      { key: 'stall',        icon: '\u{1F6D2}', name: 'Merchant',        act: () => this._ui().windows.showShop() },
      { key: 'anvil',        icon: '\u2692',    name: 'Blacksmith',      act: () => { this._toast('Blacksmith — upgrade weapons'); this._ui().windows.showShop(); } },
      { key: 'vault',        icon: '\u{1F3E6}', name: 'Bank & Profile',  act: () => this._ui().web3.showProfile() },
      { key: 'fountain',     icon: '\u2764',    name: 'Healing Fountain', act: () => this._heal() },
      { key: 'portal_stone', icon: '\u2727',    name: 'Fast-Travel Portal', act: () => this._ui().worldmap.open(null, s.progression.level) },
      { key: 'quest_board',  icon: '\u2755',    name: 'Quest Board',     act: () => this._ui().eco.showMissions() },
      { key: 'vault',        icon: '\u{1F3C6}', name: 'Leaderboard',     act: () => this._ui().web3.showLeaderboard(), tint: 0xf2d16b },
      { key: 'quest_board',  icon: '\u2694',    name: 'Training Area',   act: () => this._spawnDummies(), tint: 0x8ff0d0 },
    ];
    const R = 250;
    defs.forEach((d, i) => {
      const ang = (i / defs.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
      const spr = this.group.create(x, y, d.key).setOrigin(0.5, 0.9).setDepth(y);
      if (d.tint) spr.setTint(d.tint);
      spr.body.setSize(spr.width * 0.7, 24); spr.body.setOffset(spr.width * 0.15, spr.height * 0.72); spr.refreshBody();
      // soft glow so stations read as interactive.
      const glow = s.add.image(x, y - 8, 'glow').setTint(d.tint || 0xffe4a0).setBlendMode('ADD').setAlpha(0.35).setScale(1.6).setDepth(y - 1);
      s.tweens.add({ targets: glow, alpha: 0.6, scale: 2.0, duration: 1100, yoyo: true, repeat: -1 });
      const label = s.add.text(x, y - spr.height * 0.9 - 10, `${d.icon} ${d.name}`,
        { fontFamily: 'monospace', fontSize: '13px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 3 })
        .setOrigin(0.5, 1).setDepth(DEPTH.FX + 1);
      this.stations.push({ spr, def: d, x, y, armed: true, label });
    });

    // Floating "walk up to use" hint on the nearest station.
    this.prompt = s.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px', color: '#f2d16b', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5, 1).setDepth(DEPTH.HUD).setVisible(false);

    s.physics.add.overlap(s.player, this.group, this._enter, null, this);
  }

  _enter(player, spr) {
    const st = this.stations.find(s => s.spr === spr);
    if (!st || !st.armed) return;
    st.armed = false;
    this.scene.sfx?.levelup?.();
    st.def.act();
  }

  update(dt) {
    const p = this.scene.player;
    // Re-arm stations once the player steps away, so re-entry re-triggers.
    let nearest = null, nd = 1e9;
    for (const st of this.stations) {
      const d = Math.hypot(p.x - st.x, p.y - st.y);
      if (d > 72) st.armed = true;
      if (d < nd) { nd = d; nearest = st; }
    }
    // Keep the player healthy in town.
    if (this.scene.playerHP < this.scene.progression.stats.maxHP) {
      this.scene.playerHP = Math.min(this.scene.progression.stats.maxHP, this.scene.playerHP + 18 * dt);
    }
    // Respawn a couple of training dummies if cleared.
    if (this._dummiesActive) {
      this._dummyT -= dt;
      if (this._dummyT <= 0 && this.scene.spawner.countAlive() === 0) { this._dummyT = 3; this._spawnDummies(true); }
    }
  }

  _heal() {
    this.scene.playerHP = this.scene.progression.stats.maxHP;
    this.scene.invuln = Math.max(this.scene.invuln, 1.2);
    this.scene.vfx?.levelup?.(this.scene.player.x, this.scene.player.y);
    this._toast('Fully healed at the fountain!');
  }

  _spawnDummies(silent) {
    const s = this.scene, cx = CONFIG.world.width / 2, cy = CONFIG.world.height / 2 + 250;
    for (let i = 0; i < 3; i++) {
      const e = s.spawner.spawnAt('skeleton', cx - 80 + i * 80, cy, false);
      if (e) { e.contactDmg = 0; e.speed = 0; e.baseSpeed = 0; e.behavior = 'chase'; e.maxHP = 400; e.hp = 400; e.setTint(0x8ff0d0); }
    }
    this._dummiesActive = true; this._dummyT = 3;
    if (!silent) this._toast('Training dummies spawned — test your build!');
  }

  _toast(msg) { this._ui().windows.showAchievement?.({ icon: '\u2691', name: msg }); }

  destroy() {
    this.stations.forEach(s => { s.spr.destroy(); s.label.destroy(); });
    this.stations = [];
    if (this.prompt) this.prompt.destroy();
  }
}
