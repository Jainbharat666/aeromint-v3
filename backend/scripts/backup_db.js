const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const url = (process.env.SUPABASE_URL || 'https://lcblbjpwvlgmihvlfsdm.supabase.co').replace(/\/$/, '') + '/rest/v1';
const key = process.env.SUPABASE_KEY || 'sb_publishable_jK7FN09yg4OETrdlfsB-kQ_QfOwzVF1';
const headers = { apikey: key, Authorization: 'Bearer ' + key };

async function createBackup() {
  console.log('🔄 Fetching complete database from Supabase Cloud...');
  const [usersRes, invitesRes, configsRes] = await Promise.all([
    axios.get(url + '/app_users?select=*', { headers }),
    axios.get(url + '/app_invites?select=*', { headers }),
    axios.get(url + '/app_user_configs?select=*', { headers })
  ]);

  const backupData = {
    timestamp: new Date().toISOString(),
    project: 'AeroMint-DB (lcblbjpwvlgmihvlfsdm)',
    database: 'Supabase PostgreSQL 24/7 Cloud',
    counts: {
      users: usersRes.data.length,
      invites: invitesRes.data.length,
      user_configs: configsRes.data.length
    },
    tables: {
      app_users: usersRes.data,
      app_invites: invitesRes.data,
      app_user_configs: configsRes.data
    }
  };

  const backupDir = path.join(__dirname, '..', '..', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const backupFileName = 'supabase_complete_backup_' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  const backupFilePath = path.join(backupDir, backupFileName);
  const latestFilePath = path.join(backupDir, 'supabase_backup_latest.json');

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  fs.writeFileSync(latestFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log('=============================================================');
  console.log(' ✅ DATABASE BACKUP COMPLETED SUCCESSFULLY!');
  console.log(' 📁 Saved to:', backupFilePath);
  console.log(' 👥 Users backed up:', usersRes.data.length);
  console.log(' 🎫 Invites backed up:', invitesRes.data.length);
  console.log(' 🔐 User Configs & Vaults backed up:', configsRes.data.length);
  console.log('=============================================================');
}

createBackup().catch(e => console.error('Backup failed:', e.message));
