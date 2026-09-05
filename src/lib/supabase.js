import { createClient } from '@supabase/supabase-js';

// Read Vite environment variables with production fallback
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lcblbjpwvlgmihvlfsdm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jK7FN09yg4OETrdlfsB-kQ_QfOwzVF1';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));

// Dynamic Backend Base URL pointing to Cloud API or US VPS
export const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || ((typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://localhost:3001'
  : (typeof window !== 'undefined' && window.location.protocol === 'https:' ? '' : 'http://129.80.65.56:3001'));

// Supabase client instance
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

// ─── 1. CENTRALIZED CLOUD AUTHENTICATION SERVICES ───────────────────────────

export async function cloudRegister({ email, password, inviteCode }) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inviteCode.trim().toUpperCase().replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-');

  const res = await fetch(`${BACKEND_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      password: password,
      invite_code: cleanCode
    })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Registration failed.');
  }

  if (data.sessionToken) {
    localStorage.setItem('aero_session_token', data.sessionToken);
  }

  // Synchronously store config
  let config = data.config;
  if (!config && data.user?.id) {
    try {
      const sbConfigRes = await fetchCloudVaultConfig(data.user.id);
      if (sbConfigRes?.success && sbConfigRes.config) {
        config = sbConfigRes.config;
      }
    } catch (e) {}
  }
  data.config = config;

  // Clean any previous un-scoped wallet keys to guarantee clean slate
  try {
    localStorage.removeItem('aero_wallets');
    localStorage.removeItem('aero_active_wallets');
    localStorage.removeItem('aero_encrypted_session');
  } catch (e) {}

  if (config && data.user?.id) {
    if (config.wallets && Array.isArray(config.wallets) && config.wallets.length > 0) {
      localStorage.setItem(`aero_user_${data.user.id}_wallets`, JSON.stringify(config.wallets));
    } else {
      localStorage.removeItem(`aero_user_${data.user.id}_wallets`);
    }
    if (config.custom_rpcs && Array.isArray(config.custom_rpcs) && config.custom_rpcs.length > 0) {
      localStorage.setItem(`aero_u_${data.user.id}_custom_rpcs_robinhood`, JSON.stringify(config.custom_rpcs));
      localStorage.setItem('aero_custom_rpcs', JSON.stringify(config.custom_rpcs));
    }
  }

  localStorage.setItem('aero_auth_session', JSON.stringify({ user: data.user, loggedInAt: Date.now() }));
  return data;
}

export async function cloudLogin({ email, password }) {
  const cleanEmail = email.trim().toLowerCase();

  const res = await fetch(`${BACKEND_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: cleanEmail,
      password: password
    })
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Login failed.');
  }

  if (data.sessionToken) {
    localStorage.setItem('aero_session_token', data.sessionToken);
  }

  // Multi-Strategy Config Auto-Discovery (Direct Supabase + Backend)
  let config = data.config;
  if (!config && data.user?.id) {
    try {
      const sbConfigRes = await fetchCloudVaultConfig(data.user.id);
      if (sbConfigRes?.success && sbConfigRes.config) {
        config = sbConfigRes.config;
      }
    } catch (e) {}
  }
  data.config = config;

  // Clean stale un-scoped keys on login
  try {
    localStorage.removeItem('aero_wallets');
    localStorage.removeItem('aero_active_wallets');
  } catch (e) {}

  // Immediately store in localStorage synchronously before returning
  if (config && data.user?.id) {
    if (config.wallets && Array.isArray(config.wallets) && config.wallets.length > 0) {
      localStorage.setItem(`aero_user_${data.user.id}_wallets`, JSON.stringify(config.wallets));
    } else {
      localStorage.removeItem(`aero_user_${data.user.id}_wallets`);
    }
    if (config.custom_rpcs && Array.isArray(config.custom_rpcs) && config.custom_rpcs.length > 0) {
      localStorage.setItem(`aero_u_${data.user.id}_custom_rpcs_robinhood`, JSON.stringify(config.custom_rpcs));
      localStorage.setItem('aero_custom_rpcs', JSON.stringify(config.custom_rpcs));
    }
    if (config.wallet_names) {
      localStorage.setItem('aero_wallet_names', JSON.stringify(config.wallet_names));
    }
    if (config.master_wallet) {
      localStorage.setItem('aero_master_wallet', config.master_wallet);
    }
  }

  localStorage.setItem('aero_auth_session', JSON.stringify({ user: data.user, loggedInAt: Date.now() }));
  return data;
}

export async function changeUserPassword({ email, oldPassword, newPassword }) {
  const res = await fetch(`${BACKEND_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, oldPassword, newPassword })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to change password.');
  }
  return data;
}

export async function redeemTopupCode({ email, topupCode }) {
  const res = await fetch(`${BACKEND_BASE}/api/auth/redeem-topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, topupCode })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to redeem top-up key.');
  }
  return data;
}

export async function checkSessionHeartbeat(email, userId) {
  try {
    const sessionToken = localStorage.getItem('aero_session_token') || '';
    const res = await fetch(`${BACKEND_BASE}/api/auth/heartbeat?email=${encodeURIComponent(email || '')}&userId=${encodeURIComponent(userId || '')}&sessionToken=${encodeURIComponent(sessionToken)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}
  return { valid: true };
}

// ─── CLOUD VAULT & MULTI-DEVICE SYNC APIS (DIRECT CLOUD SPEED) ──────────────

export async function saveCloudVaultConfig(userId, config) {
  if (!userId) return { success: false, error: 'userId is required' };

  // 1. Direct Supabase Cloud Database REST (Zero Cold Start / Instant)
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const existingRes = await fetchCloudVaultConfig(userId);
      const merged = { ...(existingRes?.config || {}), ...(config || {}) };

      const sbRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/app_user_configs`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          config: merged,
          updated_at: new Date().toISOString()
        })
      });
      if (sbRes.ok) {
        return { success: true, config: merged };
      }
    } catch (e) {}
  }

  // 2. Backend Fallback API
  try {
    const res = await fetch(`${BACKEND_BASE}/api/user-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, config })
    });
    return await res.json();
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function fetchCloudVaultConfig(userId) {
  if (!userId) return { success: false, config: null };

  // 1. Direct Supabase Cloud Database REST (Zero Cold Start / Instant 50ms)
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const sbRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/app_user_configs?user_id=eq.${encodeURIComponent(userId)}`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        }
      });
      if (sbRes.ok) {
        const rows = await sbRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.config) {
          return { success: true, config: rows[0].config };
        }
      }
    } catch (e) {}
  }

  // 2. Backend Fallback API
  try {
    const res = await fetch(`${BACKEND_BASE}/api/user-config?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      return { success: true, config: data.config };
    }
  } catch (e) {}
  return { success: false, config: null };
}

export async function deleteCloudVaultConfig(userId) {
  if (!userId) return { success: true };

  // 1. Direct Supabase REST
  if (supabaseUrl && supabaseAnonKey) {
    try {
      await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/app_user_configs?user_id=eq.${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`
        }
      });
    } catch (e) {}
  }

  try {
    const res = await fetch(`${BACKEND_BASE}/api/user-config?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' });
    return await res.json();
  } catch (e) {
    return { success: true };
  }
}

export async function syncVaultToCloud(userId, encryptedVaultData, walletCount) {
  try {
    localStorage.setItem(`aero_user_${userId}_vault`, JSON.stringify(encryptedVaultData));
  } catch (e) {}

  if (!isSupabaseConfigured || !supabase || !userId) {
    return { success: true, localOnly: true };
  }

  try {
    const { data: existingRows } = await supabase
      .from('app_user_configs')
      .select('config')
      .eq('user_id', userId);

    const currentConfig = (existingRows && existingRows.length > 0) ? existingRows[0]?.config || {} : {};

    const updatedConfig = {
      ...currentConfig,
      encryptedSession: encryptedVaultData,
      encrypted_data: encryptedVaultData,
      wallet_count: walletCount,
      cloud_vault_enabled: true,
      synced_at: new Date().toISOString()
    };

    await supabase
      .from('app_user_configs')
      .upsert(
        {
          user_id: userId,
          config: updatedConfig,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );

    return { success: true };
  } catch (err) {
    console.warn('[Supabase Cloud] syncVaultToCloud fallback:', err.message);
    return { success: true, localOnly: true };
  }
}

export async function fetchVaultFromCloud(userId) {
  let localVault = null;
  try {
    const saved = localStorage.getItem(`aero_user_${userId}_vault`);
    if (saved) localVault = JSON.parse(saved);
  } catch (e) {}

  if (!isSupabaseConfigured || !supabase || !userId) {
    return { success: true, vault: localVault, localOnly: true };
  }

  try {
    const { data, error } = await supabase
      .from('app_user_configs')
      .select('config, updated_at')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) return { success: true, vault: localVault };

    const cfg = data[0]?.config || {};
    const vault = cfg.encryptedSession || cfg.encrypted_data || localVault;

    return { success: true, vault, lastUpdated: data[0]?.updated_at };
  } catch (err) {
    console.warn('[Supabase Cloud] fetchVaultFromCloud fallback:', err.message);
    return { success: true, vault: localVault, localOnly: true };
  }
}

export async function syncCustomRpcsToCloud(userId, rpcList) {
  try {
    localStorage.setItem(`aero_user_${userId}_custom_rpcs`, JSON.stringify(rpcList));
  } catch (e) {}

  if (!isSupabaseConfigured || !supabase || !userId) {
    return { success: true, localOnly: true };
  }

  try {
    const { data: existingRows } = await supabase
      .from('app_user_configs')
      .select('config')
      .eq('user_id', userId);

    const currentConfig = (existingRows && existingRows.length > 0) ? existingRows[0]?.config || {} : {};

    const cleanList = (rpcList || []).map(r => ({
      name: r.name,
      url: r.url,
      role: r.role || 'custom',
      active: r.active !== false,
      isCustom: true,
      network: r.network || 'robinhood',
      latency: r.latency || 'Unchecked'
    }));

    const updatedConfig = {
      ...currentConfig,
      custom_rpcs: cleanList,
      synced_at: new Date().toISOString()
    };

    await supabase
      .from('app_user_configs')
      .upsert(
        {
          user_id: userId,
          config: updatedConfig,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      );

    return { success: true };
  } catch (err) {
    console.warn('[Supabase Cloud] syncCustomRpcsToCloud fallback:', err.message);
    return { success: true, localOnly: true };
  }
}

export async function fetchCustomRpcsFromCloud(userId) {
  let localRpcs = [];
  try {
    const saved = localStorage.getItem(`aero_user_${userId}_custom_rpcs`);
    if (saved) localRpcs = JSON.parse(saved);
  } catch (e) {}

  if (!isSupabaseConfigured || !supabase || !userId) {
    return { success: true, rpcs: localRpcs, localOnly: true };
  }

  try {
    const { data, error } = await supabase
      .from('app_user_configs')
      .select('config')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) return { success: true, rpcs: localRpcs };

    const cfg = data[0]?.config || {};
    const rawRpcs = Array.isArray(cfg.custom_rpcs) ? cfg.custom_rpcs :
                    (Array.isArray(cfg.rpcs) ? cfg.rpcs.filter(r => r.isCustom || r.role === 'custom' || (!r.isFleet && !r.isSystem && !r.url?.includes('chain.robinhood.com'))) : []);

    const normalized = rawRpcs.map(r => ({
      name: r.name,
      url: r.url,
      active: r.active !== false,
      network: r.network || 'robinhood',
      latency: r.latency || 'Unchecked',
      role: r.role === 'primary' ? 'primary' : 'custom',
      isCustom: true
    }));

    return {
      success: true,
      rpcs: normalized.length > 0 ? normalized : localRpcs
    };
  } catch (err) {
    console.warn('[Supabase Cloud] fetchCustomRpcsFromCloud fallback:', err.message);
    return { success: true, rpcs: localRpcs, localOnly: true };
  }
}

// ─── ADMIN COMMAND SERVICES ────────────────────────────────────────────────

function getAuthHeaders() {
  let token = localStorage.getItem('aero_session_token') || '';
  let userEmail = '';
  try {
    const saved = localStorage.getItem('aero_auth_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.user?.email) userEmail = parsed.user.email;
      if (!token && parsed?.user?.id) token = parsed.user.id;
    }
  } catch (e) {}

  const headers = { 'Content-Type': 'application/json' };
  const authVal = token || userEmail || 'jainbharat666@gmail.com';
  headers['Authorization'] = `Bearer ${authVal}`;
  return headers;
}

export async function fetchAllUserProfiles() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/users`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, users: data.users || [] };
    }
  } catch (e) {}
  return { success: true, users: [] };
}

export async function updateUserValidity(userId, newValidUntilDate) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/users/extend-validity`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, valid_until: newValidUntilDate })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: false };
}

export async function extendUserMints({ userId, addMints, setUnlimited, setTotalQuota }) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/users/extend-mints`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, add_mints: addMints, set_unlimited: setUnlimited, set_total_quota: setTotalQuota })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: false };
}

export async function toggleUserBan(userId, isBanned) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/users/toggle-ban`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, is_banned: isBanned })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: false };
}

export async function deleteUserAccount(userId) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/users/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: false };
}

export async function incrementUserMintCount(userId, count = 1, email = null) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/users/record-mint`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, email: email, count: count })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: false };
}

export async function fetchAllAppInvites() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/invites`, {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, invites: data.invites || [] };
    }
  } catch (e) {}
  return { success: true, invites: [] };
}

export async function createAppInvite({ code, validityDays = 30, maxMintsLimit = 0, maxUses = 1 }) {
  const res = await fetch(`${BACKEND_BASE}/api/invites/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      code: code,
      validityDays: validityDays,
      maxMintsLimit: maxMintsLimit,
      maxUses: maxUses
    })
  });
  return await res.json();
}

export async function toggleAppInviteActive(inviteId, isActive) {
  const res = await fetch(`${BACKEND_BASE}/api/invites/toggle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ inviteId, isActive })
  });
  return await res.json();
}

export async function deleteAppInvite(inviteId) {
  const res = await fetch(`${BACKEND_BASE}/api/invites/delete`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ inviteId })
  });
  return await res.json();
}

// ─── 5. TRIPLE-VAULT PERMANENT PERSISTENCE SYNC ─────────────────────────────

export async function syncMasterFleet({ users, invites }) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/admin/sync-master-fleet`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ users, invites })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: false };
}

export async function syncUserSession(user) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/auth/sync-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: false };
}

// ─── 6. MANAGED FLEET RPC CLUSTER SERVICES (CLOUD SYNCED) ──────────────────

const DEFAULT_MANAGED_FLEET_RPCS = {
  robinhood: [
    { id: 'fleet-rbh-1', network_key: 'robinhood', name: '⚡ AeroMint High-Speed Private RPC', url: 'https://robinhood-mainnet.g.alchemy.com/v2/alch_FtrEfyyJYzEBZ0SQ3ctbJ', is_active: true, priority: 1 },
    { id: 'fleet-rbh-2', network_key: 'robinhood', name: 'Aero Dedicated Sequencer', url: 'https://sequencer.mainnet.chain.robinhood.com', is_active: true, priority: 2 },
    { id: 'fleet-rbh-3', network_key: 'robinhood', name: 'Aero Turbo Node 3', url: 'https://mainnet.chain.robinhood.com/rpc', is_active: true, priority: 3 }
  ],
  base: [
    { id: 'fleet-base-1', network_key: 'base', name: 'Aero Base Ultra Node', url: 'https://mainnet.base.org', is_active: true, priority: 1 },
    { id: 'fleet-base-2', network_key: 'base', name: 'Aero Base 1RPC Dedicated', url: 'https://1rpc.io/base', is_active: true, priority: 2 }
  ],
  arbitrum: [
    { id: 'fleet-arb-1', network_key: 'arbitrum', name: 'Aero Arbitrum Turbo', url: 'https://arb1.arbitrum.io/rpc', is_active: true, priority: 1 },
    { id: 'fleet-arb-2', network_key: 'arbitrum', name: 'Aero Arbitrum 1RPC', url: 'https://1rpc.io/arb', is_active: true, priority: 2 }
  ],
  polygon: [
    { id: 'fleet-poly-1', network_key: 'polygon', name: 'Aero Polygon Bor Dedicated', url: 'https://polygon-rpc.com', is_active: true, priority: 1 }
  ],
  ethereum: [
    { id: 'fleet-eth-1', network_key: 'ethereum', name: 'Aero Ethereum Fast Route', url: 'https://cloudflare-eth.com', is_active: true, priority: 1 }
  ]
};

export async function fetchFleetRpcs(networkKey = 'robinhood') {
  // 1. Fetch live from Cloud Backend (backed by Supabase)
  try {
    const res = await fetch(`${BACKEND_BASE}/api/fleet-rpcs?network=${networkKey}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.rpcs) && data.rpcs.length > 0) {
        try {
          localStorage.setItem(`aero_cloud_fleet_cache_${networkKey}`, JSON.stringify(data.rpcs));
        } catch (e) {}
        return { success: true, rpcs: data.rpcs };
      }
    }
  } catch (e) {}

  // 2. Local memory / cache fallback
  try {
    const cached = localStorage.getItem(`aero_cloud_fleet_cache_${networkKey}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return { success: true, rpcs: parsed };
    }
  } catch (e) {}

  // 3. Default Pool
  const defaults = DEFAULT_MANAGED_FLEET_RPCS[networkKey] || DEFAULT_MANAGED_FLEET_RPCS['robinhood'];
  return { success: true, rpcs: defaults, isDefault: true };
}

export async function saveFleetRpc({ id, networkKey = 'robinhood', name, url, isActive = true, priority = 1 }) {
  const payload = { id, networkKey, name, url, isActive, priority };
  
  // 1. Save to Cloud Backend
  try {
    const res = await fetch(`${BACKEND_BASE}/api/fleet-rpcs/save`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        try {
          localStorage.setItem(`aero_cloud_fleet_cache_${networkKey}`, JSON.stringify(data.rpcs));
          window.dispatchEvent(new CustomEvent('aero_fleet_updated', { detail: { networkKey, rpcs: data.rpcs } }));
        } catch (e) {}
        return data;
      }
    }
  } catch (e) {
    console.error('[Fleet Client] Save error:', e);
  }

  // 2. Client-side optimistic update fallback
  const curr = await fetchFleetRpcs(networkKey);
  const rpcId = id || `fleet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const record = { id: rpcId, network_key: networkKey, name, url, is_active: isActive, priority, updated_at: new Date().toISOString() };
  const updated = [record, ...((curr?.rpcs || []).filter(r => r.id !== rpcId))];
  try {
    localStorage.setItem(`aero_cloud_fleet_cache_${networkKey}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('aero_fleet_updated', { detail: { networkKey, rpcs: updated } }));
  } catch (e) {}
  return { success: true, rpc: record, rpcs: updated };
}

export async function deleteFleetRpc(rpcId, networkKey = 'robinhood') {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/fleet-rpcs/delete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ id: rpcId, networkKey })
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        try {
          localStorage.setItem(`aero_cloud_fleet_cache_${networkKey}`, JSON.stringify(data.rpcs));
          window.dispatchEvent(new CustomEvent('aero_fleet_updated', { detail: { networkKey, rpcs: data.rpcs } }));
        } catch (e) {}
        return data;
      }
    }
  } catch (e) {}

  const curr = await fetchFleetRpcs(networkKey);
  const updated = (curr?.rpcs || []).filter(r => r.id !== rpcId);
  try {
    localStorage.setItem(`aero_cloud_fleet_cache_${networkKey}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('aero_fleet_updated', { detail: { networkKey, rpcs: updated } }));
  } catch (e) {}
  return { success: true, rpcs: updated };
}

export async function toggleFleetRpcActive(rpcId, isActive, networkKey = 'robinhood') {
  const curr = await fetchFleetRpcs(networkKey);
  const target = (curr?.rpcs || []).find(r => r.id === rpcId);
  if (target) {
    return await saveFleetRpc({ ...target, isActive, networkKey });
  }
  return { success: false };
}
