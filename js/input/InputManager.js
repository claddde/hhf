/* ============================================================
   InputManager.js — unifies keyboard, virtual joystick and
   gamepad into a single movement vector + run flag.
   Consumers call getMoveVector() and isRunning() each frame.
   ============================================================ */

export class InputManager {
  /**
   * @param {Phaser.Scene} scene
   * @param {Joystick} joystick  optional on-screen joystick
   */
  constructor(scene, joystick = null) {
    this.scene = scene;
    this.joystick = joystick;

    // Keyboard: WASD + arrows + Shift (run)
    const kb = scene.input.keyboard;
    this.keys = kb.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      upA: 'UP', downA: 'DOWN', leftA: 'LEFT', rightA: 'RIGHT',
      run: 'SHIFT',
    });

    // Gamepad support is opt-in in Phaser; it is enabled in the game config.
    this.pad = null;
    if (scene.input.gamepad) {
      scene.input.gamepad.once('connected', (pad) => { this.pad = pad; });
      // If a pad is already present (page reload), grab it.
      if (scene.input.gamepad.total > 0) this.pad = scene.input.gamepad.getPad(0);
    }

    this._vec = { x: 0, y: 0 };
  }

  /** @returns {{x:number,y:number}} normalized-ish move vector (-1..1). */
  getMoveVector() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.left.isDown || k.leftA.isDown)   x -= 1;
    if (k.right.isDown || k.rightA.isDown) x += 1;
    if (k.up.isDown || k.upA.isDown)       y -= 1;
    if (k.down.isDown || k.downA.isDown)   y += 1;

    // Virtual joystick (mobile) overrides only when actually pushed.
    if (this.joystick && this.joystick.active) {
      x = this.joystick.vector.x;
      y = this.joystick.vector.y;
    }

    // Gamepad left stick.
    if (this.pad && this.pad.connected) {
      const ax = this.pad.axes.length ? this.pad.axes[0].getValue() : 0;
      const ay = this.pad.axes.length > 1 ? this.pad.axes[1].getValue() : 0;
      if (Math.abs(ax) > 0.15 || Math.abs(ay) > 0.15) { x = ax; y = ay; }
    }

    // Normalize so diagonals are not faster than cardinals.
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this._vec.x = x; this._vec.y = y;
    return this._vec;
  }

  /** @returns {boolean} whether the run modifier is engaged. */
  isRunning() {
    if (this.keys.run.isDown) return true;
    if (this.joystick && this.joystick.running) return true;
    if (this.pad && this.pad.connected) {
      // A button (0) or right trigger commonly used for run.
      if (this.pad.buttons[0] && this.pad.buttons[0].pressed) return true;
      if (this.pad.buttons[7] && this.pad.buttons[7].value > 0.4) return true;
    }
    return false;
  }
}
