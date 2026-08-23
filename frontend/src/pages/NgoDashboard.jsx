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
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
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
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50 border-red-200 text-red-800',
  };
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-md border text-xs font-medium ${styles[type] || styles.error}`}>
      <div className="flex items-center space-x-2.5">
        <Icon size={15} className="shrink-0" />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-slate-400 hover:text-slate-700 ml-2">
          &times;
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

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const todayRecord = Array.isArray(capacity)
    ? capacity.find(c => c.day_of_week === todayName) || capacity[0]
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const val = parseInt(newCapacity, 10);
    if (!val || val < 1) { setError('Enter a valid capacity.'); return; }
    setLoading(true);
    setError(null);
    setSuccess('');
    try {
      const res = await ngoService.updateCapacity(todayName, val);
      if (res.success || res.data) {
        setSuccess(`Capacity set to ${val} meals for today.`);
        setNewCapacity('');
        onUpdate();
      }
    } catch (err) {
      setError(err.message || 'Update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
          <Sliders size={18} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">Meal Capacity Management</h2>
          <p className="text-xs text-slate-500 font-medium">Today: {todayName.charAt(0) + todayName.slice(1).toLowerCase()}</p>
        </div>
        {todayRecord && (
          <div className="ml-auto text-right">
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{todayRecord.maximum_capacity ?? '—'}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">current max meals</p>
          </div>
        )}
      </div>

      {success && <AlertBanner type="success" message={success} onDismiss={() => setSuccess('')} />}
      {error   && <AlertBanner type="error"   message={error}   onDismiss={() => setError(null)} />}

      <form onSubmit={handleSubmit} className="flex items-center space-x-3 pt-1">
        <NumberField
          id="capacity-input"
          min="1"
          max="10000"
          placeholder="New max capacity (meals)"
          value={newCapacity}
          onChange={e => setNewCapacity(e.target.value)}
          className="flex-1"
          style={{ marginBottom: 0 }}
        />
        <button
          id="update-capacity-btn"
          type="submit"
          disabled={loading}
          className="fb-btn-primary py-2 px-5 text-xs shrink-0"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : 'Set Capacity'}
        </button>
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
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Request #{request.request_id ?? request.id}
          </p>
          <h3 className="text-base font-bold text-slate-900 leading-snug">{donationTitle}</h3>
        </div>
        <StatusBadge status={request.status ?? 'PENDING_NGO'} />
      </div>

      {expiryTime && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
          <ExpiryTimer expiryTime={expiryTime} showBar compact />
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {quantity && (
          <span className="flex items-center space-x-1.5 font-bold text-slate-800">
            <Boxes size={13} className="text-[#FF553E] shrink-0" />
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
          <span className="flex items-center space-x-1.5 text-slate-400">
            <Clock size={13} className="shrink-0" />
            <span>Received {formatShortDate(request.created_at)}</span>
          </span>
        )}
      </div>

      <div className="flex items-center space-x-3 pt-2">
        <button
          id={`accept-request-${request.request_id ?? request.id}`}
          onClick={() => onAccept(request.request_id ?? request.id)}
          disabled={actionLoading}
          className="flex-1 fb-btn-primary py-2.5 text-xs"
        >
          {actionLoading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          <span>Accept Request</span>
        </button>
        <button
          id={`decline-request-${request.request_id ?? request.id}`}
          onClick={() => onDecline(request.request_id ?? request.id)}
          disabled={actionLoading}
          className="flex-1 fb-btn-secondary py-2.5 text-xs text-slate-600 hover:text-red-600 hover:border-red-200 font-semibold"
        >
          <XCircle size={14} />
          <span>Decline</span>
        </button>
      </div>
    </div>
  );
};

const HistoryRow = ({ request }) => {
  const donationTitle = request.donation_title || request.donation?.donation_title || `Donation #${request.donation_id}`;
  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{donationTitle}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{formatShortDate(request.updated_at || request.created_at)}</p>
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
      if (capacityRes?.data) setCapacity(capacityRes.data.capacity_records || capacityRes.data || []);
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

  const handleDecline = async (requestId) => {
    setActionLoading(true);
    setFlash(null);
    try {
      const res = await ngoService.declineRequest(requestId, '');
      if (res.success || res.data) {
        setFlash({ type: 'success', message: `Request #${requestId} declined.` });
        await fetchData();
      }
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Decline failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const orgName = profile?.organisation_name || profile?.organization_name || user?.email?.split('@')[0] || 'NGO';

  if (loading) {
    return (
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-white border border-slate-200 rounded-lg fb-skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-5xl mx-auto">

      {/* Cloudhub Hero Banner */}
      <div className="fb-page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{orgName}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Incoming food requests matched to your organisation.
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-slate-900 shrink-0"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>
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
          <h2 className="text-sm font-semibold text-slate-800">Incoming requests</h2>
          {pendingRequests.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-[#FF5A2F] border border-orange-200">
              {pendingRequests.length} pending
            </span>
          )}
        </div>

        {pendingRequests.length === 0 ? (
          <div className="fb-empty-state">
            <Inbox size={28} className="text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No pending requests right now</p>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Matched surplus food requests will appear here as donors submit offers.</p>
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
                onDecline={handleDecline}
                actionLoading={actionLoading}
              />
            )}
          />
        )}
      </div>

      {/* History */}
      {historyRequests.length > 0 && (
        <div className="fb-section-card overflow-hidden bg-white border border-slate-200 shadow-sm">
          <div className="fb-section-card-header bg-slate-50/70 border-b border-slate-100 flex items-center">
            <History size={15} className="text-[#FF553E]" />
            <h2 className="text-sm font-semibold text-slate-900">Request history</h2>
            <span className="text-xs text-slate-400 font-semibold ml-auto">{historyRequests.length} records</span>
          </div>
          <div className="divide-y divide-slate-100">
            {historyRequests.map(r => (
              <HistoryRow key={r.request_id ?? r.id} request={r} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default NgoDashboard;

