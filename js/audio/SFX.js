/* ============================================================
   SFX.js — tiny procedural WebAudio sound effects (no asset
   files). Retro blips/noise for weapons, coins, level-up, chest,
   boss, rare item. Volume driven by the Settings (music/sound).
   ============================================================ */

export class SFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._init = false;
    // Resume/create the audio context on first user gesture.
    const kick = () => { this._ensure(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
  }

  _ensure() {
    if (this._init) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this._init = true;
    } catch (_) {}
  }

  _vol() {
    const s = window.HOODLUST_SETTINGS;
    return s ? (s.soundVol / 100) : 0.8;
  }

  _blip(freq, dur, type = 'square', vol = 0.2, slideTo = null) {
    if (!this._init) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol * this._vol(), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur);
  }

  _noise(dur, vol = 0.2) {
    if (!this._init) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol * this._vol();
    src.connect(g); g.connect(this.master); src.start(t);
  }

  shoot()    { this._blip(660, 0.07, 'square', 0.06, 880); }
  hitboss()  { this._blip(120, 0.12, 'sawtooth', 0.12, 60); }
  coin()     { this._blip(880, 0.05, 'square', 0.12, 1320); this._blip(1320, 0.06, 'square', 0.08); }
  heal()     { this._blip(520, 0.14, 'triangle', 0.16, 780); }
  levelup()  { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._blip(f, 0.14, 'square', 0.14), i * 90)); }
  chest()    { [392, 523, 659, 880].forEach((f, i) => setTimeout(() => this._blip(f, 0.12, 'triangle', 0.14), i * 70)); }
  rare()     { [659, 988, 1319].forEach((f, i) => setTimeout(() => this._blip(f, 0.18, 'square', 0.16, f * 1.2), i * 110)); }
  boss()     { this._blip(80, 0.6, 'sawtooth', 0.2, 40); this._noise(0.5, 0.1); }
  hurt()     { this._noise(0.16, 0.16); this._blip(160, 0.12, 'sawtooth', 0.1, 80); }
  explode()  { this._noise(0.3, 0.2); this._blip(90, 0.3, 'sawtooth', 0.12, 40); }
}
