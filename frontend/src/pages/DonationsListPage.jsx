/**
 * DonationsListPage — Structured donation offer inventory & history.
 * Cloudhub style: Clean white data table, coral-orange pill filters, and search bar.
 */
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { donationService } from '../services/donationService';
import { StatusBadge } from '../components/common/StatusBadge';
import { ExpiryTimer } from '../components/common/ExpiryTimer';
import { SpotlightCard } from '../components/common/SpotlightCard';
import {
  IN_PROGRESS_STATUSES,
  COMPLETED_STATUSES,
  TERMINAL_STATUSES,
} from '../constants/donationStatuses';
import {
  Search,
  PlusCircle,
  RefreshCw,
  PackageOpen,
  MapPin,
  Calendar,
  Boxes,
  AlertCircle,
  X,
  ArrowUpDown,
  Filter,
  ArrowRight,
} from 'lucide-react';

function formatShortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractCity(address) {
  if (!address) return null;
  const parts = address.split(',');
  return parts.length >= 2 ? parts[parts.length - 2].trim() : address.trim();
}

function formatQty(qty, unit) {
  if (!qty && qty !== 0) return null;
  const u = (unit || '').toLowerCase();
  return u ? `${qty} ${u}` : String(qty);
}

export const DonationsListPage = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NEWEST');

  const fetchDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await donationService.listMyDonations();
      const list = res?.donations || res?.data?.donations || [];
      setDonations(list);
    } catch (err) {
      setError(err.message || 'Failed to load donations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDonations(); }, []);

  const counts = useMemo(() => ({
    total:     donations.length,
    active:    donations.filter(d => IN_PROGRESS_STATUSES.has(d.status)).length,
    completed: donations.filter(d => COMPLETED_STATUSES.has(d.status)).length,
    terminal:  donations.filter(d => TERMINAL_STATUSES.has(d.status)).length,
  }), [donations]);

  const filtered = useMemo(() => {
    let list = donations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        (d.donation_title || '').toLowerCase().includes(q) ||
        (d.pickup_address || '').toLowerCase().includes(q) ||
        String(d.donation_id || '').includes(q)
      );
    }

    if (statusFilter === 'ACTIVE')    list = list.filter(d => IN_PROGRESS_STATUSES.has(d.status));
    if (statusFilter === 'COMPLETED') list = list.filter(d => COMPLETED_STATUSES.has(d.status));
    if (statusFilter === 'TERMINAL')  list = list.filter(d => TERMINAL_STATUSES.has(d.status));
    if (statusFilter === 'DRAFT')     list = list.filter(d => d.status === 'DRAFT');

    return [...list].sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.created_at ?? 0) - new Date(a.created_at ?? 0);
      if (sortBy === 'OLDEST') return new Date(a.created_at ?? 0) - new Date(b.created_at ?? 0);
      if (sortBy === 'QUANTITY') return (b.total_quantity || 0) - (a.total_quantity || 0);
      if (sortBy === 'EXPIRY') {
        if (!a.expiry_time) return 1;
        if (!b.expiry_time) return -1;
        return new Date(a.expiry_time) - new Date(b.expiry_time);
      }
      return 0;
    });
  }, [donations, searchQuery, statusFilter, sortBy]);

  const TABS = [
    { key: 'ALL',       label: 'All Offers',         count: counts.total,     activeClass: 'bg-orange-50 text-[#FF553E] border-orange-200 font-bold' },
    { key: 'ACTIVE',    label: 'In Progress',        count: counts.active,    activeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-bold' },
    { key: 'COMPLETED', label: 'Delivered',          count: counts.completed, activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold' },
    ...(counts.terminal > 0 ? [{ key: 'TERMINAL', label: 'Expired / Cancelled', count: counts.terminal, activeClass: 'bg-red-50 text-red-700 border-red-200 font-bold' }] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Cloudhub Hero Header */}
      <div className="fb-page-header">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">My Donations</h1>
            <p className="text-sm text-slate-500 mt-1">
              {donations.length} listing{donations.length === 1 ? '' : 's'} · search and filter below
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={fetchDonations}
              disabled={loading}
              className="p-2 rounded-md text-slate-500 hover:text-slate-900 bg-white border border-slate-200"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link to="/donor/create" className="fb-btn-primary text-xs">
              <PlusCircle size={15} />
              <span>Post Surplus Food</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="fb-alert-error">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      {donations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          {/* Tab Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap flex items-center space-x-2 border ${
                  statusFilter === tab.key
                    ? tab.activeClass
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className="tabular-nums text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/5 font-bold">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search + Sort Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, pickup address, or offer ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF553E] focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FF553E] focus:bg-white"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
                <option value="QUANTITY">Largest Quantity</option>
                <option value="EXPIRY">Soonest Expiry</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white border border-slate-200 rounded-2xl fb-skeleton" />
          ))}
        </div>
      )}

      {!loading && donations.length === 0 && !error && (
        <div className="fb-empty-state">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[#FF553E] bg-orange-50 border border-orange-200 mb-4 shadow-sm">
            <PackageOpen size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">No donations created yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed font-medium">
            Post surplus food from your kitchen or event to start matching with accredited NGOs.
          </p>
          <Link to="/donor/create" className="fb-btn-primary shadow-md">
            <PlusCircle size={15} />
            <span>Post Surplus Food</span>
          </Link>
        </div>
      )}

      {/* Empty Filter State */}
      {!loading && donations.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 border border-slate-200 rounded-2xl bg-white p-6 shadow-sm">
          <Filter size={24} className="mx-auto text-slate-400 mb-2 opacity-60" />
          <p className="text-xs font-bold text-slate-700">No donations match your selected filters</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
            className="mt-3 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Desktop Data Table / List */}
      {!loading && filtered.length > 0 && (
        <div className="fb-card overflow-hidden bg-white">
          {/* Table Header */}
          <div
            className="hidden lg:grid grid-cols-[2fr_1fr_1.2fr_1fr_1fr_80px] gap-4 px-6 py-3.5 border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400"
          >
            <div>Donation Offer</div>
            <div>Quantity</div>
            <div>Location</div>
            <div>Status</div>
            <div>Created Date</div>
            <div className="text-right">Action</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-100">
            {filtered.map(d => {
              const city = extractCity(d.pickup_address);
              const qty  = formatQty(d.total_quantity, d.quantity_unit);
              const now = Date.now();
              const expMs = d.expiry_time ? new Date(d.expiry_time).getTime() : null;
              const showExpiry = IN_PROGRESS_STATUSES.has(d.status) && expMs !== null && expMs > now;

              return (
                <SpotlightCard
                  key={d.donation_id}
                  spotlightColor="rgba(255, 85, 62, 0.12)"
                  className="p-4 sm:px-6 sm:py-4 hover:bg-slate-50/70 transition-colors flex flex-col lg:grid lg:grid-cols-[2fr_1fr_1.2fr_1fr_1fr_80px] gap-3 lg:gap-4 lg:items-center relative"
                >
                  {/* Donation Title */}
                  <div className="min-w-0 relative z-10">
                    <Link
                      to={`/donor/donations/${d.donation_id}`}
                      className="text-xs sm:text-sm font-bold text-slate-900 hover:text-[#FF553E] transition truncate block"
                    >
                      {d.donation_title || `Donation #${d.donation_id}`}
                    </Link>
                    {showExpiry && (
                      <div className="mt-1">
                        <ExpiryTimer expiryTime={d.expiry_time} donationStatus={d.status} compact />
                      </div>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="text-xs text-slate-600 flex items-center space-x-1.5 relative z-10">
                    <Boxes size={13} className="text-slate-400 shrink-0 lg:hidden" />
                    <span className="font-bold text-slate-900 tabular-nums">{qty || '—'}</span>
                  </div>

                  {/* Location */}
                  <div className="text-xs text-slate-500 flex items-center space-x-1.5 truncate font-medium relative z-10">
                    <MapPin size={13} className="text-slate-400 shrink-0 lg:hidden" />
                    <span className="truncate">{city || 'Location unavailable'}</span>
                  </div>

                  {/* Status Badge */}
                  <div className="relative z-10">
                    <StatusBadge status={d.status} />
                  </div>

                  {/* Created Date */}
                  <div className="text-xs text-slate-400 flex items-center space-x-1.5 font-medium relative z-10">
                    <Calendar size={13} className="text-slate-400 shrink-0 lg:hidden" />
                    <span>{formatShortDate(d.created_at)}</span>
                  </div>

                  {/* View Details Action */}
                  <div className="flex items-center justify-end relative z-10">
                    <Link
                      to={`/donor/donations/${d.donation_id}`}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-slate-400 hover:text-[#FF553E] transition shadow-sm"
                      title="View Details"
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
