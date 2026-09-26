import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, Eye, EyeOff, Loader2, Leaf } from 'lucide-react';

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
  if (!loading && user && !profile) {
    // Profile still loading — just stay here
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
        setInfo('Account created! Check your email to confirm, then sign in below. (If auto-confirm is enabled in Supabase, you can sign in directly).');
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F3528 0%, #174C3C 50%, #1E5E4A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '36px 40px',
        width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: '#174C3C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Leaf size={28} color="#C7F36B" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#202923' }}>ParkSync</div>
          <div style={{ fontSize: 13, color: '#68736B', marginTop: 4 }}>Smart Campus Parking System</div>
        </div>

        {/* Mode tabs */}
        <div className="tab-bar" style={{ marginBottom: 24 }}>
          <button className={`tab-btn${mode === 'login' ? ' active' : ''}`} onClick={() => { setMode('login'); setError(''); setInfo(''); }}>
            Sign In
          </button>
          <button className={`tab-btn${mode === 'register' ? ' active' : ''}`} onClick={() => { setMode('register'); setError(''); setInfo(''); }}>
            Create Account
          </button>
        </div>

        {/* Error / Info banners */}
        {error && (
          <div style={{
            padding: '10px 14px', background: '#FCE2E2', border: '1px solid #FCA5A5',
            borderRadius: 8, color: '#B91C1C', fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}
        {info && (
          <div style={{
            padding: '10px 14px', background: '#DDF5E5', border: '1px solid #A7E8BC',
            borderRadius: 8, color: '#065F46', fontSize: 13, marginBottom: 16,
          }}>
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="ps-label">Full Name</label>
                <input
                  type="text"
                  className="ps-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. John Smith"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="ps-label">Account Role</label>
                <select
                  className="ps-input"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                >
                  <option value="student">Student / User</option>
                  <option value="staff">Gatekeeper / Staff</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="ps-label">Email Address</label>
            <input
              type="email"
              className="ps-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              autoFocus={mode === 'login'}
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="ps-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className="ps-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#68736B', padding: 4,
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: 8, justifyContent: 'center', gap: 8 }}
            disabled={submitting}
          >
            {submitting
              ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
              : mode === 'login' ? 'Sign In' : 'Create Account'
            }
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>
          {mode === 'login' ? (
            <>Don't have an account?{' '}
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#174C3C', fontWeight: 600, fontSize: 12 }}
                onClick={() => { setMode('register'); setError(''); setInfo(''); }}
              >
                Create one
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#174C3C', fontWeight: 600, fontSize: 12 }}
                onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div style={{ marginTop: 16, padding: '12px', background: '#F7F8F4', borderRadius: 8, fontSize: 11.5, color: '#68736B', textAlign: 'center' }}>
          <ShieldCheck size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Powered by Supabase Auth — credentials are never stored locally
        </div>
      </div>
    </div>
  );
}
