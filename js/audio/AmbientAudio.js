/* ============================================================
   AmbientAudio.js — per-map procedural ambient music + gentle
   environmental sounds (birds, wind, water, leaves) using
   WebAudio. Volume follows the Settings "Music Volume". No asset
   files. Reuses the shared AudioContext from SFX when available.
   ============================================================ */

export class AmbientAudio {
  constructor(sfx) {
    this.sfx = sfx;             // share its AudioContext + resume-on-gesture
    this.map = null;
    this._noteT = 0;
    this._birdT = 0;
    this.playing = false;
    this.wind = 1;
    this._windNode = null;
    this._windGain = null;
  }

  get ctx() { return this.sfx && this.sfx.ctx; }
  _musicVol() { const s = window.HOODLUST_SETTINGS; return (s ? s.musicVol / 100 : 0.7); }
  _sndVol()   { const s = window.HOODLUST_SETTINGS; return (s ? s.soundVol / 100 : 0.8); }

  start(map) {
    this.map = map;
    this.playing = true;
    this._noteT = 0; this._birdT = 2;
    this._startWind();
  }

  stop() {
    this.playing = false;
    this._stopWind();
  }

  // ---- gentle looping wind bed (filtered noise) ----
  _startWind() {
    const ctx = this.ctx; if (!ctx) return;
    this._stopWind();
    const n = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = ctx.createGain(); g.gain.value = 0.0;
    src.connect(lp); lp.connect(g); g.connect(this.sfx.master);
    src.start();
    this._windNode = src; this._windGain = g;
  }
  _stopWind() {
    if (this._windNode) { try { this._windNode.stop(); } catch (_) {} this._windNode = null; }
    this._windGain = null;
  }

  _note(freq, dur, wave, vol) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = wave; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol * this._musicVol(), t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfx.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  _chirp() {
    const ctx = this.ctx; if (!ctx) return;
    const base = 1800 + Math.random() * 900;
    for (let i = 0; i < 3; i++) setTimeout(() => this._note(base + i * 120, 0.06, 'sine', 0.05 * this._sndVol() / this._musicVol()), i * 60);
  }

  update(dt, wind = 1) {
    if (!this.playing || !this.ctx || !this.map) return;
    this.wind = wind;

    // wind bed level follows weather wind + music volume.
    if (this._windGain) {
      const target = Math.min(0.14, 0.03 + wind * 0.03) * this._musicVol();
      this._windGain.gain.value += (target - this._windGain.gain.value) * Math.min(1, dt * 2);
    }

    // arpeggiated ambient melody from the map's scale.
    const m = this.map.music;
    this._noteT -= dt;
    if (this._noteT <= 0) {
      this._noteT = m.tempo * (0.7 + Math.random() * 0.6);
      const deg = m.scale[Math.floor(Math.random() * m.scale.length)];
      const oct = Math.random() < 0.3 ? 2 : 1;
      const freq = m.root * Math.pow(2, deg / 12) * oct;
      this._note(freq, 1.4 + Math.random(), m.wave, 0.05);
      // occasional soft harmony
      if (Math.random() < 0.4) this._note(freq * 1.5, 1.2, m.wave, 0.03);
    }

    // birds occasionally (skip on graveyard/crystal night maps).
    const birdy = (this.map.creatures || []).includes('bird');
    if (birdy) {
      this._birdT -= dt;
      if (this._birdT <= 0) { this._birdT = 4 + Math.random() * 7; this._chirp(); }
    }
  }
}
