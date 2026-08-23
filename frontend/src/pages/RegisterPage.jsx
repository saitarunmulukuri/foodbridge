/**
 * RegisterPage — FoodBridge Registration.
 * Visual sibling to LoginPage: identical two-column card structure,
 * orange left brand hero panel, and right panel with 3-step registration flow.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import Stepper, { Step } from '../components/common/Stepper';
import {
  TextField,
  NumberField,
  Select,
} from '../components/common/forms';
import { Button } from '../components/common/Button';
import { BorderBeam } from '../components/magicui/BorderBeam';
import {
  UtensilsCrossed,
  Building2,
  Truck,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Check,
  ShieldCheck,
} from 'lucide-react';

/* ── Role Definitions ── */
const ROLES = [
  {
    key: 'DONOR',
    label: 'Food Donor',
    subtitle: 'Hotels, restaurants & caterers donating surplus food',
    Icon: UtensilsCrossed,
  },
  {
    key: 'NGO',
    label: 'NGO Partner',
    subtitle: 'Shelters and food banks receiving and distributing meals',
    Icon: Building2,
  },
  {
    key: 'VOLUNTEER',
    label: 'Volunteer Driver',
    subtitle: 'Help transport and deliver food to community centers',
    Icon: Truck,
  },
];

const VEHICLE_TYPES = ['WALKING', 'BICYCLE', 'BIKE', 'SCOOTER', 'CAR', 'VAN'];

/* ── Role Card ── */
function RoleCard({ role, isSelected, onSelect }) {
  const Icon = role.Icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(role.key)}
      className={`fb-role-card${isSelected ? ' selected' : ''}`}
    >
      <div className="fb-role-card-icon">
        <Icon size={17} strokeWidth={2.1} />
      </div>
      <div className="flex-1 text-left">
        <div className="font-semibold text-[13.5px] text-slate-900 dark:text-[#F5F7FA]">{role.label}</div>
        <div className="text-[11.5px] text-slate-500 dark:text-[#AAB4C2] mt-0.5 leading-snug">
          {role.subtitle}
        </div>
      </div>
      <div className="fb-role-card-check">
        {isSelected && <Check size={10} strokeWidth={3} />}
      </div>
    </button>
  );
}

/* ── Main Page ── */
export const RegisterPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, loginDirect } = useAuth();

  const googleUser = location.state?.googleUser || null;

  // Stepper state — controlled externally
  const [currentStep, setCurrentStep] = useState(1);

  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isPending, setIsPending] = useState(false);

  // Account fields
  const [email, setEmail] = useState(googleUser?.email || '');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Profile fields
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState(googleUser?.name || '');
  const [orgName, setOrgName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [serviceRadius, setServiceRadius] = useState('15');
  const [vehicleType, setVehicleType] = useState('VAN');

  useEffect(() => {
    if (googleUser?.email) {
      setEmail(googleUser.email);
    }
    if (googleUser?.name) {
      setContactPerson((prev) => prev || googleUser.name);
    }
  }, [googleUser]);

  const buildProfile = () => {
    if (selectedRole === 'DONOR') {
      return { organisation_name: orgName, contact_person: contactPerson, phone, address };
    }
    if (selectedRole === 'NGO') {
      return {
        organisation_name: orgName,
        registration_number: registrationNumber,
        contact_person: contactPerson,
        phone,
        address,
        service_radius_km: parseInt(serviceRadius, 10) || 15,
      };
    }
    if (selectedRole === 'VOLUNTEER') {
      return { phone, vehicle_type: vehicleType };
    }
    return {};
  };

  const handleRegister = async () => {
    if (!googleUser) {
      if (password !== passwordConfirm) {
        setErrorMessage('Passwords do not match.');
        return false;
      }
      if (!email || !password) {
        setErrorMessage('All required fields must be filled.');
        return false;
      }
    } else {
      if (!email) {
        setErrorMessage('Email address is missing.');
        return false;
      }
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        email,
        role: selectedRole,
        profile: buildProfile(),
      };

      if (googleUser) {
        payload.google_subject_id = googleUser.google_subject_id;
      } else {
        payload.password = password;
        payload.password_confirmation = passwordConfirm;
      }

      const response = await authService.register(payload);

      if (response.success) {
        const { account_status, user_id, role } = response.data;
        if (account_status === 'PENDING') {
          setSuccessMsg('Your NGO account is pending verification. You will be notified once activated.');
          setIsPending(true);
          return true;
        }

        setSuccessMsg('Your FoodBridge account is ready.');

        if (googleUser) {
          // Attempt to log in with Google identity
          try {
            const loginResp = await authService.googleLogin(googleUser.google_subject_id);
            if (loginResp.success && loginResp.data?.access_token) {
              loginDirect(loginResp.data.user, loginResp.data.access_token);
            }
          } catch {
            // Fallback user session initialization
            loginDirect({ user_id, email, role, account_status }, null);
          }
        } else {
          await login(email, password);
        }

        setTimeout(() => {
          switch (selectedRole) {
            case 'DONOR':     navigate('/donor');     break;
            case 'VOLUNTEER': navigate('/volunteer'); break;
            default:          navigate('/login');     break;
          }
        }, 2000);
        return true;
      }
    } catch (err) {
      const detail = err?.data?.error?.details;
      if (detail && typeof detail === 'object') {
        const messages = Object.entries(detail)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('\n');
        setErrorMessage(messages);
      } else {
        setErrorMessage(err.message || 'Registration failed. Please try again.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (roleKey) => {
    setSelectedRole((prev) => (prev === roleKey ? '' : roleKey));
  };

  const goToStep = (n) => {
    setErrorMessage('');
    setCurrentStep(n);
  };

  /* Step 1 → 2 */
  const handleStep1Continue = () => {
    if (!selectedRole) return;
    goToStep(2);
  };

  /* Step 2 → 3: validate then submit */
  const handleStep2Continue = async () => {
    if (!googleUser) {
      if (!email || !password || !passwordConfirm) {
        setErrorMessage('All fields are required.');
        return;
      }
      if (password !== passwordConfirm) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    } else {
      if (!email) {
        setErrorMessage('Email is required.');
        return;
      }
    }

    if (selectedRole === 'DONOR') {
      if (!orgName || !contactPerson || !phone || !address) {
        setErrorMessage('All organisation profile fields are required.');
        return;
      }
    } else if (selectedRole === 'NGO') {
      if (!orgName || !registrationNumber || !contactPerson || !phone || !address) {
        setErrorMessage('All NGO profile fields are required.');
        return;
      }
    } else if (selectedRole === 'VOLUNTEER') {
      if (!phone || !vehicleType) {
        setErrorMessage('Phone number and vehicle type are required.');
        return;
      }
    }

    const success = await handleRegister();
    if (success) goToStep(3);
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
        {/* ── Left: Brand Panel (Identical sibling to Login) ── */}
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

          {/* Top: Logo & headline */}
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
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 17,
                  color: '#FFFFFF',
                  letterSpacing: '-0.3px',
                }}
              >
                FoodBridge
              </span>
            </Link>

            <h2
              style={{
                fontWeight: 700,
                fontSize: 28,
                color: '#FFFFFF',
                lineHeight: 1.2,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              Join the network.
            </h2>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: 14,
                marginTop: 12,
                lineHeight: 1.6,
                fontWeight: 400,
              }}
            >
              Connect with donors, NGOs, and volunteers to move surplus food where it matters.
            </p>
          </div>

          {/* Bottom: subtle tagline */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                height: 1,
                background: 'rgba(255, 255, 255, 0.2)',
                marginBottom: 20,
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
              Surplus food redistribution network
            </p>
          </div>
        </div>

        {/* ── Right: Registration Content (Stepper) ── */}
        <div
          className="login-right-panel bg-white dark:bg-[#11171F] p-8 sm:p-10 flex flex-col justify-center transition-colors duration-200"
        >
          {/* Header */}
          <div className="mb-5">
            <h1
              className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F5F7FA] tracking-tight mb-1"
            >
              Create your account
            </h1>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-[#A5B1C2] leading-relaxed">
              Join the FoodBridge redistribution network
            </p>
          </div>

          {/* Stepper Flow */}
          <Stepper
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            activeColor="#FF5A2F"
            completeColor="#10B981"
            hideFooter={true}
          >
            {/* ─────── STEP 1: ROLE SELECTION ─────── */}
            <Step>
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    margin: '0 0 12px',
                  }}
                >
                  <p
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      margin: 0,
                    }}
                  >
                    Choose your role
                  </p>
                  {selectedRole && (
                    <button
                      type="button"
                      onClick={() => setSelectedRole('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#FF5A2F',
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 150ms ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      Deselect
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ROLES.map((role) => (
                    <RoleCard
                      key={role.key}
                      role={role}
                      isSelected={selectedRole === role.key}
                      onSelect={handleRoleSelect}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={handleStep1Continue}
                  disabled={!selectedRole}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={ArrowRight}
                  iconPosition="right"
                  style={{ marginTop: 18 }}
                >
                  Continue
                </Button>

                <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 14 }}>
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: '#FF5A2F', fontWeight: 600, textDecoration: 'none' }}>
                    Sign in
                  </Link>
                </p>
              </div>
            </Step>

            {/* ─────── STEP 2: DETAILS ─────── */}
            <Step>
              <div>
                <p
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: '0 0 16px',
                  }}
                >
                  Account & Profile Details
                </p>

                {errorMessage && (
                  <div className="fb-alert-error" style={{ marginBottom: 14, whiteSpace: 'pre-line' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0, alignSelf: 'flex-start', marginTop: 1 }} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Account credentials */}
                {googleUser ? (
                  <div className="mb-5 p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] flex items-center justify-center shrink-0">
                      <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-semibold text-slate-800 dark:text-[#F5F7FA] truncate">{googleUser.email}</span>
                        <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#748296]">Verified with Google · No password required</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <TextField
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />

                    <TextField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      hint="Must contain uppercase, lowercase, digit, and special character."
                      required
                    />

                    <TextField
                      label="Confirm Password"
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repeat password"
                      required
                    />
                  </>
                )}

                {/* Role-specific profile fields */}
                {selectedRole === 'DONOR' && (
                  <>
                    <TextField
                      label="Organisation / Establishment Name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. The Grand Hotel"
                      required
                    />
                    <TextField
                      label="Contact Person"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Full name"
                      required
                    />
                    <TextField
                      label="Phone Number"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      required
                    />
                    <TextField
                      label="Pickup Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full street address"
                      required
                    />
                  </>
                )}

                {selectedRole === 'NGO' && (
                  <>
                    <TextField
                      label="Organisation Name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Registered NGO name"
                      required
                    />
                    <TextField
                      label="NGO Registration Number"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      placeholder="e.g. NGO-2024-001"
                      required
                    />
                    <TextField
                      label="Contact Person"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Full name"
                      required
                    />
                    <TextField
                      label="Phone Number"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      required
                    />
                    <TextField
                      label="Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full address"
                      required
                    />
                    <NumberField
                      label="Service Radius (km)"
                      value={serviceRadius}
                      onChange={(e) => setServiceRadius(e.target.value)}
                      min="1"
                      max="500"
                      hint="NGO accounts undergo administrative review prior to activation."
                    />
                  </>
                )}

                {selectedRole === 'VOLUNTEER' && (
                  <>
                    <TextField
                      label="Phone Number"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      required
                    />
                    <Select
                      label="Vehicle Type"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      options={VEHICLE_TYPES}
                      required
                    />
                  </>
                )}

                {/* Actions row */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <Button
                    type="button"
                    onClick={() => goToStep(1)}
                    variant="secondary"
                    size="lg"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={loading}
                    loading={loading}
                    loadingText="Creating account…"
                    onClick={handleStep2Continue}
                    variant="primary"
                    size="lg"
                    icon={ArrowRight}
                    iconPosition="right"
                    style={{ flex: 1 }}
                  >
                    Create Account
                  </Button>
                </div>

                <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 14 }}>
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: '#FF5A2F', fontWeight: 600, textDecoration: 'none' }}>
                    Sign in
                  </Link>
                </p>
              </div>
            </Step>

            {/* ─────── STEP 3: COMPLETE ─────── */}
            <Step>
              <div className="text-center py-2">
                <div
                  className="animate-check-scale w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle size={26} className="text-emerald-500" />
                </div>
                <h2
                  className="font-bold text-lg text-slate-900 dark:text-[#F5F7FA] mb-2 tracking-tight"
                >
                  You&apos;re all set.
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-500 dark:text-[#AAB4C2] leading-relaxed mb-6">
                  {successMsg || 'Your FoodBridge account is ready.'}
                </p>
                {isPending ? (
                  <Button
                    to="/login"
                    variant="primary"
                    size="lg"
                    icon={ArrowRight}
                    iconPosition="right"
                    style={{ maxWidth: 220, margin: '0 auto' }}
                  >
                    Go to Login
                  </Button>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-[#7F8A99]">
                    Redirecting to your dashboard…
                  </p>
                )}
              </div>
            </Step>
          </Stepper>
        </div>
      </div>

      {/* Responsive: single column on mobile */}
      <style>{`
        @media (max-width: 640px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { padding: 36px 24px !important; }
          [style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;

