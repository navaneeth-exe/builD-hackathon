import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Eye, EyeOff, Loader2, Compass, KeyRound, Sparkles } from 'lucide-react';

export default function Login() {
  const { user, profile, loading, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // If already logged in, redirect appropriately
  if (!loading && user && profile) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'staff') return <Navigate to="/gatekeeper" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (mode === 'register') {
      if (!fullName.trim()) { setError('Full name is required.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName.trim(), role);
        setInfo('Account created! Check your email to confirm, then sign in below.');
        setMode('login');
        setPassword('');
      }
    } catch (err: any) {
      const msg: string = err.message ?? 'An error occurred.';
      if (msg.includes('Invalid login credentials')) {
        setError('Incorrect email or password.');
      } else if (msg.includes('already registered')) {
        setError('This email is already registered. Please sign in.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #0F3528 0%, #174C3C 60%, #103B2E 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      {/* Clean Soft Realism Card */}
      <div
        className="soft-card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '38px 36px',
          position: 'relative',
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: '#174C3C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 8px 20px rgba(23, 76, 60, 0.25)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#C7F36B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Compass size={22} color="#174C3C" strokeWidth={2.5} />
            </div>
          </div>

          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '-0.3px',
              color: '#174C3C',
            }}
          >
            ParkSync
          </h1>
          <p
            style={{
              fontSize: 13,
              color: '#68736B',
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            Smart Campus Parking & Spot Management
          </p>
        </div>

        {/* Clean Soft Tab Bar */}
        <div className="soft-tab-bar" style={{ marginBottom: 24 }}>
          <button
            type="button"
            className={`soft-tab-btn${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError(''); setInfo(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`soft-tab-btn${mode === 'register' ? ' active' : ''}`}
            onClick={() => { setMode('register'); setError(''); setInfo(''); }}
          >
            Create Account
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div
            style={{
              padding: '11px 14px',
              background: '#FDE8E8',
              border: '1px solid #FCA5A5',
              borderRadius: 12,
              color: '#991B1B',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: 3, background: '#DC2626' }} />
            {error}
          </div>
        )}

        {info && (
          <div
            style={{
              padding: '11px 14px',
              background: '#DDF5E5',
              border: '1px solid #A7E8BC',
              borderRadius: 12,
              color: '#065F46',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: 3, background: '#059669' }} />
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3A4D41', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  className="soft-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. John Smith"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3A4D41', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Account Role
                </label>
                <select
                  className="soft-input"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="student">Student / Daily Driver</option>
                  <option value="staff">Gatekeeper / Campus Security</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3A4D41', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              University Email
            </label>
            <input
              type="email"
              className="soft-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              autoFocus={mode === 'login'}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#3A4D41', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="soft-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                required
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#68736B',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div style={{ paddingTop: 6 }}>
            <button
              type="submit"
              className="soft-btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                  Processing…
                </>
              ) : mode === 'login' ? (
                <>
                  <KeyRound size={16} />
                  Sign In
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Create Account
                </>
              )}
            </button>
          </div>
        </form>

        {/* Switch mode links */}
        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12.5, color: '#68736B' }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#174C3C',
                  fontWeight: 700,
                  fontSize: 12.5,
                }}
                onClick={() => { setMode('register'); setError(''); setInfo(''); }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#174C3C',
                  fontWeight: 700,
                  fontSize: 12.5,
                }}
                onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {/* Trust badge */}
        <div
          style={{
            marginTop: 18,
            padding: '10px 14px',
            background: '#F7F8F4',
            borderRadius: 10,
            fontSize: 11.5,
            color: '#68736B',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <ShieldCheck size={13} color="#174C3C" />
          Powered by Supabase Auth — credentials never stored locally
        </div>
      </div>
    </div>
  );
}


