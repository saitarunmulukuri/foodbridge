import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { donationService } from '../services/donationService';
import { StatusBadge } from '../components/common/StatusBadge';
import { FoodJourney } from '../components/common/FoodJourney';
import { ExpiryTimer } from '../components/common/ExpiryTimer';
import { SmartMatchPanel } from '../components/donor/SmartMatchPanel';
import { Stepper, Step } from '../components/common/Stepper';
import { SpotlightCard } from '../components/common/SpotlightCard';
import {
  IN_PROGRESS_STATUSES,
  COMPLETED_STATUSES,
  TERMINAL_STATUSES,
  resolveDonationState,
} from '../constants/donationStatuses';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Boxes,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Truck,
  ShieldCheck,
} from 'lucide-react';

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString([], {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const JOURNEY_STEPS = [
  {
    num: 1,
    title: 'Created',
    desc: 'Donation offer drafted with items manifest and pickup specifications.',
    statusKey: 'DRAFT',
    icon: FileText,
  },
  {
    num: 2,
    title: 'Submitted',
    desc: 'Published to matching engine. Available for nearby accredited NGOs.',
    statusKey: 'SUBMITTED',
    icon: Send,
  },
  {
    num: 3,
    title: 'NGO Accepted',
    desc: 'An accredited NGO partner accepted this rescue offer and locked capacity.',
    statusKey: 'NGO_ACCEPTED',
    icon: CheckCircle2,
  },
  {
    num: 4,
    title: 'Volunteer Pending',
    desc: 'Matching with nearby verified volunteer driver for scheduled pickup.',
    statusKey: 'VOLUNTEER_PENDING',
    icon: Clock,
  },
  {
    num: 5,
    title: 'Pickup in Progress',
    desc: 'Volunteer driver dispatched and en route for pickup.',
    statusKey: 'PICKUP_IN_PROGRESS',
    icon: Truck,
  },
  {
    num: 6,
    title: 'Delivered',
    desc: 'Food safely delivered to NGO facility and undergoing verification.',
    statusKey: 'DELIVERED',
    icon: MapPin,
  },
  {
    num: 7,
    title: 'Completed',
    desc: 'Redistribution fully verified and recorded to Community Impact ledger.',
    statusKey: 'COMPLETED',
    icon: ShieldCheck,
  },
];

function getJourneyStepNumber(status) {
  switch (status) {
    case 'DRAFT': return 1;
    case 'SUBMITTED':
    case 'PENDING_NGO': return 2;
    case 'NGO_ACCEPTED':
    case 'MATCHED': return 3;
    case 'VOLUNTEER_PENDING':
    case 'ASSIGNED': return 4;
    case 'PICKUP_IN_PROGRESS':
    case 'IN_TRANSIT':
    case 'ACCEPTED': return 5;
    case 'DELIVERED': return 6;
    case 'COMPLETED': return 7;
    default: return 1;
  }
}

const Card = ({ title, icon: Icon, children, className = '' }) => (
  <SpotlightCard
    className={`fb-section-card bg-white border border-slate-200 shadow-sm ${className}`}
    spotlightColor="rgba(255, 85, 62, 0.08)"
  >
    {title && (
      <div className="fb-section-card-header bg-slate-50/60 border-b border-slate-100 relative z-10">
        {Icon && <Icon size={16} className="text-[#FF553E] shrink-0" />}
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h2>
      </div>
    )}
    <div className="p-5 sm:p-6 relative z-10">{children}</div>
  </SpotlightCard>
);

const MetaRow = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start space-x-3.5 py-3 border-b border-slate-100 last:border-0">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-orange-50 text-[#FF553E] border border-orange-200"
      >
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{label}</p>
        <p className="text-xs sm:text-sm text-slate-900 mt-0.5 font-semibold leading-snug break-words">{value}</p>
      </div>
    </div>
  );
};

const FoodItemRow = ({ item, index }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
    <div className="flex items-center space-x-3">
      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-extrabold shrink-0">
        {index + 1}
      </div>
      <div>
        <p className="text-xs sm:text-sm font-bold text-slate-900">{item.food_name || item.item_name || 'Food Item'}</p>
        {item.food_category && (
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.food_category}</p>
        )}
      </div>
    </div>
    <div className="text-right">
      <span className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums">
        {item.quantity ?? item.quantity_kg ?? '—'}
      </span>
      {item.unit && <span className="text-slate-500 font-medium ml-1 text-xs">{item.unit}</span>}
    </div>
  </div>
);

const DonationActions = ({ donation, onRefresh }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess('');
    try {
      await donationService.submitDonation(donation.donation_id);
      setSubmitSuccess('Donation submitted. Decision Engine matching is now active.');
      onRefresh();
    } catch (err) {
      setSubmitError(err.message || 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const { status } = donation;
  const state = resolveDonationState(donation);

  return (
    <div className="space-y-3.5">
      {submitSuccess && (
        <div className="fb-alert-success">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}
      {submitError && (
        <div className="fb-alert-error">
          <AlertCircle size={15} className="shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* DRAFT -> Submit */}
      {status === 'DRAFT' && (
        <button
          id="submit-donation-btn"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full fb-btn-primary py-3.5 text-sm font-bold shadow-lg"
        >
          {submitting ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
          <span>{submitting ? 'Submitting…' : 'Submit Donation Offer'}</span>
        </button>
      )}

      {/* SUBMITTED -> SmartMatchPanel */}
      {status === 'SUBMITTED' && (
        <SmartMatchPanel donationId={donation.donation_id} onComplete={onRefresh} />
      )}

      {/* In-progress */}
      {IN_PROGRESS_STATUSES.has(status) && status !== 'SUBMITTED' && (
        <div className="fb-alert-info">
          <Clock size={15} className="shrink-0 animate-journey-pulse text-blue-600" />
          <span>Active in redistribution pipeline — live milestones will update automatically.</span>
        </div>
      )}

      {/* Completed */}
      {COMPLETED_STATUSES.has(status) && (
        <div className="fb-alert-success">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>Successfully delivered to NGO recipient. Thank you for eliminating food waste!</span>
        </div>
      )}

      {/* Terminal */}
      {TERMINAL_STATUSES.has(status) && (
        <div className="fb-alert-error">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-bold text-red-800">
              {status === 'EXPIRED' ? 'Donation offer expired' : 'Donation cancelled'}
            </p>
            {status === 'EXPIRED' && (
              <p className="text-xs text-red-600 mt-0.5 font-medium">
                This donation was not matched before its food safety expiry threshold.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Expired in-flight fallback */}
      {state.isExpiredInFlight && (
        <div className="fb-alert-warning">
          <AlertCircle size={14} className="shrink-0 text-amber-600" />
          <span>This donation&apos;s expiry time has passed. Status will update shortly.</span>
        </div>
      )}
    </div>
  );
};

export const DonationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDonation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await donationService.getDonationDetail(id);
      const data = res?.donation || res?.data?.donation || res?.data || res;
      setDonation(data);
    } catch (err) {
      setError(err.message || 'Could not load donation.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { if (id) fetchDonation(); }, [id, fetchDonation]);

  if (loading) {
    return (
      <div className="space-y-5 max-w-5xl mx-auto">
        <div className="h-8 w-40 bg-white border border-slate-200 rounded-xl fb-skeleton" />
        <div className="h-44 bg-white border border-slate-200 rounded-3xl fb-skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-64 bg-white border border-slate-200 rounded-2xl fb-skeleton" />
          <div className="h-64 bg-white border border-slate-200 rounded-2xl fb-skeleton" />
        </div>
      </div>
    );
  }

  if (error || !donation) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="fb-alert-error justify-center">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error || 'Donation not found.'}</span>
        </div>
        <button onClick={() => navigate('/donor')} className="text-xs text-slate-500 hover:text-slate-900 transition font-bold">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const state = resolveDonationState(donation);
  const foodItems = donation.food_items || donation.items || [];
  const qty = donation.total_quantity
    ? `${donation.total_quantity}${donation.quantity_unit ? ' ' + donation.quantity_unit : ''}`.trim()
    : null;
  const city = donation.pickup_address?.split(',').slice(-2, -1)[0]?.trim();
  const showExpirySection = donation.expiry_time && state.showExpiry;
  const currentJourneyStep = getJourneyStepNumber(donation.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">

      {/* Back Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/donor/list"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 transition font-bold"
        >
          <ArrowLeft size={14} />
          <span>Back to My Donations</span>
        </Link>
        <button
          onClick={fetchDonation}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 transition font-semibold"
        >
          <RefreshCw size={12} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Cloudhub Hero Banner Card */}
      <div className="fb-page-header fb-hero-donor bg-white border border-slate-200 shadow-md">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-[11px] font-mono text-slate-400 font-bold">ID #{donation.donation_id}</span>
                <StatusBadge status={donation.status} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {donation.donation_title || `Donation #${donation.donation_id}`}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2.5 text-xs text-slate-500 font-medium">
                {qty && (
                  <span className="flex items-center space-x-1.5 text-slate-900 font-bold">
                    <Boxes size={14} className="text-[#FF553E] shrink-0" />
                    <span>{qty}</span>
                  </span>
                )}
                {city && (
                  <span className="flex items-center space-x-1.5">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span>{city}</span>
                  </span>
                )}
                <span className="flex items-center space-x-1.5">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <span>Posted {formatDateTime(donation.created_at)}</span>
                </span>
              </div>
              {donation.description && (
                <p className="text-xs text-slate-600 mt-3 leading-relaxed max-w-3xl font-normal">
                  {donation.description}
                </p>
              )}
            </div>
          </div>

          {showExpirySection && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <ExpiryTimer
                expiryTime={donation.expiry_time}
                donationStatus={donation.status}
                showBar
              />
            </div>
          )}
        </div>
      </div>

      {/* Food Redistribution Journey Stepper (React Bits Stepper Component) */}
      <Card title="Food Redistribution Journey" icon={Truck}>
        <div className="space-y-4">
          <Stepper
            initialStep={currentJourneyStep}
            currentStep={currentJourneyStep}
            activeColor="#FF553E"
            completeColor="#10B981"
            hideFooter={true}
            disableStepIndicators={false}
            stepContainerClassName="justify-between px-1 sm:px-6"
            className="w-full"
          >
            {JOURNEY_STEPS.map((step) => {
              const Icon = step.icon;
              const isCurrent = currentJourneyStep === step.num;
              const isDone = currentJourneyStep > step.num;

              return (
                <Step key={step.num}>
                  <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? 'bg-orange-50 text-[#FF553E] border-orange-200 shadow-sm'
                          : isDone
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-white text-slate-400 border-slate-200'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            Stage {step.num} of 7
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FF553E] text-white">
                              Active Stage
                            </span>
                          )}
                          {isDone && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Completed
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5">{step.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-medium">{step.desc}</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <StatusBadge status={step.statusKey} />
                    </div>
                  </div>
                </Step>
              );
            })}
          </Stepper>

          {/* Compact visual node overview */}
          <div className="pt-2">
            <FoodJourney status={donation.status} orientation="horizontal" compact />
          </div>
        </div>
      </Card>

      {/* Interactive Actions & Decision Engine Smart Match */}
      <Card title="Redistribution Actions & Smart Match" icon={ShieldCheck}>
        <DonationActions donation={donation} onRefresh={fetchDonation} />
      </Card>

      {/* Two-Column Structured Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: Food Items Inventory */}
        <Card title={`Food Items Manifest (${foodItems.length})`} icon={Boxes}>
          {foodItems.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {foodItems.map((item, i) => (
                <FoodItemRow key={item.food_item_id ?? item.id ?? i} item={item} index={i} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-medium">No individual items itemized for this offer.</p>
          )}
        </Card>

        {/* Right Column: Pickup Logistics & Specifications */}
        <Card title="Logistics & Dispatch Details" icon={FileText}>
          <div className="space-y-0.5">
            <MetaRow icon={Boxes}    label="Total Volume"       value={qty} />
            <MetaRow icon={MapPin}   label="Pickup Street"      value={donation.pickup_address || 'Location unavailable'} />
            <MetaRow icon={Calendar} label="Available From"     value={formatDateTime(donation.available_from)} />
            <MetaRow icon={Calendar} label="Expiry Threshold"   value={formatDateTime(donation.expiry_time)} />
            {donation.special_instructions && (
              <MetaRow icon={FileText} label="Special Instructions" value={donation.special_instructions} />
            )}
          </div>
        </Card>

      </div>

    </div>
  );
};
