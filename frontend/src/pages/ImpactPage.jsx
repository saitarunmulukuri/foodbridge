/**
 * ImpactPage — Verified redistribution metrics from actual donor records.
 * Authentic Cloudhub SaaS light & dark design.
 */
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { donationService } from '../services/donationService';
import { StatusBadge } from '../components/common/StatusBadge';
import { Button } from '../components/common/Button';
import {
  IN_PROGRESS_STATUSES as ACTIVE_STATUSES,
  COMPLETED_STATUSES,
  TERMINAL_STATUSES,
} from '../constants/donationStatuses';
import {
  Sparkles,
  PackageOpen,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Activity,
  Boxes,
  MapPin,
  Calendar,
  Layers,
  Info,
  PlusCircle,
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
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim();
  }
  return address.trim();
}

export const ImpactPage = () => {
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
      setDonations(list);
    } catch (err) {
      setError(err.message || 'Failed to load donation metrics.');
      setDonations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const metrics = useMemo(() => {
    const list = Array.isArray(donations) ? donations : [];
    const totalOffers = list.length;
    const activeOffers = list.filter(d => d && ACTIVE_STATUSES.has(d.status));
    const completedOffers = list.filter(d => d && COMPLETED_STATUSES.has(d.status));
    const expiredOrCancelled = list.filter(d => d && TERMINAL_STATUSES.has(d.status));

    const quantityByUnit = {};
    const completedQuantityByUnit = {};

    list.forEach((d) => {
      if (!d) return;
      const qty = Number(d.total_quantity) || 0;
      const rawUnit = (d.quantity_unit || 'items').toLowerCase().trim();
      const unitKey = rawUnit.endsWith('s') ? rawUnit : `${rawUnit}s`;

      quantityByUnit[unitKey] = (quantityByUnit[unitKey] || 0) + qty;

      if (COMPLETED_STATUSES.has(d.status)) {
        completedQuantityByUnit[unitKey] = (completedQuantityByUnit[unitKey] || 0) + qty;
      }
    });

    const finalizedCount = completedOffers.length + expiredOrCancelled.length;
    const completionRate = finalizedCount > 0
      ? Math.round((completedOffers.length / finalizedCount) * 100)
      : totalOffers > 0 && completedOffers.length > 0
        ? Math.round((completedOffers.length / totalOffers) * 100)
        : null;

    return {
      total: totalOffers,
      active: activeOffers.length,
      completed: completedOffers.length,
      expiredOrCancelled: expiredOrCancelled.length,
      quantityByUnit,
      completedQuantityByUnit,
      completionRate,
    };
  }, [donations]);

  const recentJourneys = useMemo(() => {
    const list = Array.isArray(donations) ? donations : [];
    return [...list]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [donations]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="h-28 bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-3xl fb-skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-2xl fb-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Cloudhub Hero Header */}
      <div className="fb-page-header fb-hero-donor">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Sparkles size={15} className="text-[#FF5A2F]" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF5A2F]">Redistribution Metrics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tracking-tight">
              Your FoodBridge Impact
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#AAB4C2] mt-1 font-medium">
              Real lifecycle data tracking how your surplus food moves through our redistribution network.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Button
              onClick={fetchDonations}
              variant="icon"
              size="sm"
              icon={RefreshCw}
              loading={loading}
              aria-label="Refresh impact data"
              title="Refresh impact data"
            />
            <Button
              to="/donor/create"
              variant="primary"
              size="sm"
              icon={PlusCircle}
              className="shadow-md"
            >
              Post Surplus Food
            </Button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="fb-alert-error">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {donations.length === 0 && !error && (
        <div className="fb-empty-state">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-[#FF5A2F] bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30 mb-4 shadow-sm">
            <PackageOpen size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#F5F7FA] mb-1">No donation journey recorded yet</h2>
          <p className="text-xs text-slate-500 dark:text-[#AAB4C2] max-w-sm mb-6 leading-relaxed font-medium">
            When you post food donations, their real journey through matching, pickup, and community delivery will be measured here.
          </p>
          <Button
            to="/donor/create"
            variant="primary"
            size="md"
            icon={PlusCircle}
            className="shadow-md"
          >
            Post First Donation
          </Button>
        </div>
      )}

      {donations.length > 0 && (
        <>
          {/* Pipeline Overview — Cloudhub stat cards */}
          <div className="fb-section-card overflow-hidden">
            <div className="fb-section-card-header bg-slate-50/70 dark:bg-[#171E27] border-b border-slate-100 dark:border-[#26313D] flex items-center">
              <Sparkles size={15} className="text-[#FF5A2F]" />
              <span className="text-xs font-bold text-slate-900 dark:text-[#F5F7FA] uppercase tracking-wider">Redistribution Summary</span>
              <span className="ml-auto text-[11px] text-slate-400 dark:text-[#748296] font-semibold">Verified Lifecycle Records</span>
            </div>

            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Offers', sublabel: 'Offers posted all time', value: metrics.total, Icon: PackageOpen, iconColor: 'text-slate-400 dark:text-slate-500' },
                  { label: 'In Progress', sublabel: 'Currently in redistribution', value: metrics.active, Icon: Activity, iconColor: 'text-[#FF5A2F]' },
                  { label: 'Delivered', sublabel: 'Verified meal deliveries', value: metrics.completed, Icon: CheckCircle2, iconColor: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Success Rate', sublabel: metrics.completionRate !== null ? 'Completed delivery rate' : 'Pending finalized offers', value: metrics.completionRate !== null ? `${metrics.completionRate}%` : '—', Icon: TrendingUp, iconColor: 'text-blue-500 dark:text-blue-400' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="fb-stat-card p-4 sm:p-4.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-[#AAB4C2] pb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider">{stat.label}</span>
                        <stat.Icon size={15} strokeWidth={2} className={`${stat.iconColor} shrink-0`} />
                      </div>
                      <div className="text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-[#F5F7FA] tabular-nums leading-none tracking-tight my-1.5">
                        {typeof stat.value === 'number' ? (stat.value >= 0 && stat.value < 10 ? `0${stat.value}` : String(stat.value)) : stat.value}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-1 leading-snug">{stat.sublabel}</p>
                    </div>
                  </div>
                ))}
              </div>

              {metrics.completed === 0 && (
                <div className="flex items-start space-x-2.5 bg-slate-50 dark:bg-[#171D25] border border-slate-200 dark:border-[#242D38] rounded-xl p-3.5 text-xs text-slate-600 dark:text-[#AAB4C2] mt-5">
                  <Info size={15} className="text-slate-400 dark:text-[#7F8A99] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-[#F5F7FA]">Redistribution active: </span>
                    Completed impact metrics will populate as NGOs accept and receive your live offers.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Food Quantities by Unit */}
          <div className="fb-section-card p-6 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] flex items-center space-x-2">
                <Boxes size={18} className="text-[#FF5A2F]" />
                <span>Food Quantities by Measurement Unit</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-0.5 font-medium">
                Exact quantities tracked without speculative multipliers or unit conversion errors.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
              {Object.keys(metrics.quantityByUnit).length > 0 ? (
                Object.entries(metrics.quantityByUnit).map(([unit, totalQty]) => {
                  const completedQty = metrics.completedQuantityByUnit[unit] || 0;
                  return (
                    <div
                      key={unit}
                      className="bg-slate-50 dark:bg-[#171D25] border border-slate-200 dark:border-[#242D38] rounded-2xl p-4 flex flex-col justify-between"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#7F8A99] capitalize">
                        {unit}
                      </div>
                      <div className="my-2">
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-[#F5F7FA]">
                          {totalQty.toLocaleString()}{' '}
                          <span className="text-xs font-bold text-slate-400 dark:text-[#7F8A99]">{unit}</span>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-[#AAB4C2] flex items-center justify-between border-t border-slate-200 dark:border-[#242D38] pt-2 mt-1 font-medium">
                        <span>Delivered:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                          {completedQty.toLocaleString()} {unit}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-4 text-xs text-slate-400 dark:text-[#7F8A99] font-medium">
                  No quantity data recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Recent Journeys */}
          <div className="fb-section-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA] flex items-center space-x-2">
                  <Layers size={18} className="text-[#FF5A2F]" />
                  <span>Recent Redistribution Journeys</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-0.5 font-medium">
                  Latest status milestones for your posted surplus food
                </p>
              </div>
              <Link
                to="/donor/list"
                className="text-xs font-bold text-[#FF5A2F] hover:underline flex items-center space-x-1 transition"
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#26313D] border border-slate-200 dark:border-[#26313D] rounded-2xl bg-white dark:bg-[#11171F] overflow-hidden shadow-sm">
              {recentJourneys.map((donation) => {
                const city = extractCity(donation.pickup_address);

                return (
                  <div
                    key={donation.donation_id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#171E27] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/donor/donations/${donation.donation_id}`}
                        className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F5F7FA] hover:text-[#FF5A2F] transition truncate block"
                      >
                        {donation.donation_title || `Donation #${donation.donation_id}`}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-[#A5B1C2] mt-1 font-medium">
                        {donation.total_quantity && (
                          <span className="font-bold text-slate-800 dark:text-[#F5F7FA]">
                            {donation.total_quantity} {donation.quantity_unit || 'items'}
                          </span>
                        )}
                        {city && (
                          <span className="flex items-center space-x-1">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span>{city}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1 text-slate-400 dark:text-[#748296]">
                          <Calendar size={12} className="shrink-0" />
                          <span>{formatShortDate(donation.created_at)}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <StatusBadge status={donation.status} />
                      <Link
                        to={`/donor/donations/${donation.donation_id}`}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-[#171E27] hover:bg-orange-50 dark:hover:bg-orange-500/15 border border-slate-200 dark:border-[#26313D] hover:border-orange-200 text-slate-400 dark:text-[#748296] hover:text-[#FF5A2F] transition shadow-sm"
                        title="View Details"
                      >
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Transparency Callout */}
          <div className="border border-slate-200 dark:border-[#26313D] bg-white dark:bg-[#11171F] rounded-2xl p-4 text-xs text-slate-600 dark:text-[#A5B1C2] flex items-start space-x-3 shadow-sm">
            <Info size={16} className="text-[#FF5A2F] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-slate-800 dark:text-[#F5F7FA]">FoodBridge Data Transparency</p>
              <p className="leading-relaxed text-xs text-slate-500 dark:text-[#A5B1C2]">
                All impact counts reflect verifiable records from our smart matching and dispatch system.
                Quantities are tracked in your stated units without speculative multipliers or artificial approximations.
              </p>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default ImpactPage;
