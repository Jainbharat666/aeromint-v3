import React from 'react';

export default function CyberModal({
  isOpen,
  type = 'alert', // 'alert' | 'confirm' | 'danger' | 'success' | 'lock'
  title = 'Notification',
  message = '',
  detail = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  icon = '🛡️'
}) {
  if (!isOpen) return null;

  const isDanger = type === 'danger' || type === 'lock';
  const isConfirm = type === 'confirm' || type === 'danger';

  const themeColors = {
    danger: { border: 'rgba(239, 68, 68, 0.45)', glow: 'rgba(239, 68, 68, 0.2)', btn: 'linear-gradient(135deg, #ef4444, #dc2626)', iconBg: 'rgba(239, 68, 68, 0.15)', text: '#fca5a5' },
    lock: { border: 'rgba(239, 68, 68, 0.5)', glow: 'rgba(239, 68, 68, 0.25)', btn: 'linear-gradient(135deg, #ef4444, #b91c1c)', iconBg: 'rgba(239, 68, 68, 0.2)', text: '#fca5a5' },
    success: { border: 'rgba(16, 185, 129, 0.45)', glow: 'rgba(16, 185, 129, 0.2)', btn: 'linear-gradient(135deg, #10b981, #059669)', iconBg: 'rgba(16, 185, 129, 0.15)', text: '#86efac' },
    alert: { border: 'rgba(255, 147, 69, 0.45)', glow: 'rgba(255, 147, 69, 0.2)', btn: 'linear-gradient(135deg, #FF9345, #FF5500)', iconBg: 'rgba(255, 147, 69, 0.15)', text: '#fed7aa' }
  };

  const currentTheme = themeColors[type] || themeColors.alert;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(4, 6, 12, 0.88)',
      backdropFilter: 'blur(16px)',
      padding: '16px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'linear-gradient(145deg, rgba(22, 26, 38, 0.98), rgba(11, 14, 22, 0.99))',
        border: `1px solid ${currentTheme.border}`,
        borderRadius: '16px',
        boxShadow: `0 25px 65px rgba(0, 0, 0, 0.85), 0 0 40px ${currentTheme.glow}`,
        padding: '24px',
        color: '#f3f4f6',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative'
      }}>
        
        {/* Top Glow Accent Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: '2px',
          background: isDanger ? '#ef4444' : '#FF9345',
          boxShadow: `0 0 12px ${isDanger ? '#ef4444' : '#FF9345'}`
        }} />

        {/* Icon Circle */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: currentTheme.iconBg,
          border: `1px solid ${currentTheme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '26px',
          marginBottom: '16px',
          boxShadow: `0 0 20px ${currentTheme.glow}`
        }}>
          {icon}
        </div>

        {/* Title */}
        <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: '800', color: '#fff', letterSpacing: '0.01em' }}>
          {title}
        </h3>

        {/* Message */}
        <p style={{ margin: '0 0 6px', fontSize: '0.88rem', color: '#d1d5db', lineHeight: '1.45' }}>
          {message}
        </p>

        {/* Detail (Optional) */}
        {detail && (
          <div style={{
            margin: '10px 0 16px',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px',
            fontSize: '0.76rem',
            color: currentTheme.text,
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'monospace'
          }}>
            {detail}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '10px',
          width: '100%',
          marginTop: detail ? '4px' : '16px'
        }}>
          {isConfirm && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#d1d5db',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: '8px',
              background: currentTheme.btn,
              border: 'none',
              color: isDanger ? '#fff' : '#000',
              fontWeight: '800',
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: `0 4px 15px ${currentTheme.glow}`,
              transition: 'all 0.15s'
            }}
          >
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}
