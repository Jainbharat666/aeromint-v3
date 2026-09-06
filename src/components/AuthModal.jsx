import React, { useState } from 'react';
import { cloudLogin, cloudRegister } from '../lib/supabase';

export default function AuthModal({ onLoginSuccess, isDayMode: propIsDayMode, setIsDayMode: propSetIsDayMode }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNotice, setForgotNotice] = useState('');

  // Handle Strict VIP Member Login (Centralized Cloud)
  async function handleLogin(e) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        throw new Error('Please enter both your email and password.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }

      const res = await cloudLogin({ email, password });
      setSuccessMsg('✅ Authenticated! Initializing private workspace...');
      setTimeout(() => onLoginSuccess(res.user, res.config), 300);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  // Handle Strict Register with VIP Invite Code (Centralized Cloud)
  async function handleRegister(e) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (!email.trim() || !password) {
        throw new Error('Please enter both your email and password.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      if (!inviteCode.trim()) {
        throw new Error('❌ Please enter your VIP Invitation / Access Code.');
      }

      const res = await cloudRegister({ email, password, inviteCode });
      setSuccessMsg('🎉 VIP Account Activated Successfully! Entering workspace...');
      setTimeout(() => onLoginSuccess(res.user, res.config), 400);
    } catch (err) {
      setErrorMsg(err.message || 'Activation failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  // Handle Forgot Password placeholder
  function handleForgotSubmit(e) {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }
    setErrorMsg('');
    setForgotNotice(`📬 Password reset request initiated for ${forgotEmail}! Email recovery will be linked in the next update. Contact admin if urgent.`);
  }

  const [internalDayMode, setInternalDayMode] = useState(() => {
    try { return sessionStorage.getItem('aerov3_theme') === 'day'; } catch(e) { return false; }
  });
  const isDayMode = propIsDayMode !== undefined ? propIsDayMode : internalDayMode;
  const [videoActive, setVideoActive] = useState(true);

  function toggleDayMode() {
    const next = !isDayMode;
    if (propSetIsDayMode) {
      propSetIsDayMode(next);
    } else {
      setInternalDayMode(next);
      if (next) {
        document.body.classList.add('day-mode');
        try { sessionStorage.setItem('aerov3_theme', 'day'); localStorage.setItem('aerov3_theme', 'day'); } catch(e) {}
      } else {
        document.body.classList.remove('day-mode');
        try { sessionStorage.setItem('aerov3_theme', 'night'); localStorage.setItem('aerov3_theme', 'night'); } catch(e) {}
      }
    }
  }

  return (
    <div className="auth-page-root">
      {/* Top Floating Controls (Theme Toggle & Ultra-Light Video Switch) */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '24px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <button
          type="button"
          onClick={() => setVideoActive(!videoActive)}
          style={{
            background: isDayMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
            border: isDayMode ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)',
            color: isDayMode ? '#0f172a' : '#ffffff',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Toggle ambient background glow for maximum PC speed"
        >
          {videoActive ? '✨ Ambient Glow: ON' : '⚡ Minimal Mode: ON'}
        </button>

        <button
          type="button"
          onClick={toggleDayMode}
          style={{
            background: isDayMode ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
            border: isDayMode ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)',
            color: isDayMode ? '#0f172a' : '#ffffff',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          title="Toggle Day/Night Theme"
        >
          {isDayMode ? '🌙' : '☀️'}
        </button>
      </div>

      {/* ─── ULTRA-FAST ZERO-LAG AMBIENT GLOW MESH (OKX / Phantom Style - 0% CPU, 0 MB Streaming) ─── */}
      {videoActive && (
        <div className="auth-video-ambient-wrap">
          <div className="auth-ambient-mesh">
            <div className="ambient-orb ambient-orb-1" />
            <div className="ambient-orb ambient-orb-2" />
            <div className="ambient-orb ambient-orb-3" />
            <div className="ambient-grid-overlay" />
          </div>
          <div className="auth-video-gradient-overlay" />
        </div>
      )}

      <div className="auth-page-content">
        
        {/* ─── LEFT HERO SECTION (OKX Wallet Style) ─── */}
        <div className="auth-hero-col">
          {/* Logo Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#0095f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 149, 246, 0.4)'
            }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', letterSpacing: '-0.02em', color: isDayMode ? '#0f172a' : '#ffffff' }}>
              AERO MINT
            </span>
          </div>

          {/* OKX Style Bold Headline */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 4.2vw, 3.8rem)',
            fontWeight: '800',
            lineHeight: 1.1,
            margin: '0 0 1.25rem 0',
            letterSpacing: '-0.03em',
            maxWidth: '620px',
            color: '#ffffff'
          }}>
            One sniper bot, 100+ native chains.
          </h1>

          <p style={{
            fontSize: '1.05rem',
            color: '#9ca3af',
            maxWidth: '480px',
            lineHeight: 1.6,
            margin: '0 0 2.5rem 0'
          }}>
            Experience sub-millisecond Block 0 mint execution, automated multi-wallet lockstep, and zero gas waste on Arbitrum Nitro & EVM.
          </p>

          {/* Feature Chips (OKX Style) */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', maxWidth: '540px' }}>
            <div className="okx-feature-pill">
              <span style={{ color: '#0095f6' }}>⚡</span>
              <span>0.001s Block 0 Sniper</span>
            </div>
            <div className="okx-feature-pill">
              <span style={{ color: '#10b981' }}>🟢</span>
              <span>Multi-Wallet Lockstep</span>
            </div>
            <div className="okx-feature-pill">
              <span style={{ color: '#f59e0b' }}>🛡️</span>
              <span>Anti-Revert Scam Shield</span>
            </div>
          </div>
        </div>

        {/* ─── RIGHT AUTH COLUMN (Instagram Web Exact Form) ─── */}
        <div className="auth-form-col">
          <div style={{ width: '100%', maxWidth: '350px' }}>
            
            {/* Instagram Style Header */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 style={{
                margin: '0 0 8px 0',
                fontSize: '1.35rem',
                fontWeight: '700',
                letterSpacing: '-0.01em',
                color: '#ffffff'
              }}>
                {authMode === 'login' && 'Log in to Aero Mint'}
                {authMode === 'register' && 'Create your account'}
                {authMode === 'forgot' && 'Trouble logging in?'}
              </h2>
              {authMode === 'forgot' && (
                <p style={{ margin: 0, fontSize: '13px', color: '#8e8e8e', lineHeight: 1.4 }}>
                  Enter your email and we'll send you a link to get back into your account.
                </p>
              )}
            </div>

            {/* Error / Success Alerts */}
            {errorMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '12.5px',
                marginBottom: '16px',
                lineHeight: '1.4'
              }}>
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '12.5px',
                marginBottom: '16px',
                lineHeight: '1.4'
              }}>
                {successMsg}
              </div>
            )}

            {forgotNotice && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(0, 149, 246, 0.12)',
                border: '1px solid rgba(0, 149, 246, 0.3)',
                color: '#60a5fa',
                fontSize: '12.5px',
                marginBottom: '16px',
                lineHeight: '1.4'
              }}>
                {forgotNotice}
              </div>
            )}

            {/* ─── FORM MODES ─── */}
            {authMode === 'forgot' ? (
              <form onSubmit={handleForgotSubmit}>
                <div style={{ marginBottom: '14px' }}>
                  <input
                    type="email"
                    required
                    placeholder="Email address"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    className="ig-input-field"
                  />
                </div>

                <button type="submit" className="ig-btn-primary" style={{ marginBottom: '14px' }}>
                  Send login link
                </button>

                <div className="ig-divider">
                  <span>OR</span>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setErrorMsg(''); setForgotNotice(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Create new account
                  </button>
                </div>

                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                  paddingTop: '16px',
                  textAlign: 'center'
                }}>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setErrorMsg(''); setForgotNotice(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
                
                {/* Invite Code (Register Mode Only) */}
                {authMode === 'register' && (
                  <div style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      required
                      placeholder="VIP Access Code"
                      value={inviteCode}
                      onChange={e => setInviteCode(e.target.value)}
                      className="ig-input-field"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                )}

                {/* Email / Username Input */}
                <div style={{ marginBottom: '10px' }}>
                  <input
                    type="email"
                    required
                    placeholder="Phone number, username, or email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="ig-input-field"
                  />
                </div>

                {/* Password Input with Show/Hide */}
                <div style={{ marginBottom: '14px', position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="ig-input-field"
                    style={{ paddingRight: '56px' }}
                  />
                  {password && (
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="ig-btn-primary"
                >
                  {loading ? 'Processing...' : (authMode === 'login' ? 'Log in' : 'Sign up')}
                </button>

                {/* Instagram Style Forgotten Password */}
                {authMode === 'login' && (
                  <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#a8a8a8',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={e => e.target.style.color = '#ffffff'}
                      onMouseLeave={e => e.target.style.color = '#a8a8a8'}
                    >
                      Forgotten password?
                    </button>
                  </div>
                )}

                {/* Instagram-style OR Divider */}
                <div className="ig-divider">
                  <span>OR</span>
                </div>

                {/* Switch Mode Action (Create New Account / Log In) */}
                <div>
                  {authMode === 'login' ? (
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="ig-btn-outline"
                    >
                      Create new account
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="ig-btn-outline"
                    >
                      Already have an account? Log in
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Bottom Meta/Aero Mint Signature */}
            <div style={{ marginTop: '48px', textAlign: 'center', fontSize: '11px', color: '#525252', letterSpacing: '0.02em' }}>
              <span>from</span>
              <div style={{ fontWeight: '700', color: '#737373', fontSize: '12px', marginTop: '2px', letterSpacing: '0.05em' }}>
                ⚡ AERO MINT
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
