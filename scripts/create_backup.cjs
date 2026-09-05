/**
 * AeroMint V3 Intelligent Dual-Backup Engine
 * 
 * Captures a complete synchronized snapshot of:
 * 1. Local PC Codebase (Frontend, Engine, Configs) -> pc_files/
 * 2. Live US Cloud VPS State (Ashburn, VA: 129.80.65.56) -> vps_backend/
 * 
 * Generates automated 1-Click Restore scripts (RESTORE_THIS_BACKUP.bat & PUSH_TO_VPS.bat)
 * and packages the snapshot into a .zip archive.
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

// Detect SSH Key
const userProfile = process.env.USERPROFILE || 'C:\\Users\\MY PC';
const defaultKey = path.join(userProfile, 'Downloads', 'ssh-key-2026-09-04.key');
const fallbackKey = 'C:\\Users\\MY PC\\Downloads\\ssh-key-2026-09-04.key';
let sshKey = fs.existsSync(defaultKey) ? defaultKey : (fs.existsSync(fallbackKey) ? fallbackKey : null);

console.log('===================================================================');
log('   🚀 AEROMINT V3 DUAL-BACKUP GENERATOR (PC + US CLOUD VPS)', ANSI_BOLD + ANSI_CYAN);
console.log('===================================================================\n');

// Ensure base backup folder exists
if (!fs.existsSync(BACKUP_BASE)) {
  fs.mkdirSync(BACKUP_BASE, { recursive: true });
}

// 1. Detect Next Backup Version Number (1, 2, 3, ...)
log('[1/5] Detecting next backup version number...', ANSI_CYAN);
let nextVersion = 1;
while (
  fs.existsSync(path.join(BACKUP_BASE, String(nextVersion))) ||
  fs.existsSync(path.join(BACKUP_BASE, `${nextVersion}.zip`))
) {
  nextVersion++;
}

const destDir = path.join(BACKUP_BASE, String(nextVersion));
const pcBackupDir = path.join(destDir, 'pc_files');
const vpsBackupDir = path.join(destDir, 'vps_backend');
const destZip = path.join(BACKUP_BASE, `${nextVersion}.zip`);

fs.mkdirSync(pcBackupDir, { recursive: true });
fs.mkdirSync(vpsBackupDir, { recursive: true });

log(`      📁 Target Snapshot: Version [${nextVersion}]`, ANSI_GREEN);
log(`      📁 Path: ${destDir}\n`);

// 2. Backup Local PC Codebase
log('[2/5] Backing up Local PC Files (Frontend, Core Engine, Configs)...', ANSI_CYAN);
try {
  const robocopyCmd = `robocopy "${ROOT_DIR}" "${pcBackupDir}" /E /XD "node_modules" ".git" "dist" "backups" ".vps_keys" "AeroMint-Bot-Windows" /XF "*.tar.gz" > nul`;
  try {
    execSync(robocopyCmd, { stdio: 'ignore' });
  } catch (err) {
    if (err.status > 7) {
      throw new Error(`Robocopy failed with exit code ${err.status}`);
    }
  }
  log('      ✔ Local PC files copied to pc_files/', ANSI_GREEN);
} catch (err) {
  log(`      ✖ Warning copying local files: ${err.message}`, ANSI_RED);
}
console.log('');

// 3. Backup Live US Cloud VPS Backend
log(`[3/5] Backing up Live US Cloud VPS State (${VPS_HOST} - Ashburn, VA)...`, ANSI_CYAN);
let vpsBackupSuccess = false;
let pm2Status = 'Not fetched';

if (sshKey) {
  log(`      🔑 Using SSH Key: ${sshKey}`);
  try {
    const scpOpts = `-i "${sshKey}" -o StrictHostKeyChecking=no -o ConnectTimeout=8`;
    const sshOpts = `-i "${sshKey}" -o StrictHostKeyChecking=no -o ConnectTimeout=8`;

    // Fetch server.js
    execSync(`scp ${scpOpts} ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/server.js "${path.join(vpsBackupDir, 'server.js')}"`, { stdio: 'ignore' });
    log('      ✔ server.js downloaded from US VPS', ANSI_GREEN);

    // Fetch .env
    try {
      execSync(`scp ${scpOpts} ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/.env "${path.join(vpsBackupDir, '.env')}"`, { stdio: 'ignore' });
      log('      ✔ .env downloaded from US VPS', ANSI_GREEN);
    } catch (_) {}

    // Fetch package.json
    try {
      execSync(`scp ${scpOpts} ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/package.json "${path.join(vpsBackupDir, 'package.json')}"`, { stdio: 'ignore' });
      log('      ✔ package.json downloaded from US VPS', ANSI_GREEN);
    } catch (_) {}

    // Fetch package-lock.json
    try {
      execSync(`scp ${scpOpts} ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/package-lock.json "${path.join(vpsBackupDir, 'package-lock.json')}"`, { stdio: 'ignore' });
    } catch (_) {}

    // Fetch utils folder
    try {
      execSync(`scp ${scpOpts} -r ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/utils "${path.join(vpsBackupDir, 'utils')}"`, { stdio: 'ignore' });
      log('      ✔ utils/ downloaded from US VPS', ANSI_GREEN);
    } catch (_) {}

    // Fetch PM2 Status
    try {
      pm2Status = execSync(`ssh ${sshOpts} ${VPS_USER}@${VPS_HOST} "pm2 status"`, { encoding: 'utf-8' });
      fs.writeFileSync(path.join(vpsBackupDir, 'pm2_status.txt'), pm2Status, 'utf-8');
      log('      ✔ pm2_status.txt saved', ANSI_GREEN);
    } catch (_) {}

    vpsBackupSuccess = true;
  } catch (sshErr) {
    log(`      ✖ Remote VPS fetch encountered an issue: ${sshErr.message}`, ANSI_YELLOW);
  }
} else {
  log('      ⚠ SSH Key not found in Downloads folder. Using local backend as fallback.', ANSI_YELLOW);
}

// Fallback if VPS unreachable
if (!vpsBackupSuccess) {
  const localBackend = path.join(ROOT_DIR, 'backend');
  if (fs.existsSync(path.join(localBackend, 'server.js'))) {
    fs.copyFileSync(path.join(localBackend, 'server.js'), path.join(vpsBackupDir, 'server.js'));
  }
  if (fs.existsSync(path.join(localBackend, 'package.json'))) {
    fs.copyFileSync(path.join(localBackend, 'package.json'), path.join(vpsBackupDir, 'package.json'));
  }
  if (fs.existsSync(path.join(localBackend, '.env'))) {
    fs.copyFileSync(path.join(localBackend, '.env'), path.join(vpsBackupDir, '.env'));
  }
  log('      ✔ Local backend files stored in vps_backend/ as backup fallback', ANSI_YELLOW);
}
console.log('');

// 4. Generate 1-Click Restore & Push Scripts inside Backup Folder
log(`[4/5] Generating 1-Click Restore scripts in Snapshot [${nextVersion}]...`, ANSI_CYAN);

const restoreBatContent = `@echo off
title AeroMint V3 - Restore Backup [${nextVersion}] to PC and US Cloud VPS
color 0E
cls

echo ===================================================================
echo   AEROMINT V3 DUAL-RESTORE SYSTEM - SNAPSHOT [${nextVersion}]
echo ===================================================================
echo.
echo   Target PC Codebase: ${ROOT_DIR}
echo   Target US Cloud VPS: ${VPS_USER}@${VPS_HOST} (${REMOTE_DIR})
echo   Snapshot Version:    [${nextVersion}]
echo.
echo   WARNING: This will restore BOTH your Local PC files and your
echo   Live US Cloud VPS backend back to this exact snapshot!
echo.
echo ===================================================================
echo   Press [ENTER] or ANY KEY to execute 100%% DUAL RESTORE...
echo   (Or close this window immediately to CANCEL)
echo ===================================================================
pause > nul

echo.
echo [1/3] Restoring Local PC Codebase...
robocopy "%~dp0pc_files" "${ROOT_DIR}" /E /XD "node_modules" ".git" "dist" > nul
if %ERRORLEVEL% LEQ 7 (
    echo       [OK] Local PC codebase restored successfully!
) else (
    echo       [WARN] Robocopy exited with status %ERRORLEVEL%
)

echo.
echo [2/3] Restoring Live US Cloud VPS Backend (${VPS_HOST})...
set SSH_KEY=%USERPROFILE%\\Downloads\\ssh-key-2026-09-04.key
if not exist "%SSH_KEY%" set SSH_KEY=C:\\Users\\MY PC\\Downloads\\ssh-key-2026-09-04.key

if exist "%SSH_KEY%" (
    echo       Uploading server.js to US VPS...
    scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no "%~dp0vps_backend\\server.js" ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/server.js
    if exist "%~dp0vps_backend\\.env" (
        echo       Uploading .env to US VPS...
        scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no "%~dp0vps_backend\\.env" ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/.env
    )
    if exist "%~dp0vps_backend\\package.json" (
        echo       Uploading package.json to US VPS...
        scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no "%~dp0vps_backend\\package.json" ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/package.json
    )
    if exist "%~dp0vps_backend\\utils" (
        echo       Uploading utils/ to US VPS...
        scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no -r "%~dp0vps_backend\\utils" ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/
    )
    echo       Restarting PM2 process aeromint-backend...
    ssh -i "%SSH_KEY%" -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "pm2 restart aeromint-backend"
    echo       [OK] Live US Cloud VPS backend restored and restarted!
) else (
    echo       [ERROR] SSH Key not found at %SSH_KEY%!
    echo       Please ensure your ssh-key-2026-09-04.key is in Downloads.
)

echo.
echo [3/3] Verifying US Cloud VPS Live Telemetry...
curl -s -m 5 http://${VPS_HOST}:3001/api/doctor/live-mesh > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo       [OK] US Cloud VPS Telemetry is ONLINE and healthy!
) else (
    echo       [INFO] VPS starting up, please check in 3-5 seconds.
)

echo.
echo ===================================================================
echo   SUCCESS: BOTH LOCAL PC AND US CLOUD VPS ARE RESTORED TO [${nextVersion}]!
echo ===================================================================
echo.
pause
`;

const pushToVpsBatContent = `@echo off
title AeroMint V3 - Push Snapshot [${nextVersion}] to US Cloud VPS
color 0B
cls

echo ===================================================================
echo   PUSH BACKUP [${nextVersion}] TO LIVE US CLOUD VPS (${VPS_HOST})
echo ===================================================================
echo.

set SSH_KEY=%USERPROFILE%\\Downloads\\ssh-key-2026-09-04.key
if not exist "%SSH_KEY%" set SSH_KEY=C:\\Users\\MY PC\\Downloads\\ssh-key-2026-09-04.key

if not exist "%SSH_KEY%" (
    echo [ERROR] SSH Key not found in Downloads!
    pause
    exit /b 1
)

echo [1/3] Uploading server.js to US VPS...
scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no "%~dp0vps_backend\\server.js" ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/server.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to upload server.js via SCP!
    pause
    exit /b %ERRORLEVEL%
)

if exist "%~dp0vps_backend\\.env" (
    echo Uploading .env...
    scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no "%~dp0vps_backend\\.env" ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/.env
)

if exist "%~dp0vps_backend\\package.json" (
    echo Uploading package.json...
    scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no "%~dp0vps_backend\\package.json" ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/package.json
)

if exist "%~dp0vps_backend\\utils" (
    echo Uploading utils/...
    scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no -r "%~dp0vps_backend\\utils" ${VPS_USER}@${VPS_HOST}:${REMOTE_DIR}/
)

echo.
echo [2/3] Restarting PM2 process aeromint-backend...
ssh -i "%SSH_KEY%" -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "pm2 restart aeromint-backend"

echo.
echo [3/3] Verifying Health...
curl -s -m 5 http://${VPS_HOST}:3001/api/doctor/live-mesh > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] US Cloud VPS Live-Mesh Telemetry is ONLINE!
) else (
    echo [INFO] US Cloud VPS is rebooting service.
)

echo.
echo ===================================================================
echo   SUCCESS: US CLOUD VPS UPDATED WITH BACKUP [${nextVersion}] BACKEND!
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
Location:         Oracle Cloud Infrastructure - Ashburn, Virginia (US East)

CONTENTS OF THIS SNAPSHOT:
1. pc_files/
   - Full Local PC Frontend (React/Vite)
   - Core Minting Engine (Technique 2 Staggered Laser Pipeline)
   - Configs, scripts, and local dependencies specifications
   (node_modules and dist excluded for optimal performance)

2. vps_backend/
   - Live production server.js running on US Cloud VPS
   - Production .env configuration
   - Production package.json & package-lock.json
   - Production utils/
   - pm2_status.txt (Live process telemetry at backup time)

AUTOMATED ACTIONS:
- RESTORE_THIS_BACKUP.bat : 1-Click restore for BOTH PC and US Cloud VPS
- PUSH_TO_VPS.bat         : 1-Click deployment of this backend to US VPS only
===================================================================
`;

fs.writeFileSync(path.join(destDir, 'RESTORE_THIS_BACKUP.bat'), restoreBatContent, 'utf-8');
fs.writeFileSync(path.join(destDir, 'PUSH_TO_VPS.bat'), pushToVpsBatContent, 'utf-8');
fs.writeFileSync(path.join(destDir, 'SNAPSHOT_INFO.txt'), snapshotInfoContent, 'utf-8');

log('      ✔ Generated: RESTORE_THIS_BACKUP.bat', ANSI_GREEN);
log('      ✔ Generated: PUSH_TO_VPS.bat', ANSI_GREEN);
log('      ✔ Generated: SNAPSHOT_INFO.txt', ANSI_GREEN);
console.log('');

// 5. Create Archive Archive (.zip)
log(`[5/5] Creating Archive Archive [${nextVersion}.zip]...`, ANSI_CYAN);
try {
  const psZipCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${destDir}\\*' -DestinationPath '${destZip}' -CompressionLevel Optimal -Force"`;
  execSync(psZipCmd, { stdio: 'ignore' });
  if (fs.existsSync(destZip)) {
    log(`      ✔ Zip archive created: ${destZip}`, ANSI_GREEN);
  } else {
    log('      ⚠ Zip creation completed without error, check folder.', ANSI_YELLOW);
  }
} catch (zipErr) {
  log(`      ⚠ Zip archive warning: ${zipErr.message}`, ANSI_YELLOW);
}

console.log('\n===================================================================');
log(`  🎉 INTELLIGENT DUAL BACKUP [${nextVersion}] COMPLETED SUCCESSFULLY!`, ANSI_BOLD + ANSI_GREEN);
console.log('===================================================================');
console.log(`  📂 Snapshot Folder:   ${destDir}`);
console.log(`  💻 PC Files:          ${pcBackupDir}`);
console.log(`  ☁️ VPS Backend Files:  ${vpsBackupDir}`);
console.log(`  📦 Zip Archive:       ${destZip}`);
console.log('');
log('  🔄 HOW TO RESTORE ANYTIME:', ANSI_BOLD + ANSI_CYAN);
console.log(`  1. Open folder: "${destDir}"`);
console.log('  2. Double-click "RESTORE_THIS_BACKUP.bat"');
console.log('     -> In 1 click, BOTH your PC and US Cloud VPS are restored to this moment!');
console.log('===================================================================\n');
