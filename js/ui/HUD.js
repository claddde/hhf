/* ============================================================
   HUD.js — updates the DOM HUD each frame: HP bar, level, XP bar
   (top-left) and kills + elapsed time (top-right).
   ============================================================ */

export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.hpFill = document.getElementById('hp-fill');
    this.hpTxt = document.getElementById('hp-txt');
    this.lvl = document.getElementById('hud-lvl');
    this.xpFill = document.getElementById('xp-fill');
    this.xpTxt = document.getElementById('xp-txt');
    this.kills = document.getElementById('hud-kills');
    this.time = document.getElementById('hud-time');
    this.coins = document.getElementById('hud-coins');
  }

  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  update(prog, hp, maxHP, timeSec) {
    const hpPct = Math.max(0, hp / maxHP) * 100;
    this.hpFill.style.width = hpPct + '%';
    this.hpTxt.textContent = `${Math.max(0, Math.ceil(hp))}/${Math.round(maxHP)}`;

    this.lvl.textContent = prog.level;
    this.xpFill.style.width = Math.min(100, (prog.xp / prog.xpToNext) * 100) + '%';
    this.xpTxt.textContent = `${prog.xp} / ${prog.xpToNext}`;

    this.kills.textContent = prog.kills;
    const m = Math.floor(timeSec / 60), s = Math.floor(timeSec % 60);
    this.time.textContent = `${m}:${String(s).padStart(2, '0')}`;
    if (this.coins) this.coins.textContent = prog.coins;
  }
}
