/* ============================================================
   Weather.js — atmosphere-only weather. Cycles through the map's
   allowed weathers on a timer, adjusting overlays / rain / fog /
   wind strength. It NEVER touches gameplay values.
   ============================================================ */

import { DEPTH, CONFIG } from '../config.js';

export class Weather {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;
    this.list = map.weathers && map.weathers.length ? map.weathers : ['sunny'];
    this.current = null;
    this.wind = 1;
    this._timer = 0;
    this._interval = 26; // seconds between weather shifts
    this.rain = null;
    this.fog = null;

    this.fog = scene.add.tileSprite(0, 0, scene.scale.width, scene.scale.height, 'smoke')
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.FX + 2)
      .setAlpha(0).setTint(0xcdd8e8);
    scene.scale.on('resize', (gs) => this.fog && this.fog.setSize(gs.width, gs.height));

    this.set(Phaser.Utils.Array.GetRandom(this.list));
  }

  set(kind) {
    this.current = kind;
    // reset
    this.wind = 1;
    if (this.rain) { this.rain.destroy(); this.rain = null; }
    this.scene.tweens.add({ targets: this.fog, alpha: 0, duration: 1200 });

    switch (kind) {
      case 'wind':
        this.wind = 2.6; break;
      case 'fog':
        this.wind = 1.2;
        this.scene.tweens.add({ targets: this.fog, alpha: 0.22, duration: 1800 });
        break;
      case 'light_rain':
      case 'rain':
        this.wind = 1.6; this._makeRain(); break;
      case 'moonlight':
        this.wind = 0.9;
        this.scene.tweens.add({ targets: this.fog, alpha: 0.10, duration: 1800 });
        break;
      case 'sunny':
      default:
        this.wind = 1; break;
    }
    this.scene.onWeatherChanged?.(kind);
  }

  _makeRain() {
    const { width, height } = this.scene.scale;
    this.rain = this.scene.add.particles(0, 0, 'spark', {
      x: { min: 0, max: width }, y: -10,
      lifespan: 900, quantity: 4, frequency: 30,
      speedY: { min: 520, max: 640 }, speedX: { min: -60, max: -20 },
      scaleX: 0.25, scaleY: 1.4, tint: 0x9fd0ff, alpha: { start: 0.6, end: 0.1 },
    }).setScrollFactor(0).setDepth(DEPTH.FX + 2);
  }

  update(dt) {
    this._timer += dt;
    if (this._timer >= this._interval) {
      this._timer = 0;
      if (this.list.length > 1) {
        let next = this.current;
        while (next === this.current) next = Phaser.Utils.Array.GetRandom(this.list);
        this.set(next);
      }
    }
    if (this.fog && this.fog.alpha > 0) {
      this.fog.tilePositionX += dt * 12 * this.wind;
      this.fog.tilePositionY += dt * 4;
    }
  }

  destroy() {
    if (this.rain) this.rain.destroy();
    if (this.fog) this.fog.destroy();
  }
}
