/* ============================================================
   Windows.js — controllers for the Phase-3 Windows-95 windows:
   Inventory, Shop, Chest reward, Boss warning, Achievement toast,
   boss health bar and buff tray. Shares the Phase-1/2 chrome.
   ============================================================ */

import { SHOP, PASSIVES, WEAPONS, RARITY } from '../data/gamedata.js';

export class Windows {
  constructor(save) {
    this.save = save;
    this.ctx = null; // {scene, progression, weaponMgr} during a run

    this.el = {
      inv: document.getElementById('inventory-window'),
      shop: document.getElementById('shop-window'),
      chest: document.getElementById('chest-window'),
      bossWarn: document.getElementById('boss-warning'),
      achToast: document.getElementById('achievement-toast'),
      bossBar: document.getElementById('boss-bar'),
      bossFill: document.getElementById('boss-fill'),
      bossName: document.getElementById('boss-name'),
      buffTray: document.getElementById('buff-tray'),
      backdrop: document.getElementById('modal-backdrop'),
      menuCoins: document.getElementById('menu-coins'),
      shopCoins: document.getElementById('shop-coins'),
    };

    this._bind();
    this.refreshMenuCoins();
  }

  setRun(ctx) { this.ctx = ctx; }

  _bind() {
    document.querySelectorAll('[data-open="shop"]').forEach(b => b.addEventListener('click', () => this.showShop()));
    this.el.shop.querySelectorAll('[data-shop="close"]').forEach(b => b.addEventListener('click', () => this._hide(this.el.shop)));
    this.el.inv.querySelectorAll('[data-inv="close"]').forEach(b => b.addEventListener('click', () => this.closeInventory()));
    document.getElementById('inv-btn')?.addEventListener('click', () => { if (this.ctx) this.ctx.scene.toggleInventory(); });
    document.getElementById('chest-claim')?.addEventListener('click', () => this._claimChest());
  }

  _showBackdrop() { this.el.backdrop.classList.remove('hidden'); }
  _hideBackdrop() { this.el.backdrop.classList.add('hidden'); }
  _hide(el) { el.classList.add('hidden'); this._hideBackdrop(); }

  // ---------------- coins ----------------
  refreshMenuCoins() { if (this.el.menuCoins) this.el.menuCoins.textContent = this.save.data.coins; }

  // ---------------- SHOP ----------------
  showShop() {
    this.el.shopCoins.textContent = this.save.data.coins;
    const wrap = document.getElementById('shop-items');
    wrap.innerHTML = '';
    SHOP.forEach((item) => {
      const lv = this.save.permLevel(item.id);
      const maxed = lv >= item.max;
      const cost = maxed ? 0 : item.cost(lv);
      const row = document.createElement('div');
      row.className = 'shop-row' + (maxed ? ' maxed' : '');
      row.innerHTML = `<span class="shop-ico">${item.icon}</span>
        <div class="shop-info"><div class="shop-name">${item.name}</div>
          <div class="shop-desc">${item.desc}</div>
          <div class="shop-lv">Lv ${lv}/${item.max}</div></div>`;
      const btn = document.createElement('button');
      btn.className = 'w95-btn';
      btn.textContent = maxed ? 'MAX' : `${cost} \u25C6`;
      btn.disabled = maxed || this.save.data.coins < cost;
      btn.addEventListener('click', () => {
        if (this.save.spend(cost)) { this.save.buyLevel(item.id); this.showShop(); this.refreshMenuCoins(); }
      });
      row.appendChild(btn);
      wrap.appendChild(row);
    });
    this._showBackdrop();
    this.el.shop.classList.remove('hidden');
  }

  // ---------------- INVENTORY ----------------
  showInventory() {
    if (!this.ctx) return;
    const { progression: prog, weaponMgr: wm } = this.ctx;

    // Weapons.
    const wEl = document.getElementById('inv-weapons');
    wEl.innerHTML = '';
    const rose = WEAPONS.rose_bolt;
    wEl.appendChild(this._cell(rose.icon, rose.name, 'Lv ' + prog.roseLevel, RARITY[rose.rarity].color));
    wm.list().forEach(w => wEl.appendChild(this._cell(w.icon, w.name, 'Lv ' + w.level, RARITY[w.rarity].color)));

    // Passives.
    const pEl = document.getElementById('inv-passives');
    pEl.innerHTML = '';
    const taken = prog.passivesTaken || {};
    const ids = Object.keys(taken);
    if (!ids.length) pEl.innerHTML = '<div class="inv-empty">No passives yet.</div>';
    else ids.forEach(id => { const d = PASSIVES[id]; if (d) pEl.appendChild(this._cell(d.icon, d.name, 'x' + taken[id], '#5fd06a')); });

    // Stats.
    const s = prog.stats, m = prog.mods;
    const stat = document.getElementById('inv-stats');
    const rows = [
      ['Max HP', Math.round(s.maxHP)], ['Damage', '\u00d7' + m.dmgMult.toFixed(2)],
      ['Atk Speed', '\u00d7' + (1 / m.cdMult).toFixed(2)], ['Crit', Math.round((s.critChance + m.critChanceAdd) * 100) + '%'],
      ['Crit Dmg', '\u00d7' + (s.critMult + m.critDmgAdd).toFixed(1)], ['Move', '\u00d7' + s.moveMult.toFixed(2)],
      ['Magnet', Math.round(s.magnet)], ['Life Steal', Math.round(m.lifeSteal * 100) + '%'],
      ['Luck', '+' + Math.round(m.luck * 100) + '%'], ['Coins', prog.coins],
    ];
    stat.innerHTML = rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');

    this._showBackdrop();
    this.el.inv.classList.remove('hidden');
  }
  closeInventory() { this._hide(this.el.inv); if (this.ctx) this.ctx.scene.onInventoryClosed(); }
  isInventoryOpen() { return !this.el.inv.classList.contains('hidden'); }

  _cell(icon, name, lv, color) {
    const d = document.createElement('div');
    d.className = 'inv-cell';
    d.innerHTML = `<span class="inv-ico" style="color:${color}">${icon}</span><span>${name}</span><span class="inv-lv">${lv}</span>`;
    return d;
  }

  // ---------------- CHEST ----------------
  showChestReward(reward, onClaim) {
    this._pendingClaim = onClaim;
    document.getElementById('chest-title').textContent = reward.title;
    document.getElementById('chest-art').textContent = reward.icon || '\u{1F48E}';
    const col = RARITY[reward.rarityKey] ? RARITY[reward.rarityKey].color : '#fff';
    document.getElementById('chest-lines').innerHTML =
      `<div class="cl-main" style="color:${col}">${reward.lines[0]}</div><div>${reward.lines[1] || ''}</div>`;
    this._showBackdrop();
    this.el.chest.classList.remove('hidden');
  }
  _claimChest() {
    this._hide(this.el.chest);
    const cb = this._pendingClaim; this._pendingClaim = null;
    if (cb) cb();
  }

  // ---------------- BOSS WARNING ----------------
  showBossWarning(name) {
    document.getElementById('bw-name').textContent = name;
    this.el.bossWarn.classList.remove('hidden');
    clearTimeout(this._bwT);
    this._bwT = setTimeout(() => this.el.bossWarn.classList.add('hidden'), 3200);
  }

  // ---------------- BOSS BAR ----------------
  showBossBar(name) { this.el.bossName.textContent = name.toUpperCase(); this.el.bossBar.classList.remove('hidden'); }
  updateBossBar(frac) { this.el.bossFill.style.width = Math.max(0, frac * 100) + '%'; }
  hideBossBar() { this.el.bossBar.classList.add('hidden'); }

  // ---------------- BUFF TRAY ----------------
  setBuffs(list) {
    this.el.buffTray.innerHTML = list.map(b => `<div class="buff-chip">${b.name} ${Math.ceil(b.t)}s</div>`).join('');
  }

  // ---------------- ACHIEVEMENT ----------------
  showAchievement(ach) {
    document.getElementById('ach-ico').textContent = ach.icon;
    document.getElementById('ach-name').textContent = ach.name;
    const el = this.el.achToast;
    el.classList.remove('hidden');
    clearTimeout(this._achT);
    this._achT = setTimeout(() => el.classList.add('hidden'), 3600);
  }

  hideAll() {
    [this.el.inv, this.el.shop, this.el.chest, this.el.bossWarn].forEach(e => e.classList.add('hidden'));
    this.el.achToast.classList.add('hidden');
    this._hideBackdrop();
  }
}
