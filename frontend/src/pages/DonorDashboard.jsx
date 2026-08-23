/**
 * DonorDashboard — Primary operational hub for authenticated food donors.
 * Authentic Cloudhub SaaS light & dark design with signature coral-orange accents.
 */
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { donationService } from '../services/donationService';
import { StatusBadge } from '../components/common/StatusBadge';
import { FoodJourney } from '../components/common/FoodJourney';
import { ExpiryTimer } from '../components/common/ExpiryTimer';
import { Button } from '../components/common/Button';
import { GlareHover } from '../components/magicui/GlareHover';
import {
  IN_PROGRESS_STATUSES,
  COMPLETED_STATUSES,
  resolveDonationState,
} from '../constants/donationStatuses';
import {
  PlusCircle,
  RefreshCw,
  PackageOpen,
  ChevronRight,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowRight,
  Activity,
  CheckCircle2,
} from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatShortDate(iso) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function extractCity(address) {
  if (!address) return null;
  const parts = address.split(',').map(s => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || null;
}

function formatQty(qty, unit) {
  if (!qty && qty !== 0) return null;
  const u = (unit || '').toLowerCase();
  return u ? `${qty} ${u}` : `${qty}`;
}

// Editorial SaaS KPI stat card
const StatCard = ({
  eyebrow,
  value,
  description,
  contextText,
  icon: Icon,
  iconColor = 'text-slate-400',
  to,
}) => {
  // Format single digit with leading zero for clean SaaS typography (e.g. 03, 00)
  const displayValue = typeof value === 'number'
    ? (value >= 0 && value < 10 ? `0${value}` : String(value))
    : (value ?? '00');

  const content = (
    <div className="fb-stat-card p-4 sm:p-4.5 flex flex-col justify-between h-full group select-none">
      <div>
        {/* Eyebrow & subtle icon header */}
        <div className="flex items-center justify-between gap-2 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#AAB4C2]">
            {eyebrow}
          </span>
          {Icon && (
            <Icon
              size={15}
              strokeWidth={2}
              className={`${iconColor} shrink-0 transition-colors duration-180`}
            />
          )}
        </div>

        {/* Strong metric */}
        <div className="text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-[#F5F7FA] tabular-nums leading-none tracking-tight my-1.5">
          {displayValue}
        </div>

        {/* Supporting description */}
        <p className="text-xs text-slate-500 dark:text-[#AAB4C2] leading-snug mt-1">
          {description}
        </p>
      </div>

      {/* Integrated contextual footer */}
      {contextText && (
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-[#242D38] flex items-center justify-between text-[11px] text-slate-400 dark:text-[#7F8A99] font-medium">
          <span>{contextText}</span>
          <ArrowRight
            size={12}
            className="text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-[#F5F7FA] group-hover:translate-x-0.5 transition-all duration-180"
          />
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block h-full no-underline">
        {content}
      </Link>
    );
  }

  return content;
};

// Active Journey card enhanced with React Bits SpotlightCard
const JourneyCard = ({ donation }) => {
  const state = resolveDonationState(donation);
  const city = extractCity(donation.pickup_address);
  const qty = formatQty(donation.total_quantity, donation.quantity_unit);

  let stateLabel, stateColor, dotBg, accentClass;
  if (state.isCompleted) {
    stateLabel = 'Completed'; stateColor = 'text-emerald-600 dark:text-emerald-400'; dotBg = 'bg-emerald-500';
    accentClass = 'bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20';
  } else if (state.isExpired || state.isTerminal) {
    stateLabel = 'Expired'; stateColor = 'text-red-600 dark:text-red-400'; dotBg = 'bg-red-500';
    accentClass = 'bg-red-50/60 dark:bg-red-500/10 border-red-100 dark:border-red-500/20';
  } else {
    stateLabel = 'In Progress'; stateColor = 'text-[#FF5A2F]'; dotBg = 'bg-[#FF5A2F]';
    accentClass = 'bg-orange-50/60 dark:bg-orange-500/10 border-orange-100 dark:border-orange-500/20';
  }

  return (
    <GlareHover className="rounded-2xl h-full" duration={600} opacity={0.55}>
      <div className="fb-card overflow-hidden h-full">
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b ${accentClass}`}
        >
          <div className="flex items-center space-x-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotBg}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${stateColor}`}>{stateLabel}</span>
          </div>
          <StatusBadge status={donation.status} />
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#F5F7FA] leading-snug line-clamp-1">
              {donation.donation_title || `Donation #${donation.donation_id}`}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-500 dark:text-[#AAB4C2] font-medium">
              {qty && (
                <span className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                  <PackageOpen size={14} className="shrink-0 text-slate-400" />
                  <span>{qty}</span>
                </span>
              )}
              {city && (
                <span className="flex items-center space-x-1.5">
                  <MapPin size={14} className="shrink-0 text-slate-400" />
                  <span>{city}</span>
                </span>
              )}
              <span className="flex items-center space-x-1.5">
                <Calendar size={14} className="shrink-0 text-slate-400" />
                <span>{formatShortDate(donation.created_at)}</span>
              </span>
            </div>
          </div>

          {state.showExpiry && (
            <div className="p-3.5 bg-slate-50 dark:bg-[#171D25] border border-slate-200 dark:border-[#242D38] rounded-2xl">
              <ExpiryTimer
                expiryTime={donation.expiry_time}
                donationStatus={donation.status}
                showBar
              />
            </div>
          )}

          {state.isExpired && !state.isTerminal && (
            <div className="fb-alert-error">
              <AlertCircle size={15} className="shrink-0" />
              <span>This donation was not matched before its food safety expiry threshold.</span>
            </div>
          )}

          <div className="pt-1">
            <FoodJourney status={donation.status} orientation="horizontal" compact />
          </div>

          <Button
            to={`/donor/donations/${donation.donation_id}`}
            variant="secondary"
            size="sm"
            fullWidth
            icon={ArrowRight}
            iconPosition="right"
          >
            View Details
          </Button>
        </div>
      </div>
    </GlareHover>
  );
};

// Recent donation row
const DonationRow = ({ donation }) => {
  const city = extractCity(donation.pickup_address);
  const qty = formatQty(donation.total_quantity, donation.quantity_unit);

  return (
    <Link
      to={`/donor/donations/${donation.donation_id}`}
      className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-[#171E27] transition-colors group border-b border-slate-100 dark:border-[#26313D] last:border-0"
    >
      <div className="min-w-0 flex-1 pr-3">
        <p className="text-xs font-semibold text-slate-900 dark:text-[#F5F7FA] truncate group-hover:text-[#FF5A2F]">
          {donation.donation_title || `Donation #${donation.donation_id}`}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-[#A5B1C2] mt-0.5 flex items-center space-x-1.5 font-medium">
          <span>{formatShortDate(donation.created_at)}</span>
          {city && <span>· {city}</span>}
          {qty && <span>· {qty}</span>}
        </p>
      </div>
      <div className="flex items-center space-x-3 shrink-0">
        <StatusBadge status={donation.status} />
        <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-[#FF5A2F] transition-colors" />
      </div>
    </Link>
  );
};

export const DonorDashboard = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await donationService.listMyDonations();
      const rawList = res?.donations || res?.data?.donations || (Array.isArray(res?.data) ? res.data : []);
      const list = Array.isArray(rawList) ? [...rawList] : [];
      list.sort((a, b) => new Date(b?.created_at ?? 0) - new Date(a?.created_at ?? 0));
      setDonations(list);
    } catch (err) {
      setError(err.message || 'Failed to load donations.');
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDonations(); }, []);

  // Stat calculations
  const stats = useMemo(() => {
    const list = Array.isArray(donations) ? donations : [];
    const now = Date.now();
    const inProgress = list.filter(d => {
      if (!d || !IN_PROGRESS_STATUSES.has(d.status)) return false;
      const exp = d.expiry_time ? new Date(d.expiry_time).getTime() : null;
      return exp === null || exp >= now;
    }).length;
    const completed = list.filter(d => d && COMPLETED_STATUSES.has(d.status)).length;
    return { total: list.length, inProgress, completed };
  }, [donations]);

  const activeDonation = useMemo(() => {
    const list = Array.isArray(donations) ? donations : [];
    const now = Date.now();
    const actives = list.filter(d => {
      if (!d || !IN_PROGRESS_STATUSES.has(d.status)) return false;
      const exp = d.expiry_time ? new Date(d.expiry_time).getTime() : null;
      return exp === null || exp >= now;
    });
    if (!actives.length) return null;
    return [...actives].sort((a, b) => {
      if (!a?.expiry_time) return 1;
      if (!b?.expiry_time) return -1;
      return new Date(a.expiry_time) - new Date(b.expiry_time);
    })[0];
  }, [donations]);

  const otherDonations = useMemo(
    () => (Array.isArray(donations) ? donations : []).filter(d => d && d.donation_id !== activeDonation?.donation_id).slice(0, 6),
    [donations, activeDonation]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-xl fb-skeleton" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-28 bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-xl fb-skeleton" />)}
        </div>
        <div className="h-56 bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-xl fb-skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Donor Hero Banner */}
      <div className="fb-page-header">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F7FA] tracking-tight">{getGreeting()}</h1>
            <p className="text-sm text-slate-500 dark:text-[#AAB4C2] mt-1">
              Track your listings and see which ones are still moving.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <Button
              onClick={fetchDonations}
              variant="icon"
              size="sm"
              icon={RefreshCw}
              loading={loading}
              aria-label="Refresh donations"
              title="Refresh"
            />
            <Button
              to="/donor/create"
              variant="primary"
              size="sm"
              icon={PlusCircle}
            >
              Post Surplus Food
            </Button>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="fb-alert-error">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      {donations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <StatCard
            eyebrow="Total Listings"
            value={stats.total}
            description="Food offers posted"
            contextText="All time"
            icon={PackageOpen}
            iconColor="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
            to="/donor/list"
          />
          <StatCard
            eyebrow="In Progress"
            value={stats.inProgress}
            description="Currently moving through the network"
            contextText="Active coordination"
            icon={Activity}
            iconColor="text-[#FF5A2F]"
            to="/donor/list?status=ACTIVE"
          />
          <StatCard
            eyebrow="Delivered"
            value={stats.completed}
            description="Food successfully redistributed"
            contextText="Verified completed"
            icon={CheckCircle2}
            iconColor="text-emerald-600 dark:text-emerald-400"
            to="/donor/impact"
          />
        </div>
      )}

      {/* Empty State */}
      {donations.length === 0 && !error && (
        <div className="fb-empty-state">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[#FF5A2F] bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 mb-4 shadow-sm">
            <PackageOpen size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#F5F7FA] mb-1">No donation offers yet</h2>
          <p className="text-xs text-slate-500 dark:text-[#AAB4C2] max-w-sm mb-6 leading-relaxed">
            Post your surplus food listing to initiate automated matching with local NGOs and volunteer drivers.
          </p>
          <Button
            to="/donor/create"
            variant="primary"
            size="md"
            icon={PlusCircle}
            className="shadow-md"
          >
            Post Surplus Food
          </Button>
        </div>
      )}

      {/* Main Grid */}
      {donations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2 Cols: Current Food Journey */}
          <div className="lg:col-span-2 space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-[#F5F7FA]">
                Current listing
              </h2>
              {activeDonation && (
                <span className="text-xs text-[#FF5A2F] font-semibold">In progress</span>
              )}
            </div>

            {activeDonation ? (
              <JourneyCard donation={activeDonation} />
            ) : (
              <div className="p-8 fb-card text-center space-y-3">
                <p className="text-xs text-slate-500 dark:text-[#AAB4C2] font-medium">No active donations currently in transit.</p>
                <Link to="/donor/create" className="text-xs text-[#FF5A2F] hover:underline font-bold inline-flex items-center space-x-1">
                  <span>Post new surplus food offer</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* Right 1 Col: Recent Donations List */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-[#F5F7FA]">
                Recent
              </h2>
              <Link to="/donor/list" className="text-xs text-[#FF5A2F] hover:underline font-bold">
                View all
              </Link>
            </div>

            <div className="fb-card overflow-hidden">
              {otherDonations.length > 0 ? (
                otherDonations.map(d => (
                  <DonationRow key={d.donation_id} donation={d} />
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 dark:text-[#7F8A99] font-medium">
                  No past donations recorded.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default DonorDashboard;
