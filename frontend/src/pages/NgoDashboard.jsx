/**
 * NgoDashboard — NGO Partner dashboard.
 * Authentic Cloudhub SaaS light design.
 */
import { useEffect, useState, useMemo } from 'react';
import { ngoService } from '../services/ngoService';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { ExpiryTimer } from '../components/common/ExpiryTimer';
import { AnimatedList } from '../components/common/AnimatedList';
import { NumberField } from '../components/common/forms';
import { Button } from '../components/common/Button';
import { GlareHover } from '../components/magicui/GlareHover';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  Inbox,
  Sliders,
  MapPin,
  Boxes,
  Clock,
  History,
} from 'lucide-react';

function formatShortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const AlertBanner = ({ type, message, onDismiss }) => {
  const styles = {
    success: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-800 dark:text-emerald-300',
    error:   'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-800 dark:text-red-300',
  };
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-lg border text-xs font-medium ${styles[type] || styles.error}`} role="alert">
      <div className="flex items-center space-x-2.5">
        <Icon size={14} className="shrink-0" />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-[#F5F7FA] ml-2 p-0.5 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X size={14} className="shrink-0" />
        </button>
      )}
    </div>
  );
};

const CapacityWidget = ({ capacity, onUpdate }) => {
  const [newCapacity, setNewCapacity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const todayIso = new Date().toISOString().split('T')[0];
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  const capacityList = useMemo(() => {
    if (Array.isArray(capacity)) return capacity;
    if (capacity?.capacities && Array.isArray(capacity.capacities)) return capacity.capacities;
    if (capacity?.capacity_records && Array.isArray(capacity.capacity_records)) return capacity.capacity_records;
    return [];
  }, [capacity]);

  const todayRecord = useMemo(() => {
    return capacityList.find(c => c.date === todayIso || c.day_of_week === todayName) || capacityList[0] || null;
  }, [capacityList, todayIso, todayName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newCapacity || newCapacity.trim() === '') {
      setError('Please enter a capacity value.');
      return;
    }
    const val = Number(newCapacity);
    if (isNaN(val) || !Number.isInteger(val)) {
      setError('Capacity must be a valid whole number.');
      return;
    }
    if (val < 1) {
      setError('Capacity must be at least 1 meal.');
      return;
    }
    if (val > 100000) {
      setError('Capacity cannot exceed 100,000 meals.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess('');
    try {
      const res = await ngoService.updateCapacity(todayIso, val);
      if (res.success || res.data) {
        setSuccess(`Capacity updated successfully to ${val} meals.`);
        setNewCapacity('');
        if (onUpdate) await onUpdate();
      }
    } catch (err) {
      setError(err.message || 'Capacity update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-xl p-5 space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Sliders size={18} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-[#F5F7FA]">Meal Capacity Management</h2>
          <p className="text-xs text-slate-500 dark:text-[#A5B1C2] font-medium">Today: {todayName.charAt(0) + todayName.slice(1).toLowerCase()}</p>
        </div>
        {todayRecord && (
          <div className="ml-auto text-right">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-[#F5F7FA] tabular-nums">{todayRecord.maximum_capacity ?? todayRecord.max_meals ?? '—'}</p>
            <p className="text-[10px] text-slate-400 dark:text-[#748296] font-bold uppercase tracking-wider">current max meals</p>
          </div>
        )}
      </div>

      {success && <AlertBanner type="success" message={success} onDismiss={() => setSuccess('')} />}
      {error   && <AlertBanner type="error"   message={error}   onDismiss={() => setError(null)} />}

      <form onSubmit={handleSubmit} className="flex items-center space-x-3 pt-1">
        <NumberField
          id="capacity-input"
          min="1"
          max="100000"
          placeholder="New max capacity (meals)"
          value={newCapacity}
          onChange={e => setNewCapacity(e.target.value)}
          className="flex-1"
          style={{ marginBottom: 0 }}
        />
        <Button
          id="update-capacity-btn"
          type="submit"
          disabled={loading}
          loading={loading}
          loadingText="Setting…"
          variant="primary"
          size="sm"
          className="shrink-0"
        >
          Set Capacity
        </Button>
      </form>
    </div>
  );
};


const RequestCard = ({ request, onAccept, onDecline, actionLoading }) => {
  const donationTitle = request.donation_title || request.donation?.donation_title || `Donation #${request.donation_id}`;
  const quantity      = request.total_quantity || request.donation?.total_quantity;
  const unit          = request.quantity_unit  || request.donation?.quantity_unit;
  const address       = request.pickup_address || request.donation?.pickup_address || '';
  const city          = address ? address.split(',').slice(-2, -1)[0]?.trim() : '';
  const expiryTime    = request.expiry_time    || request.donation?.expiry_time;

  return (
    <GlareHover className="rounded-xl" duration={600} opacity={0.55}>
      <div className="bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 dark:text-[#748296] uppercase tracking-widest mb-1">
              Request #{request.request_id ?? request.id}
            </p>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#F5F7FA] leading-snug">{donationTitle}</h3>
          </div>
          <StatusBadge status={request.status ?? 'PENDING_NGO'} />
        </div>

        {expiryTime && (
          <div className="p-3 bg-slate-50 dark:bg-[#171E27] border border-slate-200 dark:border-[#26313D] rounded-xl">
            <ExpiryTimer expiryTime={expiryTime} showBar compact />
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-[#AAB4C2]">
          {quantity && (
            <span className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-[#F5F7FA]">
              <Boxes size={13} className="text-[#FF5A2F] shrink-0" />
              <span>{quantity}{unit ? ` ${unit.toLowerCase()}s` : ''}</span>
            </span>
          )}
          {city && (
            <span className="flex items-center space-x-1.5">
              <MapPin size={13} className="text-slate-400 shrink-0" />
              <span>{city}</span>
            </span>
          )}
          {request.created_at && (
            <span className="flex items-center space-x-1.5 text-slate-400 dark:text-[#7F8A99]">
              <Clock size={13} className="shrink-0" />
              <span>Received {formatShortDate(request.created_at)}</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <Button
            id={`accept-request-${request.request_id ?? request.id}`}
            onClick={() => onAccept(request.request_id ?? request.id)}
            disabled={actionLoading}
            loading={actionLoading}
            loadingText="Accepting…"
            variant="primary"
            size="sm"
            icon={CheckCircle2}
            className="flex-1"
          >
            Accept Request
          </Button>
          <Button
            id={`decline-request-${request.request_id ?? request.id}`}
            onClick={() => onDecline(request.request_id ?? request.id, donationTitle)}
            disabled={actionLoading}
            variant="secondary"
            size="sm"
            icon={XCircle}
            className="flex-1 text-slate-600 dark:text-[#A5B1C2] hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/30"
          >
            Decline
          </Button>
        </div>
      </div>
    </GlareHover>
  );
};

const HistoryRow = ({ request }) => {
  const donationTitle = request.donation_title || request.donation?.donation_title || `Donation #${request.donation_id}`;
  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-[#171E27] transition border-b border-slate-100 dark:border-[#26313D] last:border-0">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#F5F7FA] truncate">{donationTitle}</p>
        <p className="text-[11px] text-slate-400 dark:text-[#748296] mt-0.5 font-medium">{formatShortDate(request.updated_at || request.created_at)}</p>
      </div>
      <div className="ml-3 shrink-0">
        <StatusBadge status={request.status} />
      </div>
    </div>
  );
};

export const NgoDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [capacity, setCapacity] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError]       = useState(null);
  const [flash, setFlash]       = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null); // { id, title }
  const [declineReason, setDeclineReason] = useState('');
  const [declineError, setDeclineError]   = useState('');
  const [declineLoading, setDeclineLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && declineTarget && !declineLoading) {
        setDeclineTarget(null);
        setDeclineReason('');
        setDeclineError('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [declineTarget, declineLoading]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, capacityRes, requestsRes] = await Promise.all([
        ngoService.getProfile().catch(() => null),
        ngoService.getCapacity().catch(() => null),
        ngoService.listRequests().catch(() => null),
      ]);
      if (profileRes?.data) setProfile(profileRes.data.profile || profileRes.data);
      if (capacityRes?.data) setCapacity(capacityRes.data.capacities || capacityRes.data.capacity_records || capacityRes.data || []);
      if (requestsRes?.data) setRequests(requestsRes.data.requests || requestsRes.data || []);

    } catch (err) {
      setError(err.message || 'Failed to load NGO data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const pendingRequests = useMemo(
    () => requests.filter(r => ['PENDING', 'PENDING_NGO'].includes(r.status)),
    [requests]
  );
  const historyRequests = useMemo(
    () => requests.filter(r => !['PENDING', 'PENDING_NGO'].includes(r.status)),
    [requests]
  );

  const handleAccept = async (requestId) => {
    setActionLoading(true);
    setFlash(null);
    try {
      const res = await ngoService.acceptRequest(requestId);
      if (res.success || res.data) {
        setFlash({ type: 'success', message: `Request #${requestId} accepted. Volunteer dispatch notified.` });
        await fetchData();
      }
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Accept failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDecline = (requestId, title) => {
    setDeclineTarget({ id: requestId, title });
    setDeclineReason('');
    setDeclineError('');
  };

  const handleCloseDecline = () => {
    if (declineLoading) return;
    setDeclineTarget(null);
    setDeclineReason('');
    setDeclineError('');
  };

  const handleConfirmDecline = async (e) => {
    if (e) e.preventDefault();
    const trimmed = declineReason.trim();
    if (!trimmed) {
      setDeclineError('decline_reason must not be empty.');
      return;
    }
    if (trimmed.length > 1000) {
      setDeclineError('decline_reason must not exceed 1000 characters.');
      return;
    }

    setDeclineLoading(true);
    setDeclineError('');
    try {
      const res = await ngoService.declineRequest(declineTarget.id, trimmed);
      if (res && res.success !== false) {
        setFlash({ type: 'success', message: `Request #${declineTarget.id} declined.` });
        setDeclineTarget(null);
        setDeclineReason('');
        await fetchData();
      } else {
        setDeclineError(res?.error || 'Decline failed.');
      }
    } catch (err) {
      setDeclineError(err.message || 'Decline failed.');
    } finally {
      setDeclineLoading(false);
    }
  };

  const orgName = profile?.organisation_name || profile?.organization_name || user?.email?.split('@')[0] || 'NGO';

  if (loading) {
    return (
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-xl fb-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* Cloudhub Hero Banner */}
      <div className="fb-page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F5F7FA] tracking-tight">{orgName}</h1>
            <p className="text-sm text-slate-500 dark:text-[#A5B1C2] mt-1">
              Incoming food requests matched to your organisation.
            </p>
          </div>
          <Button
            onClick={fetchData}
            variant="icon"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            aria-label="Refresh requests"
            title="Refresh"
            className="shrink-0"
          />
        </div>
      </div>

      {/* Flash banners */}
      {flash && <AlertBanner type={flash.type} message={flash.message} onDismiss={() => setFlash(null)} />}
      {error && <AlertBanner type="error" message={error} />}

      {/* Capacity widget */}
      <CapacityWidget capacity={capacity} onUpdate={fetchData} />

      {/* Pending food requests */}
      <div className="space-y-3.5">
        <div className="flex items-center space-x-2.5">
          <Inbox size={16} className="text-[#FF5A2F] shrink-0" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-[#F5F7FA]">Incoming requests</h2>
          {pendingRequests.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-500/15 text-[#FF5A2F] border border-orange-200 dark:border-orange-500/30">
              {pendingRequests.length} pending
            </span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div className="fb-empty-state">
            <Inbox size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-[#F5F7FA]">No pending requests right now</p>
            <p className="text-xs text-slate-400 dark:text-[#7F8A99] mt-0.5 font-medium">Matched surplus food requests will appear here as donors submit offers.</p>
          </div>
        ) : (
          <AnimatedList
            items={pendingRequests}
            showGradients={false}
            displayScrollbar={false}
            renderItem={(r) => (
              <RequestCard
                request={r}
                onAccept={handleAccept}
                onDecline={handleOpenDecline}
                actionLoading={actionLoading}
              />
            )}
          />
        )}
      </div>

      {/* History */}
      {historyRequests.length > 0 && (
        <div className="fb-section-card overflow-hidden">
          <div className="fb-section-card-header bg-slate-50/70 dark:bg-[#171E27] border-b border-slate-100 dark:border-[#26313D] flex items-center">
            <History size={15} className="text-[#FF5A2F]" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#F5F7FA]">Request history</h2>
            <span className="text-xs text-slate-400 dark:text-[#7F8A99] font-semibold ml-auto">{historyRequests.length} records</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-[#242D38]">
            {historyRequests.map(r => (
              <HistoryRow key={r.request_id ?? r.id} request={r} />
            ))}
          </div>
        </div>
      )}

      {/* Decline Request Confirmation Dialog Modal */}
      {declineTarget && (
        <div
          id="decline-dialog-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !declineLoading) handleCloseDecline();
          }}
        >
          <div className="bg-white dark:bg-[#11171F] border border-slate-200 dark:border-[#26313D] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 id="decline-modal-title" className="text-base font-bold text-slate-900 dark:text-[#F5F7FA]">
                    Decline Donation Request
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#AAB4C2] mt-0.5 font-medium">
                    Request #{declineTarget.id} &bull; <span className="font-semibold text-slate-700 dark:text-[#D2DAE5]">{declineTarget.title}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDecline}
                disabled={declineLoading}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F7FA] p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#AAB4C2] leading-relaxed">
              Please enter the reason for declining this donation. This reason is required for audit transparency and will be recorded with the donation.
            </p>

            {/* Quick Reason Suggestions */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 dark:text-[#7F8A99] uppercase tracking-wider block">
                Quick Select:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Capacity full for today',
                  'Outside operating hours',
                  'Cannot handle perishable storage',
                  'Logistics / staff unavailable',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => {
                      setDeclineReason(reason);
                      setDeclineError('');
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-slate-100 dark:bg-[#1A232E] text-slate-700 dark:text-[#D2DAE5] hover:bg-orange-50 hover:text-[#FF5A2F] dark:hover:bg-orange-500/10 dark:hover:text-[#FF7A50] border border-slate-200/80 dark:border-[#26313D] transition-colors cursor-pointer"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea Form */}
            <form onSubmit={handleConfirmDecline} className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="decline-reason-input" className="font-bold text-slate-700 dark:text-[#D2DAE5]">
                    Decline Reason <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-[#7F8A99] tabular-nums">
                    {declineReason.length}/1000
                  </span>
                </div>
                <textarea
                  id="decline-reason-input"
                  rows={3}
                  maxLength={1000}
                  value={declineReason}
                  onChange={(e) => {
                    setDeclineReason(e.target.value);
                    if (declineError && e.target.value.trim()) {
                      setDeclineError('');
                    }
                  }}
                  placeholder="State the reason why your organisation cannot accept this request..."
                  className={`w-full p-3 rounded-xl border text-xs text-slate-900 dark:text-[#F5F7FA] bg-slate-50 dark:bg-[#171E27] focus:bg-white dark:focus:bg-[#11171F] focus:outline-none transition resize-none ${
                    declineError
                      ? 'border-red-400 dark:border-red-500/60 focus:ring-1 focus:ring-red-400'
                      : 'border-slate-200 dark:border-[#26313D] focus:border-[#FF5A2F] focus:ring-1 focus:ring-[#FF5A2F]'
                  }`}
                  disabled={declineLoading}
                  autoFocus
                />
                {declineError && (
                  <p id="decline-error-msg" className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center space-x-1 mt-1">
                    <AlertCircle size={13} className="shrink-0" />
                    <span>{declineError}</span>
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-[#26313D]">
                <Button
                  id="cancel-decline-btn"
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCloseDecline}
                  disabled={declineLoading}
                >
                  Cancel
                </Button>
                <Button
                  id="confirm-decline-btn"
                  type="submit"
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  loading={declineLoading}
                  loadingText="Declining…"
                  disabled={declineLoading}
                >
                  Confirm Decline
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default NgoDashboard;

