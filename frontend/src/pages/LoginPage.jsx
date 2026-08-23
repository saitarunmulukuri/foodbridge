/**
 * LoginPage — FoodBridge Authentication.
 * Premium two-column card: left brand panel, right focused form.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { TextField } from '../components/common/forms';
import {
  UtensilsCrossed,
  ArrowRight,
  Building2,
  Truck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';

const QUICK_ACCOUNTS = [
  {
    role: 'DONOR',
    label: 'Food Donor',
    email: 'e2e_donor@foodbridge.org',
    desc: "Dave's Kitchen",
    icon: UtensilsCrossed,
    color: '#FF5A2F',
    bgColor: '#FFF4F2',
    borderColor: '#FFD0C8',
  },
  {
    role: 'NGO',
    label: 'NGO Partner',
    email: 'e2e_ngo@foodbridge.org',
    desc: 'Community Meals NGO',
    icon: Building2,
    color: '#10B981',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  {
    role: 'VOLUNTEER',
    label: 'Volunteer Driver',
    email: 'e2e_vol@foodbridge.org',
    desc: 'Rapid Dispatch Driver',
    icon: Truck,
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
];

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPersonas, setShowPersonas] = useState(false);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const redirectByRole = (role) => {
    switch (role) {
      case 'DONOR':     return navigate('/donor');
      case 'NGO':       return navigate('/ngo');
      case 'VOLUNTEER': return navigate('/volunteer');
      default:          return navigate('/e2e-stepper');
    }
  };

  const executeLogin = async (loginEmail, loginPass) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const user = await login(loginEmail, loginPass);
      redirectByRole(user.role);
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await loginWithGoogle(credential);
      if (res.isNewUser) {
        navigate('/register', {
          state: {
            googleUser: res.googleUser,
          },
        });
      } else {
        redirectByRole(res.user.role);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (err) => {
    setErrorMessage(err?.message || 'Google Sign-In failed.');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    executeLogin(email, password);
  };

  const handleQuickLogin = (quickEmail) => {
    setEmail(quickEmail);
    setPassword('Secure@12345');
    executeLogin(quickEmail, 'Secure@12345');
  };

  return (
    <div className="w-full flex items-center justify-center py-4 px-4">
      <div
        className="w-full animate-fade-in"
        style={{
          maxWidth: 860,
          borderRadius: 20,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          boxShadow: '0 20px 48px -8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >

        {/* ── Left: Brand Panel ── */}
        <div
          style={{
            background: 'linear-gradient(145deg, #FF5E3A 0%, #FF4500 100%)',
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            color: '#FFFFFF',
          }}
          className="login-left-panel"
        >
          {/* Subtle ambient overlays */}
          <div
            style={{
              position: 'absolute',
              top: -80,
              right: -80,
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 255, 255, 0.22) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -80,
              left: -80,
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255, 162, 133, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top: Logo */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                textDecoration: 'none',
                marginBottom: 48,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                }}
              >
                <UtensilsCrossed size={18} strokeWidth={2.4} />
              </div>
              <div>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 17,
                    color: '#FFFFFF',
                    letterSpacing: '-0.3px',
                    display: 'block',
                    lineHeight: 1.2,
                  }}
                >
                  FoodBridge
                </span>
                <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.8)', fontWeight: 400 }}>
                  Surplus food redistribution
                </span>
              </div>
            </Link>

            <h2
              style={{
                fontWeight: 750,
                fontSize: 27,
                color: '#FFFFFF',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                margin: '0 0 14px',
              }}
            >
              Empowering Surplus Food Redistribution
            </h2>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.92)',
                fontSize: 13.5,
                lineHeight: 1.6,
                fontWeight: 400,
                margin: 0,
              }}
            >
              Connecting food donors, verified NGOs, and volunteer drivers to redirect surplus meals to communities in need.
            </p>
          </div>

          {/* Bottom: subtle tagline */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                height: 1,
                background: 'rgba(255, 255, 255, 0.2)',
                marginBottom: 16,
              }}
            />
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.04em',
                margin: 0,
              }}
            >
              Food Redistribution Platform
            </p>
          </div>
        </div>

        {/* ── Right: Auth Form ── */}
        <div
          style={{
            padding: '44px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: '#FFFFFF',
          }}
          className="login-right-panel"
        >
          {/* Form header */}
          <div style={{ marginBottom: 26 }}>
            <h1
              style={{
                fontWeight: 750,
                fontSize: 24,
                color: '#111827',
                margin: '0 0 6px',
                letterSpacing: '-0.02em',
              }}
            >
              Sign In to FoodBridge
            </h1>
            <p style={{ color: '#6B7280', fontSize: 13, margin: 0, lineHeight: 1.5, fontWeight: 400 }}>
              Access your FoodBridge account to manage surplus food redistribution.
            </p>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="fb-alert-error" style={{ marginBottom: 20 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <TextField
              id="login-email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            {/* Password */}
            <TextField
              id="login-password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
              autoComplete="current-password"
            />

            {/* Submit */}
            <button
              id="signin-btn"
              type="submit"
              disabled={loading}
              className="fb-btn-auth"
            >
              <span>{loading ? 'Signing in…' : 'Sign In'}</span>
              {!loading && <ArrowRight size={16} className="btn-arrow" />}
            </button>

            {/* ─── Divider ─── */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '18px 0',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#9CA3AF',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                OR
              </span>
              <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
            </div>

            {/* ─── Google Sign-In Button ─── */}
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={loading}
              text="Continue with Google"
            />

            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <span style={{ color: '#6B7280', fontSize: 13 }}>New to FoodBridge? </span>
              <Link
                to="/register"
                style={{ color: '#FF5A2F', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
              >
                Create an Account →
              </Link>
            </div>
          </form>

          {/* Developer / Test Personas */}
          <div style={{ marginTop: 28 }}>
            <div
              style={{
                borderRadius: 10,
                border: '1px solid #F3F4F6',
                background: '#FAFAFA',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() => setShowPersonas((v) => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span>Developer / Test Login</span>
                {showPersonas ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showPersonas && (
                <div
                  style={{
                    padding: '0 10px 10px',
                    borderTop: '1px solid #F3F4F6',
                    paddingTop: 10,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                  }}
                  className="animate-fade-in"
                >
                  {QUICK_ACCOUNTS.map((acc) => {
                    const Icon = acc.icon;
                    return (
                      <button
                        key={acc.role}
                        type="button"
                        onClick={() => handleQuickLogin(acc.email)}
                        disabled={loading}
                        style={{
                          padding: '10px 10px',
                          borderRadius: 8,
                          border: `1px solid ${acc.borderColor}`,
                          background: acc.bgColor,
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontFamily: 'Inter, sans-serif',
                          transition: 'opacity 150ms ease',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>
                            {acc.label}
                          </span>
                          <Icon size={12} style={{ color: acc.color }} />
                        </div>
                        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>
                          {acc.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: single column on mobile */}
      <style>{`
        @media (max-width: 640px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { padding: 36px 28px !important; }
          [style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;

