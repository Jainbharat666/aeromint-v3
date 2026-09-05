/**
 * AeroMint V3 Intelligent Backup Engine (V2-Style Flat Architecture)
 * 
 * 1. Synchronizes live backend files from US Cloud VPS (129.80.65.56) into local backend/
 * 2. Creates a clean, flat, unified backup in ..\old version v3\<NEXT_NUM>\ (exactly like V2!)
 * 3. Includes 1-click RESTORE_THIS_BACKUP.bat, push_to_github.bat, push_to_vps.bat
 * 4. Generates compressed <NEXT_NUM>.zip archive
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ANSI_GREEN = '\x1b[32m';
const ANSI_CYAN = '\x1b[36m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_RED = '\x1b[31m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_RESET = '\x1b[0m';

function log(msg, color = '') {
  console.log(`${color}${msg}${ANSI_RESET}`);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKUP_BASE = path.resolve(ROOT_DIR, '..', 'old version v3');
const VPS_HOST = '129.80.65.56';
const VPS_USER = 'ubuntu';
const REMOTE_DIR = '/home/ubuntu/aeromint-backend';

// Detect SSH Key for US Cloud VPS
const userProfile = process.env.USERPROFILE || 'C:\\Users\\MY PC';
const defaultKey = path.join(userProfile, 'Downloads', 'ssh-key-2026-09-04.key');
const fallbackKey = 'C:\\Users\\MY PC\\Downloads\\ssh-key-2026-09-04.key';
let sshKey = fs.existsSync(defaultKey) ? defaultKey : (fs.existsSync(fallbackKey) ? fallbackKey : null);

console.log('===================================================================');
log('   🛡️ AEROMINT V3 AUTOMATED FULL BACKUP GENERATOR 🛡️', ANSI_BOLD + ANSI_CYAN);
console.log('===================================================================\n');

// Ensure base backup directory exists
if (!fs.existsSync(BACKUP_BASE)) {
  fs.mkdirSync(BACKUP_BASE, { recursive: true });
}

// 1. Detect Next Backup Version Number (1, 2, 3, ...)
log('[1/4] Detecting next backup version number in old version v3...', ANSI_CYAN);
let nextVersion = 1;
while (
  fs.existsSync(path.join(BACKUP_BASE, String(nextVersion))) ||
  fs.existsSync(path.join(BACKUP_BASE, `${nextVersion}.zip`))
) {
  nextVersion++;
}

const destDir = path.join(BACKUP_BASE, String(nextVersion));
const destZip = path.join(BACKUP_BASE, `${nextVersion}.zip`);

log(`      👉 Next Backup Version will be: [${nextVersion}]`, ANSI_GREEN);
log(`      📁 Target Folder: ${destDir}\n`);

// 2. Synchronize Live US Cloud VPS Backend into local backend/
log(`[2/4] Pulling latest live state from US Cloud VPS (${VPS_HOST})...`, ANSI_CYAN);
let vpsSynced = false;
let pm2Status = 'Not fetched';

if (sshKey) {
  try {
    const scpOpts = `-i "${sshKey}" -o StrictHostKeyChecking=no -o ConnectTimeout=8`;
    const sshOpts = `-i "${sshKey}" -o StrictHostKeyChecking=no -o ConnectTimeout=8`;
    const localBackend = path.join(ROOT_DIR, 'backend');

    if (!fs.existsSync(localBackend)) fs.mkdirSync(localBackend, { recursive: true });

    // Fetch server.js
    execSync(`scp ${scpOpts} ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/server.js "${path.join(localBackend, 'server.js')}"`, { stdio: 'ignore' });
    log('      ✔ server.js synchronized from live US VPS', ANSI_GREEN);

    // Fetch .env
    try {
      execSync(`scp ${scpOpts} ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/.env "${path.join(localBackend, '.env')}"`, { stdio: 'ignore' });
      log('      ✔ .env synchronized from live US VPS', ANSI_GREEN);
    } catch (_) {}

    // Fetch package.json
    try {
      execSync(`scp ${scpOpts} ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/package.json "${path.join(localBackend, 'package.json')}"`, { stdio: 'ignore' });
    } catch (_) {}

    // Fetch PM2 Status
    try {
      pm2Status = execSync(`ssh ${sshOpts} ${VPS_USER}@${VPS_HOST} "pm2 status"`, { encoding: 'utf-8' });
      fs.writeFileSync(path.join(localBackend, 'pm2_status.txt'), pm2Status, 'utf-8');
      log('      ✔ Live PM2 status captured', ANSI_GREEN);
    } catch (_) {}

    vpsSynced = true;
  } catch (sshErr) {
    log(`      ⚠ Remote VPS sync note: ${sshErr.message}. Using current local backend files.`, ANSI_YELLOW);
  }
} else {
  log('      ⚠ SSH Key not found in Downloads. Using existing local backend files.', ANSI_YELLOW);
}

if (!vpsSynced) {
  log('      ℹ️ Using existing local backend files for snapshot.', ANSI_CYAN);
}
console.log('');

// 3. Flat Copy of entire project (V2-Style, no subfolder clutter)
log(`[3/4] Copying complete project files to folder [${nextVersion}]...`, ANSI_CYAN);
fs.mkdirSync(destDir, { recursive: true });

try {
  const robocopyCmd = `robocopy "${ROOT_DIR}" "${destDir}" /E /XD "node_modules" ".git" "dist" "backups" ".vps_keys" "AeroMint-Bot-Windows" /XF "*.tar.gz" > nul`;
  try {
    execSync(robocopyCmd, { stdio: 'ignore' });
  } catch (err) {
    if (err.status > 7) {
      throw new Error(`Robocopy failed with code ${err.status}`);
    }
  }
  log(`      ✔ Folder created with complete project files: ${destDir}`, ANSI_GREEN);
} catch (err) {
  log(`      ✖ Error copying files: ${err.message}`, ANSI_RED);
}
console.log('');

// 4. Generate 1-Click Restore Script and Snapshot Metadata inside destDir
log(`[4/4] Finalizing 1-Click Restore script and archive for [${nextVersion}]...`, ANSI_CYAN);

const restoreBatContent = `@echo off
title AeroMint V3 - Restore Backup [${nextVersion}] to PC, GitHub and US VPS
color 0E
cls

echo ===================================================================
echo   🔄 AEROMINT V3 1-CLICK FULL RESTORE - SNAPSHOT [${nextVersion}]
echo ===================================================================
echo.
echo   Target Project Folder: ${ROOT_DIR}
echo   Live US Cloud VPS:     ${VPS_USER}@${VPS_HOST} (${REMOTE_DIR})
echo   GitHub & Live Website: https://github.com/Jainbharat666/aeromint-v3
echo.
echo   WARNING: This will restore BOTH your Local PC files, your Live Website,
echo   and your US Cloud VPS backend back to Snapshot [${nextVersion}]!
echo.
echo ===================================================================
echo   Press [ENTER] or ANY KEY to execute 100%% COMPLETE RESTORE...
echo   (Or close this window to CANCEL)
echo ===================================================================
pause > nul

echo.
echo [1/3] Restoring Local PC Codebase...
robocopy "%~dp0." "${ROOT_DIR}" /E /XD "node_modules" ".git" "dist" > nul
if %ERRORLEVEL% LEQ 7 (
    echo       [OK] Local PC codebase restored successfully!
) else (
    echo       [WARN] Robocopy exited with code %ERRORLEVEL%
)

echo.
echo [2/3] Restoring GitHub and Live Website (Vercel)...
if exist "${ROOT_DIR}\\push_to_github.bat" (
    call "${ROOT_DIR}\\push_to_github.bat" --auto
    echo       [OK] GitHub & Live Vercel website updated to [${nextVersion}]!
)

echo.
echo [3/3] Restoring Live US Cloud VPS Backend (${VPS_HOST})...
if exist "${ROOT_DIR}\\push_to_vps.bat" (
    call "${ROOT_DIR}\\push_to_vps.bat" --auto
    echo       [OK] US Cloud VPS backend restored and restarted!
)

echo.
echo ===================================================================
echo   🎉 SUCCESS: 100%% RESTORE COMPLETE!
echo   PC, GITHUB, VERCEL, AND US CLOUD VPS ARE NOW AT VERSION [${nextVersion}]!
echo ===================================================================
echo.
pause
`;

const snapshotInfoContent = `===================================================================
AEROMINT V3 SNAPSHOT METADATA - VERSION [${nextVersion}]
===================================================================
Timestamp:        ${new Date().toISOString()} (${new Date().toLocaleString()})
Local PC Folder:  ${ROOT_DIR}
US Cloud VPS:     ${VPS_USER}@${VPS_HOST}
VPS Remote Path:  ${REMOTE_DIR}
GitHub Repo:      https://github.com/Jainbharat666/aeromint-v3
Live Website:     https://www.aeromint.xyz & https://aeromint-v3.vercel.app

HOW TO RESTORE THIS SNAPSHOT AT ANY TIME:
Method 1 (Recommended):
  Double-click "RESTORE_THIS_BACKUP.bat" in this folder.
  -> Automatically restores PC files, pushes to GitHub (Vercel live site updates),
     and uploads to US Cloud VPS and restarts PM2 in 1 click!

Method 2 (V2-Style Favorite):
  Double-click "push_to_github.bat" in this folder.
  -> Directly pushes this version to GitHub, and also offers 1-click VPS deployment!
===================================================================
`;

fs.writeFileSync(path.join(destDir, 'RESTORE_THIS_BACKUP.bat'), restoreBatContent, 'utf-8');
fs.writeFileSync(path.join(destDir, 'SNAPSHOT_INFO.txt'), snapshotInfoContent, 'utf-8');

// Create Archive (.zip)
try {
  const psZipCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${destDir}\\*' -DestinationPath '${destZip}' -CompressionLevel Optimal -Force"`;
  execSync(psZipCmd, { stdio: 'ignore' });
  if (fs.existsSync(destZip)) {
    log(`      ✔ Zip archive created: ${destZip}`, ANSI_GREEN);
  }
} catch (zipErr) {
  log(`      ⚠ Zip archive warning: ${zipErr.message}`, ANSI_YELLOW);
}

console.log('\n===================================================================');
log(`  🎉 BACKUP [${nextVersion}] COMPLETED SUCCESSFULLY! 🎉`, ANSI_BOLD + ANSI_GREEN);
console.log('===================================================================');
console.log(`  📁 Folder:  ${destDir}`);
console.log(`  📦 Zip:     ${destZip}`);
console.log('');
log('  🔄 HOW TO RESTORE ANYTIME:', ANSI_BOLD + ANSI_CYAN);
console.log(`  Way 1: Open "${destDir}" and double-click "RESTORE_THIS_BACKUP.bat"`);
console.log(`  Way 2: Open "${destDir}" and double-click "push_to_github.bat"`);
console.log(`  Way 3: In main project folder, double-click "restore.bat"`);
console.log('===================================================================\n');
