/* ============================================================
   Dialogs.js — Windows 95 styled in-game popups: Level Up,
   Pause and Game Over. Each takes callbacks; the caller
   (GameScene) handles pausing/resuming physics.
   ============================================================ */

export class Dialogs {
  constructor() {
    this.backdrop = document.getElementById('modal-backdrop');
    this.levelup = document.getElementById('levelup-dialog');
    this.pause = document.getElementById('pause-dialog');
    this.gameover = document.getElementById('gameover-dialog');
    this.choicesEl = document.getElementById('upgrade-choices');
    this.open = false;

    // Pause dialog buttons.
    this.pause.querySelectorAll('[data-pause]').forEach((b) => {
      b.addEventListener('click', () => {
        const a = b.dataset.pause;
        if (a === 'settings') { document.getElementById('settings-window')?.classList.remove('hidden'); return; }
        this._hide(this.pause);
        if (a === 'resume') this._cb('onResume');
        if (a === 'quit')   this._cb('onQuit');
      });
    });
    // Game over buttons.
    this.gameover.querySelectorAll('[data-over]').forEach((b) => {
      b.addEventListener('click', () => {
        const a = b.dataset.over;
        this._hide(this.gameover);
        if (a === 'retry') this._cb('onRetry');
        if (a === 'menu')  this._cb('onMenu');
      });
    });

    this.handlers = {};
  }

  _cb(name) { if (this.handlers[name]) this.handlers[name](); }
  _showBackdrop() { this.backdrop.classList.remove('hidden'); this.open = true; }
  _hide(el) { el.classList.add('hidden'); this.backdrop.classList.add('hidden'); this.open = false; }

  /** @param {Array} choices upgrade defs @param {number} level @param {(u)=>void} onPick */
  showLevelUp(choices, level, onPick) {
    document.getElementById('levelup-lvl').textContent = 'Level ' + level;
    this.choicesEl.innerHTML = '';
    choices.forEach((u) => {
      const btn = document.createElement('button');
      btn.className = 'upgrade-card';
      btn.innerHTML = `<span class="u-name"><span class="u-ico" style="color:${u.color || '#7d1330'}">${u.icon || '\u2740'}</span>${u.name}</span><span class="u-desc">${u.desc}</span>`;
      btn.addEventListener('click', () => { this._hide(this.levelup); onPick(u); }, { once: true });
      this.choicesEl.appendChild(btn);
    });
    this._showBackdrop();
    this.levelup.classList.remove('hidden');
  }

  showPause(onResume, onQuit) {
    this.handlers.onResume = onResume;
    this.handlers.onQuit = onQuit;
    this._showBackdrop();
    this.pause.classList.remove('hidden');
  }

  hidePause() { this._hide(this.pause); }
  isPauseOpen() { return !this.pause.classList.contains('hidden'); }

  showGameOver(stats, onRetry, onMenu) {
    this.handlers.onRetry = onRetry;
    this.handlers.onMenu = onMenu;
    document.getElementById('go-time').textContent = stats.time;
    document.getElementById('go-kills').textContent = stats.kills;
    document.getElementById('go-level').textContent = stats.level;
    const scoreEl = document.getElementById('go-score');
    if (scoreEl) scoreEl.textContent = (stats.score || 0).toLocaleString();
    this._showBackdrop();
    this.gameover.classList.remove('hidden');
  }

  hideAll() {
    [this.levelup, this.pause, this.gameover].forEach((e) => e.classList.add('hidden'));
    this.backdrop.classList.add('hidden');
    this.open = false;
  }
}
