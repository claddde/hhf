/* ============================================================
   Joystick.js — lightweight DOM virtual joystick + run/pause
   buttons for touch devices. Exposes .vector {x,y} in (-1..1),
   .active and .running flags read by InputManager.
   ============================================================ */

export class Joystick {
  constructor() {
    this.vector = { x: 0, y: 0 };
    this.active = false;
    this.running = false;

    this.root  = document.getElementById('touch-controls');
    this.base  = document.getElementById('joystick-base');
    this.thumb = document.getElementById('joystick-thumb');
    this.runBtn = document.getElementById('run-btn');
    this.pauseBtn = document.getElementById('pause-btn');

    this.maxRadius = 44;
    this.touchId = null;

    this._bind();
  }

  isTouchDevice() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }

  show() { if (this.isTouchDevice()) this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); this._reset(); }

  onPause(cb) { this.pauseBtn.addEventListener('click', cb); }

  _reset() {
    this.active = false;
    this.vector.x = 0; this.vector.y = 0;
    this.touchId = null;
    this.thumb.style.transform = 'translate(-50%,-50%)';
  }

  _bind() {
    const start = (clientX, clientY, id) => {
      this.active = true; this.touchId = id;
      this._origin = this.base.getBoundingClientRect();
      this._move(clientX, clientY);
    };
    const move = (clientX, clientY) => {
      if (!this.active) return;
      this._move(clientX, clientY);
    };

    // Pointer events cover both touch and mouse-drag on the base.
    this.base.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.base.setPointerCapture(e.pointerId);
      start(e.clientX, e.clientY, e.pointerId);
    });
    this.base.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.touchId) return;
      move(e.clientX, e.clientY);
    });
    const end = (e) => { if (e.pointerId === this.touchId) this._reset(); };
    this.base.addEventListener('pointerup', end);
    this.base.addEventListener('pointercancel', end);

    // Run button (hold).
    const setRun = (v) => (e) => { e.preventDefault(); this.running = v; this.runBtn.classList.toggle('active', v); };
    this.runBtn.addEventListener('pointerdown', setRun(true));
    this.runBtn.addEventListener('pointerup', setRun(false));
    this.runBtn.addEventListener('pointerleave', setRun(false));
    this.runBtn.addEventListener('pointercancel', setRun(false));
  }

  _move(clientX, clientY) {
    const cx = this._origin.left + this._origin.width / 2;
    const cy = this._origin.top + this._origin.height / 2;
    let dx = clientX - cx, dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > this.maxRadius) { dx = dx / dist * this.maxRadius; dy = dy / dist * this.maxRadius; }
    this.thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.vector.x = dx / this.maxRadius;
    this.vector.y = dy / this.maxRadius;
  }
}
