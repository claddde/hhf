/* ============================================================
   SelectScreen.js — Windows-95 character + world selection shown
   when the player presses Play. Multi-character ready: reads the
   CHARACTERS + MAPS tables, remembers the last choice, and hands
   {character, map} to the game start callback.
   ============================================================ */

import { CHARACTERS, MAPS, MAP_IDS, REGIONS } from '../data/maps.js';

export class SelectScreen {
  constructor(save) {
    this.save = save;
    this.win = document.getElementById('select-window');
    this.charEl = document.getElementById('sel-characters');
    this.mapEl = document.getElementById('sel-maps');
    this.backdrop = document.getElementById('modal-backdrop');

    this.character = localStorage.getItem('hoodlust-char') || CHARACTERS[0].id;
    this.mapId = localStorage.getItem('hoodlust-map') || MAP_IDS[0];
    this._onStart = null;

    this.win.querySelectorAll('[data-select="close"]').forEach(b => b.addEventListener('click', () => this.hide()));
    document.getElementById('sel-start').addEventListener('click', () => this._start());
  }

  open(onStart) {
    this._onStart = onStart;
    this._renderChars();
    this._renderMaps();
    this.backdrop.classList.remove('hidden');
    this.win.classList.remove('hidden');
  }
  hide() { this.win.classList.add('hidden'); this.backdrop.classList.add('hidden'); }

  _renderChars() {
    this.charEl.innerHTML = '';
    CHARACTERS.forEach((c) => {
      const card = document.createElement('button');
      card.className = 'sel-card' + (c.id === this.character ? ' selected' : '');
      const stars = '\u2605'.repeat(c.difficulty || 1) + '\u2606'.repeat(5 - (c.difficulty || 1));
      card.innerHTML = `<div class="sel-thumb"><img src="assets/player/${c.portrait || 'portrait'}.png" alt="${c.name}"/></div>
        <div class="sel-name">${c.name}</div>
        <div class="sel-desc">${c.style || ''}<br><span style="color:#e0a020">${stars}</span></div>`;
      card.addEventListener('click', () => {
        this.character = c.id;
        this.charEl.querySelectorAll('.sel-card').forEach(x => x.classList.remove('selected'));
        card.classList.add('selected');
      });
      this.charEl.appendChild(card);
    });
  }

  _renderMaps() {
    this.mapEl.innerHTML = '';
    // PHASE 7.6 DEMO: maps unlock SEQUENTIALLY — a region opens only after the
    // previous region's boss is cleared. Locked maps show clearly as locked.
    const world = window.HOODLUST && window.HOODLUST.worldState;
    const { PROGRESSION_ORDER } = window.HOODLUST.__maps || {};
    const order = (PROGRESSION_ORDER && PROGRESSION_ORDER.length) ? PROGRESSION_ORDER : MAP_IDS;
    const unlocked = (id) => world ? world.isUnlocked(id) : true;
    if (this.mapId && !unlocked(this.mapId)) this.mapId = world ? world.current : order[0];
    order.forEach((id) => {
      const m = MAPS[id]; if (!m) return;
      const r = REGIONS[id];
      const open = unlocked(id);
      const cleared = world && world.isCleared(id);
      const card = document.createElement('button');
      card.className = 'sel-card' + (id === this.mapId ? ' selected' : '') + (open ? '' : ' locked');
      const status = open ? (cleared ? '\u2714 Cleared' : 'Lv ' + (r ? r.rec[0] + '–' + r.rec[1] : '?')) : '\uD83D\uDD12 Locked';
      card.innerHTML = `<div class="sel-swatch" style="background:${open ? m.floorColor : '#2a3648'}"></div>
        <div class="sel-name">${open ? m.name : '???'}</div>
        <div class="sel-desc">${open ? status : 'Clear previous map'}</div>`;
      if (open) card.addEventListener('click', () => {
        this.mapId = id;
        this.mapEl.querySelectorAll('.sel-card').forEach(x => x.classList.remove('selected'));
        card.classList.add('selected');
      });
      this.mapEl.appendChild(card);
    });
  }

  _start() {
    localStorage.setItem('hoodlust-char', this.character);
    localStorage.setItem('hoodlust-map', this.mapId);
    this.hide();
    const cb = this._onStart; this._onStart = null;
    if (cb) cb({ character: this.character, map: this.mapId, region: this.mapId });
  }
}
