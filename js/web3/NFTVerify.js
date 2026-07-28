/* ============================================================
   NFTVerify.js — checks HoodLust NFT ownership by calling
   ERC-721 balanceOf(address) through the connected wallet's own
   provider (no API key in the bundle). Falls back to a config
   RPC/backend proxy only if the wallet cannot perform eth_call.
   ============================================================ */

import { WEB3, BALANCE_OF_SELECTOR } from './config.js';

export class NFTVerify {
  constructor(wallet) { this.wallet = wallet; }

  _callData(address) {
    const addr = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    return BALANCE_OF_SELECTOR + addr;
  }

  /** @returns {Promise<number>} number of HoodLust NFTs owned. */
  async balanceOf(address) {
    const data = this._callData(address);
    const params = [{ to: WEB3.nftContract, data }, 'latest'];

    // 1) Prefer the user's wallet provider (no secret needed).
    if (this.wallet && this.wallet.provider) {
      try {
        const hex = await this.wallet.provider.request({ method: 'eth_call', params });
        return this._toInt(hex);
      } catch (_) { /* fall through to RPC proxy */ }
    }

    // 2) Fallback: configured RPC / backend proxy (never a raw secret key).
    if (WEB3.rpcFallback) {
      const res = await fetch(WEB3.rpcFallback, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params }),
      });
      const json = await res.json();
      if (json.error) throw new Error('RPC_ERROR');
      return this._toInt(json.result);
    }

    throw new Error('NO_VERIFY_METHOD');
  }

  _toInt(hex) {
    if (!hex || hex === '0x') return 0;
    try { return Number(BigInt(hex)); } catch (_) { return parseInt(hex, 16) || 0; }
  }

  async isHolder(address) { return (await this.balanceOf(address)) > 0; }
}
