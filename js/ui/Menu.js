/* ============================================================
   Menu.js — wires the Windows 95 DOM UI to the Phaser game:
   Play / Settings / Credits / Exit, taskbar clock, settings
   persistence (localStorage), fullscreen toggle.
   ============================================================ */

export class Menu {
  /**
   * @param {Phaser.Game} game
   * @param {Joystick} joystick
   */
  constructor(game, joystick) {
    this.game = game;
    this.joystick = joystick;
    this.started = false;   // has GameScene been created yet?
    this.ready = false;     // engine finished preloading?

    this.el = {
      desktop:  document.getElementById('desktop'),
      menuWin:  document.getElementById('menu-window'),
      settings: document.getElementById('settings-window'),
      credits:  document.getElementById('credits-window'),
      shutdown: document.getElementById('shutdown'),
      status:   document.getElementById('menu-status'),
      clock:    document.getElementById('clock'),
    };

    // Default settings (persisted).
    this.settings = Object.assign(
      { musicVol: 70, soundVol: 80, fullscreen: false, lang: 'en' },
      JSON.parse(localStorage.getItem('hoodlust-settings') || '{}')
    );

    this._bindActions();
    this._bindSettings();
    this._startClock();

    // Engine-ready signal from BootScene.
    window.addEventListener('hoodlust-ready', () => {
      this.ready = true;
      if (this.el.status) this.el.status.textContent = 'Ready. Press Play.';
    });
    // In-game ESC / pause button asks to reopen the menu.
    window.addEventListener('hoodlust-open-menu', () => this.openMenu());

    // Quit-to-menu from the in-game Pause / Game Over dialogs.
    window.addEventListener('hoodlust-quit', () => {
      this.started = false;
      this.game.scene.stop('GameScene');
      this.openMenu();
    });

    // Mobile pause button.
    if (this.joystick) this.joystick.onPause(() => this.openMenu());

    // Keyboard mnemonics (P/S/C/E) while the menu is visible.
    document.addEventListener('keydown', (e) => {
      if (this.el.desktop.classList.contains('hidden')) return;
      const map = { p: 'play', s: 'settings', c: 'credits', e: 'exit' };
      const a = map[e.key.toLowerCase()];
      if (a) this._doAction(a);
    });
  }

  _bindActions() {
    document.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => this._doAction(btn.dataset.action));
    });
  }

  _doAction(action) {
    switch (action) {
      case 'play':          this.play(); break;
      case 'settings':      this.el.settings.classList.remove('hidden'); break;
      case 'close-settings':this.el.settings.classList.add('hidden'); this._save(); break;
      case 'credits':       this.el.credits.classList.remove('hidden'); break;
      case 'close-credits': this.el.credits.classList.add('hidden'); break;
      case 'exit':          this.exit(); break;
      case 'reboot':        this.openMenu(); this.el.shutdown.classList.add('hidden'); break;
      case 'menu':          this.openMenu(); break;
    }
  }

  play() {
    if (!this.ready) return; // engine still loading

    // If a run is already in progress (paused), just resume it.
    if (this.started) {
      this.el.desktop.classList.add('hidden');
      if (this.joystick) this.joystick.show();
      this.game.scene.resume('GameScene');
      return;
    }

    const openSelection = () => {
      // Phase-4 character + world selection.
      window.HOODLUST.ui.select.open(({ character, map }) => {
        this.el.desktop.classList.add('hidden');
        if (this.joystick) this.joystick.show();
        this.game.scene.start('GameScene', { joystick: this.joystick, character, map });
        this.started = true;
      });
    };

    // Phase-5 gate: verified holders (or Demo) may proceed to selection.
    const web3 = window.HOODLUST.ui.web3;
    if (web3.isVerified() || web3.session.demo) openSelection();
    else web3.openGate(() => openSelection());
  }

  openMenu() {
    this.el.desktop.classList.remove('hidden');
    if (this.joystick) this.joystick.hide();
    if (this.started) this.game.scene.pause('GameScene');
  }

  exit() {
    this.el.desktop.classList.add('hidden');
    if (this.joystick) this.joystick.hide();
    if (this.started) this.game.scene.pause('GameScene');
    this.el.shutdown.classList.remove('hidden');
  }

  // ---- Settings ----
  _bindSettings() {
    const music = document.getElementById('music-vol');
    const sound = document.getElementById('sound-vol');
    const musicOut = document.getElementById('music-vol-out');
    const soundOut = document.getElementById('sound-vol-out');
    const full = document.getElementById('fullscreen-toggle');
    const lang = document.getElementById('lang-select');

    // Initialise from saved settings.
    music.value = this.settings.musicVol; musicOut.textContent = this.settings.musicVol;
    sound.value = this.settings.soundVol; soundOut.textContent = this.settings.soundVol;
    full.checked = this.settings.fullscreen;
    lang.value = this.settings.lang;

    music.addEventListener('input', () => { this.settings.musicVol = +music.value; musicOut.textContent = music.value; });
    sound.addEventListener('input', () => { this.settings.soundVol = +sound.value; soundOut.textContent = sound.value; });
    lang.addEventListener('change', () => { this.settings.lang = lang.value; this._save(); });
    full.addEventListener('change', () => {
      this.settings.fullscreen = full.checked;
      try {
        if (full.checked) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      } catch (_) {}
      this._save();
    });
    // Expose current settings globally for future audio system (Phase 4).
    window.HOODLUST_SETTINGS = this.settings;
  }

  _save() {
    localStorage.setItem('hoodlust-settings', JSON.stringify(this.settings));
    window.HOODLUST_SETTINGS = this.settings;
  }

  _startClock() {
    const tick = () => {
      const d = new Date();
      const h = d.getHours() % 12 || 12;
      const m = String(d.getMinutes()).padStart(2, '0');
      const ap = d.getHours() < 12 ? 'AM' : 'PM';
      if (this.el.clock) this.el.clock.textContent = `${h}:${m} ${ap}`;
    };
    tick();
    setInterval(tick, 15000);
  }
}
