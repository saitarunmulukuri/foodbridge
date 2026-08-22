/**
 * RegisterPage — FoodBridge Registration.
 * Visual sibling to LoginPage: identical two-column card structure,
 * orange left brand hero panel, and right panel with 3-step registration flow.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import Stepper, { Step } from '../components/common/Stepper';
import {
  UtensilsCrossed,
  Building2,
  Truck,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
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
      <div style={{ flex: 1, textAlign: 'left' }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#111827' }}>{role.label}</div>
        <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 1, lineHeight: 1.35 }}>
          {role.subtitle}
        </div>
      </div>
      <div className="fb-role-card-check">
        {isSelected && <Check size={10} strokeWidth={3} />}
      </div>
    </button>
  );
}

/* ── Form Field wrapper ── */
function FormField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="fb-form-label">{label}</label>
      {children}
      {hint && (
        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{hint}</p>
      )}
    </div>
  );
}

/* ── Main Page ── */
export const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Stepper state — controlled externally
  const [currentStep, setCurrentStep] = useState(1);

  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isPending, setIsPending] = useState(false);

  // Account fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // Profile fields
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [orgName, setOrgName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [serviceRadius, setServiceRadius] = useState('15');
  const [vehicleType, setVehicleType] = useState('VAN');

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
    if (password !== passwordConfirm) {
      setErrorMessage('Passwords do not match.');
      return false;
    }
    if (!email || !password) {
      setErrorMessage('All required fields must be filled.');
      return false;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const payload = {
        email,
        password,
        password_confirmation: passwordConfirm,
        role: selectedRole,
        profile: buildProfile(),
      };
      const response = await authService.register(payload);

      if (response.success) {
        const { account_status } = response.data;
        if (account_status === 'PENDING') {
          setSuccessMsg('Your NGO account is pending verification. You will be notified once activated.');
          setIsPending(true);
          return true;
        }
        setSuccessMsg('Your FoodBridge account is ready.');
        const user = await login(email, password);
        setTimeout(() => {
          switch (user.role) {
            case 'DONOR':     navigate('/donor');     break;
            case 'VOLUNTEER': navigate('/volunteer'); break;
            default:          navigate('/login');     break;
          }
        }, 2200);
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
    if (!email || !password || !passwordConfirm) {
      setErrorMessage('All fields are required.');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    const success = await handleRegister();
    if (success) goToStep(3);
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
          style={{
            padding: '40px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: '#FFFFFF',
          }}
          className="login-right-panel"
        >
          {/* Header */}
          <div style={{ marginBottom: 20 }}>
            <h1
              style={{
                fontWeight: 700,
                fontSize: 22,
                color: '#111827',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Create your account
            </h1>
            <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 4, fontWeight: 400 }}>
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
                <p
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: '0 0 12px',
                  }}
                >
                  Choose your role
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ROLES.map((role) => (
                    <RoleCard
                      key={role.key}
                      role={role}
                      isSelected={selectedRole === role.key}
                      onSelect={setSelectedRole}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleStep1Continue}
                  disabled={!selectedRole}
                  className="fb-btn-auth"
                  style={{ marginTop: 18 }}
                >
                  <span>Continue</span>
                  <ArrowRight size={16} className="btn-arrow" />
                </button>

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
                <FormField label="Email Address">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="fb-input"
                  />
                </FormField>

                <FormField
                  label="Password"
                  hint="Must contain uppercase, lowercase, digit, and special character."
                >
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      className="fb-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
                        display: 'flex', padding: 4,
                      }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </FormField>

                <FormField label="Confirm Password">
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="fb-input"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPasswordConfirm((v) => !v)}
                      style={{
                        position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
                        display: 'flex', padding: 4,
                      }}
                    >
                      {showPasswordConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </FormField>

                {/* Role-specific profile fields */}
                {selectedRole === 'DONOR' && (
                  <>
                    <FormField label="Organisation / Establishment Name">
                      <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. The Grand Hotel" required className="fb-input" />
                    </FormField>
                    <FormField label="Contact Person">
                      <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="Full name" required className="fb-input" />
                    </FormField>
                    <FormField label="Phone Number">
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number" required className="fb-input" />
                    </FormField>
                    <FormField label="Pickup Address">
                      <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                        placeholder="Full street address" required className="fb-input" />
                    </FormField>
                  </>
                )}

                {selectedRole === 'NGO' && (
                  <>
                    <FormField label="Organisation Name">
                      <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Registered NGO name" required className="fb-input" />
                    </FormField>
                    <FormField label="NGO Registration Number">
                      <input type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)}
                        placeholder="e.g. NGO-2024-001" required className="fb-input" />
                    </FormField>
                    <FormField label="Contact Person">
                      <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                        placeholder="Full name" required className="fb-input" />
                    </FormField>
                    <FormField label="Phone Number">
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number" required className="fb-input" />
                    </FormField>
                    <FormField label="Address">
                      <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                        placeholder="Full address" required className="fb-input" />
                    </FormField>
                    <FormField
                      label="Service Radius (km)"
                      hint="NGO accounts undergo administrative review prior to activation."
                    >
                      <input type="number" value={serviceRadius} onChange={(e) => setServiceRadius(e.target.value)}
                        min="1" max="500" className="fb-input" />
                    </FormField>
                  </>
                )}

                {selectedRole === 'VOLUNTEER' && (
                  <>
                    <FormField label="Phone Number">
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number" required className="fb-input" />
                    </FormField>
                    <FormField label="Vehicle Type">
                      <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}
                        required className="fb-input">
                        {VEHICLE_TYPES.map((vt) => <option key={vt} value={vt}>{vt}</option>)}
                      </select>
                    </FormField>
                  </>
                )}

                {/* Actions row */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="fb-btn-secondary"
                    style={{ flex: '0 0 auto', height: 48, paddingLeft: 18, paddingRight: 18 }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleStep2Continue}
                    className="fb-btn-auth"
                    style={{ flex: 1 }}
                  >
                    <span>{loading ? 'Creating account…' : 'Create Account'}</span>
                    {!loading && <ArrowRight size={16} className="btn-arrow" />}
                  </button>
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
              <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
                <div
                  className="animate-check-scale"
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: '#F0FDF4',
                    border: '1.5px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px',
                  }}
                >
                  <CheckCircle size={26} style={{ color: '#10B981' }} />
                </div>
                <h2
                  style={{
                    fontWeight: 700,
                    fontSize: 19,
                    color: '#111827',
                    margin: '0 0 8px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  You&apos;re all set.
                </h2>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
                  {successMsg || 'Your FoodBridge account is ready.'}
                </p>
                {isPending ? (
                  <Link
                    to="/login"
                    className="fb-btn-auth"
                    style={{ textDecoration: 'none', display: 'inline-flex', maxWidth: 220 }}
                  >
                    <span>Go to Login</span>
                    <ArrowRight size={16} className="btn-arrow" />
                  </Link>
                ) : (
                  <p style={{ fontSize: 12, color: '#9CA3AF' }}>
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
