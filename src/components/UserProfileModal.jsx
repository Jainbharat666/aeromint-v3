import React, { useState, useEffect } from 'react';
import { changeUserPassword, redeemTopupCode, saveCloudVaultConfig, fetchCloudVaultConfig, deleteCloudVaultConfig } from '../lib/supabase';

export default function UserProfileModal({
  currentUser,
  onClose,
  onLogout,
  onUpdateUser,
  onShowToast,
  wallets = [],
  rpcEndpoints = [],
  selectedNetworkKey = 'robinhood',
  onImportWallets,
  onRestoreRpcs,
  onSaveRpcEndpoints,
  onSetPrimaryRpc,
  onDeleteRpc
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'cloud_vault' | 'rpcs' | 'security' | 'renew'
  
  // Local state for User Profile RPC Manager
  const [modalNewRpcName, setModalNewRpcName] = useState('');
  const [modalNewRpcUrl, setModalNewRpcUrl] = useState('');
  const [modalEditingRpcIndex, setModalEditingRpcIndex] = useState(null);
  const [modalEditRpcName, setModalEditRpcName] = useState('');
  const [modalEditRpcUrl, setModalEditRpcUrl] = useState('');
  
  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Topup / Renewal Key state
  const [topupKey, setTopupKey] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [topupError, setTopupError] = useState('');
  const [topupSuccess, setTopupSuccess] = useState('');

  // Cloud Vault & Sync State
  const [vaultEnabled, setVaultEnabled] = useState(() => {
    return localStorage.getItem(`aero_vault_enabled_${currentUser?.id}`) === 'true';
  });
  const [vaultStats, setVaultStats] = useState({
    walletCount: 0,
    rpcCount: 0,
    lastSynced: null,
    loading: false
  });
  const [isSyncingVault, setIsSyncingVault] = useState(false);
  const [isRestoringVault, setIsRestoringVault] = useState(false);

  // Live Second-by-Second Countdown State
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  const isOwner = currentUser?.email?.toLowerCase() === 'jainbharat666@gmail.com' || currentUser?.role === 'admin';

  // Live 1-Second Ticker Clock
  useEffect(() => {
    if (isOwner || !currentUser?.valid_until) {
      setTimeLeft({ days: 3650, hours: 0, minutes: 0, seconds: 0, isExpired: false });
      return;
    }

    const updateClock = () => {
      const targetTime = new Date(currentUser.valid_until).getTime();
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [currentUser, isOwner]);

  // Load Cloud Vault status on mount / tab open
  useEffect(() => {
    if (currentUser?.id && activeTab === 'cloud_vault') {
      loadCloudVaultStats();
    }
  }, [currentUser, activeTab]);

  async function loadCloudVaultStats() {
    setVaultStats(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetchCloudVaultConfig(currentUser.id);
      if (res.success && res.config) {
        const cfg = res.config;
        setVaultStats({
          walletCount: cfg.wallets?.length || 0,
          rpcCount: cfg.custom_rpcs?.length || 0,
          lastSynced: cfg.synced_at || null,
          loading: false
        });
        if (cfg.cloud_vault_enabled !== undefined) {
          setVaultEnabled(cfg.cloud_vault_enabled);
          localStorage.setItem(`aero_vault_enabled_${currentUser.id}`, String(cfg.cloud_vault_enabled));
        }
      } else {
        setVaultStats({ walletCount: 0, rpcCount: 0, lastSynced: null, loading: false });
      }
    } catch (e) {
      setVaultStats(prev => ({ ...prev, loading: false }));
    }
  }

  // Handle Vault Toggle
  async function handleToggleVault(enabled) {
    setVaultEnabled(enabled);
    localStorage.setItem(`aero_vault_enabled_${currentUser?.id}`, String(enabled));
    if (currentUser?.id) {
      await saveCloudVaultConfig(currentUser.id, { cloud_vault_enabled: enabled });
      if (onShowToast) onShowToast(enabled ? '🔒 Cloud Vault Backup Enabled' : '⚪ Switched to Local-Only Mode', 'info');
    }
  }

  // Helper to gather local wallets from props and all storage keys
  function gatherAllLocalWallets() {
    if (Array.isArray(wallets) && wallets.length > 0) return wallets;
    
    // Check strictly user-scoped key
    try {
      const raw = localStorage.getItem(`aero_user_${currentUser?.id}_wallets`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return [];
  }

  // Helper to identify system RPC
  function isSystemRpc(r) {
    if (!r) return false;
    if (r.isFleet || r.isSystem) return true;
    const name = r.name || '';
    if (name.includes('AeroMint') || name.includes('Official RPC')) return true;
    const url = (r.url || '').toLowerCase();
    if (url.includes('chain.robinhood.com')) return true;
    return false;
  }

  // Helper to gather local custom RPCs
  function gatherAllLocalRpcs() {
    if (Array.isArray(rpcEndpoints)) {
      const custom = rpcEndpoints.filter(r => !isSystemRpc(r));
      if (custom.length > 0) return custom;
    }

    try {
      const raw = localStorage.getItem(`aero_u_${currentUser?.id}_custom_rpcs_${selectedNetworkKey}`) ||
                  localStorage.getItem('aero_custom_rpcs');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(r => !isSystemRpc(r));
      }
    } catch (e) {}

    return [];
  }

  // Backup / Sync Wallets & RPCs to Supabase Cloud Vault
  async function handleBackupToCloud() {
    if (!currentUser?.id) return;
    setIsSyncingVault(true);
    try {
      const localWallets = gatherAllLocalWallets();
      const localRpcs = gatherAllLocalRpcs();

      let walletNames = {};
      try {
        walletNames = JSON.parse(localStorage.getItem('aero_wallet_names') || '{}');
      } catch (e) {}

      const masterWallet = localStorage.getItem('aero_master_wallet') || '';

      const payload = {
        cloud_vault_enabled: true,
        wallets: localWallets,
        custom_rpcs: localRpcs,
        wallet_names: walletNames,
        master_wallet: masterWallet,
        synced_at: new Date().toISOString()
      };

      const res = await saveCloudVaultConfig(currentUser.id, payload);
      if (res.success) {
        setVaultEnabled(true);
        localStorage.setItem(`aero_vault_enabled_${currentUser.id}`, 'true');
        setVaultStats({
          walletCount: localWallets.length,
          rpcCount: localRpcs.length,
          lastSynced: payload.synced_at,
          loading: false
        });
        if (onShowToast) onShowToast(`☁️ Synced ${localWallets.length} Wallets & ${localRpcs.length} RPCs to Cloud Vault!`, 'success');
      } else {
        if (onShowToast) onShowToast(res.error || 'Failed to sync to Cloud Vault', 'error');
      }
    } catch (e) {
      if (onShowToast) onShowToast('Sync error: ' + e.message, 'error');
    } finally {
      setIsSyncingVault(false);
    }
  }

  // Restore Wallets & RPCs from Supabase Cloud Vault
  async function handleRestoreFromCloud() {
    if (!currentUser?.id) return;
    setIsRestoringVault(true);
    try {
      const res = await fetchCloudVaultConfig(currentUser.id);
      if (res.success && res.config) {
        const cfg = res.config;
        let restoredWallets = 0;
        let restoredRpcs = 0;

        if (cfg.wallets && Array.isArray(cfg.wallets) && cfg.wallets.length > 0) {
          localStorage.setItem(`aero_user_${currentUser.id}_wallets`, JSON.stringify(cfg.wallets));
          if (onImportWallets) onImportWallets(cfg.wallets);
          restoredWallets = cfg.wallets.length;
        }

        if (cfg.custom_rpcs && Array.isArray(cfg.custom_rpcs) && cfg.custom_rpcs.length > 0) {
          localStorage.setItem(`aero_u_${currentUser.id}_custom_rpcs_${selectedNetworkKey}`, JSON.stringify(cfg.custom_rpcs));
          localStorage.setItem('aero_custom_rpcs', JSON.stringify(cfg.custom_rpcs));
          if (onRestoreRpcs) onRestoreRpcs(cfg.custom_rpcs);
          restoredRpcs = cfg.custom_rpcs.length;
        }

        if (cfg.wallet_names) {
          localStorage.setItem('aero_wallet_names', JSON.stringify(cfg.wallet_names));
        }

        if (cfg.master_wallet) {
          localStorage.setItem('aero_master_wallet', cfg.master_wallet);
        }

        if (onShowToast) onShowToast(`🎉 Restored ${restoredWallets} Wallets & ${restoredRpcs} RPCs! Reloading session...`, 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        if (onShowToast) onShowToast('No backup found in Cloud Vault for this account.', 'warning');
      }
    } catch (e) {
      if (onShowToast) onShowToast('Restore failed: ' + e.message, 'error');
    } finally {
      setIsRestoringVault(false);
    }
  }

  // Wipe Cloud Vault from Server
  async function handleWipeCloudVault() {
    if (!currentUser?.id) return;
    if (!window.confirm('Delete all backed up wallets and RPCs from Cloud Server? (Local browser data will not be affected)')) return;
    try {
      await deleteCloudVaultConfig(currentUser.id);
      setVaultStats({ walletCount: 0, rpcCount: 0, lastSynced: null, loading: false });
      if (onShowToast) onShowToast('🗑️ Cloud Vault backup wiped from database.', 'info');
    } catch (e) {
      if (onShowToast) onShowToast('Wipe failed: ' + e.message, 'error');
    }
  }

  // Handle Password Change
  async function handleChangePassword(e) {
    if (e) e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (!oldPassword || !newPassword) {
      setPassError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changeUserPassword({
        email: currentUser.email,
        oldPassword,
        newPassword
      });
      setPassSuccess(res.message || '✅ Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onShowToast) onShowToast('🔐 Password changed successfully!', 'success');
    } catch (err) {
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPass(false);
    }
  }

  // Handle Topup Key Redemption
  async function handleRedeemKey(e) {
    if (e) e.preventDefault();
    setTopupError('');
    setTopupSuccess('');

    const cleanCode = topupKey.trim().toUpperCase().replace(/[\u2010-\u2015\u2212\uFF0D]/g, '-');
    if (!cleanCode) {
      setTopupError('Please enter a VIP Top-up / Renewal Key.');
      return;
    }

    setIsRedeeming(true);
    try {
      const res = await redeemTopupCode({
        email: currentUser.email,
        topupCode: cleanCode
      });

      setTopupSuccess(res.message || '🎉 Subscription Extended!');
      setTopupKey('');

      if (res.valid_until || res.max_mints_allowed !== undefined) {
        const updated = {
          ...currentUser,
          valid_until: res.valid_until || currentUser.valid_until,
          max_mints_allowed: res.max_mints_allowed !== undefined ? res.max_mints_allowed : currentUser.max_mints_allowed
        };
        if (onUpdateUser) onUpdateUser(updated);
        localStorage.setItem('aero_auth_session', JSON.stringify({ user: updated, loggedInAt: Date.now() }));
      }

      if (onShowToast) onShowToast(res.message || '🎉 Top-up Applied Successfully!', 'success');
    } catch (err) {
      setTopupError(err.message || 'Failed to apply top-up key.');
    } finally {
      setIsRedeeming(false);
    }
  }

  const email = currentUser?.email || 'VIP Member';
  const displayName = currentUser?.user_metadata?.name || email.split('@')[0];
  const mintsUsed = currentUser?.total_mints || 0;
  const maxMints = currentUser?.max_mints_allowed || 0;
  const mintsRemaining = maxMints > 0 ? Math.max(0, maxMints - mintsUsed) : null;
  const mintPercent = maxMints > 0 ? Math.min(100, Math.round((mintsUsed / maxMints) * 100)) : 0;

  const currentLocalWalletsCount = gatherAllLocalWallets().length;
  const currentLocalRpcsCount = gatherAllLocalRpcs().length;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 7, 13, 0.82)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div className="user-profile-modal-content" style={{
        width: '100%',
        maxWidth: '560px',
        background: 'linear-gradient(145deg, rgba(20, 24, 38, 0.98), rgba(12, 14, 24, 0.99))',
        border: '1px solid rgba(255, 147, 69, 0.35)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255, 147, 69, 0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '92vh'
      }}>
        
        {/* Modal Header */}
        <div className="modal-header-section" style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: isOwner ? 'linear-gradient(135deg, #FF9345, #FF5500)' : 'linear-gradient(135deg, #38bdf8, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: isOwner ? '0 0 15px rgba(255, 147, 69, 0.5)' : '0 0 15px rgba(56, 189, 248, 0.4)'
            }}>
              {isOwner ? '👑' : '💎'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: '800' }}>
                  {displayName}
                </h2>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '800',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: isOwner ? 'rgba(255, 147, 69, 0.25)' : 'rgba(56, 189, 248, 0.2)',
                  color: isOwner ? '#FF9345' : '#38bdf8',
                  border: `1px solid ${isOwner ? 'rgba(255, 147, 69, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                  textTransform: 'uppercase'
                }}>
                  {isOwner ? 'Platform Owner' : 'VIP Member'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>{email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#9ca3af',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Cyberpunk Navigation Tabs */}
        <div className="modal-nav-tabs" style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10, 13, 20, 0.6)',
          padding: '0 12px'
        }}>
          {[
            { id: 'overview', label: '📊 Overview', color: '#38bdf8' },
            { id: 'cloud_vault', label: '🔐 Cloud Vault', color: '#10b981' },
            { id: 'rpcs', label: '🌐 Custom RPCs', color: '#a855f7' },
            { id: 'security', label: '🛡️ Password', color: '#FF9345' },
            { id: 'renew', label: '🎟️ Redeem Key', color: '#c084fc' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '12px 6px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${tab.color}` : '3px solid transparent',
                color: activeTab === tab.id ? '#fff' : '#9ca3af',
                fontWeight: activeTab === tab.id ? '700' : '500',
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* ══════════════ TAB 1: OVERVIEW & COUNTDOWNS ══════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Single Device Concurrency Shield Pill */}
              <div className="concurrency-lock-pill" style={{
                padding: '10px 14px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399' }}>
                  <span>🛡️</span>
                  <span><strong>Single-Device Concurrency Lock:</strong> 1 Active Device Permitted</span>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontWeight: 'bold' }}>
                  ACTIVE
                </span>
              </div>

              {/* Live Validity Countdown Clock */}
              <div className="vip-subscription-card" style={{
                background: 'rgba(15, 20, 30, 0.8)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '14px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div className="vip-card-title" style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  ⏱️ Live VIP Subscription Remaining
                </div>

                {isOwner ? (
                  <div style={{ fontSize: '1.4rem', fontWeight: '900', color: '#10b981', padding: '10px 0' }}>
                    ♾️ UNLIMITED LIFETIME ACCESS
                  </div>
                ) : timeLeft.isExpired ? (
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ef4444', padding: '10px 0' }}>
                    ⚠️ SUBSCRIPTION EXPIRED
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '4px 0 10px' }}>
                    {[
                      { val: timeLeft.days, unit: 'DAYS' },
                      { val: timeLeft.hours, unit: 'HOURS' },
                      { val: timeLeft.minutes, unit: 'MINS' },
                      { val: timeLeft.seconds, unit: 'SECS' }
                    ].map((t, idx) => (
                      <div key={idx} className="countdown-box" style={{
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        minWidth: '55px'
                      }}>
                        <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#38bdf8', fontFamily: 'monospace' }}>
                          {String(t.val).padStart(2, '0')}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: '600' }}>{t.unit}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="valid-until-text" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Valid Until: <strong style={{ color: '#e5e7eb' }}>
                    {isOwner ? 'Permanent (2036)' : (currentUser?.valid_until ? new Date(currentUser.valid_until).toLocaleString() : 'N/A')}
                  </strong>
                </div>
              </div>

              {/* Mint Quota Meter */}
              <div className="mint-quota-card" style={{
                background: 'rgba(15, 20, 30, 0.8)',
                border: '1px solid rgba(192, 132, 252, 0.3)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="quota-card-title" style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    🎯 Mint Quota Progress
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#c084fc' }}>
                    {maxMints === 0 ? '♾️ Unlimited Mints' : `${mintsUsed} / ${maxMints} Mints Used`}
                  </div>
                </div>

                {maxMints > 0 && (
                  <>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden', margin: '8px 0' }}>
                      <div style={{
                        width: `${mintPercent}%`,
                        height: '100%',
                        background: mintPercent >= 100 ? '#ef4444' : 'linear-gradient(90deg, #38bdf8, #a855f7)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9ca3af' }}>
                      <span>Completed: <strong>{mintsUsed}</strong></span>
                      <span style={{ color: mintsRemaining === 0 ? '#ef4444' : '#34d399', fontWeight: 'bold' }}>
                        {mintsRemaining === 0 ? 'Quota Reached!' : `${mintsRemaining} Mints Remaining`}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* VIP Code Used Badge */}
              <div className="vip-code-card" style={{
                padding: '10px 14px',
                background: 'rgba(255, 147, 69, 0.08)',
                border: '1px solid rgba(255, 147, 69, 0.25)',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem'
              }}>
                <span style={{ color: '#9ca3af' }}>Activated VIP Code:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: '800', color: '#FF9345' }}>
                  {currentUser?.invite_code_used || 'DIRECT_OWNER'}
                </span>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 2: ENCRYPTED CLOUD VAULT & MULTI-DEVICE SYNC ══════════════ */}
          {activeTab === 'cloud_vault' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Feature Header Card */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔐</span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#fff' }}>
                        Encrypted Cloud Vault (Optional)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                        Save burner wallets & custom RPCs to private database for cross-device access.
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={vaultEnabled}
                      onChange={e => handleToggleVault(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: vaultEnabled ? '#10b981' : 'rgba(255,255,255,0.15)',
                      borderRadius: '24px',
                      transition: '0.3s'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '',
                        height: '18px',
                        width: '18px',
                        left: vaultEnabled ? '22px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        transition: '0.3s'
                      }} />
                    </span>
                  </label>
                </div>

                <div style={{ fontSize: '0.74rem', color: vaultEnabled ? '#34d399' : '#9ca3af', marginTop: '6px' }}>
                  {vaultEnabled 
                    ? '🟢 Cloud Backup Active: You can backup and restore wallets seamlessly across computers.'
                    : '⚪ Local-Only Private Mode: Wallets are stored strictly on this browser only.'
                  }
                </div>
              </div>

              {/* Local Browser Detected Data Pill */}
              <div style={{
                padding: '10px 14px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.78rem'
              }}>
                <span style={{ color: '#9ca3af' }}>Active on this Browser:</span>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>
                  💼 {currentLocalWalletsCount} Wallets • 🌐 {currentLocalRpcsCount} Custom RPCs
                </span>
              </div>

              {/* Cloud Vault Stats */}
              <div style={{
                background: 'rgba(15, 20, 30, 0.8)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  ☁️ Cloud Backup Status
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Wallets in Cloud</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#38bdf8', marginTop: '2px' }}>
                      {vaultStats.walletCount} Wallets
                    </div>
                  </div>

                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Custom RPCs in Cloud</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#c084fc', marginTop: '2px' }}>
                      {vaultStats.rpcCount} RPCs
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '14px' }}>
                  Last Synced: <strong style={{ color: '#d1d5db' }}>
                    {vaultStats.lastSynced ? new Date(vaultStats.lastSynced).toLocaleString() : 'Never'}
                  </strong>
                </div>

                {/* Instant Sync & Restore Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleBackupToCloud}
                    disabled={isSyncingVault}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      transition: 'all 0.15s'
                    }}
                  >
                    {isSyncingVault ? '🔄 Syncing...' : '🔄 Backup to Cloud Now'}
                  </button>

                  <button
                    type="button"
                    onClick={handleRestoreFromCloud}
                    disabled={isRestoringVault || vaultStats.walletCount === 0}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #38bdf8, #0284c7)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.82rem',
                      cursor: vaultStats.walletCount === 0 ? 'not-allowed' : 'pointer',
                      opacity: vaultStats.walletCount === 0 ? 0.5 : 1,
                      boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)',
                      transition: 'all 0.15s'
                    }}
                  >
                    {isRestoringVault ? '📥 Restoring...' : '📥 Restore from Cloud'}
                  </button>

                  {vaultStats.walletCount > 0 && (
                    <button
                      type="button"
                      onClick={handleWipeCloudVault}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Wipe
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB: CUSTOM RPCS & NETWORK FLEET ══════════════ */}
          {activeTab === 'rpcs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Network Context Header */}
              <div style={{
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🌐 Network RPC Fleet</span>
                    <span style={{ fontSize: '0.68rem', padding: '2px 7px', background: 'rgba(168, 85, 247, 0.25)', color: '#c084fc', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                      {selectedNetworkKey}
                    </span>
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 'bold' }}>
                    ☁️ Auto-Synced
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#9ca3af', lineHeight: '1.4' }}>
                  ⚡ AeroRPC is managed from Admin Fleet and Robinhood Official is the secondary sequencer. These 2 system nodes are permanent. You can add, edit, or delete personal RPC nodes below.
                </div>
              </div>

              {/* Active RPCs List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '2px' }}>
                {rpcEndpoints.map((rpc, idx) => {
                  const isFleetNode = rpc.isFleet || rpc.role === 'fleet' || rpc.name?.includes('AeroMint') || rpc.name?.includes('Aero VIP');
                  const displayName = isFleetNode ? '⚡ AeroMint High-Speed Private RPC' : rpc.name;
                  const isMaskedFleet = !isOwner && isFleetNode;
                  const displayUrl = isMaskedFleet ? 'https://••••••••••••••••••••••••••••••••' : rpc.url;
                  const isPrimary = rpc.role === 'primary';
                  const isSystemNode = isSystemRpc(rpc);
                  const isCustomNode = !isSystemNode;
                  const isEditingThis = modalEditingRpcIndex === idx;

                  if (isEditingThis) {
                    return (
                      <div 
                        key={idx}
                        style={{
                          background: 'rgba(56, 189, 248, 0.08)',
                          border: '1.5px solid #38bdf8',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#38bdf8' }}>✏️ Edit Custom RPC</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px' }}>
                          <input
                            type="text"
                            value={modalEditRpcName}
                            onChange={(e) => setModalEditRpcName(e.target.value)}
                            placeholder="Node Name"
                            style={{
                              padding: '6px 8px',
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '0.78rem'
                            }}
                          />
                          <input
                            type="text"
                            value={modalEditRpcUrl}
                            onChange={(e) => setModalEditRpcUrl(e.target.value)}
                            placeholder="https://rpc-url..."
                            style={{
                              padding: '6px 8px',
                              background: 'rgba(0,0,0,0.4)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '0.78rem',
                              fontFamily: 'monospace'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setModalEditingRpcIndex(null)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              color: '#9ca3af',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!modalEditRpcName.trim() || !modalEditRpcUrl.trim()) return;
                              const updated = rpcEndpoints.map((r, i) => i === idx ? {
                                ...r,
                                name: modalEditRpcName.trim(),
                                url: modalEditRpcUrl.trim(),
                                latency: 'Unchecked',
                                isCustom: true,
                                role: r.role === 'primary' ? 'primary' : 'custom'
                              } : r);
                              setModalEditingRpcIndex(null);
                              if (onSaveRpcEndpoints) onSaveRpcEndpoints(updated);
                              if (onShowToast) onShowToast(`Updated RPC: ${modalEditRpcName.trim()}`, 'success');
                            }}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              background: '#38bdf8',
                              border: 'none',
                              color: '#000',
                              fontWeight: 'bold',
                              fontSize: '0.72rem',
                              cursor: 'pointer'
                            }}
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        background: isPrimary ? 'rgba(168, 85, 247, 0.12)' : 'rgba(0, 0, 0, 0.35)',
                        border: isPrimary ? '1.5px solid rgba(168, 85, 247, 0.55)' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.84rem', color: '#fff' }}>{displayName}</strong>
                          {isPrimary && (
                            <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.3)', color: '#c084fc', fontWeight: 'bold' }}>
                              👑 PRIMARY
                            </span>
                          )}
                          {isSystemNode && (
                            <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 'bold', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                              🔒 SYSTEM
                            </span>
                          )}
                          {isCustomNode && (
                            <span style={{ fontSize: '0.62rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontWeight: 'bold' }}>
                              ➕ CUSTOM
                            </span>
                          )}
                          <span style={{ fontSize: '0.66rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                            {rpc.latency || 'Unchecked'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: isMaskedFleet ? '#c084fc' : '#6b7280', marginTop: '2px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayUrl}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onSetPrimaryRpc) onSetPrimaryRpc(idx);
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              color: '#38bdf8',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Set Primary
                          </button>
                        )}

                        {isCustomNode && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setModalEditingRpcIndex(idx);
                                setModalEditRpcName(rpc.name);
                                setModalEditRpcUrl(rpc.url);
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: 'rgba(251, 191, 36, 0.15)',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                                color: '#fbbf24',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              title="Edit this custom RPC"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (onDeleteRpc) {
                                  onDeleteRpc(idx);
                                } else {
                                  const filtered = rpcEndpoints.filter((_, i) => i !== idx);
                                  if (onSaveRpcEndpoints) onSaveRpcEndpoints(filtered);
                                }
                                if (onShowToast) onShowToast(`Deleted RPC: ${rpc.name}`, 'info');
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                              title="Delete this custom RPC"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom RPC Card */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#38bdf8' }}>
                  ➕ Add Personal Custom RPC Endpoint
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                  <input
                    type="text"
                    value={modalNewRpcName}
                    onChange={(e) => setModalNewRpcName(e.target.value)}
                    placeholder="Node Name (e.g. Alchemy Personal)"
                    style={{
                      padding: '7px 10px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.78rem'
                    }}
                  />
                  <input
                    type="text"
                    value={modalNewRpcUrl}
                    onChange={(e) => setModalNewRpcUrl(e.target.value)}
                    placeholder="https://rpc-url..."
                    style={{
                      padding: '7px 10px',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    disabled={!modalNewRpcName.trim() || !modalNewRpcUrl.trim()}
                    onClick={() => {
                      if (!modalNewRpcName.trim() || !modalNewRpcUrl.trim()) return;
                      const updated = [...rpcEndpoints, {
                        name: modalNewRpcName.trim(),
                        url: modalNewRpcUrl.trim(),
                        latency: 'Unchecked',
                        active: false,
                        role: 'custom',
                        isCustom: true,
                        network: selectedNetworkKey
                      }];
                      if (onSaveRpcEndpoints) onSaveRpcEndpoints(updated);
                      setModalNewRpcName('');
                      setModalNewRpcUrl('');
                      if (onShowToast) onShowToast(`Added Custom RPC: ${modalNewRpcName.trim()}`, 'success');
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: (!modalNewRpcName.trim() || !modalNewRpcUrl.trim()) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #38bdf8, #0284c7)',
                      border: 'none',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.78rem',
                      cursor: (!modalNewRpcName.trim() || !modalNewRpcUrl.trim()) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    ➕ Add to Profile
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ TAB 3: PASSWORD CHANGE ══════════════ */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Update your account password for enhanced security across all devices.
              </div>

              {passError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem' }}>
                  {passError}
                </div>
              )}

              {passSuccess && (
                <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', color: '#4ade80', fontSize: '0.8rem' }}>
                  {passSuccess}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Current Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    background: 'rgba(12, 15, 22, 0.95)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>New Password (min. 6 chars)</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter new strong password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    background: 'rgba(12, 15, 22, 0.95)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Confirm New Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    background: 'rgba(12, 15, 22, 0.95)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                >
                  {showPass ? '🙈 Hide Passwords' : '👁️ Show Passwords'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                style={{
                  marginTop: '6px',
                  padding: '11px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #FF9345, #FF5500)',
                  border: 'none',
                  color: '#000',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255, 147, 69, 0.3)',
                  transition: 'all 0.15s'
                }}
              >
                {isChangingPass ? 'Updating Password...' : '🔒 Save New Password'}
              </button>
            </form>
          )}

          {/* ══════════════ TAB 4: REDEEM TOP-UP KEY ══════════════ */}
          {activeTab === 'renew' && (
            <form onSubmit={handleRedeemKey} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                Purchased a Top-up Voucher or Renewal Key from Admin? Enter it below to extend your VIP validity days and mint quota instantly!
              </div>

              {topupError && (
                <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem' }}>
                  {topupError}
                </div>
              )}

              {topupSuccess && (
                <div style={{ padding: '8px 12px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', color: '#4ade80', fontSize: '0.8rem' }}>
                  {topupSuccess}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>VIP Top-up / Renewal Key *</label>
                <input
                  type="text"
                  placeholder="e.g. AERO-TOPUP-30D or VIP-RENEW-100M"
                  value={topupKey}
                  onChange={e => setTopupKey(e.target.value.toUpperCase())}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    background: 'rgba(12, 15, 22, 0.95)',
                    border: '1px solid rgba(192, 132, 252, 0.35)',
                    borderRadius: '8px',
                    color: '#c084fc',
                    fontFamily: 'monospace',
                    fontWeight: '800',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isRedeeming}
                style={{
                  marginTop: '6px',
                  padding: '11px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                  border: 'none',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)',
                  transition: 'all 0.15s'
                }}
              >
                {isRedeeming ? 'Redeeming Voucher...' : '✨ Apply Top-up / Extend Subscription'}
              </button>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="modal-footer-section" style={{
          padding: '14px 24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10, 13, 20, 0.6)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>
            AeroMint • Bank-Grade Security
          </span>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <span>🚪</span>
            <span>Sign Out Session</span>
          </button>
        </div>

      </div>
    </div>
  );
}
