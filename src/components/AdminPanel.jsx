import React, { useState, useEffect } from 'react';
import {
  fetchAllUserProfiles,
  updateUserValidity,
  extendUserMints,
  toggleUserBan,
  deleteUserAccount,
  fetchAllAppInvites,
  createAppInvite,
  toggleAppInviteActive,
  deleteAppInvite,
  syncMasterFleet,
  fetchFleetRpcs,
  saveFleetRpc,
  deleteFleetRpc,
  toggleFleetRpcActive,
  fetchUserTxHistory
} from '../lib/supabase';
import CyberModal from './CyberModal';

export default function AdminPanel({ currentUser, onShowToast }) {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Fleet RPC Management State
  const [fleetRpcs, setFleetRpcs] = useState([]);
  const [selectedFleetNetwork, setSelectedFleetNetwork] = useState('robinhood');
  const [newFleetName, setNewFleetName] = useState('');
  const [newFleetUrl, setNewFleetUrl] = useState('');
  const [newFleetPriority, setNewFleetPriority] = useState(1);
  const [isAddingFleetRpc, setIsAddingFleetRpc] = useState(false);
  const [isTestingFleetLatencies, setIsTestingFleetLatencies] = useState(false);
  const [fleetLatencies, setFleetLatencies] = useState({});

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // 'all' | 'active' | 'expired_time' | 'expired_mints' | 'banned'
  const [inviteSearch, setInviteSearch] = useState('');
  const [selectedCodeDrilldown, setSelectedCodeDrilldown] = useState(null);

  // New Invite Code Form State (Dual Constraint)
  const [newCode, setNewCode] = useState('');
  const [newValidityDays, setNewValidityDays] = useState(30);
  const [newMaxMintsLimit, setNewMaxMintsLimit] = useState(0); // 0 = unlimited
  const [newMaxUses, setNewMaxUses] = useState(1);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [customDaysInput, setCustomDaysInput] = useState('');
  const [customMintsInput, setCustomMintsInput] = useState('');
  const [customPromptModal, setCustomPromptModal] = useState({
    isOpen: false,
    userId: null,
    userEmail: '',
    type: 'mints', // 'mints' or 'days'
    currentVal: 0,
    inputValue: ''
  });

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // CyberModal state for confirmations (Zero native browser popups!)
  const [cyberModal, setCyberModal] = useState({
    isOpen: false,
    type: 'danger',
    title: '',
    message: '',
    detail: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    icon: '🛡️',
    onConfirm: null,
    onCancel: () => setCyberModal(prev => ({ ...prev, isOpen: false }))
  });

  // User Transaction History Modal State
  const [historyModalUser, setHistoryModalUser] = useState(null);
  const [userHistoryLogs, setUserHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleViewUserHistory = async (u) => {
    setHistoryModalUser(u);
    setHistoryLoading(true);
    setUserHistoryLogs([]);
    try {
      const res = await fetchUserTxHistory(u.user_id || u.id);
      if (res?.success && Array.isArray(res.txHistory)) {
        setUserHistoryLogs(res.txHistory);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  async function loadFleetData(networkKey) {
    try {
      const res = await fetchFleetRpcs(networkKey || selectedFleetNetwork);
      if (res && res.success && Array.isArray(res.rpcs)) {
        setFleetRpcs(res.rpcs);
      }
    } catch (e) {
      console.error('[Admin] Error loading fleet RPCs:', e);
    }
  }

  useEffect(() => {
    loadAdminData();
    loadFleetData(selectedFleetNetwork);
  }, [selectedFleetNetwork]);

  async function loadAdminData() {
    setIsSyncing(true);
    try {
      // 1. Read permanent local master backups
      let localUsersBackup = [];
      let localInvitesBackup = [];
      try {
        localUsersBackup = JSON.parse(localStorage.getItem('aerov3_master_users_backup') || '[]');
        localInvitesBackup = JSON.parse(localStorage.getItem('aerov3_master_invites_backup') || '[]');
      } catch (e) {}

      // 2. Fetch live data from server
      const [usersRes, invitesRes] = await Promise.all([
        fetchAllUserProfiles(),
        fetchAllAppInvites()
      ]);

      let serverUsers = usersRes.success ? (usersRes.users || []) : [];
      let serverInvites = invitesRes.success ? (invitesRes.invites || []) : [];

      // 3. Auto-Heal Check: If server has fewer records than local master backup (e.g. Render restarted container)
      if (localUsersBackup.length > serverUsers.length || localInvitesBackup.length > serverInvites.length) {
        console.log('[Admin Master Vault] Server restarted or missing data. Auto-syncing master backup to server...');
        const syncRes = await syncMasterFleet({ users: localUsersBackup, invites: localInvitesBackup });
        if (syncRes && syncRes.success) {
          const refreshed = await Promise.all([fetchAllUserProfiles(), fetchAllAppInvites()]);
          if (refreshed[0].success) serverUsers = refreshed[0].users || [];
          if (refreshed[1].success) serverInvites = refreshed[1].invites || [];
          if (onShowToast) onShowToast(`🛡️ Auto-Restored ${syncRes.restoredUsersCount || 0} users & ${syncRes.restoredInvitesCount || 0} VIP codes from Master Vault!`, 'info');
        }
      }

      setUsers(serverUsers);
      setInvites(serverInvites);

      // 4. Save fresh master backup to local storage
      if (serverUsers.length > 0) localStorage.setItem('aerov3_master_users_backup', JSON.stringify(serverUsers));
      if (serverInvites.length > 0) localStorage.setItem('aerov3_master_invites_backup', JSON.stringify(serverInvites));
    } catch (e) {
      console.error('[Admin] Load error:', e);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }

  // ─── MANAGED FLEET RPC HANDLERS ─────────────────────────
  async function handleAddFleetRpc(e) {
    if (e) e.preventDefault();
    if (!newFleetName.trim() || !newFleetUrl.trim()) {
      if (onShowToast) onShowToast('Please enter both node name and valid RPC URL', 'warning');
      return;
    }
    setIsAddingFleetRpc(true);
    try {
      const res = await saveFleetRpc({
        networkKey: selectedFleetNetwork,
        name: newFleetName.trim(),
        url: newFleetUrl.trim(),
        isActive: true,
        priority: parseInt(newFleetPriority) || 1
      });
      if (res && res.success) {
        if (res.rpcs) setFleetRpcs(res.rpcs);
        else await loadFleetData(selectedFleetNetwork);
        setNewFleetName('');
        setNewFleetUrl('');
        if (onShowToast) onShowToast(`⚡ Fleet Node "${res.rpc.name}" added to VIP Cluster!`, 'success');
        setTimeout(() => handleTestFleetLatencies(res.rpcs), 200);
      }
    } catch (err) {
      if (onShowToast) onShowToast(`Error saving node: ${err.message}`, 'error');
    } finally {
      setIsAddingFleetRpc(false);
    }
  }

  async function handleToggleFleetActive(rpcId, currentActive) {
    const nextActive = !currentActive;
    const res = await toggleFleetRpcActive(rpcId, nextActive, selectedFleetNetwork);
    if (res && res.rpcs) {
      setFleetRpcs(res.rpcs);
    } else {
      setFleetRpcs(prev => prev.map(r => r.id === rpcId ? { ...r, is_active: nextActive } : r));
    }
    if (onShowToast) onShowToast(nextActive ? '🟢 Fleet Node Activated' : '⏸️ Fleet Node Paused', 'info');
  }

  function promptDeleteFleetRpc(rpcId, rpcName) {
    setCyberModal({
      isOpen: true,
      type: 'danger',
      title: '🗑️ Delete Fleet Node',
      message: `Remove "${rpcName}" from VIP Fleet Cluster?`,
      detail: 'Subscribers will no longer route traffic through this node.',
      confirmText: 'Delete Node',
      cancelText: 'Cancel',
      icon: '⚡',
      onCancel: () => setCyberModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setCyberModal(prev => ({ ...prev, isOpen: false }));
        const res = await deleteFleetRpc(rpcId, selectedFleetNetwork);
        if (res && res.rpcs) setFleetRpcs(res.rpcs);
        else setFleetRpcs(prev => prev.filter(r => r.id !== rpcId));
        if (onShowToast) onShowToast(`🗑️ Node "${rpcName}" removed from cluster!`, 'info');
      }
    });
  }

  async function handleTestFleetLatencies(nodesToTest) {
    setIsTestingFleetLatencies(true);
    const targetNodes = Array.isArray(nodesToTest) && nodesToTest.length > 0 ? nodesToTest : fleetRpcs;
    const updatedLatencies = {};
    try {
      await Promise.all(targetNodes.map(async (rpc) => {
        const t0 = performance.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(rpc.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
            signal: controller.signal
          });
          clearTimeout(timeout);
          if (res.ok) {
            const ms = Math.round(performance.now() - t0);
            updatedLatencies[rpc.id] = `${ms}ms`;
          } else {
            updatedLatencies[rpc.id] = 'Error';
          }
        } catch (e) {
          updatedLatencies[rpc.id] = 'Timeout';
        }
      }));
      setFleetLatencies(prev => ({ ...prev, ...updatedLatencies }));
      if (onShowToast) onShowToast('⚡ Latency tests completed across VIP Fleet Nodes!', 'success');
    } finally {
      setIsTestingFleetLatencies(false);
    }
  }

  // 1. Extend Validity Days
  async function handleExtendDays(userId, currentValidUntil, addDays) {
    setActionLoadingId(`days_${userId}`);
    try {
      const baseDate = new Date(currentValidUntil) > new Date() ? new Date(currentValidUntil) : new Date();
      baseDate.setDate(baseDate.getDate() + addDays);

      const res = await updateUserValidity(userId, baseDate.toISOString());
      if (res.success) {
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, valid_until: baseDate.toISOString() } : u));
        if (onShowToast) onShowToast(`⚡ Added +${addDays} Days to subscription!`, 'success');
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  // 2. Extend Mint Quota
  async function handleExtendMints(userId, addMints, setUnlimited = false, setTotalQuota = undefined) {
    setActionLoadingId(`mints_${userId}`);
    try {
      const res = await extendUserMints({ userId, addMints, setUnlimited, setTotalQuota });
      if (res.success) {
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, max_mints_allowed: res.max_mints_allowed } : u));
        if (onShowToast) onShowToast(
          setUnlimited 
            ? '♾️ Set Mint Quota to UNLIMITED!' 
            : (setTotalQuota !== undefined 
                ? `🎯 Set Mint Quota to exact ${setTotalQuota} Mints!` 
                : `🎯 Added +${addMints} Mints to user quota!`), 
          'success'
        );
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  // 3. Toggle Ban / Suspend
  async function handleToggleBan(userId, currentBanned) {
    setActionLoadingId(`ban_${userId}`);
    try {
      const nextBanned = !currentBanned;
      const res = await toggleUserBan(userId, nextBanned);
      if (res.success) {
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_banned: nextBanned } : u));
        if (onShowToast) onShowToast(nextBanned ? '🚫 User Suspended! Their live session will terminate instantly.' : '✅ User access restored!', nextBanned ? 'warning' : 'success');
      }
    } finally {
      setActionLoadingId(null);
    }
  }

  // 4. Prompt Delete User with CyberModal (Zero browser native popup!)
  function promptDeleteUser(userId, userEmail) {
    setCyberModal({
      isOpen: true,
      type: 'danger',
      title: '🗑️ Delete User Account',
      message: `Are you sure you want to permanently delete user "${userEmail}"?`,
      detail: 'This will wipe their session, delete cloud configurations, and revoke workspace access immediately.',
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      icon: '🗑️',
      onCancel: () => setCyberModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setCyberModal(prev => ({ ...prev, isOpen: false }));
        setActionLoadingId(`del_${userId}`);
        try {
          const res = await deleteUserAccount(userId);
          if (res.success) {
            setUsers(prev => prev.filter(u => u.user_id !== userId && u.id !== userId));
            if (onShowToast) onShowToast(`🗑️ User account ${userEmail} permanently deleted!`, 'info');
          } else {
            if (onShowToast) onShowToast(res.error || 'Failed to delete user', 'error');
          }
        } finally {
          setActionLoadingId(null);
        }
      }
    });
  }

  // 5. Create Dual-Rule Invite Code
  async function handleCreateInvite(e) {
    if (e) e.preventDefault();
    if (!newCode.trim()) {
      if (onShowToast) onShowToast('Please enter an invite code', 'warning');
      return;
    }
    setIsCreatingInvite(true);
    try {
      const res = await createAppInvite({
        code: newCode,
        validityDays: newValidityDays,
        maxMintsLimit: newMaxMintsLimit,
        maxUses: newMaxUses
      });
      if (res.success) {
        setInvites(prev => [res.invite, ...prev.filter(i => i.invite_code !== res.invite.invite_code)]);
        setNewCode('');
        if (onShowToast) onShowToast(`🎉 VIP Code "${res.invite.invite_code}" issued successfully!`, 'success');
      } else {
        if (onShowToast) onShowToast(res.error || 'Failed to create code', 'error');
      }
    } finally {
      setIsCreatingInvite(false);
    }
  }

  // 6. Auto Generate Dice Code
  function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 8; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(`AERO-${rand}`);
  }

  // 7. Toggle Invite Active
  async function handleToggleInvite(inviteId, currentActive) {
    const nextActive = !currentActive;
    const res = await toggleAppInviteActive(inviteId, nextActive);
    if (res.success) {
      setInvites(prev => prev.map(inv => (inv.id === inviteId || inv.invite_code === inviteId) ? { ...inv, is_active: nextActive } : inv));
      if (onShowToast) onShowToast(nextActive ? '▶️ Code Activated' : '⏸️ Code Paused (Cannot be used)', 'info');
    }
  }

  // 8. Prompt Delete Invite with CyberModal (Zero browser native popup!)
  function promptDeleteInvite(inviteId, inviteCode) {
    setCyberModal({
      isOpen: true,
      type: 'danger',
      title: '🗑️ Delete VIP Invite Code',
      message: `Delete VIP code "${inviteCode}" permanently?`,
      detail: 'This will erase the code from the cloud database permanently.',
      confirmText: 'Delete Code',
      cancelText: 'Cancel',
      icon: '🎫',
      onCancel: () => setCyberModal(prev => ({ ...prev, isOpen: false })),
      onConfirm: async () => {
        setCyberModal(prev => ({ ...prev, isOpen: false }));
        const res = await deleteAppInvite(inviteId || inviteCode);
        if (res.success) {
          setInvites(prev => prev.filter(inv => inv.id !== inviteId && inv.invite_code !== inviteCode));
          if (onShowToast) onShowToast(`🗑️ Code "${inviteCode}" permanently removed!`, 'info');
        }
      }
    });
  }

  // Calculate Code Aggregated Stats
  function getCodeStats(inviteCode) {
    const matchingUsers = users.filter(u => (u.invite_code_used || '').toUpperCase() === (inviteCode || '').toUpperCase());
    const totalMints = matchingUsers.reduce((sum, u) => sum + (u.total_mints || 0), 0);
    return {
      userCount: matchingUsers.length,
      users: matchingUsers,
      totalMints: totalMints
    };
  }

  // Filtered lists
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.invite_code_used || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.user_id || '').toLowerCase().includes(userSearch.toLowerCase());
    
    if (!matchesSearch) return false;

    const isTimeExpired = u.valid_until && new Date(u.valid_until) <= new Date();
    const isMintsExpired = u.max_mints_allowed > 0 && (u.total_mints || 0) >= u.max_mints_allowed;

    if (userFilter === 'active') return !u.is_banned && !isTimeExpired && !isMintsExpired;
    if (userFilter === 'expired_time') return !u.is_banned && isTimeExpired;
    if (userFilter === 'expired_mints') return !u.is_banned && isMintsExpired;
    if (userFilter === 'banned') return u.is_banned;
    return true;
  });

  const filteredInvites = invites.filter(i =>
    (i.invite_code || '').toLowerCase().includes(inviteSearch.toLowerCase())
  );

  const totalActiveSubscriptions = users.filter(u => {
    const isTimeExpired = u.valid_until && new Date(u.valid_until) <= new Date();
    const isMintsExpired = u.max_mints_allowed > 0 && (u.total_mints || 0) >= u.max_mints_allowed;
    return !u.is_banned && !isTimeExpired && !isMintsExpired;
  }).length;

  const totalFleetMints = users.reduce((sum, u) => sum + (u.total_mints || 0), 0);

  return (
    <div className="admin-panel-container" style={{ padding: '16px 20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box', color: '#f3f4f6' }}>
      
      {/* ────────────────── TOP CYBER HEADER ────────────────── */}
      <div className="admin-header-card" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        padding: '16px 22px',
        background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.95), rgba(13, 16, 24, 0.98))',
        borderRadius: '14px',
        border: '1px solid rgba(255, 147, 69, 0.3)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #FF9345, #FF5500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            boxShadow: '0 0 20px rgba(255, 147, 69, 0.4)'
          }}>
            🛡️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#fff', letterSpacing: '0.02em' }}>
                AeroMint <span style={{ color: '#FF9345' }}>Master Command Center</span>
              </h2>
              <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,147,69,0.2)', color: '#FF9345', border: '1px solid rgba(255,147,69,0.4)', fontSize: '0.7rem', fontWeight: 'bold' }}>
                DUAL-RULE SAAS
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
              Real-Time Code Tracking • Dual-Condition Expiry (Time OR Mints) • Instant Remote Ban & Deletion
            </p>
          </div>
        </div>

        <button
          onClick={loadAdminData}
          disabled={isSyncing}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f3f4f6',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isSyncing ? 'scale(0.96)' : 'scale(1)'
          }}
        >
          <span style={{ display: 'inline-block', transition: 'transform 0.5s', transform: isSyncing ? 'rotate(360deg)' : 'none' }}>🔄</span>
          {isSyncing ? 'Syncing...' : 'Sync Fleet Data'}
        </button>
      </div>

      {/* ────────────────── 4 TOP METRIC CARDS ────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div className="admin-metric-card" style={{ padding: '16px 18px', background: 'rgba(20, 24, 36, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Accounts</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#fff', marginTop: '4px' }}>{users.length}</div>
          <div style={{ fontSize: '0.72rem', color: '#38bdf8', marginTop: '2px' }}>Total authenticated fleet members</div>
        </div>

        <div className="admin-metric-card" style={{ padding: '16px 18px', background: 'rgba(20, 24, 36, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Subscriptions</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>{totalActiveSubscriptions}</div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>{users.length - totalActiveSubscriptions} expired or quota reached</div>
        </div>

        <div className="admin-metric-card" style={{ padding: '16px 18px', background: 'rgba(20, 24, 36, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', borderLeft: '4px solid #FF9345' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>VIP Access Codes</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#FF9345', marginTop: '4px' }}>{invites.length}</div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>{invites.filter(i => i.is_active).length} active for instant signup</div>
        </div>

        <div className="admin-metric-card" style={{ padding: '16px 18px', background: 'rgba(20, 24, 36, 0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', borderLeft: '4px solid #a855f7' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Fleet Mints</div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#c084fc', marginTop: '4px' }}>{totalFleetMints}</div>
          <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '2px' }}>Live confirmed operations executed</div>
        </div>
      </div>

      {/* ────────────────── TWO-COLUMN DUAL DECK ────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 1fr) minmax(540px, 1.4fr)',
        gap: '20px',
        alignItems: 'start'
      }}>

        {/* ═══════════════ LEFT COLUMN: DUAL-RULE VIP INVITE ENGINE ═══════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 1. Generator Card */}
          <div className="admin-generator-card" style={{
            background: 'linear-gradient(145deg, rgba(24, 29, 43, 0.95), rgba(14, 17, 26, 0.98))',
            border: '1px solid rgba(255, 147, 69, 0.35)',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#FF9345', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🎫 Issue Dual-Rule VIP Key</span>
              </h3>
              <button
                type="button"
                onClick={generateRandomCode}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(255, 147, 69, 0.15)',
                  border: '1px solid rgba(255, 147, 69, 0.35)',
                  color: '#FF9345',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                🎲 Auto Dice
              </button>
            </div>

            <form onSubmit={handleCreateInvite} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>VIP Invite Code *</label>
                <input
                  type="text"
                  placeholder="e.g. ALLUARJUN, VIP-30D"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    background: 'rgba(12, 15, 22, 0.95)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#FF9345',
                    fontFamily: 'monospace',
                    fontWeight: 'bold',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              {/* Condition 1: Time Limit */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Condition 1: Time Validity</label>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 'bold' }}>{newValidityDays} Days</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {[
                    { label: '1 Day', val: 1 },
                    { label: '7 Days', val: 7 },
                    { label: '30 Days', val: 30 },
                    { label: '90 Days', val: 90 },
                    { label: '♾️ Lifetime', val: 3650 }
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => { setNewValidityDays(p.val); setCustomDaysInput(''); }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: newValidityDays === p.val && !customDaysInput ? '#FF9345' : 'rgba(255,255,255,0.06)',
                        color: newValidityDays === p.val && !customDaysInput ? '#000' : '#d1d5db',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Custom Days:</span>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    placeholder="e.g. 5, 15, 60"
                    value={customDaysInput}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomDaysInput(val);
                      if (val && !isNaN(parseInt(val))) {
                        setNewValidityDays(parseInt(val));
                      }
                    }}
                    style={{
                      width: '110px',
                      padding: '4px 8px',
                      background: 'rgba(12, 15, 22, 0.95)',
                      border: '1px solid rgba(56, 189, 248, 0.4)',
                      borderRadius: '6px',
                      color: '#38bdf8',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
              </div>

              {/* Condition 2: Mint Limit */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Condition 2: Max Mint Quota</label>
                  <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 'bold' }}>{newMaxMintsLimit === 0 ? '♾️ Unlimited' : `${newMaxMintsLimit} Mints`}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {[
                    { label: '5 Mints', val: 5 },
                    { label: '10 Mints', val: 10 },
                    { label: '25 Mints', val: 25 },
                    { label: '100 Mints', val: 100 },
                    { label: '♾️ Unlimited', val: 0 }
                  ].map(m => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => { setNewMaxMintsLimit(m.val); setCustomMintsInput(''); }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: newMaxMintsLimit === m.val && !customMintsInput ? '#c084fc' : 'rgba(255,255,255,0.06)',
                        color: newMaxMintsLimit === m.val && !customMintsInput ? '#000' : '#d1d5db',
                        fontSize: '0.72rem',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Custom Mints:</span>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    placeholder="e.g. 1, 3, 5, 12"
                    value={customMintsInput}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomMintsInput(val);
                      if (val !== '' && !isNaN(parseInt(val))) {
                        setNewMaxMintsLimit(parseInt(val));
                      }
                    }}
                    style={{
                      width: '110px',
                      padding: '4px 8px',
                      background: 'rgba(12, 15, 22, 0.95)',
                      border: '1px solid rgba(192, 132, 252, 0.4)',
                      borderRadius: '6px',
                      color: '#c084fc',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Max Total Redemptions (Users limit)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={newMaxUses}
                  onChange={e => setNewMaxUses(parseInt(e.target.value) || 1)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    background: 'rgba(12, 15, 22, 0.95)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ padding: '8px 10px', background: 'rgba(255, 147, 69, 0.08)', borderRadius: '6px', fontSize: '0.72rem', color: '#fbbf24', border: '1px solid rgba(255, 147, 69, 0.2)' }}>
                ⚡ <strong>Dual-Rule Expiry:</strong> User plan locks as soon as either <strong>{newValidityDays} Days</strong> pass OR <strong>{newMaxMintsLimit === 0 ? 'Unlimited' : `${newMaxMintsLimit} Mints`}</strong> are completed!
              </div>

              <button
                type="submit"
                disabled={isCreatingInvite}
                style={{
                  marginTop: '4px',
                  padding: '11px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF9345, #FF5500)',
                  border: 'none',
                  color: '#000',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255, 147, 69, 0.3)',
                  transition: 'all 0.15s'
                }}
              >
                {isCreatingInvite ? 'Issuing VIP Key...' : '✨ Issue Dual-Rule VIP Key'}
              </button>
            </form>
          </div>

          {/* 2. Code Inventory with Real-Time Code Tracking */}
          <div className="admin-codes-inventory-card" style={{
            background: 'rgba(20, 24, 36, 0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>
                🎫 Active Codes Inventory ({invites.length})
              </div>
              <input
                type="text"
                placeholder="Search code..."
                value={inviteSearch}
                onChange={e => setInviteSearch(e.target.value)}
                style={{
                  width: '130px',
                  padding: '4px 8px',
                  background: '#0e111a',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.75rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '460px', overflowY: 'auto' }}>
              {filteredInvites.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem' }}>
                  No invite codes found.
                </div>
              ) : (
                filteredInvites.map((inv, idx) => {
                  const stats = getCodeStats(inv.invite_code);
                  const isSelected = selectedCodeDrilldown === inv.invite_code;

                  return (
                    <div
                      key={inv.id || idx}
                      className="admin-code-item"
                      style={{
                        padding: '12px 14px',
                        background: isSelected ? 'rgba(255, 147, 69, 0.12)' : 'rgba(12, 15, 24, 0.95)',
                        border: isSelected ? '1px solid #FF9345' : '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#FF9345', fontSize: '0.92rem' }}>
                            {inv.invite_code}
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                            {inv.validity_days || 30}d
                          </span>
                          <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc' }}>
                            {inv.max_mints_limit ? `${inv.max_mints_limit} Mints` : '∞ Mints'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(inv.invite_code);
                              if (onShowToast) onShowToast(`Copied "${inv.invite_code}" to clipboard!`, 'info');
                            }}
                            title="Copy Code"
                            style={{ padding: '4px 7px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.7rem', cursor: 'pointer' }}
                          >
                            📋
                          </button>
                          <button
                            onClick={() => handleToggleInvite(inv.id, inv.is_active)}
                            title={inv.is_active ? 'Pause Code' : 'Activate Code'}
                            style={{
                              padding: '4px 7px',
                              borderRadius: '4px',
                              background: inv.is_active ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              border: `1px solid ${inv.is_active ? '#f59e0b' : '#10b981'}`,
                              color: inv.is_active ? '#f59e0b' : '#10b981',
                              fontSize: '0.7rem',
                              cursor: 'pointer'
                            }}
                          >
                            {inv.is_active ? '⏸️' : '▶️'}
                          </button>
                          <button
                            onClick={() => promptDeleteInvite(inv.id || inv.invite_code, inv.invite_code)}
                            title="Delete Code Permanently"
                            style={{ padding: '4px 7px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Code Analytics Live Banner */}
                      <div
                        onClick={() => setSelectedCodeDrilldown(isSelected ? null : inv.invite_code)}
                        style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          👥 Accounts Created: <strong style={{ color: '#fff' }}>{stats.userCount}</strong> • ⚡ Total Mints: <strong style={{ color: '#10b981' }}>{stats.totalMints}</strong>
                        </div>
                        <span style={{ color: '#FF9345', fontSize: '0.7rem' }}>{isSelected ? '▲ Hide' : '▼ View Users'}</span>
                      </div>

                      {/* Drilldown user list for this code */}
                      {isSelected && (
                        <div style={{ marginTop: '4px', padding: '8px', background: '#07090e', borderRadius: '6px', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <strong style={{ color: '#FF9345' }}>Accounts under {inv.invite_code}:</strong>
                          {stats.users.length === 0 ? (
                            <span style={{ color: '#6b7280' }}>No users have signed up with this code yet.</span>
                          ) : (
                            stats.users.map((su, sidx) => (
                              <div key={sidx} style={{ display: 'flex', justifyContent: 'space-between', color: '#d1d5db' }}>
                                <span>• {su.email}</span>
                                <span style={{ color: '#10b981' }}>{su.total_mints || 0} mints</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ═══════════════ RIGHT COLUMN: USER SUBSCRIPTION COMMANDER ═══════════════ */}
        <div className="admin-users-card" style={{
          background: 'rgba(20, 24, 36, 0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '20px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          
          {/* Header & Filter Controls */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👥 User Fleet Commander</span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>({filteredUsers.length} total)</span>
              </h3>

              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'active', label: '🟢 Active' },
                  { id: 'expired_time', label: '⏳ Time Expired' },
                  { id: 'expired_mints', label: '🎯 Quota Reached' },
                  { id: 'banned', label: '🚫 Suspended' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setUserFilter(f.id)}
                    className="admin-filter-btn"
                    style={{
                      padding: '3px 8px',
                      borderRadius: '5px',
                      border: 'none',
                      background: userFilter === f.id ? '#FF9345' : 'rgba(255,255,255,0.06)',
                      color: userFilter === f.id ? '#000' : '#9ca3af',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search input */}
            <input
              type="text"
              className="admin-input-box"
              placeholder="🔍 Search users by email, user ID, or VIP invite code..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '9px 12px',
                background: '#0e111a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* User Cards Feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '720px', overflowY: 'auto' }}>
            {filteredUsers.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                {loading ? 'Fetching member records...' : 'No accounts match the current filter.'}
              </div>
            ) : (
              filteredUsers.map((u, idx) => {
                const isOwner = u.email === 'jainbharat666@gmail.com' || u.role === 'admin';
                const isTimeExpired = u.valid_until && new Date(u.valid_until) <= new Date();
                const isMintsExpired = u.max_mints_allowed > 0 && (u.total_mints || 0) >= u.max_mints_allowed;

                const daysLeft = u.valid_until ? Math.ceil((new Date(u.valid_until) - new Date()) / 86400000) : 0;
                const mintsUsed = u.total_mints || 0;
                const maxMints = u.max_mints_allowed || 0;

                return (
                  <div
                    key={u.id || u.user_id || idx}
                    className="admin-user-item"
                    style={{
                      padding: '14px 16px',
                      background: isOwner ? 'linear-gradient(135deg, rgba(255, 147, 69, 0.08), rgba(20, 24, 36, 0.95))' : 'rgba(12, 15, 24, 0.95)',
                      border: isOwner ? '1px solid rgba(255, 147, 69, 0.4)' : (u.is_banned ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255,255,255,0.06)'),
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Top Row: User info + Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="admin-user-email" style={{ fontWeight: '700', color: '#fff', fontSize: '0.92rem' }}>
                            {u.email}
                          </span>
                          {isOwner ? (
                            <span style={{ padding: '1px 6px', background: '#FF9345', color: '#000', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '900' }}>
                              OWNER
                            </span>
                          ) : (
                            <span style={{ padding: '1px 6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>
                              VIP MEMBER
                            </span>
                          )}
                        </div>
                        <div className="admin-user-subtext" style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px', fontFamily: 'monospace' }}>
                          Code: <strong style={{ color: '#f59e0b' }}>{u.invite_code_used || '—'}</strong> • Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {isOwner ? (
                          <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid rgba(16,185,129,0.3)' }}>
                            ♾️ LIFETIME MASTER
                          </span>
                        ) : u.is_banned ? (
                          <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid rgba(239,68,68,0.4)' }}>
                            🚫 SUSPENDED
                          </span>
                        ) : (
                          <>
                            {/* Time Badge */}
                            {isTimeExpired ? (
                              <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid rgba(239,68,68,0.3)' }}>
                                ⏳ Expired ({daysLeft}d)
                              </span>
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid rgba(16,185,129,0.3)' }}>
                                🟢 {daysLeft}d active
                              </span>
                            )}

                            {/* Mint Quota Badge */}
                            {maxMints > 0 ? (
                              isMintsExpired ? (
                                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid rgba(239,68,68,0.3)' }}>
                                  🎯 {mintsUsed}/{maxMints} Mints (Quota Reached)
                                </span>
                              ) : (
                                <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid rgba(192,132,252,0.3)' }}>
                                  🎯 {mintsUsed}/{maxMints} Mints ({maxMints - mintsUsed} left)
                                </span>
                              )
                            ) : (
                              <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.72rem', fontWeight: 'bold', border: '1px solid rgba(56,189,248,0.3)' }}>
                                ⚡ {mintsUsed} Mints (Unlimited)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Full Granular Controls */}
                    {!isOwner && (
                      <div className="admin-user-actions-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '8px' }}>
                        
                        {/* Time Controls */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Time:</span>
                          <button
                            onClick={() => handleExtendDays(u.user_id, u.valid_until, 7)}
                            disabled={actionLoadingId === `days_${u.user_id}`}
                            title="Add 7 Days"
                            style={{ padding: '3px 7px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#10b981', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                          >
                            +7d
                          </button>
                          <button
                            onClick={() => handleExtendDays(u.user_id, u.valid_until, 30)}
                            disabled={actionLoadingId === `days_${u.user_id}`}
                            title="Add 30 Days"
                            style={{ padding: '3px 7px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                          >
                            +30d
                          </button>
                          <button
                            onClick={() => setCustomPromptModal({ isOpen: true, userId: u.user_id, userEmail: u.email, type: 'days', currentVal: daysLeft, inputValue: '7' })}
                            disabled={actionLoadingId === `days_${u.user_id}`}
                            title="Add custom days"
                            style={{ padding: '3px 7px', borderRadius: '4px', background: 'rgba(255, 147, 69, 0.15)', border: '1px solid rgba(255, 147, 69, 0.35)', color: '#FF9345', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                          >
                            +Custom
                          </button>
                        </div>

                        {/* Mint Quota Controls */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Quota:</span>
                          <button
                            onClick={() => handleExtendMints(u.user_id, 5)}
                            disabled={actionLoadingId === `mints_${u.user_id}`}
                            title="Add 5 Mints"
                            style={{ padding: '3px 7px', borderRadius: '4px', background: 'rgba(192, 132, 252, 0.15)', border: '1px solid rgba(192, 132, 252, 0.35)', color: '#c084fc', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                          >
                            +5 Mints
                          </button>
                          <button
                            onClick={() => handleExtendMints(u.user_id, 20)}
                            disabled={actionLoadingId === `mints_${u.user_id}`}
                            title="Add 20 Mints"
                            style={{ padding: '3px 7px', borderRadius: '4px', background: 'rgba(192, 132, 252, 0.15)', border: '1px solid rgba(192, 132, 252, 0.35)', color: '#c084fc', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                          >
                            +20 Mints
                          </button>
                          <button
                            onClick={() => handleExtendMints(u.user_id, 0, true)}
                            disabled={actionLoadingId === `mints_${u.user_id}`}
                            title="Set Unlimited Mints"
                            style={{ padding: '3px 7px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '0.72rem', cursor: 'pointer' }}
                          >
                            Set ∞
                          </button>
                          <button
                            onClick={() => setCustomPromptModal({ isOpen: true, userId: u.user_id, userEmail: u.email, type: 'mints', currentVal: maxMints, inputValue: String(maxMints || 5) })}
                            disabled={actionLoadingId === `mints_${u.user_id}`}
                            title="Set exact custom mint quota (e.g. 5 Mints)"
                            style={{ padding: '3px 7px', borderRadius: '4px', background: 'rgba(255, 147, 69, 0.15)', border: '1px solid rgba(255, 147, 69, 0.4)', color: '#FF9345', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                          >
                            🎯 Custom
                          </button>
                        </div>

                        {/* Ban, Delete & History Controls */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleViewUserHistory(u)}
                            title="View User Mint History & Receipts"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              color: '#38bdf8',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            📜 History
                          </button>

                          <button
                            onClick={() => handleToggleBan(u.user_id, u.is_banned)}
                            disabled={actionLoadingId === `ban_${u.user_id}`}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: u.is_banned ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              border: `1px solid ${u.is_banned ? '#10b981' : '#ef4444'}`,
                              color: u.is_banned ? '#10b981' : '#ef4444',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {u.is_banned ? 'Reactivate' : 'Suspend'}
                          </button>

                          <button
                            onClick={() => promptDeleteUser(u.user_id, u.email)}
                            disabled={actionLoadingId === `del_${u.user_id}`}
                            title="Delete User Permanently"
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.35)',
                              color: '#ef4444',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>

                      </div>
                    )}

                    {isOwner && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                          onClick={() => handleViewUserHistory(u)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'rgba(255, 147, 69, 0.15)',
                            border: '1px solid rgba(255, 147, 69, 0.35)',
                            color: '#FF9345',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          📜 Owner History
                        </button>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      
      {/* ────────────────── ⚡ MANAGED VIP FLEET RPC CLUSTER (CLOUD SYNCED) ────────────────── */}
      <div className="admin-rpc-cluster-card" style={{
        marginTop: '24px',
        padding: '20px 22px',
        background: 'linear-gradient(135deg, rgba(20, 24, 38, 0.95), rgba(12, 15, 25, 0.98))',
        borderRadius: '14px',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)'
            }}>
              ⚡
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: '#fff' }}>
                  Subscriber Fleet RPC Cluster
                </h3>
                <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)', fontSize: '0.68rem', fontWeight: 'bold' }}>
                  SUBSCRIBER VIP POOL
                </span>
                <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', fontSize: '0.68rem', fontWeight: 'bold' }}>
                  ☁️ CLOUD SYNCED
                </span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
                Manage private cluster endpoints for subscribers. Stored directly in Supabase Cloud. Subscribers receive auto-balanced traffic with 100% URL masking!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <select
              value={selectedFleetNetwork}
              onChange={(e) => setSelectedFleetNetwork(e.target.value)}
              className="admin-select-box"
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <option value="robinhood">Robinhood Chain</option>
              <option value="base">Base Mainnet</option>
              <option value="ink">Ink Chain</option>
              <option value="ethereum">Ethereum</option>
            </select>

            <button
              onClick={() => handleTestFleetLatencies()}
              disabled={isTestingFleetLatencies}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(99, 102, 241, 0.3))',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                color: '#c084fc',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{isTestingFleetLatencies ? '⏳' : '⚡'}</span>
              {isTestingFleetLatencies ? 'Testing Pings...' : 'Test Cluster Latencies'}
            </button>
          </div>
        </div>

        {/* Add New Fleet Node Form */}
        <form onSubmit={handleAddFleetRpc} style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 1fr) minmax(280px, 2.5fr) 110px auto',
          gap: '10px',
          alignItems: 'center',
          padding: '12px 14px',
          background: 'rgba(0, 0, 0, 0.35)',
          borderRadius: '10px',
          border: '1px dashed rgba(168, 85, 247, 0.4)',
          marginBottom: '16px'
        }}>
          <input
            type="text"
            placeholder="Node Label (e.g. Alchemy Dedicated #1)"
            value={newFleetName}
            onChange={(e) => setNewFleetName(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.8rem'
            }}
          />
          <input
            type="text"
            placeholder="Private RPC URL (https://... or wss://...)"
            value={newFleetUrl}
            onChange={(e) => setNewFleetUrl(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.8rem',
              fontFamily: 'monospace'
            }}
          />
          <select
            value={newFleetPriority}
            onChange={(e) => setNewFleetPriority(e.target.value)}
            style={{
              padding: '8px 8px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '0.78rem'
            }}
          >
            <option value="1">Rank 1 (Top)</option>
            <option value="2">Rank 2</option>
            <option value="3">Rank 3</option>
            <option value="4">Rank 4</option>
            <option value="5">Rank 5</option>
          </select>
          <button
            type="submit"
            disabled={isAddingFleetRpc}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              border: 'none',
              color: '#fff',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {isAddingFleetRpc ? 'Adding...' : '+ Add Fleet Node'}
          </button>
        </form>

        {/* Fleet Nodes List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {fleetRpcs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
              No custom fleet nodes configured for this network yet. Default built-in high speed pool is active.
            </div>
          ) : (
            fleetRpcs.map((rpc, index) => {
              const ping = fleetLatencies[rpc.id];
              return (
                <div
                  key={rpc.id || index}
                  className="admin-rpc-node-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: rpc.is_active !== false ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: rpc.is_active !== false ? '#10b981' : '#6b7280',
                      boxShadow: rpc.is_active !== false ? '0 0 8px #10b981' : 'none'
                    }} />
                    <strong style={{ fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap' }}>
                      {rpc.name}
                    </strong>
                    
                    {/* Rank Priority Badge with Quick Increment/Decrement */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(168, 85, 247, 0.15)',
                        color: '#c084fc',
                        fontWeight: 'bold'
                      }}>
                        Rank #{rpc.priority || index + 1}
                      </span>
                    </div>

                    {ping && (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: ping.includes('ms') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: ping.includes('ms') ? '#34d399' : '#f87171',
                        fontWeight: 'bold'
                      }}>
                        ⚡ {ping}
                      </span>
                    )}

                    <span style={{
                      fontSize: '0.74rem',
                      color: '#9ca3af',
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '380px'
                    }}>
                      {rpc.url}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleToggleFleetActive(rpc.id, rpc.is_active !== false)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: rpc.is_active !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                        border: `1px solid ${rpc.is_active !== false ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
                        color: rpc.is_active !== false ? '#34d399' : '#9ca3af',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {rpc.is_active !== false ? '🟢 Active' : '⏸️ Paused'}
                    </button>
                    <button
                      onClick={() => promptDeleteFleetRpc(rpc.id, rpc.name)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '0.72rem',
                        cursor: 'pointer'
                      }}
                      title="Delete Node from Cloud Pool"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>


      {/* Custom Days & Custom Quota Prompt Modal */}
      {customPromptModal.isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000
        }}>
          <div style={{
            background: 'rgba(15, 20, 32, 0.98)',
            border: '1px solid rgba(255, 147, 69, 0.4)',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '380px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#FF9345', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {customPromptModal.type === 'mints' ? '🎯 Set Exact Mint Quota' : '⏳ Add Custom Validity Days'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#9ca3af' }}>
              User: <strong style={{ color: '#fff' }}>{customPromptModal.userEmail}</strong>
            </p>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.75rem', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>
                {customPromptModal.type === 'mints' ? 'Enter Total Mint Limit (e.g. 5, 10, 20):' : 'Enter Days to Add (e.g. 5, 15, 60):'}
              </label>
              <input
                type="number"
                min="1"
                max="100000"
                autoFocus
                value={customPromptModal.inputValue}
                onChange={e => setCustomPromptModal(prev => ({ ...prev, inputValue: e.target.value }))}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 14px',
                  background: 'rgba(10, 13, 20, 0.95)',
                  border: '1px solid rgba(255, 147, 69, 0.5)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCustomPromptModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#9ca3af',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = parseInt(customPromptModal.inputValue);
                  if (isNaN(val) || val <= 0) {
                    if (onShowToast) onShowToast('Please enter a valid positive number', 'warning');
                    return;
                  }
                  if (customPromptModal.type === 'mints') {
                    handleExtendMints(customPromptModal.userId, 0, false, val);
                  } else {
                    const u = users.find(x => x.user_id === customPromptModal.userId);
                    handleExtendDays(customPromptModal.userId, u?.valid_until, val);
                  }
                  setCustomPromptModal(prev => ({ ...prev, isOpen: false }));
                }}
                style={{
                  padding: '8px 18px',
                  background: 'linear-gradient(135deg, #FF9345, #f59e0b)',
                  border: 'none',
                  color: '#000',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CyberModal Confirmation Dialog */}
      <CyberModal
        isOpen={cyberModal.isOpen}
        type={cyberModal.type}
        title={cyberModal.title}
        message={cyberModal.message}
        detail={cyberModal.detail}
        icon={cyberModal.icon}
        confirmText={cyberModal.confirmText}
        cancelText={cyberModal.cancelText}
        onConfirm={cyberModal.onConfirm}
        onCancel={cyberModal.onCancel}
      />

      {/* 📜 User Transaction History Modal */}
      {historyModalUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 7, 13, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setHistoryModalUser(null); }}
        >
          <div style={{
            background: '#0c0f18',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '860px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>📜</span>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>
                    Mint Audit History: <span style={{ color: '#38bdf8' }}>{historyModalUser.email}</span>
                  </h3>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '3px', fontFamily: 'monospace' }}>
                  User ID: <strong style={{ color: '#cbd5e1' }}>{historyModalUser.user_id || historyModalUser.id}</strong> • Total Mints: <strong style={{ color: '#10b981' }}>{historyModalUser.total_mints || 0}</strong> • Max Quota: <strong style={{ color: '#c084fc' }}>{historyModalUser.max_mints_allowed > 0 ? historyModalUser.max_mints_allowed : '∞'}</strong>
                </div>
              </div>

              <button
                onClick={() => setHistoryModalUser(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '1.2rem',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              {historyLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#38bdf8', fontSize: '0.85rem' }}>
                  ⚡ Fetching cloud transaction ledger from US VPS...
                </div>
              ) : userHistoryLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>
                  No transaction records found for this account in Cloud Database.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#9ca3af' }}>
                        <th style={{ padding: '8px 10px' }}>Time</th>
                        <th style={{ padding: '8px 10px' }}>Task / Stage</th>
                        <th style={{ padding: '8px 10px' }}>Wallet</th>
                        <th style={{ padding: '8px 10px' }}>Contract</th>
                        <th style={{ padding: '8px 10px' }}>Gas Spent</th>
                        <th style={{ padding: '8px 10px' }}>Status</th>
                        <th style={{ padding: '8px 10px' }}>Explorer Proof</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userHistoryLogs.map((tx, tidx) => (
                        <tr key={tx.id || tidx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', color: '#d1d5db' }}>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#9ca3af' }}>{tx.time || '—'}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#f59e0b' }}>{tx.taskName || 'Mint'}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                            {tx.wallet ? `${tx.wallet.slice(0, 6)}...${tx.wallet.slice(-4)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                            {tx.contract ? `${tx.contract.slice(0, 6)}...${tx.contract.slice(-4)}` : '—'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#10b981' }}>
                            {tx.gasUsedNative ? `${tx.gasUsedNative} ETH` : '—'}
                            {tx.gasUsedUsd ? ` ($${tx.gasUsedUsd})` : ''}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: tx.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: tx.status === 'SUCCESS' ? '#10b981' : '#ef4444',
                              fontWeight: 'bold',
                              fontSize: '0.7rem'
                            }}>
                              {tx.status || 'SUCCESS'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {tx.txHash && tx.txHash.startsWith('0x') ? (
                              <a
                                href={`https://explorer.mainnet.chain.robinhood.com/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#38bdf8', textDecoration: 'none', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '3px' }}
                              >
                                <span>{tx.txHash.slice(0, 8)}...</span>
                                <span>↗</span>
                              </a>
                            ) : (
                              <span style={{ color: '#6b7280' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <button
                onClick={() => setHistoryModalUser(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
