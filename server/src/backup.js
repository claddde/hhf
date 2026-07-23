/* backup.js — automatic daily PostgreSQL backups via pg_dump, with a
   restore helper. Schedules a dump at BACKUP_CRON_HOUR each day. Run a
   one-off with `node src/backup.js --once`; restore with `--restore <file>`. */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from './config.js';
import { log } from './logger.js';

function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }

export function runBackup() {
  if (!existsSync(CONFIG.backupDir)) mkdirSync(CONFIG.backupDir, { recursive: true });
  const file = join(CONFIG.backupDir, `hoodlust-${stamp()}.sql`);
  const p = spawn(CONFIG.pgDump, [CONFIG.databaseUrl, '-f', file, '--no-owner'], { stdio: 'inherit' });
  p.on('exit', (code) => code === 0 ? log.info('backup complete', { file }) : log.error('backup failed', { code }));
  return file;
}

export function restoreBackup(file) {
  const p = spawn('psql', [CONFIG.databaseUrl, '-f', file], { stdio: 'inherit' });
  p.on('exit', (code) => log.info('restore finished', { code }));
}

/** Schedule a daily backup; checks hourly and fires at the configured hour. */
export function scheduleBackups() {
  let lastDay = -1;
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === CONFIG.backupHour && now.getDate() !== lastDay) { lastDay = now.getDate(); runBackup(); }
  }, 60 * 60 * 1000);
  log.info('daily backups scheduled', { hour: CONFIG.backupHour });
}

// CLI usage.
const arg = process.argv[2];
if (arg === '--once') runBackup();
if (arg === '--restore') restoreBackup(process.argv[3]);
