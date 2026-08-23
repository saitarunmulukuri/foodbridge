/**
 * LoginPage — FoodBridge Authentication.
 * Premium two-column card: left brand panel, right focused form.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton';
import { TextField } from '../components/common/forms';
import { Button } from '../components/common/Button';
import { BorderBeam } from '../components/magicui/BorderBeam';
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
    bgClass: 'bg-[#FFF4F2] dark:bg-[#1A222C]',
    borderClass: 'border-[#FFD0C8] dark:border-orange-500/30',
  },
  {
    role: 'NGO',
    label: 'NGO Partner',
    email: 'e2e_ngo@foodbridge.org',
    desc: 'Community Meals NGO',
    icon: Building2,
    color: '#10B981',
    bgClass: 'bg-[#F0FDF4] dark:bg-[#1A222C]',
    borderClass: 'border-[#BBF7D0] dark:border-emerald-500/30',
  },
  {
    role: 'VOLUNTEER',
    label: 'Volunteer Driver',
    email: 'e2e_vol@foodbridge.org',
    desc: 'Rapid Dispatch Driver',
    icon: Truck,
    color: '#3B82F6',
    bgClass: 'bg-[#EFF6FF] dark:bg-[#1A222C]',
    borderClass: 'border-[#BFDBFE] dark:border-blue-500/30',
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
        className="w-full animate-fade-in relative overflow-hidden bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] shadow-2xl rounded-[20px] grid grid-cols-1 sm:grid-cols-2"
        style={{
          maxWidth: 860,
        }}
      >
        <BorderBeam duration={8} size={150} colorFrom="#FF5A2F" colorTo="#FFA726" />

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
          className="login-right-panel bg-white dark:bg-[#11171F] p-8 sm:p-11 flex flex-col justify-center transition-colors duration-200"
        >
          {/* Form header */}
          <div className="mb-6">
            <h1
              className="text-2xl font-bold text-slate-900 dark:text-[#F5F7FA] tracking-tight mb-1.5"
            >
              Sign In to FoodBridge
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-[#A5B1C2] leading-relaxed">
              Access your FoodBridge account to manage surplus food redistribution.
            </p>
          </div>

          {/* Error */}
          {errorMessage && (
            <div className="fb-alert-error mb-5">
              <AlertCircle size={15} className="shrink-0" />
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
            <Button
              id="signin-btn"
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              loadingText="Signing in…"
              icon={ArrowRight}
              iconPosition="right"
            >
              Sign In
            </Button>

            {/* ─── Divider ─── */}
            <div className="flex items-center my-4 gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-[#26313D]" />
              <span className="text-[11px] font-semibold text-slate-400 dark:text-[#748296] tracking-wider uppercase">
                OR
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-[#26313D]" />
            </div>

            {/* ─── Google Sign-In Button ─── */}
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              disabled={loading}
              text="Continue with Google"
            />

            <div className="text-center mt-4">
              <span className="text-xs sm:text-[13px] text-slate-500 dark:text-[#AAB4C2]">New to FoodBridge? </span>
              <Link
                to="/register"
                className="text-[#FF5A2F] font-bold text-xs sm:text-[13px] hover:underline"
              >
                Create an Account →
              </Link>
            </div>
          </form>

          {/* Developer / Test Personas */}
          <div className="mt-6">
            <div className="rounded-xl border border-slate-200 dark:border-[#26313D] bg-slate-50 dark:bg-[#171E27] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPersonas((v) => !v)}
                className="w-full flex items-center justify-between p-2.5 px-3.5 bg-transparent border-none cursor-pointer text-slate-500 dark:text-[#A5B1C2] text-xs font-medium"
              >
                <span>Developer / Test Login</span>
                {showPersonas ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {showPersonas && (
                <div
                  className="p-2.5 pt-2 border-t border-slate-200 dark:border-[#26313D] grid grid-cols-3 gap-2 animate-fade-in"
                >
                  {QUICK_ACCOUNTS.map((acc) => {
                    const Icon = acc.icon;
                    return (
                      <button
                        key={acc.role}
                        type="button"
                        onClick={() => handleQuickLogin(acc.email)}
                        disabled={loading}
                        className={`p-2.5 rounded-lg border text-left cursor-pointer transition ${acc.bgClass} ${acc.borderClass}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-[#F5F7FA]">
                            {acc.label}
                          </span>
                          <Icon size={12} style={{ color: acc.color }} />
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-[#748296] font-medium block truncate">
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
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
