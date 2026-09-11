const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://zfsyokzedsdofmtmjtqt.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const PUBLIC_ANON_KEY = 'sb_publishable_GPW6AVq_IUmR3r0hq4De-w_OViDAsSi';

async function runSecurityAudit() {
  console.log('====================================================');
  console.log('🔒 AEROMINT V3: SUPABASE RLS SECURITY & PERMISSION AUDIT');
  console.log('====================================================');
  console.log(`Target Supabase URL: ${SUPABASE_URL}\n`);

  // 1. TEST UNAUTHORIZED PUBLIC ACCESS (Simulating outside hacker with publishable key)
  console.log('--- TEST 1: Hacker / Public Internet Attack Simulation ---');
  try {
    const pubRes = await axios.get(`${SUPABASE_URL}/rest/v1/app_users?select=id,email`, {
      headers: { apikey: PUBLIC_ANON_KEY, Authorization: `Bearer ${PUBLIC_ANON_KEY}` },
      timeout: 5000
    });

    if (Array.isArray(pubRes.data) && pubRes.data.length > 0) {
      console.log('❌ VULNERABILITY ACTIVE: Public anon key was able to read users table!');
      console.log('   Exposed rows count:', pubRes.data.length);
      console.log('   Action Required: Run enable_rls_security.sql in Supabase SQL Editor for aeromint-v3.');
    } else if (Array.isArray(pubRes.data) && pubRes.data.length === 0) {
      console.log('✅ SECURED: Public anon key returned 0 rows (RLS is blocking unauthorized reads).');
    }
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403 || err.response.status === 404)) {
      console.log(`✅ SECURED: Public anon key blocked with HTTP ${err.response.status} (${err.response.data?.message || 'Access Denied'}).`);
    } else {
      console.log('⚠️ Unexpected response during anon test:', err.message);
    }
  }

  // 2. TEST BACKEND SERVICE ROLE KEY ACCESS (Simulating local backend server)
  console.log('\n--- TEST 2: Local Backend Server Connection ---');
  if (!SUPABASE_KEY || SUPABASE_KEY.startsWith('sb_publishable_')) {
    console.log('⚠️ Current backend key is still using public anon key.');
    console.log('   For full production security, paste service_role secret key into backend/.env');
  } else {
    try {
      const backendRes = await axios.get(`${SUPABASE_URL}/rest/v1/app_users?select=count`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        timeout: 5000
      });
      console.log('✅ BACKEND MASTER ACCESS SUCCESS: Backend successfully connected via service_role key!');
      console.log('   Response status:', backendRes.status, 'Data:', backendRes.data);
    } catch (err) {
      console.log('❌ Backend connection failed:', err.response?.data || err.message);
    }
  }
  console.log('====================================================\n');
}

runSecurityAudit();
