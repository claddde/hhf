/* ============================================================
   EcosystemUI.js — Phase 7 Windows-95 windows for the live
   ecosystem: Season hub, Battle Pass, Daily/Weekly Missions,
   Cosmetics locker, Accessibility and Streamer Mode. Reads/writes
   the LiveOps engine. Cosmetic + progression only — no gameplay
   changes. Reuses the existing modal-backdrop + toast patterns.
   ============================================================ */

import { LiveOps } from '../systems/LiveOps.js';

export class EcosystemUI {
  constructor(save) {
    this.save = save;
    this.liveops = new LiveOps(save);
    this.backdrop = document.getElementById('modal-backdrop');
    this.a11y = this._loadA11y();
    this._applyA11y();
    this._bind();
  }

  // ---------- bindings ----------
  _bind() {
    const openMap = {
      season: () => this.showSeason(),
      battlepass: () => this.showBattlePass(),
      missions: () => this.showMissions(),
      cosmetics: () => this.showCosmetics(),
      accessibility: () => this.showAccessibility(),
    };
    document.querySelectorAll('[data-open]').forEach(b => {
      const t = b.getAttribute('data-open');
      if (openMap[t]) b.addEventListener('click', openMap[t]);
    });
    document.querySelectorAll('[data-eco-close]').forEach(b =>
      b.addEventListener('click', () => this._hide(b.getAttribute('data-eco-close'))));
  }

  _show(id) { this.backdrop.classList.remove('hidden'); document.getElementById(id).classList.remove('hidden'); }
  _hide(id) { document.getElementById(id).classList.add('hidden'); this.backdrop.classList.add('hidden'); }
  _toast(icon, msg) {
    const el = document.getElementById('achievement-toast');
    document.getElementById('ach-ico').textContent = icon;
    document.getElementById('ach-name').textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._t); this._t = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  // ---------- season ----------
  showSeason() {
    const lo = this.liveops, s = lo.season();
    document.getElementById('season-body').innerHTML = `
      <div class="eco-hero">
        <div class="eco-hero-title">${s.name}</div>
        <div class="eco-muted">${lo.seasonDaysLeft()} days left · Tier ${lo.bpTier()}/${s.tiers}</div>
        <div class="eco-bar"><div class="eco-bar-fill" style="width:${(lo.seasonProgress() * 100).toFixed(1)}%"></div></div>
      </div>
      <div class="eco-cards">
        <button class="eco-card" data-goto="battlepass"><b>Battle Pass</b><span>${lo.isAccessPass() ? 'Access Pass' : 'Free'} · Tier ${lo.bpTier()}</span></button>
        <button class="eco-card" data-goto="missions"><b>Missions</b><span>Daily &amp; Weekly</span></button>
        <button class="eco-card" data-goto="cosmetics"><b>Cosmetics</b><span>${lo.ownedCosmetics().length} owned</span></button>
      </div>
      <div class="eco-section">Season Stats</div>
      <div class="eco-stats">
        <div><span>Lifetime Kills</span><b>${this.save.data.totalKills || 0}</b></div>
        <div><span>Runs</span><b>${this.save.data.runs || 0}</b></div>
        <div><span>Best Score</span><b>${(this.save.data.bestScore || 0).toLocaleString()}</b></div>
        <div><span>Bosses</span><b>${this.save.data.bosses || 0}</b></div>
      </div>`;
    document.querySelectorAll('#season-body [data-goto]').forEach(b => b.addEventListener('click', () => {
      this._hide('season-window');
      ({ battlepass: () => this.showBattlePass(), missions: () => this.showMissions(), cosmetics: () => this.showCosmetics() })[b.dataset.goto]();
    }));
    this._show('season-window');
  }

  // ---------- battle pass (horizontal sliding track) ----------
  showBattlePass() {
    this._renderBp();
    this._show('battlepass-window');
    this._bpBindDrag();
  }
  _renderBp() {
    const lo = this.liveops;
    const access = lo.isAccessPass();
    const tier = lo.bpTier();
    const curXp = lo.state.bpXp % 1000;
    const reqXp = 1000;

    document.getElementById('bp-head').innerHTML = `
      <div class="bp-head-row">
        <div class="bp-head-title">Battle Pass <span class="bp-tier-badge">Tier ${tier}</span></div>
        <div class="bp-xp-label">${curXp} / ${reqXp} XP <span class="eco-muted">to Tier ${tier + 1}</span></div>
      </div>
      <div class="bp-xp-bar"><div class="bp-xp-fill" style="width:${(curXp / reqXp * 100).toFixed(1)}%"></div></div>
      <div class="eco-muted bp-xp-hint">Earn XP by completing matches, winning battles, daily activities &amp; seasonal missions.</div>`;

    document.getElementById('bp-access').innerHTML = access
      ? `<div class="bp-access-on">&#10004; HoodLust Access Pass active — all reward paths unlocked.</div>`
      : `<div class="bp-access-off">
           <span>&#128274; Access Pass path requires a <b>HoodLust Access Pass</b>.</span>
           <button class="w95-btn" id="bp-getaccess">Get Access Pass</button>
         </div>`;
    const ga = document.getElementById('bp-getaccess');
    if (ga) ga.addEventListener('click', () => { lo.activateAccessPass(); this._toast('\u2B50', 'HoodLust Access Pass activated!'); this._renderBp(); });

    // Horizontal tier cards (free + access reward per tier).
    document.getElementById('bp-track').innerHTML = lo.bpTable().map(r => {
      const reached = r.tier <= tier;
      const cell = (track, label) => {
        const claimed = lo.state.bpClaimed[track].includes(r.tier);
        const locked = track === 'premium' && !access;
        const claimable = reached && !claimed && !locked;
        const cls = claimed ? 'claimed' : claimable ? 'claimable' : locked ? 'locked' : reached ? 'reached' : 'future';
        const tag = track === 'premium' ? 'ACCESS' : 'FREE';
        return `<div class="bp-reward ${cls}" data-tier="${r.tier}" data-track="${track}">
            <div class="bp-reward-tag">${tag}</div>
            <div class="bp-mystery"><span class="bp-mystery-ico">?</span></div>
            <div class="bp-reward-name">${label}</div>
            <div class="bp-reward-note">Under development</div>
            ${claimed ? '<div class="bp-reward-state claimed">CLAIMED \u2714</div>'
              : claimable ? '<div class="bp-reward-state claim">CLAIM</div>'
              : locked ? '<div class="bp-reward-state locked">&#128274; Access</div>'
              : reached ? '' : '<div class="bp-reward-state locked">Locked</div>'}
          </div>`;
      };
      return `<div class="bp-col ${reached ? 'reached' : ''}">
          <div class="bp-col-tier">TIER<br><b>${r.tier}</b></div>
          ${cell('free', r.freeLabel)}
          ${cell('premium', r.accessLabel)}
        </div>`;
    }).join('');

    document.querySelectorAll('#bp-track .bp-reward.claimable').forEach(c => c.addEventListener('click', () => {
      const reward = lo.claimBp(parseInt(c.dataset.tier, 10), c.dataset.track);
      if (reward) { this._toast('\uD83C\uDF81', 'Reward claimed!'); this._renderBp(); this._refreshMenuCoins(); }
    }));
    // Snap the track to the current tier.
    requestAnimationFrame(() => {
      const track = document.getElementById('bp-track');
      const col = track && track.children[Math.max(0, tier - 1)];
      if (col) track.scrollLeft = col.offsetLeft - 40;
    });
  }

  // Wheel + drag horizontal scrolling with snap.
  _bpBindDrag() {
    const track = document.getElementById('bp-track');
    if (!track || track._bound) return;
    track._bound = true;
    track.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { track.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    let down = false, sx = 0, sl = 0, moved = false;
    const start = (x) => { down = true; moved = false; sx = x; sl = track.scrollLeft; track.classList.add('dragging'); };
    const move = (x) => { if (!down) return; const d = x - sx; if (Math.abs(d) > 4) moved = true; track.scrollLeft = sl - d; };
    const end = () => { down = false; track.classList.remove('dragging'); };
    track.addEventListener('mousedown', e => start(e.pageX));
    window.addEventListener('mousemove', e => move(e.pageX));
    window.addEventListener('mouseup', end);
    track.addEventListener('touchstart', e => start(e.touches[0].pageX), { passive: true });
    track.addEventListener('touchmove', e => move(e.touches[0].pageX), { passive: true });
    track.addEventListener('touchend', end);
    track.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
    const by = () => track.clientWidth * 0.8;
    document.getElementById('bp-prev').addEventListener('click', () => track.scrollBy({ left: -by(), behavior: 'smooth' }));
    document.getElementById('bp-next').addEventListener('click', () => track.scrollBy({ left: by(), behavior: 'smooth' }));
  }

  // ---------- missions ----------
  showMissions() { this._renderMissions(); this._show('missions-window'); }
  _renderMissions() {
    const { daily, weekly } = this.liveops.missions();
    const row = (m) => {
      const pct = Math.min(100, (m.progress / m.goal) * 100);
      const state = m.claimed ? 'claimed' : m.done ? 'done' : '';
      return `<div class="mis-row ${state}">
        <div class="mis-info"><b>${m.name}</b>
          <div class="eco-bar sm"><div class="eco-bar-fill" style="width:${pct}%"></div></div>
          <span class="eco-muted">${Math.min(m.progress, m.goal)}/${m.goal} · +${m.xp} BP XP${m.coins ? ' · +' + m.coins + ' coins' : ''}</span>
        </div>
        <button class="w95-btn mis-claim" data-id="${m.id}" ${m.done && !m.claimed ? '' : 'disabled'}>${m.claimed ? '✓' : 'Claim'}</button>
      </div>`;
    };
    document.getElementById('mis-daily').innerHTML = daily.map(row).join('');
    document.getElementById('mis-weekly').innerHTML = weekly.map(row).join('');
    document.querySelectorAll('#missions-window .mis-claim').forEach(b => b.addEventListener('click', () => {
      const m = this.liveops.claimMission(b.dataset.id);
      if (m) { this._toast('\u2705', 'Mission complete: +' + m.xp + ' BP XP'); this._renderMissions(); this._refreshMenuCoins(); }
    }));
  }

  // ---------- cosmetics ----------
  showCosmetics() { this._renderCosmetics(); this._show('cosmetics-window'); }
  _renderCosmetics() {
    const lo = this.liveops, owned = lo.ownedCosmetics();
    const slots = ['frame', 'banner', 'aura', 'pet', 'spawnfx', 'victoryfx'];
    document.getElementById('cos-equipped').innerHTML = slots.map(s =>
      `<div class="cos-slot"><span class="eco-muted">${s}</span><b>${(lo.state.equipped[s] || '—').replace(/^.*:/, '')}</b></div>`).join('');
    document.getElementById('cos-grid').innerHTML = owned.length ? owned.map(c =>
      `<button class="cos-item ${Object.values(lo.state.equipped).includes(c) ? 'equipped' : ''}" data-c="${c}">
        <span class="cos-ico">${this._cosmeticIcon(c)}</span><span>${c.replace(':', ' ')}</span></button>`).join('')
      : '<div class="eco-muted" style="padding:10px">No cosmetics yet — earn them from the Battle Pass, missions, or by holding HoodLust NFTs.</div>';
    document.querySelectorAll('#cos-grid .cos-item').forEach(b => b.addEventListener('click', () => {
      if (lo.equip(b.dataset.c)) { this._toast('\uD83D\uDC57', 'Equipped ' + b.dataset.c.replace(':', ' ')); this._renderCosmetics(); }
    }));
  }
  _cosmeticIcon(reward) {
    const k = reward.split(':')[0];
    return { coins: '\uD83D\uDFE1', frame: '\uD83D\uDDBC', banner: '\uD83C\uDFF3', aura: '\u2728', pet: '\uD83D\uDC3E',
      spawnfx: '\uD83C\uDF00', victoryfx: '\uD83C\uDF89', skin: '\uD83D\uDC57', title: '\uD83C\uDFC5' }[k] || '\u2B50';
  }

  // ---------- accessibility + streamer ----------
  _loadA11y() {
    try { return Object.assign({ colorBlind: 'off', uiScale: 100, subtitles: true, streamer: false }, JSON.parse(localStorage.getItem('hoodlust-a11y')) || {}); }
    catch (_) { return { colorBlind: 'off', uiScale: 100, subtitles: true, streamer: false }; }
  }
  _saveA11y() { localStorage.setItem('hoodlust-a11y', JSON.stringify(this.a11y)); this._applyA11y(); }
  _applyA11y() {
    const root = document.documentElement;
    root.style.setProperty('--ui-scale', (this.a11y.uiScale / 100).toString());
    root.setAttribute('data-colorblind', this.a11y.colorBlind);
    document.body.classList.toggle('streamer-mode', !!this.a11y.streamer);
    document.body.classList.toggle('subs-off', !this.a11y.subtitles);
  }
  showAccessibility() {
    const a = this.a11y;
    document.getElementById('a11y-body').innerHTML = `
      <label class="a11y-row"><span>Color Blind Mode</span>
        <select id="a11y-cb">${['off', 'protanopia', 'deuteranopia', 'tritanopia'].map(o => `<option ${a.colorBlind === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
      <label class="a11y-row"><span>UI Scale</span>
        <input id="a11y-scale" type="range" min="80" max="140" step="5" value="${a.uiScale}"> <b id="a11y-scale-v">${a.uiScale}%</b></label>
      <label class="a11y-row"><span>Subtitles / Captions</span><input id="a11y-subs" type="checkbox" ${a.subtitles ? 'checked' : ''}></label>
      <label class="a11y-row"><span>Streamer Mode (hide wallet &amp; personal info)</span><input id="a11y-stream" type="checkbox" ${a.streamer ? 'checked' : ''}></label>
      <p class="eco-muted">Controller, touch controls, keyboard and volume are configured in Settings. Keyboard remapping: use Arrow keys or WASD — both are always active.</p>`;
    document.getElementById('a11y-cb').addEventListener('change', e => { a.colorBlind = e.target.value; this._saveA11y(); });
    document.getElementById('a11y-scale').addEventListener('input', e => { a.uiScale = +e.target.value; document.getElementById('a11y-scale-v').textContent = a.uiScale + '%'; this._saveA11y(); });
    document.getElementById('a11y-subs').addEventListener('change', e => { a.subtitles = e.target.checked; this._saveA11y(); });
    document.getElementById('a11y-stream').addEventListener('change', e => { a.streamer = e.target.checked; this._saveA11y(); this._toast('\uD83D\uDCF9', 'Streamer mode ' + (a.streamer ? 'on' : 'off')); });
    this._show('accessibility-window');
  }

  // ---------- run integration ----------
  /** Called at game over: advance missions + battle-pass XP from a run. */
  onRunEnd(metrics) {
    const done = this.liveops.trackRun(metrics);
    const bpXp = Math.floor((metrics.kills || 0) * 1 + (metrics.xp || 0) * 0.2 + (metrics.bosses || 0) * 100 + (metrics.time || 0) * 0.5);
    const tiers = this.liveops.addBattleXp(bpXp);
    if (tiers > 0) this._toast('\u2B50', 'Battle Pass Tier Up! (+' + tiers + ')');
    if (done.length) this._toast('\u2705', done.length + ' mission' + (done.length > 1 ? 's' : '') + ' complete — claim in Missions');
    return { bpXp, tiers, done };
  }
  _refreshMenuCoins() { try { window.HOODLUST.ui.windows.refreshMenuCoins(); } catch (_) {} }
}
