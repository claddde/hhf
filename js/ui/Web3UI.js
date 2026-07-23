/* ============================================================
   Web3UI.js — Windows-95 controllers for the Phase-5 online layer:
   holder-verification gate, player profile, leaderboard (weekly /
   monthly / all-time + reset countdown) and the reward-admin
   module. Owns the verification session used to gate gameplay.
   ============================================================ */

import { WEB3 } from '../web3/config.js';
import { Wallet } from '../web3/Wallet.js';
import { NFTVerify } from '../web3/NFTVerify.js';
import { makeBackend, ONLINE, setAuthToken } from '../online/Backend.js';
import { Realtime } from '../online/Realtime.js';
import { Rewards } from '../online/Rewards.js';
import { AntiCheat } from '../online/AntiCheat.js';
import { CHARACTERS } from '../data/maps.js';
import { WEAPONS } from '../data/gamedata.js';

export class Web3UI {
  constructor(save) {
    this.save = save;
    this.wallet = new Wallet();
    this.verify = new NFTVerify(this.wallet);
    this.backend = makeBackend();
    this.rewards = new Rewards(this.backend, save);
    this.anticheat = AntiCheat;

    // Verification session (null until verified).
    this.session = { wallet: null, nfts: 0, holder: false, verified: false, demo: false, name: '' };

    this.backdrop = document.getElementById('modal-backdrop');
    this._bind();

    // Remote mode only: live updates + server notifications.
    this.realtime = new Realtime();
    this.realtime.on('leaderboard', (m) => { if (!document.getElementById('leaderboard-window').classList.contains('hidden')) this._renderBoard(document.querySelector('.lb-tab.selected')?.dataset.scope || 'week'); });
    this.realtime.on('notification', (m) => this._toast((m.title || 'Notice') + (m.body ? ' — ' + m.body : '')));

    // Multi-wallet: refresh verification when the account changes.
    this.wallet.onAccountChange((addr) => {
      this.session.verified = false; this.session.wallet = addr;
      this._refreshMenuWallet();
      if (addr) this._toast('Wallet changed — re-verify to play.');
    });
    this.wallet.tryReconnect().then((addr) => { if (addr) { this.session.wallet = addr; this._refreshMenuWallet(); } });
  }

  _bind() {
    const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
    document.querySelectorAll('[data-open="profile"]').forEach(b => b.addEventListener('click', () => this.showProfile()));
    document.querySelectorAll('[data-open="leaderboard"]').forEach(b => b.addEventListener('click', () => this.showLeaderboard()));
    document.querySelectorAll('[data-wallet="close"]').forEach(b => b.addEventListener('click', () => this._hide('wallet-window')));
    document.querySelectorAll('[data-profile="close"]').forEach(b => b.addEventListener('click', () => this._hide('profile-window')));
    document.querySelectorAll('[data-lb="close"]').forEach(b => b.addEventListener('click', () => this._hide('leaderboard-window')));
    document.querySelectorAll('[data-admin="close"]').forEach(b => b.addEventListener('click', () => this._hide('admin-window')));

    on('wallet-connect', 'click', () => this._runFlow(false));
    on('wallet-switch', 'click', () => this._runFlow(true));
    on('wallet-demo', 'click', () => this._enterDemo());
    on('wallet-play', 'click', () => this._enterGame());
    on('profile-switch', 'click', () => { this._hide('profile-window'); this.openGate(this._pendingEnter); });

    document.querySelectorAll('.lb-tab').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.lb-tab').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected'); this._renderBoard(b.dataset.scope);
    }));
    on('lb-admin-btn', 'click', () => this.showAdmin());
    on('admin-add', 'click', () => this._addAdminRule());
    on('admin-save', 'click', () => this._saveAdminRules());
  }

  // ---------------- gate flow ----------------
  isVerified() { return this.session.verified; }

  openGate(onEnter) {
    this._pendingEnter = onEnter;
    this._resetSteps();
    this._show('wallet-window');
    this._btn('wallet-connect', true); this._btn('wallet-switch', false);
    this._btn('wallet-play', false);
    this._btn('wallet-demo', WEB3.allowDemo);
    this._status('Ready to verify.');
  }

  async _runFlow(isSwitch) {
    try {
      this._stepActive('ws-connect');
      this._status('Requesting wallet connection…');
      const addr = isSwitch ? await this.wallet.switchWallet() : await this.wallet.connect();
      if (!addr) throw new Error('NO_ACCOUNT');
      this.session.wallet = addr;
      this._stepDone('ws-connect'); this._refreshMenuWallet();

      this._stepActive('ws-network');
      if (WEB3.enforceChain && WEB3.chainIdHex) {
        const ok = await this.wallet.ensureChain(WEB3.chainIdHex);
        if (!ok) throw new Error('WRONG_NETWORK');
      }
      this._stepDone('ws-network');

      this._stepActive('ws-nft');
      this._status('Checking on-chain ownership…');

      // REMOTE: server-authoritative sign-in (nonce + signature) → JWT →
      // server verifies NFT ownership. LOCAL: client-side balanceOf.
      let nfts;
      if (ONLINE.mode === 'remote' && ONLINE.baseUrl) {
        nfts = await this._remoteLogin(addr);
      } else {
        nfts = await this.verify.balanceOf(addr);
      }
      this.session.nfts = nfts; this.session.holder = nfts > 0;
      if (nfts <= 0) {
        this._stepFail('ws-nft');
        this._status('No HoodLust NFT found in this wallet. Access is holder-only.', 'err');
        this._btn('wallet-switch', true);
        this._btn('wallet-connect', false);
        this._btn('wallet-demo', WEB3.allowDemo);
        return;
      }
      this._stepDone('ws-nft');
      this.session.verified = true; this.session.demo = false;
      this.session.name = this._playerName(addr);
      this._stepActive('ws-enter');
      this._status(`Holder verified — ${nfts} HoodLust NFT${nfts > 1 ? 's' : ''}.`, 'ok');
      this._btn('wallet-connect', false); this._btn('wallet-switch', true);
      this._btn('wallet-demo', false); this._btn('wallet-play', true);
      this._refreshMenuWallet();
      await this._syncCloud(addr);
      this.rewards.processWeekly(addr, this.anticheat).then(r => { if (r) this._toast('Weekly reward: ' + (r.title || r.id)); });
    } catch (e) {
      const msg = e.message === 'NO_WALLET'
        ? 'No Web3 wallet detected. Install a wallet (e.g. MetaMask) to verify.'
        : e.message === 'WRONG_NETWORK' ? 'Please switch to the HoodLust network and retry.'
        : 'Verification failed. Please try again.';
      this._status(msg, 'err');
      this._btn('wallet-demo', WEB3.allowDemo);
    }
  }

  _enterDemo() {
    this.session = { wallet: this.session.wallet, nfts: 0, holder: false, verified: false, demo: true, name: 'Guest' };
    this._toast('Demo Mode — scores are not leaderboard-eligible.');
    this._enterGame();
  }
  _enterGame() {
    this._hide('wallet-window');
    const cb = this._pendingEnter; this._pendingEnter = null;
    if (cb) cb({ ...this.session });
  }

  _playerName(addr) {
    return localStorage.getItem('hoodlust-name') || ('Holder ' + addr.slice(2, 6).toUpperCase());
  }

  /** Remote sign-in: fetch nonce, personal_sign, verify → JWT + realtime.
      Returns the server-reported NFT count (throws NOT_HOLDER etc.). */
  async _remoteLogin(addr) {
    const base = ONLINE.baseUrl.replace(/\/$/, '');
    const nres = await fetch(base + '/api/auth/nonce?address=' + addr).then(r => r.json());
    if (!nres.message) throw new Error('NONCE');
    const sig = await this.wallet.provider.request({ method: 'personal_sign', params: [nres.message, addr] });
    const res = await fetch(base + '/api/auth/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr, signature: sig }),
    }).then(r => r.json());
    if (res.error === 'NOT_HOLDER') return 0;
    if (res.error === 'MAINTENANCE') throw new Error('MAINTENANCE');
    if (!res.token) throw new Error('AUTH_FAILED');
    setAuthToken(res.token);
    ONLINE._meWallet = addr;
    this.session.name = res.player?.name || this._playerName(addr);
    this.realtime.connect();
    return res.nftCount || 0;
  }

  async _syncCloud(addr) {
    try {
      const blob = await this.backend.cloudLoad(addr);
      if (blob && this.anticheat.verifySave(blob)) {
        // merge coins/unlocks conservatively (take the max).
        const d = this.save.data;
        d.coins = Math.max(d.coins, blob.coins || 0);
        (blob.unlockedWeapons || []).forEach(w => this.save.unlockWeapon(w));
        this.save.save();
      }
    } catch (_) {}
  }

  // ---------------- profile ----------------
  async showProfile() {
    const body = document.getElementById('profile-body');
    const s = this.session, d = this.save.data;
    const [wRank, aRank] = await Promise.all([
      s.wallet ? this.backend.playerRank(s.wallet, 'week') : null,
      s.wallet ? this.backend.playerRank(s.wallet, 'all') : null,
    ]);
    const chars = CHARACTERS.map(c => c.name);
    const weapons = (d.unlockedWeapons || []).map(id => WEAPONS[id] ? WEAPONS[id].name : id);
    const titles = d.titles || [];
    const excl = (d.exclusive || []).map(r => (r.title || r.id));
    const status = s.demo ? 'Demo (Guest)' : s.holder ? 'Verified Holder' : (s.wallet ? 'Unverified' : 'Not connected');

    const row = (k, v) => `<div class="profile-row"><span>${k}</span><b>${v}</b></div>`;
    const tags = (arr, empty) => arr.length
      ? `<div class="profile-tags">${arr.map(t => `<span class="profile-tag">${t}</span>`).join('')}</div>`
      : `<div class="profile-tags"><span class="profile-tag empty">${empty}</span></div>`;

    body.innerHTML =
      row('Wallet', s.wallet ? this.wallet.short(s.wallet) : '—') +
      row('Holder Status', status) +
      row('HoodLust NFTs', s.nfts || 0) +
      row('Player Name', s.name || this._playerName(s.wallet || '0x0000')) +
      row('Weekly Rank', wRank ? '#' + wRank : '—') +
      row('All-Time Rank', aRank ? '#' + aRank : '—') +
      row('Lifetime Best Score', d.bestScore || 0) +
      row('Best Time', this._fmtTime(d.bestTime || 0)) +
      row('Highest Level', d.highestLevel || 1) +
      row('Bosses Defeated', d.bosses || 0) +
      `<div class="profile-section">Owned Characters</div>` + tags(chars, 'None') +
      `<div class="profile-section">Unlocked Weapons</div>` + tags(weapons, 'None') +
      `<div class="profile-section">Exclusive Rewards & Titles</div>` + tags([...excl, ...titles], 'Compete weekly to earn exclusives') +
      `<div class="profile-section">Achievements (${(d.achievements || []).length})</div>` + tags(d.achievements || [], 'None yet');

    this._show('profile-window');
  }

  // ---------------- leaderboard ----------------
  async showLeaderboard() {
    this._show('leaderboard-window');
    this._renderBoard('week');
    this._startCountdown();
    // admin button only for configured admin wallets.
    const adminBtn = document.getElementById('lb-admin-btn');
    const isAdmin = WEB3.admins.length === 0 || (this.session.wallet && WEB3.admins.includes(this.session.wallet));
    adminBtn.style.display = isAdmin ? '' : 'none';
  }

  async _renderBoard(scope) {
    const rows = document.getElementById('lb-rows');
    rows.innerHTML = '<div class="lb-empty">Loading…</div>';
    const board = await this.backend.leaderboard(scope);
    if (!board.length) { rows.innerHTML = '<div class="lb-empty">No scores yet. Be the first!</div>'; return; }
    const me = this.session.wallet;
    rows.innerHTML = board.map((e, i) => {
      const rank = i + 1;
      const cls = ['lb-row', rank <= 3 ? 'top' + rank : '', e.wallet === me ? 'me' : ''].join(' ').trim();
      return `<div class="${cls}"><span class="lb-rank">${rank}</span>
        <span>${this.wallet.short(e.wallet)}</span><span>${(e.character || '—').slice(0, 6)}</span>
        <span class="lb-score">${e.score.toLocaleString()}</span></div>`;
    }).join('');
  }

  _startCountdown() {
    const el = document.getElementById('lb-countdown');
    const tick = () => { if (el) el.textContent = this.rewards.countdownText(); };
    tick();
    clearInterval(this._cdT); this._cdT = setInterval(tick, 30000);
  }

  // ---------------- admin ----------------
  showAdmin() { this._rules = JSON.parse(JSON.stringify(this.rewards.rules)); this._renderAdmin(); this._show('admin-window'); }
  _addAdminRule() { this._rules.push({ minRank: 1, maxRank: 1, type: 'weapon', id: 'magic_wand', rarity: 'rare', title: 'New Title' }); this._renderAdmin(); }
  _renderAdmin() {
    const wrap = document.getElementById('admin-rules');
    const types = ['weapon', 'skin', 'title', 'effect'];
    wrap.innerHTML = '';
    this._rules.forEach((r, i) => {
      const div = document.createElement('div');
      div.className = 'admin-rule';
      div.innerHTML =
        `<input type="number" min="1" value="${r.minRank}" data-f="minRank">` +
        `<input type="number" min="1" value="${r.maxRank}" data-f="maxRank">` +
        `<input type="text" value="${r.id}|${r.rarity}|${r.title || ''}" data-f="combo" title="id|rarity|title">` +
        `<span class="rm">&#10005;</span>`;
      div.querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => {
        const f = inp.dataset.f;
        if (f === 'combo') { const [id, rarity, title] = inp.value.split('|'); r.id = id; r.rarity = rarity; r.title = title; }
        else r[f] = parseInt(inp.value) || 1;
      }));
      div.querySelector('.rm').addEventListener('click', () => { this._rules.splice(i, 1); this._renderAdmin(); });
      wrap.appendChild(div);
    });
  }
  _saveAdminRules() { this.rewards.saveRules(this._rules); this._toast('Reward rules saved.'); this._hide('admin-window'); }

  // ---------------- score submission (called by GameScene) ----------------
  async submitRun(stats, character) {
    const score = this.anticheat.computeScore(stats);
    // Update local best regardless.
    if (score > (this.save.data.bestScore || 0)) { this.save.data.bestScore = score; this.save.save(); }
    // Only holders submit to the leaderboard; validate first (anti-cheat).
    if (!this.session.verified || this.session.demo || !this.session.wallet) return { score, submitted: false };
    if (!this.anticheat.validateScore(score, stats)) return { score, submitted: false, rejected: true };
    await this.backend.submitScore({ wallet: this.session.wallet, name: this.session.name, score, character, ts: Date.now() });
    // Cloud save (signed) + weekly reward check.
    const blob = { coins: this.save.data.coins, unlockedWeapons: this.save.data.unlockedWeapons, bestScore: this.save.data.bestScore };
    blob._sig = this.anticheat.sign(blob);
    await this.backend.cloudSave(this.session.wallet, blob);
    const reward = await this.rewards.processWeekly(this.session.wallet, this.anticheat);
    return { score, submitted: true, reward };
  }

  // ---------------- small helpers ----------------
  _fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; }
  _show(id) { this.backdrop.classList.remove('hidden'); document.getElementById(id).classList.remove('hidden'); }
  _hide(id) { document.getElementById(id).classList.add('hidden'); this.backdrop.classList.add('hidden'); }
  _btn(id, show) { const el = document.getElementById(id); if (el) el.classList.toggle('hidden', !show); }
  _status(msg, kind) { const el = document.getElementById('wallet-status'); el.textContent = msg; el.className = 'wallet-status' + (kind ? ' ' + kind : ''); }
  _resetSteps() { ['ws-connect', 'ws-network', 'ws-nft', 'ws-enter'].forEach(id => { const e = document.getElementById(id); if (e) e.className = ''; }); }
  _stepActive(id) { const e = document.getElementById(id); if (e) e.className = 'active'; }
  _stepDone(id) { const e = document.getElementById(id); if (e) e.className = 'done'; }
  _stepFail(id) { const e = document.getElementById(id); if (e) e.className = 'fail'; }
  _refreshMenuWallet() {
    const el = document.getElementById('menu-wallet-addr'); const wrap = document.getElementById('menu-wallet');
    if (!el) return;
    if (this.session.verified) { el.textContent = this.wallet.short(this.session.wallet) + ' ✓'; wrap.classList.add('verified'); }
    else if (this.session.wallet) { el.textContent = this.wallet.short(this.session.wallet); wrap.classList.remove('verified'); }
    else { el.textContent = 'Not connected'; wrap.classList.remove('verified'); }
  }
  _toast(msg) {
    // Reuse the achievement toast styling for online notices.
    const el = document.getElementById('achievement-toast');
    document.getElementById('ach-ico').textContent = '\u{1F517}';
    document.getElementById('ach-name').textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._toastT); this._toastT = setTimeout(() => el.classList.add('hidden'), 3600);
  }
}
