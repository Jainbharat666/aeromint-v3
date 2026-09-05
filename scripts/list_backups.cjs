/**
 * AeroMint V3 Backup Lister
 * Displays all available backup snapshots in ..\old version v3
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUP_BASE = path.resolve(ROOT_DIR, '..', 'old version v3');

if (!fs.existsSync(BACKUP_BASE)) {
  console.log('  (No backups found yet in old version v3)');
  process.exit(0);
}

const entries = fs.readdirSync(BACKUP_BASE, { withFileTypes: true });
const versionDirs = entries
  .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
  .map(e => parseInt(e.name, 10))
  .sort((a, b) => a - b);

if (versionDirs.length === 0) {
  console.log('  (No numbered backup folders found in old version v3)');
  process.exit(0);
}

versionDirs.forEach(ver => {
  const verDir = path.join(BACKUP_BASE, String(ver));
  const infoFile = path.join(verDir, 'SNAPSHOT_INFO.txt');
  let dateStr = '';
  if (fs.existsSync(infoFile)) {
    try {
      const text = fs.readFileSync(infoFile, 'utf-8');
      const match = text.match(/Timestamp:\s+([^\n\r]+)/);
      if (match) dateStr = ` - ${match[1]}`;
    } catch (_) {}
  }
  if (!dateStr) {
    const stats = fs.statSync(verDir);
    dateStr = ` - ${stats.mtime.toLocaleString()}`;
  }
  console.log(`  [${ver}] Backup Version ${ver}${dateStr}`);
});
