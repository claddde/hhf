/* ============================================================
   WorldMapUI.js — PHASE 7.5 Windows-95 world map.
   Renders every region on a grid with connection lines, the
   player's current position, locked (undiscovered) regions as
   "???", feature icons, recommended level bands and an over-level
   warning. Fast-travel is enabled ONLY for discovered regions.
   ============================================================ */

import { REGIONS, REGION_IDS, TRAVEL } from '../data/maps.js';

const FEAT_ICON = { boss: '\u2620', merchant: '\u{1F6D2}', dungeon: '\u2021', secret: '\u2726', night: '\u263E' };
const FEAT_LABEL = { boss: 'Regional Boss', merchant: 'Merchant', dungeon: 'Mini-Dungeon', secret: 'Secret Area', night: 'Night Boss' };

export class WorldMapUI {
  constructor(save, worldState) {
    this.save = save;
    this.world = worldState;
    this.win = document.getElementById('worldmap-window');
    this.backdrop = document.getElementById('modal-backdrop');
    this.nodesEl = document.getElementById('wm-nodes');
    this.linksEl = document.getElementById('wm-links');
    this.detailEl = document.getElementById('wm-detail');
    this.selected = null;
    this._onTravel = null;
    this.playerLevel = 1;

    this.win.querySelectorAll('[data-worldmap="close"]').forEach(b => b.addEventListener('click', () => this.hide()));
    document.querySelectorAll('[data-open="worldmap"]').forEach(b => b.addEventListener('click', () => this.open()));
    document.getElementById('wm-travel').addEventListener('click', () => this._travel());
  }

  open(onTravel = null, playerLevel = 1) {
    this._onTravel = onTravel;
    this.playerLevel = playerLevel || (this.save.data.highestLevel || 1);
    this.selected = this.world.current;
    document.getElementById('wm-worldlevel').textContent = this.world.recompute(this.playerLevel);
    const p = this.world.progress();
    document.getElementById('wm-progress').textContent = `${p.found}/${p.total}`;
    this._render();
    this.backdrop.classList.remove('hidden');
    this.win.classList.remove('hidden');
  }
  hide() { this.win.classList.add('hidden'); this.backdrop.classList.add('hidden'); }

  _px(pos) {
    const W = this.nodesEl.clientWidth || 560, H = this.nodesEl.clientHeight || 320;
    // Dynamic grid bounds so any number of regions fits.
    if (!this._bounds) {
      let mx = 0, my = 0;
      for (const id of REGION_IDS) { mx = Math.max(mx, REGIONS[id].pos.x); my = Math.max(my, REGIONS[id].pos.y); }
      this._bounds = { cols: mx + 1, rows: my + 1 };
    }
    const { cols, rows } = this._bounds;
    return { x: ((pos.x + 0.5) / cols) * W, y: ((pos.y + 0.5) / rows) * H };
  }

  _render() {
    // Connection lines (only between at-least-one-discovered pairs; else dim).
    const seen = new Set();
    let svg = '';
    for (const id of REGION_IDS) {
      const r = REGIONS[id], a = this._px(r.pos);
      for (const l of (r.links || [])) {
        const key = [id, l.to].sort().join('|'); if (seen.has(key)) continue; seen.add(key);
        const b = this._px(REGIONS[l.to].pos);
        const known = this.world.isDiscovered(id) || this.world.isDiscovered(l.to);
        svg += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${known ? '#f2d16b' : '#3a5068'}" stroke-width="${known ? 2 : 1}" stroke-dasharray="${known ? '0' : '4 3'}"/>`;
      }
    }
    this.linksEl.innerHTML = svg;

    // Region nodes.
    this.nodesEl.innerHTML = '';
    for (const id of REGION_IDS) {
      const r = REGIONS[id], p = this._px(r.pos);
      const disc = this.world.isDiscovered(id);
      const node = document.createElement('div');
      node.className = 'wm-node' + (disc ? '' : ' locked') + (id === this.world.current ? ' current' : '') + (id === this.selected ? ' selected' : '');
      node.style.left = p.x + 'px'; node.style.top = p.y + 'px';
      const icons = disc ? Object.keys(r.features || {}).map(f => FEAT_ICON[f] || '').join(' ') : '';
      node.innerHTML =
        (id === this.world.current ? '<span class="wm-you">YOU</span>' : '') +
        `<div class="wm-dot" style="background:${disc ? r.color : '#2a3648'}"></div>` +
        `<div class="wm-name">${disc ? r.name : '???'}</div>` +
        `<div class="wm-icons">${icons}</div>` +
        `<div class="wm-danger" style="color:${disc ? r.color : '#5a6a7a'}">${disc ? r.danger : 'Undiscovered'}</div>`;
      if (disc) node.addEventListener('click', () => { this.selected = id; this._render(); this._detail(id); });
      this.nodesEl.appendChild(node);
    }
    this._detail(this.selected);
  }

  _detail(id) {
    const r = REGIONS[id]; const t = document.getElementById('wm-travel');
    if (!r || !this.world.isDiscovered(id)) {
      this.detailEl.innerHTML = 'Undiscovered region — reach it through a portal to unlock fast travel.';
      t.disabled = true; return;
    }
    const over = this.world.isOverLevel(id, this.playerLevel);
    const feats = Object.keys(r.features || {}).map(f => FEAT_LABEL[f]).filter(Boolean).join(' · ');
    this.detailEl.innerHTML =
      `<b>${r.name}</b> — <span style="color:${r.color}">${r.danger}</span> · ` +
      `<span class="wm-rec">Recommended Lv ${r.rec[0]}–${r.rec[1]}</span>` +
      (over ? ` <span class="wm-warn">⚠ Above your level (${this.playerLevel})</span>` : '') +
      (feats ? `<br><span style="font-size:10px">${feats}</span>` : '') +
      `<br><span class="wm-lore">${r.lore}</span>`;
    t.disabled = false;
    t.textContent = id === this.world.current ? 'Enter ▶' : 'Fast Travel ▶';
  }

  _travel() {
    const id = this.selected;
    if (!id || !this.world.isDiscovered(id)) return;
    this.hide();
    const cb = this._onTravel || this._onTravelDefault; this._onTravel = null;
    if (cb) cb(id);
  }
}
