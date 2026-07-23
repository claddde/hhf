/* ============================================================
   SelectScreen.js — Windows-95 character + world selection shown
   when the player presses Play. Multi-character ready: reads the
   CHARACTERS + MAPS tables, remembers the last choice, and hands
   {character, map} to the game start callback.
   ============================================================ */

import { CHARACTERS, MAPS, MAP_IDS } from '../data/maps.js';

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
      const unlocked = c.unlocked || this.save.data.unlockedCharacters?.includes(c.id) || true; // all playable for now
      const card = document.createElement('button');
      card.className = 'sel-card' + (c.id === this.character ? ' selected' : '');
      const tintStyle = c.tint ? `filter: drop-shadow(0 0 0 #000);` : '';
      card.innerHTML = `<div class="sel-thumb"><img src="assets/player/portrait.png" alt="${c.name}"
          style="${c.tint ? `filter: hue-rotate(0) saturate(1.2);` : ''}"/></div>
        <div class="sel-name">${c.name}</div><div class="sel-desc">${c.desc}</div>`;
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
    MAP_IDS.forEach((id) => {
      const m = MAPS[id];
      const card = document.createElement('button');
      card.className = 'sel-card' + (id === this.mapId ? ' selected' : '');
      card.innerHTML = `<div class="sel-swatch" style="background:${m.floorColor}"></div>
        <div class="sel-name">${m.name}</div>`;
      card.addEventListener('click', () => {
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
    if (cb) cb({ character: this.character, map: this.mapId });
  }
}
