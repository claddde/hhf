/* ============================================================
   BootScene.js — preloads every asset with pixel-art settings,
   then signals the DOM menu that the engine is ready. It does
   NOT auto-start the game; the Windows 95 "Play" button does.
   ============================================================ */

import { CHAR_ANIMS, ANIM_PLAY } from '../data/charAnims.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // Load in small batches. The default (32 parallel) can leave overflow
    // requests hanging on slow/static hosts; a low cap drains reliably and
    // is gentle on GitHub Pages too.
    this.load.maxParallelDownloads = 6;

    // Nearest-neighbour, no filtering for every loaded texture.
    this.load.on('filecomplete', (key, type) => {
      if (type === 'image' && this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    });

    // --- Player (uploaded HoodLust character — sliced from the master sheet) ---
    // Static fallback + animation spritesheets (frame sizes are fixed by the
    // slicer; feet-aligned within each cell). Art is used as-is, never redrawn.
    this.load.image('player', 'assets/player/player.png');
    this.load.spritesheet('idle',   'assets/player/idle.png',   { frameWidth: 72,  frameHeight: 144 });
    this.load.spritesheet('walk',   'assets/player/walk.png',   { frameWidth: 70,  frameHeight: 140 });
    this.load.spritesheet('run',    'assets/player/run.png',    { frameWidth: 76,  frameHeight: 133 });
    this.load.spritesheet('attack', 'assets/player/attack.png', { frameWidth: 133, frameHeight: 127 });
    this.load.spritesheet('hurt',   'assets/player/hurt.png',   { frameWidth: 88,  frameHeight: 123 });
    this.load.spritesheet('death',  'assets/player/death.png',  { frameWidth: 115, frameHeight: 72 });
    this.load.image('portrait',    'assets/player/portrait.png');
    this.load.spritesheet('expressions', 'assets/player/expressions.png', { frameWidth: 110, frameHeight: 113 });

    // --- Four extra playable characters (sliced from master sheets) ---
    for (const [id, anims] of Object.entries(CHAR_ANIMS)) {
      for (const [anim, [fw, fh]] of Object.entries(anims))
        this.load.spritesheet(id + '_' + anim, 'assets/player/' + id + '_' + anim + '.png', { frameWidth: fw, frameHeight: fh });
      this.load.image(id + '_portrait', 'assets/player/' + id + '_portrait.png');
    }

    // --- Environment placeholders ---
    this.load.image('grass', 'assets/background/grass.png');
    this.load.image('tree',  'assets/background/tree.png');
    this.load.image('rock',  'assets/background/rock.png');
    this.load.image('grave', 'assets/background/grave.png');

    // --- Phase 2: enemies + FX (placeholder pixel sprites) ---
    this.load.image('bat',         'assets/enemies/bat.png');
    this.load.image('spider',      'assets/enemies/spider.png');
    this.load.image('ghost',       'assets/enemies/ghost.png');
    this.load.image('skeleton',    'assets/enemies/skeleton.png');
    this.load.image('zombie_girl', 'assets/enemies/zombie_girl.png');
    this.load.image('shadow',      'assets/enemies/shadow.png');
    this.load.image('gem',         'assets/fx/gem.png');
    this.load.image('bolt',        'assets/fx/bolt.png');

    // --- Phase 3: loot, chests, particles, boss, weapon FX ---
    this.load.image('coin',   'assets/fx/coin.png');
    this.load.image('heart',  'assets/fx/heart.png');
    this.load.image('key',    'assets/fx/key.png');
    this.load.image('magnet', 'assets/fx/magnet.png');
    this.load.image('buff',   'assets/fx/buff.png');
    this.load.image('chest',      'assets/fx/chest.png');
    this.load.image('chest_open', 'assets/fx/chest_open.png');
    this.load.image('spark',  'assets/fx/spark.png');
    this.load.image('smoke',  'assets/fx/smoke.png');
    this.load.image('boss',   'assets/enemies/boss.png');
    ['w_wand', 'w_fire', 'w_bone', 'w_ice', 'w_ghost', 'w_blade', 'w_laser', 'w_scythe']
      .forEach(k => this.load.image(k, 'assets/fx/' + k + '.png'));

    // --- Phase 4: colourful world + creatures ---
    ['grass_forest', 'grass_garden', 'grass_graveyard', 'grass_crystal', 'grass_ruins', 'path', 'bridge', 'fence', 'bush', 'mushroom', 'crystal', 'flower_pink', 'flower_blue', 'flower_purple', 'flower_gold']
      .forEach(k => this.load.image(k, 'assets/background/' + k + '.png'));
    ['water0', 'water1', 'water2'].forEach(k => this.load.image(k, 'assets/background/' + k + '.png'));
    ['glow', 'cloud', 'petal', 'leaf', 'butterfly0', 'butterfly1', 'bird0', 'bird1', 'cat', 'ghostpet']
      .forEach(k => this.load.image(k, 'assets/fx/' + k + '.png'));

    // --- Phase 7.5: new-biome floors, decor, enemies, bosses ---
    ['floor_sky', 'floor_volcano', 'floor_frost', 'floor_jungle', 'floor_mush', 'floor_desert',
     'sky_pillar', 'sky_shard', 'sky_cloud2', 'lava_rock', 'ember_vent', 'obsidian',
     'ice_spike', 'snow_pine', 'frozen_rock', 'twisted_tree', 'toxic_flower', 'corrupt_vine',
     'giant_mushroom', 'glow_cap', 'spore_pod', 'cactus', 'dune_rock', 'bone_pile']
      .forEach(k => this.load.image(k, 'assets/background/' + k + '.png'));
    ['sky_wisp', 'magma_imp', 'ice_shard', 'corrupt_spore', 'myco_crawler', 'sand_lurker',
     'boss_sky', 'boss_volcano', 'boss_frost', 'boss_jungle', 'boss_mush', 'boss_desert']
      .forEach(k => this.load.image(k, 'assets/enemies/' + k + '.png'));
    // Safe Town stations + floor.
    ['town_floor', 'fountain', 'stall', 'anvil', 'vault', 'portal_stone', 'quest_board', 'town_house']
      .forEach(k => this.load.image(k, 'assets/background/' + k + '.png'));

    // PHASE 7.6 — full-screen loading screen with bar + percentage.
    const status = document.getElementById('menu-status');
    const fill = document.getElementById('load-fill');
    const pct = document.getElementById('load-pct');
    const msg = document.getElementById('load-msg');
    const phases = [
      [0.0, 'Loading\u2026'], [0.25, 'Loading assets\u2026'],
      [0.55, 'Preparing world\u2026'], [0.85, 'Almost ready\u2026'], [0.99, 'Please wait\u2026'],
    ];
    this.load.on('progress', (p) => {
      const n = Math.round(p * 100);
      if (status) status.textContent = `Loading engine\u2026 ${n}%`;
      if (fill) fill.style.width = n + '%';
      if (pct) pct.textContent = n + '%';
      if (msg) { for (const [t, label] of phases) if (p >= t) msg.textContent = label; }
    });
  }

  create() {
    // Enforce nearest filtering globally too.
    this.textures.get('player').setFilter(Phaser.Textures.FilterMode.NEAREST);

    // --- HoodLust character animations (sliced from the master sprite sheet,
    //     frame order preserved exactly; no pose is invented) ---
    const A = (key, frames, frameRate, repeat) => {
      if (!this.textures.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, frames), frameRate, repeat });
    };
    A('idle',   { start: 0, end: 9 }, 6,  -1);
    A('walk',   { start: 0, end: 9 }, 10, -1);
    A('run',    { start: 0, end: 9 }, 14, -1);
    A('attack', { start: 0, end: 6 }, 16,  0);
    A('hurt',   { start: 0, end: 8 }, 16,  0);
    A('death',  { start: 0, end: 7 }, 10,  0);

    // Register the four extra characters' animations (prefixed keys).
    for (const [id, anims] of Object.entries(CHAR_ANIMS)) {
      for (const [anim, [, , count]] of Object.entries(anims)) {
        if (!this.textures.exists(id + '_' + anim)) continue;
        const play = ANIM_PLAY[anim] || { fps: 10, repeat: -1 };
        this.anims.create({ key: id + '-' + anim, frames: this.anims.generateFrameNumbers(id + '_' + anim, { start: 0, end: count - 1 }), frameRate: play.fps, repeat: play.repeat });
      }
    }

    // Tell the DOM UI the engine is ready → enables Play.
    window.dispatchEvent(new CustomEvent('hoodlust-ready'));

    // PHASE 7.6 — dismiss the full-screen loading screen once fully loaded.
    const ls = document.getElementById('loading-screen');
    if (ls) {
      const fill = document.getElementById('load-fill'); if (fill) fill.style.width = '100%';
      const pct = document.getElementById('load-pct'); if (pct) pct.textContent = '100%';
      const msg = document.getElementById('load-msg'); if (msg) msg.textContent = 'Ready!';
      setTimeout(() => { ls.classList.add('done'); setTimeout(() => ls.remove(), 700); }, 450);
    }
  }
}
