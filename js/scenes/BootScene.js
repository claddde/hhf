/* ============================================================
   BootScene.js — preloads every asset with pixel-art settings,
   then signals the DOM menu that the engine is ready. It does
   NOT auto-start the game; the Windows 95 "Play" button does.
   ============================================================ */

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

    // Simple loading text on the menu.
    const status = document.getElementById('menu-status');
    this.load.on('progress', (p) => {
      if (status) status.textContent = `Loading engine\u2026 ${Math.round(p * 100)}%`;
    });
  }

  create() {
    // Enforce nearest filtering globally too.
    this.textures.get('player').setFilter(Phaser.Textures.FilterMode.NEAREST);

    // --- HoodLust character animations (sliced from the master sprite sheet,
    //     frame order preserved exactly; no pose is invented) ---
    const A = (key, frames, frameRate, repeat) =>
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, frames), frameRate, repeat });
    A('idle',   { start: 0, end: 9 }, 6,  -1);
    A('walk',   { start: 0, end: 9 }, 10, -1);
    A('run',    { start: 0, end: 9 }, 14, -1);
    A('attack', { start: 0, end: 6 }, 16,  0);
    A('hurt',   { start: 0, end: 8 }, 16,  0);
    A('death',  { start: 0, end: 7 }, 10,  0);

    // Tell the DOM UI the engine is ready → enables Play.
    window.dispatchEvent(new CustomEvent('hoodlust-ready'));
  }
}
