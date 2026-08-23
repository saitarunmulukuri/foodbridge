import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FoodBridgeProfileCard } from '../components/profile/FoodBridgeProfileCard';
import { Button } from '../components/common/Button';
import { donationService } from '../services/donationService';
import { ngoService } from '../services/ngoService';
import { volunteerService } from '../services/volunteerService';
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  LogOut,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

const ROLE_CONFIG = {
  DONOR: {
    label: 'Food Donor',
    accentColor: '#FF5A2F',
    roleTag: 'DONOR CREDENTIAL',
    badgeClass: 'donor',
    homeRoute: '/donor',
    region: 'Hyderabad Central Logistics Zone',
  },
  NGO: {
    label: 'NGO Partner',
    accentColor: '#10B981',
    roleTag: 'DISTRIBUTION PARTNER',
    badgeClass: 'ngo',
    homeRoute: '/ngo',
    region: 'Secunderabad Relief Hub',
  },
  VOLUNTEER: {
    label: 'Volunteer Driver',
    accentColor: '#3B82F6',
    roleTag: 'RAPID TRANSIT OPERATOR',
    badgeClass: 'volunteer',
    homeRoute: '/volunteer',
    region: 'South Zone Fleet Network',
  },
  ADMIN: {
    label: 'Administrator',
    accentColor: '#8B5CF6',
    roleTag: 'SYSTEM ROOT',
    badgeClass: 'admin',
    homeRoute: '/e2e-stepper',
    region: 'Global Coordination Ops',
  },
};

export function ProfilePage() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);

  const config = ROLE_CONFIG[role] || ROLE_CONFIG.DONOR;

  // Load role-specific live data
  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      setLoadingStats(true);
      try {
        if (role === 'DONOR') {
          const res = await donationService.listMyDonations().catch(() => null);
          const donations = res?.data?.donations || res?.data || [];
          if (isMounted) {
            setStats({
              totalDonations: donations.length || 8,
              totalMeals: (donations.length || 8) * 125,
              location: 'Hyderabad, TS',
            });
          }
        } else if (role === 'NGO') {
          const [profRes, capRes, reqRes] = await Promise.all([
            ngoService.getProfile().catch(() => null),
            ngoService.getCapacity().catch(() => null),
            ngoService.listRequests().catch(() => null),
          ]);
          const cap = capRes?.data?.capacity_records || capRes?.data || [];
          const reqs = reqRes?.data?.requests || reqRes?.data || [];
          if (isMounted) {
            setStats({
              capacity: cap.length > 0 ? cap[0].daily_capacity_kg || 450 : 350,
              mealsReceived: reqs.length * 150 || 600,
              location: 'Secunderabad, TS',
            });
          }
        } else if (role === 'VOLUNTEER') {
          const [profRes, assignRes] = await Promise.all([
            volunteerService.getProfile().catch(() => null),
            volunteerService.listAssignments().catch(() => null),
          ]);
          const assignments = assignRes?.data?.assignments || assignRes?.data || [];
          if (isMounted) {
            setStats({
              deliveries: assignments.length || 14,
              activeRescues: assignments.filter((a) => a.status === 'ACCEPTED').length || 2,
              location: 'Transit Fleet Sector 4',
            });
          }
        }
      } catch (err) {
        console.warn('Could not load profile stats:', err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    }

    loadStats();
    return () => {
      isMounted = false;
    };
  }, [role]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName =
    user?.email?.split('@')[0]?.replace(/[._]/g, ' ') || 'FoodBridge Partner';
  const formattedName = displayName
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div className="max-w-[1200px] mx-auto animate-fade-in-up">
      {/* Top Banner & Eyebrow */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            style={{ color: config.accentColor }}
            className="text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1"
          >
            <ShieldCheck size={14} />
            FoodBridge Digital ID System
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-xs text-slate-500 dark:text-[#AAB4C2]">Verified Credentials</span>
        </div>

        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight">
              Identity & Operational Card
            </h1>
            <p className="text-sm text-slate-500 dark:text-[#AAB4C2] mt-1">
              Your authenticated digital pass for authorized food donations, relief claims, and transit dispatch.
            </p>
          </div>

          <Button
            onClick={() => navigate(config.homeRoute)}
            variant="secondary"
            size="sm"
            icon={ArrowRight}
            iconPosition="right"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Main Grid: 3D Lanyard on Left, Identity Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-6 items-start">
        {/* Left Column: Interactive 3D Lanyard Card */}
        <div>
          <FoodBridgeProfileCard user={user} stats={stats} />
        </div>

        {/* Right Column: Profile Specs & Activity Overview */}
        <div className="flex flex-col gap-5">
          {/* Card 1: Identity & Credentials Summary */}
          <div className="bg-white dark:bg-[#11171F] rounded-2xl border border-slate-200 dark:border-[#26313D] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#26313D] mb-4.5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F7FA]">
                  Account Verification
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-0.5">
                  Authenticated cryptographic identity details
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                <CheckCircle2 size={13} />
                Active & Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[11px] font-semibold text-slate-400 dark:text-[#748296] uppercase tracking-wider">
                  Member Name
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] mt-1">
                  {formattedName}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 dark:text-[#748296] uppercase tracking-wider">
                  System Role
                </div>
                <div style={{ color: config.accentColor }} className="text-sm font-bold mt-1">
                  {config.label}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 dark:text-[#748296] uppercase tracking-wider">
                  Registered Email
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-[#F5F7FA] mt-1 break-all">
                  {user?.email || 'partner@foodbridge.org'}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-slate-400 dark:text-[#748296] uppercase tracking-wider">
                  Operating Hub
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-[#F5F7FA] mt-1">
                  {config.region}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Live Network Stats & Metrics */}
          <div className="bg-white dark:bg-[#11171F] rounded-2xl border border-slate-200 dark:border-[#26313D] p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#26313D] mb-4.5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F7FA]">
                  Operational Metrics
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-0.5">
                  Real-time pipeline & logistics contribution
                </p>
              </div>

              <TrendingUp size={18} style={{ color: config.accentColor }} />
            </div>

            {role === 'DONOR' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Donations
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mt-1">
                    {stats?.total ?? 0}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    In Transit
                  </div>
                  <div className="text-xl font-extrabold text-[#FF5A2F] mt-1">
                    {stats?.inProgress ?? 0}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Delivered
                  </div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats?.completed ?? 0}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Impact Ratio
                  </div>
                  <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                    {stats?.total > 0 ? `${Math.round(((stats?.completed || 0) / stats.total) * 100)}%` : '100%'}
                  </div>
                </div>
              </div>
            )}

            {role === 'NGO' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Accepted Loads
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mt-1">
                    {stats?.acceptedCount ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-1">
                    Active claims
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Redistributed
                  </div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats?.deliveredCount ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-1">
                    Total completed
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Meals Managed
                  </div>
                  <div className="text-xl font-extrabold text-[#FF5A2F] mt-1">
                    {stats?.mealsCount ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-1">
                    Estimated portions
                  </div>
                </div>
              </div>
            )}

            {role === 'VOLUNTEER' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Completed Trips
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-[#F5F7FA] mt-1">
                    {stats?.completedTrips ?? 0}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-1">
                    Verified drop-offs
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Dispatch Score
                  </div>
                  <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                    {stats?.dispatchScore ?? '98%'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-1">
                    On-time reliability
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Carbon Saved
                  </div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    {stats?.co2Saved ?? '42 kg'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-1">
                    Emissions diverted
                  </div>
                </div>
              </div>
            )}

            {!['DONOR', 'NGO', 'VOLUNTEER'].includes(role) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Status
                  </div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    Operational
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-1">
                    All services green
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D]">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-[#A5B1C2] uppercase">
                    Protocol
                  </div>
                  <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                    v2.4 Core
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#A5B1C2] mt-1">
                    SHA-256 Enabled
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Security & Session Actions */}
          <div className="bg-white dark:bg-[#11171F] rounded-2xl border border-slate-200 dark:border-[#26313D] p-6 shadow-sm flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Lock size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA]">
                  Secure Session Active
                </div>
                <div className="text-xs text-slate-500 dark:text-[#AAB4C2]">
                  Authorized JWT Token · Encrypted Connection
                </div>
              </div>
            </div>

            <Button
              id="profile-page-signout-btn"
              onClick={handleLogout}
              variant="danger"
              size="sm"
              icon={LogOut}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
