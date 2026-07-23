/* ============================================================
   GameScene.js — playable world.
   PHASE 1: map, player, camera, collision, atmosphere.
   PHASE 2: enemies, spawner, auto-attack, XP, level-up, HP, HUD.
   PHASE 3: modular weapons, loot, chests, rarity, bosses, passives,
            shop hooks, VFX + SFX, buffs, achievements, save.
   Earlier-phase behaviour is preserved; Phase 3 only adds.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';
import { Player } from '../entities/Player.js';
import { InputManager } from '../input/InputManager.js';
import { Enemy } from '../entities/Enemy.js';
import { XPGem } from '../entities/XPGem.js';
import { Spawner } from '../systems/Spawner.js';
import { WeaponSystem } from '../systems/WeaponSystem.js';
import { Progression } from '../systems/Progression.js';
import { WeaponManager } from '../systems/WeaponManager.js';
import { LootManager } from '../systems/LootManager.js';
import { BossManager } from '../systems/BossManager.js';
import { VFX } from '../systems/VFX.js';
import { buildLevelUpOffers, buildChestReward } from '../systems/Offers.js';
import { WEAPONS, ACHIEVEMENTS } from '../data/gamedata.js';
import { MAPS, MAP_IDS, CHARACTERS } from '../data/maps.js';
import { Environment } from '../systems/Environment.js';
import { Weather } from '../systems/Weather.js';
import { Ambient } from '../systems/Ambient.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  init(data) {
    this.joystick = data.joystick || null;
    // Phase 4: chosen character + world (fall back to defaults).
    this.mapDef = MAPS[data.map] || MAPS[MAP_IDS[0]];
    this.charDef = CHARACTERS.find(c => c.id === data.character) || CHARACTERS[0];
  }

  create() {
    const W = CONFIG.world.width, H = CONFIG.world.height;
    const map = this.mapDef;

    // ===== PHASE 1 =====
    this.physics.world.setBounds(0, 0, W, H);
    this.cameras.main.setBounds(0, 0, W, H);
    // Phase 4: brighter, per-map floor colour instead of the dark default.
    this.cameras.main.setBackgroundColor(map.floorColor);
    this.cameras.main.roundPixels = true;
    this.add.tileSprite(0, 0, W, H, map.grass).setOrigin(0, 0).setDepth(DEPTH.FLOOR);
    this.props = this.physics.add.staticGroup();
    this._buildForest(W, H);
    // Tint the collidable trees/props to the map palette (colour only —
    // collision + positions are unchanged from Phase 1).
    if (map.trees && map.trees.tint) this.props.children.iterate(p => p && p.setTexture && p.texture.key === 'tree' && p.setTint(map.trees.tint));

    this.player = new Player(this, W / 2, H / 2, 'idle');
    if (this.charDef.tint) this.player.setTint(this.charDef.tint);
    this.player.cfg = { ...CONFIG.player };
    this._baseWalk = CONFIG.player.walkSpeed;
    this._baseRun = CONFIG.player.runSpeed;
    this.physics.add.collider(this.player, this.props);

    this.inputMgr = new InputManager(this, this.joystick);
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, CONFIG.camera.lerp, CONFIG.camera.lerp);
    cam.setDeadzone(CONFIG.camera.deadzoneW, CONFIG.camera.deadzoneH);
    this._buildAtmosphere();

    this.hud = this.add.text(10, 10, '', { fontFamily: '"Press Start 2P", monospace', fontSize: '10px', color: '#9fe8c0', stroke: '#000', strokeThickness: 3 })
      .setScrollFactor(0).setDepth(DEPTH.HUD).setVisible(false);

    // ===== SHARED refs =====
    this.save = window.HOODLUST.save;
    this.sfx = window.HOODLUST.sfx;
    this.ui = window.HOODLUST.ui;
    this.vfx = new VFX(this);

    // ===== PHASE 2 =====
    this.enemies = this.physics.add.group();
    this.projGroup = this.physics.add.group();
    this.gemGroup = this.physics.add.group();
    this.progression = new Progression(this.save.data);
    this.weapon = new WeaponSystem(this, this.projGroup, this.progression); // Rose Bolt (unchanged)
    this.spawner = new Spawner(this, this.enemies);
    this.enemyHpMult = 1;

    this.playerHP = this.progression.stats.maxHP;
    this.invuln = 0; this._regenAcc = 0; this.elapsed = 0;
    this.pendingLevels = 0; this.paused = false; this.over = false;
    this._sep = new Phaser.Math.Vector2();
    this._achAcc = 0;

    // ===== PHASE 3 =====
    this.weaponMgr = new WeaponManager(this, this.projGroup, this.progression);
    this.lootGroup = this.physics.add.group();
    this.lootMgr = new LootManager(this, this.lootGroup, this.progression);
    this.bossGroup = this.physics.add.group();
    this.bossHazards = this.physics.add.group();
    this.bossMgr = new BossManager(this);
    this.bossesThisRun = 0;

    this.ui.windows.setRun({ scene: this, progression: this.progression, weaponMgr: this.weaponMgr });

    // ===== PHASE 4 — colourful world, weather, life, ambient audio =====
    // Apply the chosen character's small (non-mechanical) modifier flavour.
    this._applyCharacter(this.charDef);

    this.env = new Environment(this, map);
    this.env.build();
    this.weather = new Weather(this, map);
    this.ambient = new Ambient(this, map);
    this.ambient.build();
    this.ambientAudio = window.HOODLUST.ambientAudio;
    this.ambientAudio.start(map);

    // Collisions / overlaps.
    this.physics.add.collider(this.enemies, this.props);
    this.physics.add.overlap(this.projGroup, this.enemies, this._hitEnemy, null, this);
    this.physics.add.overlap(this.projGroup, this.bossGroup, this._hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemies, this._touchEnemy, null, this);
    this.physics.add.overlap(this.player, this.bossGroup, this._touchEnemy, null, this);
    this.physics.add.overlap(this.player, this.bossHazards, this._hitByHazard, null, this);
    this.physics.add.overlap(this.player, this.gemGroup, this._collectGem, null, this);
    this.physics.add.overlap(this.player, this.lootGroup, this._collectLoot, null, this);

    // Enemy death → gem + loot + kill + achievements.
    this.events.on('enemy-died', (e) => {
      this._dropGem(e.x, e.y, e.xpValue);
      this.lootMgr.roll(e.x, e.y, this.progression.totalLuck(), e.isElite ? 2.2 : 1);
      this.vfx.hit(e.x, e.y, false);
      this.progression.kills += 1;
      this._checkAchievements();
    });

    this.input.keyboard.on('keydown-ESC', () => this._togglePause());
    this.input.keyboard.on('keydown-I', () => this.toggleInventory());

    this.events.once('shutdown', () => {
      this.events.off('enemy-died');
      this.ui.hud.hide();
      this.ui.windows.hideBossBar();
      this.weaponMgr.destroyAll();
      // Phase 4 teardown.
      if (this.env) this.env.destroy();
      if (this.weather) this.weather.destroy();
      if (this.ambient) this.ambient.destroy();
      if (this.ambientAudio) this.ambientAudio.stop();
    });

    this.ui.hud.show();
    this.ui.dialogs.hideAll();
    this.ui.windows.hideAll();
    this.ui.windows.hideBossBar();

    if (CONFIG.debug) this.physics.world.createDebugGraphic();
  }

  /* ---------------- PHASE 1 helpers ---------------- */
  _buildForest(W, H) {
    let seed = 1337;
    const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const place = (key, count, bodyW, bodyH, bodyOffY) => {
      for (let i = 0; i < count; i++) {
        const x = 120 + rand() * (W - 240), y = 120 + rand() * (H - 240);
        if (Math.hypot(x - W / 2, y - H / 2) < 180) continue;
        const s = this.props.create(x, y, key);
        s.setDepth(y); s.setOrigin(0.5, 0.85);
        s.body.setSize(bodyW, bodyH); s.body.setOffset((s.width - bodyW) / 2, s.height * bodyOffY);
        s.refreshBody();
      }
    };
    place('tree', 46, 14, 12, 0.72);
    place('rock', 22, 22, 12, 0.45);
    place('grave', 14, 14, 10, 0.62);
  }
  _buildAtmosphere() {
    const { width, height } = this.scale;
    this.vignette = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.FX);
    this._drawVignette(width, height);
    this.scale.on('resize', (gs) => this._drawVignette(gs.width, gs.height));
    this.fog = this.add.tileSprite(0, 0, CONFIG.world.width, CONFIG.world.height, 'grass')
      .setOrigin(0, 0).setDepth(DEPTH.FX - 1).setAlpha(0.05).setTint(0x203028);
  }
  _drawVignette(w, h) {
    const g = this.vignette; g.clear();
    for (let i = 0; i < 6; i++) {
      const a = 0.10 * (i / 6), inset = (i / 6) * Math.min(w, h) * 0.5;
      g.fillStyle(0x000000, a);
      g.fillRect(0, 0, w, inset); g.fillRect(0, h - inset, w, inset);
      g.fillRect(0, 0, inset, h); g.fillRect(w - inset, 0, inset, h);
    }
  }

  /* ---------------- combat core ---------------- */
  dealHit(target, dmg, crit, fx, fy) {
    const died = target.hurt(dmg, fx, fy);
    this._damageNumber(target.x, target.y - 14, dmg, crit);
    if (crit) this.vfx.hit(target.x, target.y, true);
    const ls = this.progression.mods.lifeSteal;
    if (ls > 0) this.playerHP = Math.min(this.progression.stats.maxHP, this.playerHP + dmg * ls);
    if (target.isBoss) this.sfx?.hitboss();
    return died;
  }

  _hitEnemy(proj, enemy) {
    if (!proj.active || !enemy.active || enemy.dead) return;
    if (proj.hitSet.has(enemy)) return;
    proj.hitSet.add(enemy);
    this.dealHit(enemy, proj.damage, proj.crit, proj.x, proj.y);
    if (proj.pierceLeft > 0) proj.pierceLeft -= 1; else proj.kill();
  }

  _touchEnemy(player, enemy) {
    if (enemy.dead || this.invuln > 0 || this.over) return;
    this.playerHP -= enemy.contactDmg;
    this.invuln = CONFIG.survival.invulnMs / 1000;
    player.setTintFill(0xff3b3b);
    this.time.delayedCall(90, () => { if (player.active) player.clearTint(); });
    this.cameras.main.flash(120, 120, 0, 0, false);
    this.sfx?.hurt();
    if (this.playerHP <= 0) this._gameOver();
    else this.player.playHurt();
  }

  _hitByHazard(player, hz) {
    hz.destroy();
    if (this.invuln > 0 || this.over) return;
    this.playerHP -= hz.dmg || 12;
    this.invuln = CONFIG.survival.invulnMs / 1000;
    player.setTintFill(0xff3b3b);
    this.time.delayedCall(90, () => { if (player.active) player.clearTint(); });
    this.sfx?.hurt();
    if (this.playerHP <= 0) this._gameOver();
    else this.player.playHurt();
  }

  _collectGem(player, gem) { if (!gem.active) return; gem.collect(); this.gainXP(gem.value); }
  _collectLoot(player, p) { if (!p.active) return; this.lootMgr.collect(p); this.ui.hud && (this._coinsDirty = true); }

  _dropGem(x, y, value) {
    let g = this.gemGroup.getFirstDead(false);
    if (!g) { g = new XPGem(this, x, y); this.gemGroup.add(g); }
    g.spawn(x, y, value);
  }

  gainXP(v) { this._gainXP(v); }
  _gainXP(v) {
    const p = this.progression;
    p.xp += v;
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext; p.level += 1;
      p.xpToNext = Math.round(p.xpToNext * CONFIG.level.growth);
      this.pendingLevels += 1;
    }
    if (this.pendingLevels > 0 && !this.paused) this._openLevelUp();
  }

  _openLevelUp() {
    if (this.pendingLevels <= 0) return;
    this._pauseForDialog();
    this.vfx.levelup(this.player.x, this.player.y);
    this.sfx?.levelup();
    this.ui.hud.update(this.progression, this.playerHP, this.progression.stats.maxHP, this.elapsed);
    const choices = buildLevelUpOffers(this);
    this.ui.dialogs.showLevelUp(choices, this.progression.level, (u) => {
      u.apply();
      this.syncStats();
      this.pendingLevels -= 1;
      if (this.pendingLevels > 0) this._openLevelUp();
      else this._resumeFromDialog();
    });
  }

  /** Rose Bolt upgrade (Phase-2 style stat bump). */
  upgradeRose() {
    const s = this.progression.stats;
    s.damage *= 1.22; s.cooldownMs *= 0.92;
    if (this.progression.roseLevel % 2 === 0) s.projCount += 1;
    this.progression.roseLevel = Math.min(WEAPONS.rose_bolt.maxLevel, this.progression.roseLevel + 1);
  }

  syncStats() { this._syncStats(); }
  _syncStats() {
    const s = this.progression.stats;
    this.player.cfg.walkSpeed = this._baseWalk * s.moveMult * this.progression.buffMove;
    this.player.cfg.runSpeed = this._baseRun * s.moveMult * this.progression.buffMove;
    if (s.healQueued > 0) { this.playerHP = Math.min(s.maxHP, this.playerHP + s.healQueued); s.healQueued = 0; }
    this.playerHP = Math.min(this.playerHP, s.maxHP);
  }

  _damageNumber(x, y, amount, crit) {
    const t = this.add.text(x, y, String(Math.round(amount)), {
      fontFamily: '"Press Start 2P", monospace', fontSize: crit ? '13px' : '10px',
      color: crit ? '#f2d16b' : '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH.FX);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 620, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }
  floatText(x, y, text, color) {
    const t = this.add.text(x, y, text, {
      fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(DEPTH.FX);
    this.tweens.add({ targets: t, y: y - 22, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  /* ---------------- chests / buffs / magnet ---------------- */
  openChest() {
    if (this.over) return;
    this.progression.chests += 1;
    this._pauseForDialog();
    this.vfx.chestOpen(this.player.x, this.player.y);
    this.sfx?.chest();
    const reward = buildChestReward(this);
    this._checkAchievements();
    this.ui.windows.showChestReward(reward, () => {
      reward.apply();
      this.syncStats();
      this.sfx?.rare();
      this._resumeFromDialog();
    });
  }

  applyBuff(b) {
    if (b.id === 'vacuum') { this.vacuumAll(); return; }
    const existing = this.progression.buffs.find(x => x.id === b.id);
    if (existing) existing.t = b.dur;
    else this.progression.buffs.push({ id: b.id, name: b.name, t: b.dur });
  }

  vacuumAll() {
    this.gemGroup.children.iterate((g) => { if (g && g.active) { this.gainXP(g.value); g.collect(); } });
    this.lootGroup.children.iterate((p) => { if (p && p.active && p.kind === 'coin') { this.progression.addCoins(p.value); p.collect(); } });
    this.sfx?.coin();
  }

  /* ---------------- boss hooks ---------------- */
  spawnBossHazard(x, y, angle, dmg) {
    const hz = this.bossHazards.create(x, y, 'bolt');
    hz.setTint(0xff5a8a).setScale(1.3).setDepth(DEPTH.PROJ);
    hz.dmg = Math.round(dmg * 0.6);
    hz.body.setAllowGravity(false);
    const sp = CONFIG.phase3.bossHazardSpeed;
    hz.setVelocity(Math.cos(angle) * sp, Math.sin(angle) * sp);
    this.time.delayedCall(3200, () => { if (hz.active) hz.destroy(); });
  }

  spawnMinion(x, y) {
    const key = Math.random() < 0.5 ? 'bat' : 'spider';
    let e = new Enemy(this, Phaser.Math.Clamp(x, 20, CONFIG.world.width - 20), Phaser.Math.Clamp(y, 20, CONFIG.world.height - 20), key);
    e.setScale(e.def.scale);
    this.enemies.add(e);
  }

  showBossBar(name) { this.ui.windows.showBossBar(name); }
  updateBossBar(frac) { this.ui.windows.updateBossBar(frac); }
  hideBossBar() { this.ui.windows.hideBossBar(); }

  onBossDefeated(boss) {
    this.ui.windows.hideBossBar();
    this.progression.bosses += 1; this.bossesThisRun += 1;
    this.vfx.bossDeath(boss.x, boss.y);
    this.sfx?.explode();
    // Guaranteed rewards.
    this.lootMgr.spawn('chest', boss.x, boss.y, 1);
    const coins = Phaser.Math.Between(...CONFIG.phase3.chestCoins);
    for (let i = 0; i < 6; i++) this.lootMgr.spawn('coin', boss.x + Phaser.Math.Between(-30, 30), boss.y + Phaser.Math.Between(-30, 30), Math.ceil(coins / 6));
    this._dropGem(boss.x, boss.y, 20);
    this._checkAchievements();
  }

  /* ---------------- inventory / pause ---------------- */
  toggleInventory() {
    if (this.over) return;
    if (this.ui.windows.isInventoryOpen()) { this.ui.windows.closeInventory(); return; }
    if (this.paused) return;
    this._pauseForDialog();
    this.ui.windows.showInventory();
  }
  onInventoryClosed() { this._resumeFromDialog(); }

  _togglePause() {
    if (this.over) return;
    if (this.ui.windows.isInventoryOpen()) { this.ui.windows.closeInventory(); return; }
    if (this.ui.dialogs.isPauseOpen()) { this._resumeFromDialog(); this.ui.dialogs.hidePause(); return; }
    if (this.paused) return;
    this._pauseForDialog();
    this.ui.dialogs.showPause(
      () => this._resumeFromDialog(),
      () => { this._resumeFromDialog(); this._quitToMenu(); }
    );
  }
  _pauseForDialog() { this.paused = true; this.physics.pause(); }
  _resumeFromDialog() { this.paused = false; this.physics.resume(); }

  /* ---------------- achievements ---------------- */
  _checkAchievements() {
    const st = { kills: this.progression.kills, level: this.progression.level, bosses: this.bossesThisRun, chests: this.progression.chests, coinsRun: this.progression.coins, time: this.elapsed };
    for (const a of ACHIEVEMENTS) {
      if (!this.save.hasAchievement(a.id) && a.test(st)) {
        this.save.unlockAchievement(a.id);
        this.ui.windows.showAchievement(a);
        this.sfx?.rare();
      }
    }
  }

  /* ---------------- game over ---------------- */
  _applyCharacter(ch) {
    const mods = ch.mods || {};
    const m = this.progression.mods, s = this.progression.stats;
    if (mods.luck) m.luck += mods.luck;
    if (mods.critChanceAdd) m.critChanceAdd += mods.critChanceAdd;
    if (mods.dmgMult) { m.dmgMult *= mods.dmgMult; s.damage *= mods.dmgMult; }
    if (mods.moveMult) s.moveMult *= mods.moveMult;
    if (mods.maxHP) { s.maxHP += mods.maxHP; this.playerHP = s.maxHP; }
  }

  _gameOver() {
    if (this.over) return;
    // Revive (Ankh from shop).
    if (this.progression.revives > 0) {
      this.progression.revives -= 1;
      this.playerHP = this.progression.stats.maxHP;
      this.invuln = 2.0;
      this.cameras.main.flash(500, 255, 255, 255);
      this.floatText(this.player.x, this.player.y - 30, 'REVIVED!', '#f2d16b');
      return;
    }
    this.over = true; this.paused = true; this.physics.pause();
    this.player.setVelocity(0, 0);
    this.player.playDeath();
    this.ui.windows.hideBossBar();

    // Persist meta-progression.
    this.save.recordRun({ time: this.elapsed, kills: this.progression.kills, level: this.progression.level, coins: this.progression.coins, bossesThisRun: this.bossesThisRun });
    this.ui.windows.refreshMenuCoins();

    // Phase 5: submit run to the online leaderboard (anti-cheat validated;
    // holders only — demo/unverified runs stay local).
    const runStats = { kills: this.progression.kills, level: this.progression.level, bossesThisRun: this.bossesThisRun, coins: this.progression.coins, time: this.elapsed };
    let goScore = 0;
    try {
      const web3 = window.HOODLUST.ui.web3;
      goScore = web3.anticheat.computeScore(runStats);
      web3.submitRun(runStats, this.charDef.name).then((r) => {
        if (r && r.reward) this.ui.windows.showAchievement({ icon: '\u{1F3C6}', name: 'Weekly Reward: ' + (r.reward.title || r.reward.id) });
      });
    } catch (_) {}

    // Phase 7: advance seasons / battle pass / daily+weekly missions.
    try {
      window.HOODLUST.ui.eco.onRunEnd({
        kills: this.progression.kills, bosses: this.bossesThisRun,
        coins: this.progression.coins, xp: this.progression.totalXp || 0,
        time: this.elapsed, chests: this.progression.chests || 0, runs: 1,
      });
    } catch (_) {}

    const m = Math.floor(this.elapsed / 60), s = Math.floor(this.elapsed % 60);
    this.ui.dialogs.showGameOver(
      { time: `${m}:${String(s).padStart(2, '0')}`, kills: this.progression.kills, level: this.progression.level, score: goScore },
      () => this.scene.restart({ joystick: this.joystick, character: this.charDef.id, map: this.mapDef.id }),
      () => this._quitToMenu()
    );
  }

  _quitToMenu() {
    this.ui.hud.hide(); this.ui.dialogs.hideAll(); this.ui.windows.hideAll(); this.ui.windows.hideBossBar();
    window.dispatchEvent(new CustomEvent('hoodlust-quit'));
  }

  /* ---------------- main loop ---------------- */
  update(time, delta) {
    const dt = delta / 1000;

    if (!this.paused && !this.over) {
      const move = this.inputMgr.getMoveVector();
      this.player.update(delta, move, this.inputMgr.isRunning());
    } else {
      this.player.update(delta, { x: 0, y: 0 }, false);
    }
    this.player.setDepth(this.player.y);
    this.player.shadow.setDepth(this.player.y - 1);
    if (this.fog) { this.fog.tilePositionX += delta * 0.004; this.fog.tilePositionY += delta * 0.002; }

    // Phase 4: colourful world, weather & life animate every frame (even
    // while a dialog is up) so the world stays alive. Visual only.
    const wind = this.weather ? this.weather.wind : 1;
    if (this.env) this.env.update(dt, wind);
    if (this.weather) this.weather.update(dt);
    if (this.ambient) this.ambient.update(dt);
    if (this.ambientAudio) this.ambientAudio.update(dt, wind);

    if (this.paused || this.over) return;

    this.elapsed += dt;
    if (this.invuln > 0) this.invuln -= dt;

    const st = this.progression.stats;

    // --- Buffs: recompute flags from active buffs ---
    let bDmg = 1, bMove = 1, bCd = 1;
    if (this.progression.buffs.length) {
      for (let i = this.progression.buffs.length - 1; i >= 0; i--) {
        const b = this.progression.buffs[i];
        b.t -= dt;
        if (b.t <= 0) { this.progression.buffs.splice(i, 1); continue; }
        if (b.id === 'might') bDmg = 2;
        else if (b.id === 'haste') bMove = 1.5;
        else if (b.id === 'frenzy') bCd = 0.5;
      }
      this.ui.windows.setBuffs(this.progression.buffs);
    } else if (this._hadBuffs) { this.ui.windows.setBuffs([]); }
    this._hadBuffs = this.progression.buffs.length > 0;
    this.progression.buffDmg = bDmg; this.progression.buffMove = bMove; this.progression.buffCdMult = bCd;

    // Live move speed (mods + buff).
    this.player.cfg.walkSpeed = this._baseWalk * st.moveMult * bMove;
    this.player.cfg.runSpeed = this._baseRun * st.moveMult * bMove;

    // Regen.
    if (st.regen > 0) { this._regenAcc += dt; if (this._regenAcc >= 1) { this._regenAcc -= 1; this.playerHP = Math.min(st.maxHP, this.playerHP + st.regen); } }

    const px = this.player.x, py = this.player.y;

    // Spawner + weapons (Rose Bolt + modular).
    this.spawner.update(delta, px, py);
    this.weapon.update(delta, this.player, this.enemies);

    // Build hurtable target list (enemies + boss) for non-projectile weapons.
    const targets = [];
    this.enemies.children.iterate((e) => { if (e && e.active && !e.dead) targets.push(e); });
    if (this.bossMgr.active && this.bossMgr.active.active) targets.push(this.bossMgr.active);
    this.weaponMgr.update(delta, this.player, targets);

    // Boss.
    this.bossMgr.update(dt, this.elapsed, this.player);

    // Enemy AI + separation.
    const sepR = CONFIG.enemies.separation, sepR2 = sepR * sepR;
    for (const e of targets) {
      if (e.isBoss) continue;
      let sx = 0, sy = 0;
      for (const o of targets) {
        if (o === e || o.isBoss) continue;
        const dx = e.x - o.x, dy = e.y - o.y, d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < sepR2) { const d = Math.sqrt(d2); sx += dx / d; sy += dy / d; }
      }
      this._sep.set(sx * 26, sy * 26);
      e.think(dt, px, py, this._sep);
      e.setDepth(e.y);
    }

    // Gems + loot magnet.
    const magnet = st.magnet * this.progression.mods.magnetMult;
    this.gemGroup.children.iterate((g) => { if (g && g.active) g.seek(px, py, magnet, dt); });
    this.lootMgr.update(dt, px, py, magnet);

    // Achievements: time-based tick.
    this._achAcc += dt; if (this._achAcc >= 1) { this._achAcc = 0; this._checkAchievements(); }

    // HUD.
    this.ui.hud.update(this.progression, this.playerHP, st.maxHP, this.elapsed);
  }
}
