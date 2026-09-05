import React, { useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import UserProfileModal from './UserProfileModal';

export default function UserNav({
  currentUser,
  onLogout,
  isCloudSynced,
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
  const [showModal, setShowModal] = useState(false);

  if (!currentUser) return null;

  const email = currentUser.email || 'VIP Member';
  const displayName = currentUser.user_metadata?.name || email.split('@')[0];
  const isOwner = email.toLowerCase() === 'jainbharat666@gmail.com' || currentUser.role === 'admin';

  const daysLeft = currentUser.valid_until ? Math.max(0, Math.ceil((new Date(currentUser.valid_until) - new Date()) / 86400000)) : 0;
  const mintsUsed = currentUser.total_mints || 0;
  const maxMints = currentUser.max_mints_allowed || 0;
  const mintsRemaining = maxMints > 0 ? Math.max(0, maxMints - mintsUsed) : null;

  return (
    <>
      <div
        className="user-nav-pill"
        onClick={() => setShowModal(true)}
        title="Click to view User Profile, Live Countdown Clock & Password Settings"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'linear-gradient(135deg, rgba(20, 24, 36, 0.95), rgba(12, 14, 22, 0.98))',
          border: isOwner ? '1px solid rgba(255, 147, 69, 0.45)' : '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '30px',
          padding: '4px 14px 4px 6px',
          backdropFilter: 'blur(12px)',
          boxShadow: isOwner ? '0 4px 20px rgba(255, 147, 69, 0.25)' : '0 4px 20px rgba(56, 189, 248, 0.15)',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          userSelect: 'none'
        }}
      >
        {/* Glowing Avatar */}
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: isOwner ? 'linear-gradient(135deg, #FF9345, #FF5500)' : 'linear-gradient(135deg, #38bdf8, #0284c7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: '900',
          fontSize: '13px',
          boxShadow: isOwner ? '0 0 12px rgba(255, 147, 69, 0.6)' : '0 0 12px rgba(56, 189, 248, 0.6)'
        }}>
          {isOwner ? '👑' : displayName.charAt(0).toUpperCase()}
        </div>

        {/* User Info & Live Badges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="user-nav-name" style={{ fontSize: '12px', fontWeight: '700', color: '#fff', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            <span style={{
              fontSize: '9px',
              fontWeight: '800',
              textTransform: 'uppercase',
              padding: '1px 5px',
              borderRadius: '4px',
              background: isOwner ? 'rgba(255, 147, 69, 0.25)' : 'rgba(56, 189, 248, 0.2)',
              color: isOwner ? '#FF9345' : '#38bdf8',
              border: `1px solid ${isOwner ? 'rgba(255, 147, 69, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`
            }}>
              {isOwner ? 'OWNER' : 'VIP'}
            </span>
          </div>

          {/* Dynamic Live Metric Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isOwner ? (
              <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold' }}>
                ♾️ Lifetime Access
              </span>
            ) : (
              <>
                <span style={{ fontSize: '10px', color: daysLeft <= 2 ? '#ef4444' : '#38bdf8', fontWeight: '600' }}>
                  ⏳ {daysLeft}d left
                </span>
                <span style={{ fontSize: '10px', color: '#6b7280' }}>•</span>
                <span style={{ fontSize: '10px', color: mintsRemaining === 0 ? '#ef4444' : '#c084fc', fontWeight: '600' }}>
                  ⚡ {mintsRemaining !== null ? `${mintsRemaining} mints` : '∞ mints'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Profile Settings Gear / Arrow */}
        <div className="user-nav-gear" style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          color: '#9ca3af',
          marginLeft: '4px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          ⚙️
        </div>
      </div>

      {/* Full Cyberpunk Profile Modal */}
      {showModal && (
        <UserProfileModal
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onLogout={onLogout}
          onUpdateUser={onUpdateUser}
          onShowToast={onShowToast}
          wallets={wallets}
          rpcEndpoints={rpcEndpoints}
          selectedNetworkKey={selectedNetworkKey}
          onImportWallets={onImportWallets}
          onRestoreRpcs={onRestoreRpcs}
          onSaveRpcEndpoints={onSaveRpcEndpoints}
          onSetPrimaryRpc={onSetPrimaryRpc}
          onDeleteRpc={onDeleteRpc}
        />
      )}
    </>
  );
}
