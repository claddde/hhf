/* ============================================================
   Player.js — the playable HoodLust character.
   Handles 8-direction movement with smooth acceleration and
   stopping, facing/flip, and idle/walk/run states.

   Animation-ready: if directional spritesheet anims exist
   (keys 'idle'/'walk'/'run'), they are played automatically.
   With a single static portrait we fall back to a subtle
   squash/bob so movement still reads clearly. The art itself
   is NEVER redrawn or smoothed.
   ============================================================ */

import { CONFIG, DEPTH } from '../config.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, texture = 'idle') {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    const c = CONFIG.player;
    this.cfg = c;

    // --- Full-body sheet frames are tall (feet at the bottom of each cell).
    // Anchor at the feet so every animation lines up, and scale DOWN to a
    // target height (never up — preserves the original pixel quality). ---
    this.setOrigin(0.5, 1);
    const fw = this.width, fh = this.height;
    const targetH = c.displaySize * 1.4;
    this.setScale(Math.min(1, targetH / fh));
    this.setDepth(DEPTH.PLAYER);

    // --- Collision body: a feet-area band at the bottom of the frame ---
    const bw = fw * c.bodyScaleX;
    const bh = fh * c.bodyScaleY;
    this.body.setSize(bw, bh);
    this.body.setOffset((fw - bw) / 2, fh - bh - fh * 0.04);
    this.setCollideWorldBounds(true);

    // --- State ---
    this.state = 'idle';       // idle | walk | run
    this.facing = 'down';      // 8-way label, useful for future anims
    this._bobT = 0;
    this._baseScale = this.scale;
    this._locked = false;      // true during death (stops state machine)

    this.play('idle');

    // Soft shadow that tracks the player's feet (origin is at the feet).
    this.shadow = scene.add.ellipse(x, y, c.displaySize * 0.42, c.displaySize * 0.16, 0x000000, 0.35);
    this.shadow.setDepth(DEPTH.PLAYER - 1);
  }

  /**
   * @param {number} delta  ms since last frame
   * @param {{x:number,y:number}} moveVec  input direction (-1..1)
   * @param {boolean} running
   */
  update(delta, moveVec, running) {
    const c = this.cfg;
    const dt = delta / 1000;
    if (this._locked) { this.setVelocity(0, 0); this.shadow.setPosition(this.x, this.y); return; }
    const moving = (moveVec.x !== 0 || moveVec.y !== 0);
    const maxSpeed = running ? c.runSpeed : c.walkSpeed;

    // Target velocity from input.
    const targetVX = moveVec.x * maxSpeed;
    const targetVY = moveVec.y * maxSpeed;

    // Frame-rate independent smoothing toward the target (accel / decel).
    const rate = moving ? c.accel : c.decel;
    const t = 1 - Math.exp(-rate * dt);
    const vx = Phaser.Math.Linear(this.body.velocity.x, targetVX, t);
    const vy = Phaser.Math.Linear(this.body.velocity.y, targetVY, t);
    this.setVelocity(vx, vy);

    // --- State machine ---
    const speed = Math.hypot(vx, vy);
    let next = 'idle';
    if (moving && speed > 4) next = running ? 'run' : 'walk';
    if (next !== this.state) this._setState(next);

    // --- Facing (8-direction) ---
    if (moving) {
      this.facing = this._facingFromVec(moveVec.x, moveVec.y);
      // Flip sprite for left-ward movement (portrait faces forward).
      if (moveVec.x < -0.15) this.setFlipX(true);
      else if (moveVec.x > 0.15) this.setFlipX(false);
    }

    // --- Movement feedback (fallback when no frame anims) ---
    this._animateFallback(dt, speed, maxSpeed);

    // Keep the shadow glued to the feet (origin is at the feet: y === feet).
    this.shadow.setPosition(this.x, this.y);
  }

  _setState(s) {
    this.state = s;
    // Play a real animation if one has been registered for this state.
    const key = `${s}-${this.facing}`;
    if (this.anims && this.scene.anims.exists(key)) this.play(key, true);
    else if (this.scene.anims.exists(s)) this.play(s, true);
  }

  /** One-shot hurt flash + animation (returns to state machine after). */
  playHurt() {
    if (this._locked || !this.scene.anims.exists('hurt')) return;
    this.play('hurt', true);
    this.state = '_hurt';
    this.once('animationcomplete-hurt', () => { if (!this._locked) this._setState('idle'); });
  }

  /** Death: lock control and play the death animation once. */
  playDeath() {
    this._locked = true;
    this.setVelocity(0, 0);
    if (this.scene.anims.exists('death')) this.play('death', true);
  }

  _facingFromVec(x, y) {
    const a = Phaser.Math.RadToDeg(Math.atan2(y, x));
    const dirs = ['right','down-right','down','down-left','left','up-left','up','up-right'];
    const idx = Math.round(((a + 360) % 360) / 45) % 8;
    return dirs[idx];
  }

  // Subtle squash/bob so idle-art still communicates walk vs run.
  _animateFallback(dt, speed, maxSpeed) {
    if (this.scene.anims.exists(this.state)) return; // real anims take over
    if (speed > 4) {
      const freq = this.state === 'run' ? 15 : 9;
      this._bobT += dt * freq;
      const amp = this.state === 'run' ? 0.06 : 0.035;
      const s = this._baseScale * (1 + Math.sin(this._bobT) * amp);
      this.setScale(this._baseScale * (1 - Math.sin(this._bobT) * amp * 0.5), s);
    } else {
      this._bobT = 0;
      // ease back to rest scale
      const s = Phaser.Math.Linear(this.scaleY, this._baseScale, 1 - Math.exp(-10 * dt));
      this.setScale(this._baseScale, s);
    }
  }

  destroy(fromScene) {
    if (this.shadow) this.shadow.destroy();
    super.destroy(fromScene);
  }
}
