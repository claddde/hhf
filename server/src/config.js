/* config.js — centralised, validated environment configuration.
   Nothing sensitive is ever hardcoded; everything comes from env. */
import 'dotenv/config';

function req(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) { console.error(`[config] missing env ${name}`); process.exit(1); }
  return v;
}
const list = (s) => (s || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);

export const CONFIG = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  corsOrigins: list(process.env.CORS_ORIGINS),

  jwtSecret: req('JWT_SECRET'),
  jwtTtl: parseInt(process.env.JWT_TTL || '86400', 10),
  nonceTtl: parseInt(process.env.AUTH_NONCE_TTL || '300', 10),

  databaseUrl: req('DATABASE_URL'),
  pgSsl: (process.env.PGSSL || 'false') === 'true',

  nftContract: (req('NFT_CONTRACT')).toLowerCase(),
  rpcUrl: req('RPC_URL'),
  chainId: parseInt(process.env.CHAIN_ID || '1', 10),
  nftCacheTtl: parseInt(process.env.NFT_CACHE_TTL || '1800', 10),

  adminWallets: list(process.env.ADMIN_WALLETS),
  adminPassword: process.env.ADMIN_PASSWORD || '',

  backupDir: process.env.BACKUP_DIR || './backups',
  backupHour: parseInt(process.env.BACKUP_CRON_HOUR || '3', 10),
  pgDump: process.env.PG_DUMP || 'pg_dump',

  // Maintenance is toggleable at runtime via the admin API; env is the default.
  maintenance: (process.env.MAINTENANCE || 'false') === 'true',
};
