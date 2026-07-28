/* ============================================================
   Environment.js — Phase 4 colorful world dressing (visual only,
   no collision, no gameplay effect). Scatters decorations, glow,
   animated water, wooden bridges, warm pixel lighting overlay and
   parallax clouds/petals for the selected map.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';

export class Environment {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.decor = [];
    this.water = [];
    this.glows = [];
    this._waterT = 0; this._waterFrame = 0;
    this._lightT = 0;
  }

  /** Deterministic RNG so a map looks identical each visit. */
  _rng() {
    let seed = 90001 + this.map.id.length * 7;
    for (const ch of this.map.id) seed = (seed * 31 + ch.charCodeAt(0)) & 0x7fffffff;
    return () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  }

  build() {
    const s = this.scene, W = CONFIG.world.width, H = CONFIG.world.height;
    const rand = this._rng();

    // Winding colourful stone path across the world.
    this._buildPath(W, H, rand);

    // Water patches (+ optional bridge planks over one).
    this._buildWater(W, H, rand);

    // Scatter decorations from the map's mix.
    for (const d of this.map.decor) {
      for (let i = 0; i < d.count; i++) {
        const x = 60 + rand() * (W - 120);
        const y = 60 + rand() * (H - 120);
        if (Math.hypot(x - W / 2, y - H / 2) < 150) continue; // keep spawn clear
        const spr = s.add.image(x, y, d.key);
        if (d.depth) { spr.setOrigin(0.5, 0.9); spr.setDepth(y); } else { spr.setDepth(DEPTH.FLOOR + 1); }
        // gentle size variety
        const sc = 0.85 + rand() * 0.5;
        spr.setScale(sc);
        this.decor.push(spr);
        // Glowing objects get a soft additive halo + flicker.
        if (d.glow) {
          const g = s.add.image(x, y - 6, 'glow').setTint(d.glow).setBlendMode('ADD')
            .setDepth(y - 1).setAlpha(0.5).setScale(sc * 0.8);
          g._phase = rand() * Math.PI * 2;
          this.glows.push(g);
        }
      }
    }

    this._buildLighting();
    this._buildParallax();
    this._buildPetals();
  }

  _buildPath(W, H, rand) {
    const s = this.scene, tile = 32;
    let x = W * 0.15, y = H * 0.1;
    const steps = Math.floor((W + H) / 26);
    for (let i = 0; i < steps; i++) {
      const p = s.add.image(x, y, 'path').setDepth(DEPTH.FLOOR + 0.5).setAlpha(0.9);
      x += Math.cos(i * 0.3) * tile * 0.9 + tile * 0.55;
      y += Math.sin(i * 0.5) * tile * 0.7 + tile * 0.35;
      if (x > W - 40 || y > H - 40) { x = 40 + rand() * (W - 80); y = 40 + rand() * (H - 80); }
      this.decor.push(p);
    }
  }

  _buildWater(W, H, rand) {
    const s = this.scene;
    const patches = (this.map.water && this.map.water.patches) || 0;
    for (let p = 0; p < patches; p++) {
      const cx = 120 + rand() * (W - 240), cy = 120 + rand() * (H - 240);
      if (Math.hypot(cx - W / 2, cy - H / 2) < 200) continue;
      const w = (3 + Math.floor(rand() * 3)) * 32, h = (2 + Math.floor(rand() * 2)) * 32;
      const t = s.add.tileSprite(cx, cy, w, h, 'water0').setDepth(DEPTH.FLOOR + 0.4);
      this.water.push(t);
      // bridge planks across the first patch
      if (this.map.water.bridge && p === 0) {
        for (let bx = -w / 2; bx < w / 2; bx += 32) {
          this.decor.push(s.add.image(cx + bx + 16, cy, 'bridge').setDepth(DEPTH.FLOOR + 0.6));
        }
      }
    }
  }

  /** Warm pixel light: a gentle additive warm wash + soft sun glow that
      brightens and colours the world (never darkens). Flickers subtly. */
  _buildLighting() {
    const L = this.map.light;
    const { width, height } = this.scene.scale;
    // Additive warm wash — lifts the palette toward the map's light colour.
    this.light = this.scene.add.rectangle(0, 0, width, height, L.color)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.FX + 1)
      .setBlendMode('ADD').setAlpha(L.intensity);
    // A soft warm sun-glow in one corner (screen-fixed).
    this.sun = this.scene.add.image(width * 0.72, height * 0.18, 'glow')
      .setScrollFactor(0).setDepth(DEPTH.FX).setBlendMode('ADD')
      .setTint(L.color).setAlpha(0.14).setScale(11);
    this.scene.scale.on('resize', (gs) => {
      if (this.light) this.light.setSize(gs.width, gs.height);
      if (this.sun) this.sun.setPosition(gs.width * 0.72, gs.height * 0.18);
    });
  }

  /** Parallax pixel clouds drifting across the sky (screen-fixed). */
  _buildParallax() {
    const s = this.scene, { width, height } = s.scale;
    this.clouds = [];
    for (let i = 0; i < 7; i++) {
      const c = s.add.image(Math.random() * width, 20 + Math.random() * (height * 0.4), 'cloud')
        .setScrollFactor(0).setDepth(DEPTH.FX - 1)
        .setAlpha(0.35 + Math.random() * 0.35).setScale(1 + Math.random() * 2);
      c._spd = 4 + Math.random() * 10;
      this.clouds.push(c);
    }
  }

  /** Floating petals / leaves that drift with the wind (world-space). */
  _buildPetals() {
    const tex = (this.map.id === 'moonlight_graveyard' || this.map.id === 'crystal_valley') ? 'leaf' : 'petal';
    this.petals = this.scene.add.particles(0, 0, tex, {
      x: { min: 0, max: this.scene.scale.width },
      y: -10, lifespan: 9000, quantity: 1, frequency: 700,
      speedX: { min: 6, max: 26 }, speedY: { min: 10, max: 26 },
      rotate: { min: 0, max: 360 }, scale: { min: 0.6, max: 1.1 },
      alpha: { start: 0.9, end: 0.2 },
    }).setScrollFactor(0).setDepth(DEPTH.FX - 1);
  }

  update(dt, wind = 1) {
    // Animate water frames.
    this._waterT += dt;
    if (this._waterT > 0.18 && this.water.length) {
      this._waterT = 0;
      this._waterFrame = (this._waterFrame + 1) % 3;
      const key = 'water' + this._waterFrame;
      for (const w of this.water) w.setTexture(key);
    }
    // Glow flicker.
    this._lightT += dt;
    const fl = this.map.light.flicker;
    for (const g of this.glows) {
      g.setAlpha(0.42 + Math.sin(this._lightT * 4 + g._phase) * 0.16);
    }
    if (this.light && fl) {
      this.light.setAlpha(this.map.light.intensity + Math.sin(this._lightT * 3) * fl * 0.4);
    }
    // Parallax clouds.
    if (this.clouds) {
      const w = this.scene.scale.width;
      for (const c of this.clouds) {
        c.x += c._spd * dt * wind;
        if (c.x - c.displayWidth / 2 > w) c.x = -c.displayWidth / 2;
      }
    }
  }

  setWindStrength(_) { /* petals/clouds read wind in update */ }

  destroy() {
    [...this.decor, ...this.water, ...this.glows].forEach(o => o && o.destroy());
    if (this.clouds) this.clouds.forEach(c => c.destroy());
    if (this.light) this.light.destroy();
    if (this.sun) this.sun.destroy();
    if (this.petals) this.petals.destroy();
  }
}
