import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthLayout } from './components/layout/AuthLayout';
import { PillNav } from './components/navigation/PillNav';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// ── Static page imports for instantaneous, zero-flicker routing ──
import HomePage from './pages/HomePage';
import HowItWorksPage from './pages/HowItWorksPage';
import PublicImpactPage from './pages/PublicImpactPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DonorDashboard from './pages/DonorDashboard';
import DonationsListPage from './pages/DonationsListPage';
import ImpactPage from './pages/ImpactPage';
import CreateDonationPage from './pages/CreateDonationPage';
import DonationDetailPage from './pages/DonationDetailPage';
import NgoDashboard from './pages/NgoDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import E2EStepperPage from './pages/E2EStepperPage';
import ProfilePage from './pages/ProfilePage';

// ── Loading Fallback ───────────────────────────────────────────────
const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      width: '100%',
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '3px solid #E2E8F0',
          borderTopColor: '#FF5A2F',
          animation: 'fb-spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
        Loading FoodBridge…
      </span>
      <style>{`
        @keyframes fb-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

// ── Redirects authenticated users to their dashboard ──────────────
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated) {
    if (role === 'DONOR')     return <Navigate to="/donor" replace />;
    if (role === 'NGO')       return <Navigate to="/ngo" replace />;
    if (role === 'VOLUNTEER') return <Navigate to="/volunteer" replace />;
    return <Navigate to="/e2e-stepper" replace />;
  }
  return children;
};

// ── Guards authenticated routes ────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'DONOR')     return <Navigate to="/donor" replace />;
    if (role === 'NGO')       return <Navigate to="/ngo" replace />;
    if (role === 'VOLUNTEER') return <Navigate to="/volunteer" replace />;
    return <Navigate to="/e2e-stepper" replace />;
  }

  return <AuthLayout>{children}</AuthLayout>;
};

// ── Public layout with floating PillNav ────────────────────────────
const PublicLayout = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  const getDashboardHref = () => {
    if (role === 'DONOR') return '/donor';
    if (role === 'NGO') return '/ngo';
    if (role === 'VOLUNTEER') return '/volunteer';
    return '/e2e-stepper';
  };

  const navItems = [
    { label: 'Home',           href: '/' },
    { label: 'How It Works',   href: '/how-it-works' },
    { label: 'Impact',         href: '/impact' },
    { label: 'About',          href: '/about' },
    ...(isAuthenticated
      ? [{ label: 'Dashboard', href: getDashboardHref(), isCta: true }]
      : [
          { label: 'Sign In',        href: '/login', isCta: true },
          { label: 'Create Account', href: '/register', isCta: true },
        ]),
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0B0F14] text-slate-900 dark:text-[#F5F7FA] flex flex-col transition-colors duration-200">
      <div className="pt-3">
        <PillNav
          items={navItems}
          activeHref={location.pathname}
          ease="power2.out"
          isAuthNav={false}
        />
      </div>
      <main className="flex-1 w-full max-w-[1200px] mx-auto p-4 sm:p-6 flex flex-col justify-start">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
      <footer className="py-3.5 px-6 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#11171F] transition-colors duration-200">
        FoodBridge · Surplus food redistribution logistics
      </footer>
    </div>
  );
};

// ── Route tree ─────────────────────────────────────────────────────
function AppContent() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Pages */}
        <Route path="/"             element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/how-it-works" element={<PublicLayout><HowItWorksPage /></PublicLayout>} />
        <Route path="/impact"       element={<PublicLayout><PublicImpactPage /></PublicLayout>} />
        <Route path="/about"        element={<PublicLayout><AboutPage /></PublicLayout>} />

        {/* Public auth routes */}
        <Route path="/login"    element={<PublicOnlyRoute><PublicLayout><LoginPage /></PublicLayout></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><PublicLayout><RegisterPage /></PublicLayout></PublicOnlyRoute>} />

        {/* Donor routes */}
        <Route path="/donor"                element={<ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}><DonorDashboard /></ProtectedRoute>} />
        <Route path="/donor/list"           element={<ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}><DonationsListPage /></ProtectedRoute>} />
        <Route path="/donor/impact"         element={<ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}><ImpactPage /></ProtectedRoute>} />
        <Route path="/donor/create"         element={<ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}><CreateDonationPage /></ProtectedRoute>} />
        <Route path="/donor/donations/:id"  element={<ProtectedRoute allowedRoles={['DONOR', 'ADMIN']}><DonationDetailPage /></ProtectedRoute>} />

        {/* NGO routes */}
        <Route path="/ngo"      element={<ProtectedRoute allowedRoles={['NGO', 'ADMIN']}><NgoDashboard /></ProtectedRoute>} />

        {/* Volunteer routes */}
        <Route path="/volunteer" element={<ProtectedRoute allowedRoles={['VOLUNTEER', 'ADMIN']}><VolunteerDashboard /></ProtectedRoute>} />

        {/* Internal E2E stepper */}
        <Route path="/e2e-stepper" element={<ProtectedRoute allowedRoles={['DONOR', 'NGO', 'VOLUNTEER', 'ADMIN']}><E2EStepperPage /></ProtectedRoute>} />

        {/* Profile & Digital ID */}
        <Route path="/profile" element={<ProtectedRoute allowedRoles={['DONOR', 'NGO', 'VOLUNTEER', 'ADMIN']}><ProfilePage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

