/* routes/auth.js — holder-only wallet authentication.
   Flow: GET /nonce -> client personal_sign(message) -> POST /verify.
   The server recovers the signer, re-verifies NFT ownership on-chain,
   creates/loads the player, and issues a JWT session. Guest mode is
   disabled: a wallet with zero HoodLust NFTs is refused. */
import { Router } from 'express';
import { ethers } from 'ethers';
import { randomBytes } from 'node:crypto';
import { query, tx } from '../db/pool.js';
import { CONFIG } from '../config.js';
import { verifyOwnership } from '../services/nft.js';
import { issueToken } from '../middleware/auth.js';
import { getSetting } from '../services/settings.js';
import { isAddress } from '../middleware/validate.js';
import { log } from '../logger.js';

export const authRouter = Router();

function message(address, nonce) {
  return `HoodLust Survivor login\nWallet: ${address}\nNonce: ${nonce}`;
}

authRouter.get('/nonce', async (req, res) => {
  const address = String(req.query.address || '').toLowerCase();
  if (!isAddress(address)) return res.status(400).json({ error: 'BAD_ADDRESS' });
  const nonce = randomBytes(16).toString('hex');
  await query(`INSERT INTO auth_nonces(address,nonce,issued_at) VALUES ($1,$2,now())
               ON CONFLICT (address) DO UPDATE SET nonce=$2, issued_at=now()`, [address, nonce]);
  res.json({ nonce, message: message(address, nonce) });
});

authRouter.post('/verify', async (req, res) => {
  try {
    if (await getSetting('maintenance', CONFIG.maintenance))
      return res.status(503).json({ error: 'MAINTENANCE' });

    const address = String(req.body.address || '').toLowerCase();
    const signature = req.body.signature;
    if (!isAddress(address) || !signature) return res.status(400).json({ error: 'BAD_REQUEST' });

    const { rows } = await query('SELECT nonce, issued_at FROM auth_nonces WHERE address=$1', [address]);
    if (!rows[0]) return res.status(400).json({ error: 'NO_NONCE' });
    if (Date.now() - new Date(rows[0].issued_at).getTime() > CONFIG.nonceTtl * 1000)
      return res.status(400).json({ error: 'NONCE_EXPIRED' });

    // Verify the signature came from this wallet.
    const recovered = ethers.verifyMessage(message(address, rows[0].nonce), signature).toLowerCase();
    if (recovered !== address) return res.status(401).json({ error: 'BAD_SIGNATURE' });
    await query('DELETE FROM auth_nonces WHERE address=$1', [address]);   // one-time use

    // Holder-only gate (on-chain, cached with auto-refresh).
    const { count, holder } = await verifyOwnership(address, { force: true });
    if (!holder) { await log.event('login', address, { holder: false }); return res.status(403).json({ error: 'NOT_HOLDER' }); }

    // Find or create the player + wallet link.
    const player = await tx(async (c) => {
      let r = await c.query('SELECT p.* FROM players p JOIN wallets w ON w.player_id=p.id WHERE w.address=$1', [address]);
      let p = r.rows[0];
      if (!p) {
        p = (await c.query('INSERT INTO players(name, last_login) VALUES ($1, now()) RETURNING *',
          ['Holder ' + address.slice(2, 6).toUpperCase()])).rows[0];
        await c.query('INSERT INTO wallets(address, player_id) VALUES ($1,$2)', [address, p.id]);
        await c.query('INSERT INTO cloud_saves(player_id) VALUES ($1) ON CONFLICT DO NOTHING', [p.id]);
        if (CONFIG.adminWallets.includes(address)) { await c.query('UPDATE players SET is_admin=true WHERE id=$1', [p.id]); p.is_admin = true; }
      } else {
        await c.query('UPDATE players SET last_login=now() WHERE id=$1', [p.id]);
      }
      return p;
    });
    if (player.banned && (!player.ban_until || new Date(player.ban_until) > new Date()))
      return res.status(403).json({ error: 'BANNED', until: player.ban_until });

    const token = issueToken(player, address);
    await log.event('login', address, { holder: true, count });
    res.json({ token, player: { id: player.id, name: player.name, admin: !!player.is_admin }, wallet: address, nftCount: count });
  } catch (e) {
    log.error('auth.verify', { err: e.message });
    res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// Re-verify ownership for an active session (used on reconnect / periodic refresh).
authRouter.post('/refresh', async (req, res) => {
  const address = String(req.body.address || '').toLowerCase();
  if (!isAddress(address)) return res.status(400).json({ error: 'BAD_ADDRESS' });
  const { count, holder } = await verifyOwnership(address, { force: true });
  res.json({ holder, nftCount: count });
});
