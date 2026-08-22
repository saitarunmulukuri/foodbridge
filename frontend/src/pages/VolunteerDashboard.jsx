/**
 * VolunteerDashboard — Volunteer Logistics Driver dashboard.
 * Authentic Cloudhub SaaS light design.
 */
import { useEffect, useState, useMemo } from 'react';
import { volunteerService } from '../services/volunteerService';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { ExpiryTimer } from '../components/common/ExpiryTimer';
import { AnimatedList } from '../components/common/AnimatedList';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Boxes,
  Clock,
  ShieldCheck,
  ShieldOff,
  History,
  ClipboardList,
  Navigation,
} from 'lucide-react';

const ACTIVE_STATUSES = new Set(['PENDING', 'ASSIGNED', 'ACCEPTED', 'PICKUP_IN_PROGRESS', 'IN_TRANSIT']);
const DONE_STATUSES   = new Set(['DELIVERED', 'COMPLETED', 'DECLINED', 'CANCELLED']);

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
        <button onClick={onDismiss} className="ml-3 opacity-60 hover:opacity-100 transition text-xs">✕</button>
      )}
    </div>
  );
};

const StatusToggle = ({ profile, onToggle, loading }) => {
  const isAvailable = profile?.operational_status === 'AVAILABLE';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${isAvailable ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
            {isAvailable ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              {isAvailable ? 'Available for Immediate Pickups' : 'Currently Offline'}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {profile?.vehicle_type ? `Vehicle: ${profile.vehicle_type}` : 'Set your driver availability'}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            id="status-available-btn"
            onClick={() => onToggle('AVAILABLE')}
            disabled={loading || isAvailable}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold ${isAvailable ? 'bg-emerald-600 text-white cursor-default' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}`}
          >
            {loading && isAvailable ? <RefreshCw size={13} className="animate-spin" /> : 'Available'}
          </button>
          <button
            id="status-offline-btn"
            onClick={() => onToggle('OFFLINE')}
            disabled={loading || !isAvailable}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold ${!isAvailable ? 'bg-slate-200 text-slate-600 cursor-default' : 'bg-white text-slate-500 hover:text-red-600 border border-slate-200'}`}
          >
            Offline
          </button>
        </div>
      </div>
    </div>
  );
};

const ActiveAssignmentCard = ({ assignment, onAccept, onDecline, onComplete, loading }) => {
  const donation     = assignment.donation || {};
  const title        = donation.donation_title || assignment.donation_title || `Assignment #${assignment.assignment_id}`;
  const address      = donation.pickup_address || assignment.pickup_address || '';
  const city         = address ? address.split(',').slice(-2, -1)[0]?.trim() : '';
  const totalQty     = donation.total_quantity || assignment.total_quantity;
  const unit         = donation.quantity_unit  || assignment.quantity_unit;
  const expiryTime   = donation.expiry_time    || assignment.expiry_time;
  const status       = assignment.status;
  const assignmentId = assignment.assignment_id || assignment.id;

  const isPending   = ['PENDING', 'ASSIGNED'].includes(status);
  const isAccepted  = ['ACCEPTED', 'PICKUP_IN_PROGRESS', 'IN_TRANSIT'].includes(status);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">
            {isPending ? 'Incoming Pickup Request' : 'Active Delivery Assignment'}
          </p>
          <h2 className="text-lg font-bold text-slate-900 leading-snug">{title}</h2>
        </div>
        <StatusBadge status={status} />
      </div>

      {expiryTime && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
          <ExpiryTimer expiryTime={expiryTime} showBar compact />
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {totalQty && (
          <span className="flex items-center space-x-1.5 font-bold text-slate-900">
            <Boxes size={14} className="text-[#FF553E] shrink-0" />
            <span>{totalQty}{unit ? ` ${unit.toLowerCase()}s` : ''}</span>
          </span>
        )}
        {city && (
          <span className="flex items-center space-x-1.5">
            <MapPin size={14} className="text-slate-400 shrink-0" />
            <span>{city}</span>
          </span>
        )}
        {assignment.created_at && (
          <span className="flex items-center space-x-1.5 text-slate-400">
            <Clock size={14} className="shrink-0" />
            <span>Assigned {formatShortDate(assignment.created_at)}</span>
          </span>
        )}
      </div>

      {address && (
        <div className="flex items-start space-x-2.5 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
          <Navigation size={15} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 leading-relaxed font-medium">{address}</p>
        </div>
      )}

      <div className="flex items-center space-x-3 pt-2">
        {isPending && (
          <>
            <button
              id={`accept-assignment-${assignmentId}`}
              onClick={() => onAccept(assignmentId)}
              disabled={loading}
              className="flex-1 fb-btn-primary py-2.5 text-xs"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              <span>Accept Pickup</span>
            </button>
            <button
              id={`decline-assignment-${assignmentId}`}
              onClick={() => onDecline(assignmentId)}
              disabled={loading}
              className="px-5 py-2.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 text-xs font-semibold"
            >
              Decline
            </button>
          </>
        )}
        {isAccepted && (
          <button
            id={`complete-delivery-${assignmentId}`}
            onClick={() => onComplete(assignmentId)}
            disabled={loading}
            className="flex-1 fb-btn-primary py-2.5 text-xs"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            <span>Mark as Delivered</span>
          </button>
        )}
      </div>
    </div>
  );
};

const AssignmentRow = ({ assignment }) => {
  const title = assignment.donation?.donation_title || assignment.donation_title || `Assignment #${assignment.assignment_id}`;
  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{formatShortDate(assignment.updated_at || assignment.created_at)}</p>
      </div>
      <div className="ml-3 shrink-0">
        <StatusBadge status={assignment.status} />
      </div>
    </div>
  );
};

export const VolunteerDashboard = () => {
  const { user } = useAuth();
  const [profile,     setProfile]     = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error,       setError]       = useState(null);
  const [flash,       setFlash]       = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, assignmentsRes] = await Promise.all([
        volunteerService.getProfile().catch(() => null),
        volunteerService.listAssignments().catch(() => null),
      ]);
      if (profileRes?.data) setProfile(profileRes.data.profile || profileRes.data);
      if (assignmentsRes?.data) setAssignments(assignmentsRes.data.assignments || assignmentsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load volunteer data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleStatus = async (newStatus) => {
    setActionLoading(true);
    setFlash(null);
    try {
      const lat = profile?.latitude  ?? 17.425;
      const lng = profile?.longitude ?? 78.415;
      await volunteerService.updateProfile({ operational_status: newStatus, latitude: lat, longitude: lng });
      setFlash({ type: 'success', message: `Status updated to ${newStatus === 'AVAILABLE' ? 'Available' : 'Offline'}.` });
      await fetchData();
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Status update failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (assignmentId) => {
    setActionLoading(true);
    setFlash(null);
    try {
      await volunteerService.acceptAssignment(assignmentId);
      setFlash({ type: 'success', message: 'Pickup accepted! Please proceed to pickup location.' });
      await fetchData();
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Accept failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (assignmentId) => {
    setActionLoading(true);
    setFlash(null);
    try {
      await volunteerService.declineAssignment(assignmentId, '');
      setFlash({ type: 'success', message: 'Assignment declined.' });
      await fetchData();
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Decline failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (assignmentId) => {
    setActionLoading(true);
    setFlash(null);
    try {
      await volunteerService.completeDelivery(assignmentId);
      setFlash({ type: 'success', message: 'Delivery marked as complete! Thank you.' });
      await fetchData();
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Complete failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const activeAssignments = useMemo(() => {
    const actives = assignments.filter(a => ACTIVE_STATUSES.has(a.status));
    return actives.sort((a, b) => new Date(a.created_at ?? 0) - new Date(b.created_at ?? 0));
  }, [assignments]);

  const historyAssignments = useMemo(
    () => assignments.filter(a => DONE_STATUSES.has(a.status)).slice(0, 10),
    [assignments]
  );

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Volunteer';

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

      {/* Volunteer Hero Banner */}
      <div className="fb-page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{displayName}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Pickups assigned to you, with addresses and quantities.
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

      {/* Flash / Error */}
      {flash && <AlertBanner type={flash.type} message={flash.message} onDismiss={() => setFlash(null)} />}
      {error && <AlertBanner type="error" message={error} />}

      {/* Status toggle */}
      <StatusToggle profile={profile} onToggle={handleToggleStatus} loading={actionLoading} />

      {/* Active assignments queue with AnimatedList */}
      {activeAssignments.length > 0 ? (
        <div className="space-y-3.5">
          <div className="flex items-center space-x-2.5">
            <ClipboardList size={16} className="text-blue-600 shrink-0" />
            <h2 className="text-sm font-semibold text-slate-800">Active assignments</h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
              {activeAssignments.length} active
            </span>
          </div>

          <AnimatedList
            items={activeAssignments}
            showGradients={false}
            displayScrollbar={false}
            renderItem={(assignment) => (
              <ActiveAssignmentCard
                assignment={assignment}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onComplete={handleComplete}
                loading={actionLoading}
              />
            )}
          />
        </div>
      ) : (
        <div className="fb-empty-state">
          <ClipboardList size={28} className="text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">No active assignments right now</p>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            {profile?.operational_status === 'AVAILABLE'
              ? 'You are available — pickup dispatches will appear here.'
              : 'Set your status to Available to receive pickup dispatches.'
            }
          </p>
        </div>
      )}

      {/* History */}
      {historyAssignments.length > 0 && (
        <div className="fb-section-card overflow-hidden bg-white border border-slate-200 shadow-sm">
          <div className="fb-section-card-header bg-slate-50/70 border-b border-slate-100 flex items-center">
            <History size={15} className="text-[#FF553E]" />
            <h2 className="text-sm font-semibold text-slate-900">Delivery history</h2>
            <span className="text-xs text-slate-400 font-semibold ml-auto">{historyAssignments.length} records</span>
          </div>
          <div className="divide-y divide-slate-100">
            {historyAssignments.map(a => (
              <AssignmentRow key={a.assignment_id ?? a.id} assignment={a} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
