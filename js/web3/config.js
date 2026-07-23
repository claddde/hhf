/* ============================================================
   web3/config.js — Phase 5 configuration for NFT-holder gating
   and online features. Kept separate so rules/endpoints change
   WITHOUT touching game logic.

   SECURITY: never hardcode a secret API key into the browser
   bundle. On-chain verification runs through the user's OWN
   wallet provider (window.ethereum) by default, so no key is
   needed client-side. The RPC below is only a fallback and MUST
   be proxied by your backend in production — replace it with your
   backend URL, or leave blank to rely solely on the wallet.
   ============================================================ */

export const WEB3 = {
  // HoodLust NFT collection (ERC-721).
  nftContract: '0x0be6e89cf774020d5a978865544b6ccc63e61a29',

  // Target network. balanceOf works on whatever chain the wallet is on;
  // if you require a specific chain, set chainIdHex and enforce=true.
  chainIdHex: null,          // e.g. '0x1' for Ethereum mainnet
  chainName: 'HoodLust Network',
  enforceChain: false,

  // Fallback JSON-RPC (used ONLY if the wallet cannot eth_call).
  // ⚠ Do NOT commit a real Alchemy key here — proxy it via your backend.
  //   Set to your backend proxy URL in production, e.g.
  //   'https://your-backend.example/rpc'
  rpcFallback: '',

  // Demo access: when true, players without a holder wallet may enter a
  // clearly-labelled Demo Mode (scores are NOT leaderboard-eligible).
  // Set false to enforce strict holder-only access.
  allowDemo: true,

  // Admin wallets (lowercase) allowed to open the reward-admin module.
  admins: [],
};

// ERC-721 balanceOf(address) selector.
export const BALANCE_OF_SELECTOR = '0x70a08231';
