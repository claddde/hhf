/* ============================================================
   Wallet.js — EIP-1193 wallet connection with multi-wallet
   support: connect, reconnect, account/chain change events and
   wallet switching. No dependencies; uses window.ethereum.
   ============================================================ */

export class Wallet {
  constructor() {
    this.provider = (typeof window !== 'undefined') ? window.ethereum : null;
    this.address = null;
    this.chainId = null;
    this._listeners = { account: [], chain: [] };
    this._bound = false;
  }

  isAvailable() { return !!this.provider; }

  onAccountChange(cb) { this._listeners.account.push(cb); }
  onChainChange(cb) { this._listeners.chain.push(cb); }

  _bind() {
    if (this._bound || !this.provider || !this.provider.on) return;
    this._bound = true;
    this.provider.on('accountsChanged', (accs) => {
      this.address = (accs && accs[0]) ? accs[0].toLowerCase() : null;
      this._listeners.account.forEach(cb => cb(this.address));
    });
    this.provider.on('chainChanged', (cid) => {
      this.chainId = cid;
      this._listeners.chain.forEach(cb => cb(cid));
    });
  }

  /** Prompt connection. Returns the selected address (lowercase). */
  async connect() {
    if (!this.provider) throw new Error('NO_WALLET');
    this._bind();
    const accs = await this.provider.request({ method: 'eth_requestAccounts' });
    this.address = (accs && accs[0]) ? accs[0].toLowerCase() : null;
    this.chainId = await this.provider.request({ method: 'eth_chainId' }).catch(() => null);
    return this.address;
  }

  /** Silent reconnect if already authorised (no prompt). */
  async tryReconnect() {
    if (!this.provider) return null;
    this._bind();
    try {
      const accs = await this.provider.request({ method: 'eth_accounts' });
      this.address = (accs && accs[0]) ? accs[0].toLowerCase() : null;
      if (this.address) this.chainId = await this.provider.request({ method: 'eth_chainId' }).catch(() => null);
      return this.address;
    } catch (_) { return null; }
  }

  /** Explicit wallet switch (re-opens the account picker where supported). */
  async switchWallet() {
    if (!this.provider) throw new Error('NO_WALLET');
    try {
      await this.provider.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
    } catch (_) { /* not all wallets support this; fall through to connect */ }
    return this.connect();
  }

  async ensureChain(chainIdHex) {
    if (!chainIdHex || !this.provider) return true;
    if (this.chainId === chainIdHex) return true;
    try {
      await this.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
      this.chainId = chainIdHex;
      return true;
    } catch (_) { return false; }
  }

  short(addr = this.address) {
    if (!addr) return '—';
    return addr.slice(0, 6) + '…' + addr.slice(-4);
  }
}
