import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Eye, EyeOff, Loader2, KeyRound, Sparkles, ShieldCheck,
  Clock, Zap, ArrowRight,
} from 'lucide-react';
import ParkSyncLogo from '../components/ParkSyncLogo';

/* ── tiny inline SVG campus illustration ── */
const CampusIllustration = () => (
  <svg viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    {/* Ground */}
    <ellipse cx="170" cy="205" rx="155" ry="16" fill="rgba(199,243,107,0.12)" />
    {/* Road */}
    <rect x="60" y="155" width="220" height="34" rx="4" fill="#1A5742" />
    <rect x="60" y="155" width="220" height="34" rx="4" fill="url(#road-tex)" opacity="0.5" />
    <rect x="155" y="169" width="30" height="5" rx="2" fill="rgba(199,243,107,0.4)" />
    {/* Parking bays */}
    {[72, 98, 124, 200, 226, 252].map((x, i) => (
      <rect
        key={i} x={x} y={156} width={18} height={16} rx={2}
        fill={i === 0 || i === 3 ? '#FCE4E4' : i === 2 || i === 4 ? '#FEF0C7' : '#D9F2E4'}
        stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"
      />
    ))}
    {/* Building left */}
    <rect x="52" y="78" width="72" height="82" rx="6" fill="#1F6B53" />
    <rect x="52" y="78" width="72" height="18" rx="6" fill="#174C3C" />
    <text x="88" y="91" textAnchor="middle" fill="rgba(199,243,107,0.7)" fontSize="8" fontWeight="700">MAIN</text>
    {/* Windows left building */}
    {[0,1,2].map(row => [0,1,2].map(col => (
      <rect
        key={`w-${row}-${col}`}
        x={62 + col * 20} y={102 + row * 16}
        width={12} height={10} rx={2}
        fill={row === 1 && col === 1 ? 'rgba(199,243,107,0.5)' : 'rgba(255,255,255,0.15)'}
      />
    )))}
    {/* Building right */}
    <rect x="220" y="88" width="68" height="72" rx="6" fill="#1F6B53" />
    <rect x="220" y="88" width="68" height="16" rx="6" fill="#174C3C" />
    <text x="254" y="99" textAnchor="middle" fill="rgba(199,243,107,0.7)" fontSize="8" fontWeight="700">ENG</text>
    {/* Windows right building */}
    {[0,1,2].map(row => [0,1].map(col => (
      <rect
        key={`wr-${row}-${col}`}
        x={230 + col * 22} y={110 + row * 16}
        width={14} height={10} rx={2}
        fill="rgba(255,255,255,0.15)"
      />
    )))}
    {/* Trees */}
    {[148, 163, 178].map((x, i) => (
      <g key={i}>
        <rect x={x + 3} y="128" width="4" height="28" fill="#174C3C" rx="2" />
        <ellipse cx={x + 5} cy="118" rx="10" ry="12"
          fill={i === 1 ? '#22734F' : '#1F6B53'}
          opacity={0.9}
        />
      </g>
    ))}
    {/* Car in parking */}
    <rect x="200" y="159" width="14" height="9" rx="2" fill="#3B82F6" />
    <rect x="202" y="157" width="10" height="5" rx="2" fill="#5BA4F5" />
    {/* P sign */}
    <rect x="140" y="130" width="20" height="24" rx="4" fill="#174C3C" />
    <text x="150" y="146" textAnchor="middle" fill="#C7F36B" fontSize="11" fontWeight="800">P</text>
    {/* Gradient overlay */}
    <defs>
      <linearGradient id="road-tex" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(0,0,0,0.06)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
      </linearGradient>
    </defs>
  </svg>
);

/* ── feature pill ── */
const FeaturePill = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '7px 13px',
    borderRadius: 99,
    background: 'rgba(199, 243, 107, 0.12)',
    border: '1px solid rgba(199, 243, 107, 0.25)',
    fontSize: 12.5,
    fontWeight: 500,
    color: 'rgba(255,255,255,0.80)',
    whiteSpace: 'nowrap',
  }}>
    <Icon size={13} color="#C7F36B" strokeWidth={2.5} />
    {text}
  </div>
);

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

  /* redirect if already authenticated */
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
        setInfo('Account created! Check your email to confirm, then sign in.');
        setMode('login');
        setPassword('');
      }
    } catch (err: any) {
      const msg: string = err.message ?? 'An error occurred.';
      if (msg.includes('Invalid login credentials')) setError('Incorrect email or password.');
      else if (msg.includes('already registered')) setError('This email is already registered. Please sign in.');
      else if (msg.includes('Email not confirmed')) setError('Please confirm your email before signing in.');
      else setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      background: '#FAF8F2',
    }}>
      {/* ── Left panel — brand + illustration ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: '0 0 48%',
        background: 'linear-gradient(160deg, #0E3329 0%, #174C3C 45%, #1A5742 100%)',
        padding: '52px 52px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="login-panel-left"
      >
        {/* Subtle background rings */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(199, 243, 107, 0.06)',
          border: '1px solid rgba(199, 243, 107, 0.08)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 40, left: -100,
          width: 280, height: 280, borderRadius: '50%',
          background: 'rgba(199, 243, 107, 0.04)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'auto' }}>
          <ParkSyncLogo size={46} style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.3)', borderRadius: 14 }} />
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              ParkSync
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 3 }}>
              Smart Campus Parking
            </div>
          </div>
        </div>

        {/* Illustration */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '32px 0',
        }}>
          <div style={{
            width: '100%', maxWidth: 340,
            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
          }}>
            <CampusIllustration />
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            color: '#FFFFFF',
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.04em',
            lineHeight: 1.18,
            marginBottom: 12,
          }}>
            Park smarter,<br />
            <span style={{ color: '#C7F36B' }}>arrive easier.</span>
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.58)',
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.65,
            maxWidth: 340,
          }}>
            Reserve, track, and manage campus parking from your phone — with AI-powered demand forecasting.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          <FeaturePill icon={Zap} text="Real-time availability" />
          <FeaturePill icon={Clock} text="AI demand forecast" />
          <FeaturePill icon={ShieldCheck} text="QR-verified entry" />
        </div>
      </div>

      {/* ── Right panel — auth form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Form header */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#1A2420',
              letterSpacing: '-0.04em',
              lineHeight: 1.2,
              marginBottom: 6,
            }}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p style={{ fontSize: 14, color: '#627068', fontWeight: 400, lineHeight: 1.5 }}>
              {mode === 'login'
                ? 'Sign in to access your campus parking dashboard.'
                : 'Join ParkSync and start reserving smarter.'}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="soft-tab-bar" style={{ marginBottom: 28 }}>
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

          {/* Alerts */}
          {error && (
            <div className="error-banner" style={{ marginBottom: 20 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#DC2626', flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}
          {info && (
            <div className="info-banner" style={{ marginBottom: 20 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', flexShrink: 0, marginTop: 3 }} />
              <span style={{ fontWeight: 500 }}>{info}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {mode === 'register' && (
              <>
                <div>
                  <label className="ps-label">Full Name</label>
                  <input
                    type="text"
                    className="soft-input"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="ps-label">Account Role</label>
                  <select
                    className="soft-input"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="student">Student / Campus Driver</option>
                    <option value="staff">Gatekeeper / Campus Security</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="ps-label">University Email</label>
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
              <label className="ps-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="soft-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                  required
                  style={{ paddingRight: 46 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9AADA5', padding: 4, display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#174C3C')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#9AADA5')}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div style={{ paddingTop: 4 }}>
              <button
                type="submit"
                className="soft-btn-primary"
                disabled={submitting}
                id="login-submit-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                    Processing…
                  </>
                ) : mode === 'login' ? (
                  <>
                    <KeyRound size={16} />
                    Sign In to ParkSync
                    <ArrowRight size={15} style={{ marginLeft: 'auto' }} />
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Create Account
                    <ArrowRight size={15} style={{ marginLeft: 'auto' }} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Switch mode */}
          <div style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: '#627068' }}>
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setInfo(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#174C3C', fontWeight: 700, fontSize: 13,
                    textDecoration: 'underline', textDecorationColor: 'transparent',
                    transition: 'text-decoration-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.textDecorationColor = '#174C3C')}
                  onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#174C3C', fontWeight: 700, fontSize: 13,
                    textDecoration: 'underline', textDecorationColor: 'transparent',
                    transition: 'text-decoration-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.textDecorationColor = '#174C3C')}
                  onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {/* Trust footer */}
          <div style={{
            marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 11.5, color: '#9AADA5',
          }}>
            <ShieldCheck size={13} color="#174C3C" />
            Powered by Supabase Auth — credentials never stored locally
          </div>
        </div>
      </div>

      {/* Responsive styles injected inline */}
      <style>{`
        @media (max-width: 800px) {
          .login-panel-left { display: none !important; }
        }
      `}</style>
    </div>
  );
}
