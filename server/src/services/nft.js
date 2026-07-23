/* nft.js — server-side HoodLust ownership verification with caching and
   automatic refresh. The RPC key lives ONLY here (server env), never in
   the browser. Positive results are cached for NFT_CACHE_TTL; on the next
   check after expiry, ownership is re-fetched — so a player who transfers
   away all NFTs loses access on their next verification. */
import { ethers } from 'ethers';
import { CONFIG } from '../config.js';
import { query } from '../db/pool.js';
import { log } from '../logger.js';

const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl, CONFIG.chainId);
const abi = ['function balanceOf(address owner) view returns (uint256)'];
const contract = new ethers.Contract(CONFIG.nftContract, abi, provider);

async function fetchOnChain(address) {
  const bal = await contract.balanceOf(address);
  return Number(bal);
}

/** @returns {Promise<{count:number, holder:boolean, cached:boolean}>} */
export async function verifyOwnership(address, { force = false } = {}) {
  address = address.toLowerCase();
  const { rows } = await query('SELECT nft_count, is_holder, checked_at FROM nft_verifications WHERE address=$1', [address]);
  const row = rows[0];
  const fresh = row && (Date.now() - new Date(row.checked_at).getTime()) < CONFIG.nftCacheTtl * 1000;
  if (row && fresh && !force) return { count: row.nft_count, holder: row.is_holder, cached: true };

  let count = 0;
  try { count = await fetchOnChain(address); }
  catch (e) { log.error('nft.fetch failed', { address, err: e.message }); if (row) return { count: row.nft_count, holder: row.is_holder, cached: true }; throw e; }

  const holder = count > 0;
  await query(
    `INSERT INTO nft_verifications(address, nft_count, is_holder, checked_at)
     VALUES ($1,$2,$3,now())
     ON CONFLICT (address) DO UPDATE SET nft_count=$2, is_holder=$3, checked_at=now()`,
    [address, count, holder]
  );
  await log.event('verify', address, { count, holder });
  return { count, holder, cached: false };
}
