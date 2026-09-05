import React, { useState, useRef, useEffect } from 'react';
import ChainIcon from './ChainIcon';

export default function NetworkSelector({
  networks,
  selectedNetworkKey,
  onSelectNetwork,
  isDayMode = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentNet = networks[selectedNetworkKey] || networks['robinhood'];

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button - OpenSea Style */}
      <button
        type="button"
        className="network-selector-btn"
        onClick={() => setIsOpen(prev => !prev)}
        title="Switch Blockchain Network"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '36px',
          padding: '0 12px 0 8px',
          borderRadius: '20px',
          background: isDayMode 
            ? 'rgba(255, 255, 255, 0.95)' 
            : 'linear-gradient(135deg, rgba(20, 24, 38, 0.95), rgba(12, 14, 24, 0.98))',
          border: isOpen 
            ? '1.5px solid var(--accent-purple)' 
            : isDayMode ? '1px solid rgba(148, 163, 184, 0.35)' : '1px solid rgba(255, 255, 255, 0.12)',
          color: isDayMode ? '#090d16' : '#ffffff',
          cursor: 'pointer',
          boxShadow: isOpen 
            ? '0 0 15px rgba(168, 85, 247, 0.3)' 
            : isDayMode ? '0 2px 8px rgba(100, 116, 139, 0.1)' : '0 4px 15px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          userSelect: 'none'
        }}
      >
        <ChainIcon chainKey={selectedNetworkKey} size={20} />
        <span style={{ fontSize: '0.82rem', fontWeight: '700', letterSpacing: '-0.01em' }}>
          {currentNet?.name || 'Robinhood Chain'}
        </span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: isDayMode ? '#64748b' : '#94a3b8'
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className="network-dropdown-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '240px',
            background: isDayMode ? '#ffffff' : '#0e1322',
            border: isDayMode ? '1px solid rgba(148, 163, 184, 0.25)' : '1px solid rgba(168, 85, 247, 0.35)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: isDayMode 
              ? '0 10px 30px rgba(100, 116, 139, 0.2), 0 2px 8px rgba(0, 0, 0, 0.08)' 
              : '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(168, 85, 247, 0.2)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            backdropFilter: 'blur(16px)',
            animation: 'dropdownFadeIn 0.18s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '4px 8px',
            color: isDayMode ? '#64748b' : '#94a3b8'
          }}>
            Select Network
          </div>

          {Object.entries(networks).map(([key, net]) => {
            const isSelected = key === selectedNetworkKey;
            return (
              <div
                key={key}
                onClick={() => {
                  onSelectNetwork(key);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: isSelected 
                    ? (isDayMode ? 'rgba(124, 58, 237, 0.08)' : 'rgba(168, 85, 247, 0.18)') 
                    : 'transparent',
                  border: isSelected 
                    ? (isDayMode ? '1px solid rgba(124, 58, 237, 0.3)' : '1px solid rgba(168, 85, 247, 0.4)') 
                    : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = isDayMode ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ChainIcon chainKey={key} size={22} />
                  <div>
                    <div style={{ 
                      fontSize: '0.82rem', 
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected 
                        ? (isDayMode ? '#7c3aed' : '#c084fc') 
                        : (isDayMode ? '#090d16' : '#f1f5f9')
                    }}>
                      {net.name}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: isDayMode ? '#64748b' : '#64748b' }}>
                      Chain ID: {net.chainId}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <span style={{ 
                    color: isDayMode ? '#7c3aed' : '#a855f7', 
                    fontWeight: 900, 
                    fontSize: '0.9rem' 
                  }}>
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
