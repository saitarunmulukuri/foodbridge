/**
 * VolunteerDashboard — Complete Volunteer Driver Experience.
 *
 * Features:
 *  • Large 3D truck hero (visual identity of the Volunteer Driver page)
 *  • Pickup → In Transit → Delivery logistics flow
 *  • Online / Offline status toggle (maps to operational_status: AVAILABLE / OFFLINE)
 *  • Available / Unavailable session toggle (local session preference)
 *  • Pending assignments: Accept / Reject + Accept All / Reject All (with confirmation)
 *  • Active delivery: progress tracker + state-appropriate actions
 *  • Completed deliveries history
 *  • Empty states per driver status
 *  • Reduced-motion support
 *  • Attribution: "Truck by Poly by Google" — Poly Pizza (CC-BY)
 *
 * All API calls use the existing volunteerService — no new backend endpoints.
 */

import { useEffect, useState, useMemo, useCallback, Fragment } from 'react';
import { volunteerService } from '../services/volunteerService';
import { useAuth } from '../contexts/AuthContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { ExpiryTimer } from '../components/common/ExpiryTimer';
import { Button } from '../components/common/Button';
import { TruckViewer } from '../components/volunteer/TruckViewer';
import { PendingAssignmentCard } from '../components/volunteer/PendingAssignmentCard';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Boxes,
  Clock,
  History,
  ClipboardList,
  Wifi,
  WifiOff,
  ShieldCheck,
  ShieldOff,
  Package,
  Truck,
  Home,
  ChevronRight,
  CheckCheck,
  XCircle,
  X,
  AlertTriangle,
} from 'lucide-react';

// ── Status sets ────────────────────────────────────────────────────────────────

const PENDING_STATUSES = new Set(['PENDING', 'ASSIGNED']);
const ACTIVE_STATUSES = new Set(['ACCEPTED', 'PICKUP_IN_PROGRESS', 'IN_TRANSIT']);
const DONE_STATUSES = new Set(['DELIVERED', 'COMPLETED', 'DECLINED', 'CANCELLED']);

// ── Delivery progress steps (visual only) ─────────────────────────────────────

const DELIVERY_STEPS = [
  { key: 'ASSIGNED', label: 'Assigned', Icon: ClipboardList },
  { key: 'ACCEPTED', label: 'Accepted', Icon: CheckCircle2 },
  { key: 'PICKUP_IN_PROGRESS', label: 'Picked Up', Icon: Package },
  { key: 'IN_TRANSIT', label: 'In Transit', Icon: Truck },
  { key: 'DELIVERED', label: 'Delivered', Icon: Home },
];

function getDeliveryStepIndex(status) {
  const map = {
    PENDING: 0, ASSIGNED: 0,
    ACCEPTED: 1,
    PICKUP_IN_PROGRESS: 2,
    IN_TRANSIT: 3,
    DELIVERED: 4, COMPLETED: 4,
  };
  return map[status] ?? 0;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatShortDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function useReducedMotion() {
  return useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const AlertBanner = ({ type, message, onDismiss }) => {
  const styles = {
    success: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-800 dark:text-emerald-300',
    error: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-800 dark:text-red-300',
  };
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-lg border text-xs font-medium ${styles[type] || styles.error}`}
      role="alert"
    >
      <div className="flex items-center space-x-2.5">
        <Icon size={14} className="shrink-0" />
        <span>{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-3 text-slate-400 hover:text-slate-700 dark:hover:text-[#F5F7FA] p-0.5 rounded transition-colors"
          aria-label="Dismiss notification"
        >
          <X size={14} className="shrink-0" />
        </button>
      )}
    </div>
  );
};

// ── Hero: Logistics flow indicator ───────────────────────────────────────────

// Journey stage definitions
const JOURNEY_STAGES = [
  { key: 'pickup',   label: 'Pickup',     Icon: Package },
  { key: 'transit',  label: 'In Transit', Icon: Truck   },
  { key: 'delivery', label: 'Delivery',   Icon: Home    },
];

/**
 * LogisticsFlow — shows Pickup → In Transit → Delivery progress.
 * activeStep: -1 idle, 0 pickup current, 1 transit current, 2 delivery current, 3 all done
 */
const LogisticsFlow = ({ activeStep = -1 }) => (
  <div className="vd-logistics-flow" aria-label="Delivery flow: Pickup, In Transit, Delivery">
    {JOURNEY_STAGES.map((stage, idx) => {
      const isDone     = activeStep > idx;
      const isCurrent  = activeStep === idx;
      return (
        <Fragment key={stage.key}>
          <div
            className={`vd-flow-step${isCurrent ? ' vd-flow-step--active' : isDone ? ' vd-flow-step--done' : ''}`}
          >
            {isDone
              ? <CheckCircle2 size={15} className="vd-flow-step-icon vd-flow-step-icon--done" aria-hidden="true" />
              : <stage.Icon   size={15} className={`vd-flow-step-icon${isCurrent ? ' vd-flow-step-icon--active' : ''}`} aria-hidden="true" />
            }
            <span>{stage.label}</span>
          </div>
          {idx < JOURNEY_STAGES.length - 1 && (
            <ChevronRight
              size={13}
              className={`vd-flow-arrow${isDone ? ' vd-flow-arrow--done' : ''}`}
              aria-hidden="true"
            />
          )}
        </Fragment>
      );
    })}
  </div>
);

// ── Driver Status Controls ─────────────────────────────────────────────────────

const DriverStatusControls = ({ isOnline, isAvailable, onToggleOnline, onToggleAvailable, loading }) => (
  <div className="vd-status-controls">
    {/* Online / Offline */}
    <div className="vd-status-group">
      <p className="vd-status-group-label">Connection</p>
      <div className="vd-pill-group" role="group" aria-label="Online or Offline status">
        <button
          id="status-online-btn"
          className={`vd-pill ${isOnline ? 'vd-pill--online' : ''}`}
          onClick={() => !isOnline && onToggleOnline(true)}
          disabled={loading || isOnline}
          aria-pressed={isOnline}
        >
          <Wifi size={13} aria-hidden="true" />
          Online
          {isOnline && <span className="vd-pill-dot vd-pill-dot--green" aria-hidden="true" />}
        </button>
        <button
          id="status-offline-btn"
          className={`vd-pill ${!isOnline ? 'vd-pill--offline' : ''}`}
          onClick={() => isOnline && onToggleOnline(false)}
          disabled={loading || !isOnline}
          aria-pressed={!isOnline}
        >
          <WifiOff size={13} aria-hidden="true" />
          Offline
          {!isOnline && <span className="vd-pill-dot vd-pill-dot--gray" aria-hidden="true" />}
        </button>
      </div>
    </div>

    <div className="vd-status-divider" aria-hidden="true" />

    {/* Available / Unavailable */}
    <div className="vd-status-group">
      <p className="vd-status-group-label">
        Availability
        <span className="vd-status-session-tag">Session</span>
      </p>
      <div className="vd-pill-group" role="group" aria-label="Availability status">
        <button
          id="status-available-btn"
          className={`vd-pill ${isAvailable ? 'vd-pill--available' : ''}`}
          onClick={() => !isAvailable && onToggleAvailable(true)}
          disabled={!isOnline}
          aria-pressed={isAvailable}
          title={!isOnline ? 'Go online to set availability' : undefined}
        >
          <ShieldCheck size={13} aria-hidden="true" />
          Available
        </button>
        <button
          id="status-unavailable-btn"
          className={`vd-pill ${!isAvailable ? 'vd-pill--unavailable' : ''}`}
          onClick={() => isAvailable && onToggleAvailable(false)}
          disabled={!isOnline}
          aria-pressed={!isAvailable}
          title={!isOnline ? 'Go online to set availability' : undefined}
        >
          <ShieldOff size={13} aria-hidden="true" />
          Unavailable
        </button>
      </div>
    </div>
  </div>
);


// ── Active Delivery Card ───────────────────────────────────────────────────────

const ActiveDeliveryCard = ({ assignment, onComplete, loading }) => {
  const donation = assignment.donation || {};
  const title = donation.donation_title || assignment.donation_title || `Assignment #${assignment.assignment_id || assignment.id}`;
  const address = donation.pickup_address || assignment.pickup_address || '';
  const totalQty = donation.total_quantity || assignment.total_quantity;
  const unit = donation.quantity_unit || assignment.quantity_unit;
  const expiryTime = donation.expiry_time || assignment.expiry_time;
  const status = assignment.status;
  const assignmentId = assignment.assignment_id || assignment.id;
  const stepIndex = getDeliveryStepIndex(status);

  const canComplete = ACTIVE_STATUSES.has(status);

  return (
    <div className="vd-active-card">
      <div className="vd-active-card-header">
        <div>
          <p className="vd-active-card-eyebrow">Active Delivery</p>
          <h3 className="vd-active-card-title">{title}</h3>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Progress track */}
      <div className="vd-progress-track" role="list" aria-label="Delivery progress">
        {DELIVERY_STEPS.map((step, idx) => {
          const isCompleted = idx < stepIndex;
          const isCurrent = idx === stepIndex;
          return (
            <div key={step.key} className="vd-progress-step" role="listitem">
              <div
                className={`vd-progress-dot ${isCompleted ? 'vd-progress-dot--done' :
                    isCurrent ? 'vd-progress-dot--current' :
                      'vd-progress-dot--pending'
                  }`}
                aria-label={`${step.label}: ${isCompleted ? 'complete' : isCurrent ? 'current' : 'upcoming'}`}
              >
                {isCompleted
                  ? <CheckCircle2 size={14} aria-hidden="true" />
                  : <step.Icon size={13} aria-hidden="true" />
                }
              </div>
              <span className={`vd-progress-label ${isCurrent ? 'vd-progress-label--current' : ''}`}>
                {step.label}
              </span>
              {idx < DELIVERY_STEPS.length - 1 && (
                <div
                  className={`vd-progress-connector ${idx < stepIndex ? 'vd-progress-connector--done' : ''}`}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Assignment details */}
      <div className="vd-active-card-details">
        {totalQty && (
          <div className="vd-active-detail-item">
            <Boxes size={14} className="text-[#FF5A2F]" aria-hidden="true" />
            <span>{totalQty}{unit ? ` ${unit.toLowerCase()}s` : ''}</span>
          </div>
        )}
        {address && (
          <div className="vd-active-detail-item">
            <MapPin size={14} className="text-slate-400" aria-hidden="true" />
            <span>{address}</span>
          </div>
        )}
        {expiryTime && (
          <div className="vd-active-detail-item">
            <Clock size={14} className="text-slate-400" aria-hidden="true" />
            <ExpiryTimer expiryTime={expiryTime} compact />
          </div>
        )}
      </div>

      {canComplete && (
        <div className="mt-4">
          <Button
            id={`complete-${assignmentId}`}
            onClick={() => onComplete(assignmentId)}
            disabled={loading}
            loading={loading}
            loadingText="Marking delivered…"
            variant="primary"
            size="md"
            icon={CheckCircle2}
            fullWidth
          >
            Mark as Delivered
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Completed Assignment Row ───────────────────────────────────────────────────

const CompletedRow = ({ assignment }) => {
  const title = assignment.donation?.donation_title || assignment.donation_title || `Assignment #${assignment.assignment_id || assignment.id}`;
  return (
    <div className="vd-history-row">
      <div>
        <p className="vd-history-title">{title}</p>
        <p className="vd-history-date">{formatShortDate(assignment.updated_at || assignment.created_at)}</p>
      </div>
      <StatusBadge status={assignment.status} />
    </div>
  );
};

// ── Reject All Confirmation Dialog ────────────────────────────────────────────

const RejectAllConfirm = ({ count, onConfirm, onCancel, loading }) => (
  <div className="vd-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="reject-all-title">
    <div className="vd-confirm-box">
      <div className="vd-confirm-icon" aria-hidden="true">
        <AlertTriangle size={22} className="text-red-500" />
      </div>
      <h3 id="reject-all-title" className="vd-confirm-title">Reject all {count} assignments?</h3>
      <p className="vd-confirm-body">
        This will decline all {count} pending assignments. Each rejection will be sent to the server. This action cannot be undone.
      </p>
      <div className="vd-confirm-actions">
        <Button
          id="reject-all-confirm-btn"
          onClick={onConfirm}
          disabled={loading}
          loading={loading}
          loadingText="Rejecting…"
          variant="danger"
          size="sm"
          icon={XCircle}
        >
          Yes, Reject All
        </Button>
        <Button
          id="reject-all-cancel-btn"
          onClick={onCancel}
          disabled={loading}
          variant="secondary"
          size="sm"
        >
          Cancel
        </Button>
      </div>
    </div>
  </div>
);

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export const VolunteerDashboard = () => {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [flash, setFlash] = useState(null);

  // Local session preference — not persisted to backend (no endpoint for it)
  // Defaults to true when online, so driver is ready to receive assignments.
  const [isAvailableLocal, setIsAvailableLocal] = useState(true);

  // Reject All confirmation state
  const [showRejectAllConfirm, setShowRejectAllConfirm] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-dismiss flash after 5 seconds
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  // ── Computed values ────────────────────────────────────────────────────────

  const isOnline = profile?.operational_status === 'AVAILABLE';

  const pendingAssignments = useMemo(
    () => assignments.filter(a => PENDING_STATUSES.has(a.status))
      .sort((a, b) => new Date(a.created_at ?? 0) - new Date(b.created_at ?? 0)),
    [assignments]
  );

  const activeAssignments = useMemo(
    () => assignments.filter(a => ACTIVE_STATUSES.has(a.status))
      .sort((a, b) => new Date(a.created_at ?? 0) - new Date(b.created_at ?? 0)),
    [assignments]
  );

  const historyAssignments = useMemo(
    () => assignments.filter(a => DONE_STATUSES.has(a.status)).slice(0, 12),
    [assignments]
  );

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Volunteer';

  // deliveryState drives TruckViewer animation and in-transit badge
  const deliveryState = activeAssignments.some(a => a.status === 'IN_TRANSIT') ? 'transit' : 'idle';

  // journeyStep: -1=idle, 0=pickup current, 1=transit current, 2=delivery current, 3=all done
  const journeyStep = useMemo(() => {
    if (activeAssignments.length === 0) return -1;
    const s = activeAssignments[0]?.status;
    if (s === 'ACCEPTED')           return 0; // Pickup phase
    if (s === 'PICKUP_IN_PROGRESS') return 1; // Transit phase
    if (s === 'IN_TRANSIT')         return 1; // Transit phase
    if (s === 'DELIVERED')          return 3;
    if (s === 'COMPLETED')          return 3;
    return -1;
  }, [activeAssignments]);

  // ── Action handlers ────────────────────────────────────────────────────────

  const handleToggleOnline = useCallback(async (goOnline) => {
    setActionLoading(true);
    setFlash(null);
    const newStatus = goOnline ? 'AVAILABLE' : 'OFFLINE';
    try {
      const lat = profile?.latitude ?? 17.425;
      const lng = profile?.longitude ?? 78.415;
      await volunteerService.updateProfile({ operational_status: newStatus, latitude: lat, longitude: lng });
      setFlash({ type: 'success', message: `You are now ${goOnline ? 'online and ready for assignments' : 'offline'}.` });
      if (!goOnline) setIsAvailableLocal(true); // reset availability when going offline
      await fetchData();
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Status update failed.' });
    } finally {
      setActionLoading(false);
    }
  }, [profile, fetchData]);

  const handleAccept = useCallback(async (assignmentId) => {
    setActionLoading(true);
    setFlash(null);
    try {
      await volunteerService.acceptAssignment(assignmentId);
      setFlash({ type: 'success', message: 'Assignment accepted. Proceed to pickup location.' });
      await fetchData();
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Accept failed.' });
    } finally {
      setActionLoading(false);
    }
  }, [fetchData]);

  const handleDecline = useCallback(async (assignmentId) => {
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
  }, [fetchData]);

  const handleComplete = useCallback(async (assignmentId) => {
    setActionLoading(true);
    setFlash(null);
    try {
      await volunteerService.completeDelivery(assignmentId);
      setFlash({ type: 'success', message: 'Delivery complete. Thank you for helping!' });
      await fetchData();
    } catch (err) {
      setFlash({ type: 'error', message: err.message || 'Could not mark as delivered.' });
    } finally {
      setActionLoading(false);
    }
  }, [fetchData]);

  // ── Bulk actions (sequential individual API calls — no bulk endpoint exists) ─

  const handleAcceptAll = useCallback(async () => {
    if (pendingAssignments.length === 0) return;
    setActionLoading(true);
    setFlash(null);
    let accepted = 0;
    let failed = 0;
    for (const a of pendingAssignments) {
      const id = a.assignment_id || a.id;
      try {
        await volunteerService.acceptAssignment(id);
        accepted++;
      } catch {
        failed++;
      }
    }
    setFlash({
      type: failed === 0 ? 'success' : 'error',
      message: failed === 0
        ? `Accepted all ${accepted} assignments.`
        : `Accepted ${accepted}, failed ${failed}. Check your connection.`,
    });
    setActionLoading(false);
    await fetchData();
  }, [pendingAssignments, fetchData]);

  const handleRejectAllConfirmed = useCallback(async () => {
    setShowRejectAllConfirm(false);
    setActionLoading(true);
    setFlash(null);
    let declined = 0;
    let failed = 0;
    for (const a of pendingAssignments) {
      const id = a.assignment_id || a.id;
      try {
        await volunteerService.declineAssignment(id, '');
        declined++;
      } catch {
        failed++;
      }
    }
    setFlash({
      type: failed === 0 ? 'success' : 'error',
      message: failed === 0
        ? `Rejected all ${declined} assignments.`
        : `Declined ${declined}, failed ${failed}.`,
    });
    setActionLoading(false);
    await fetchData();
  }, [pendingAssignments, fetchData]);

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="vd-root">
        <div className="vd-hero vd-hero--skeleton">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-3 fb-skeleton" />
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded mb-2 fb-skeleton" />
          <div className="h-4 w-52 bg-slate-200 dark:bg-slate-700 rounded fb-skeleton" />
          <div className="vd-truck-canvas-wrapper vd-truck-canvas-wrapper--skeleton fb-skeleton mt-6" />
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="vd-root animate-fade-in-up">

      {/* ── Reject All Confirmation ── */}
      {showRejectAllConfirm && (
        <RejectAllConfirm
          count={pendingAssignments.length}
          onConfirm={handleRejectAllConfirmed}
          onCancel={() => setShowRejectAllConfirm(false)}
          loading={actionLoading}
        />
      )}

      {/* ══════════════════════════════════════════════
          HERO — Identity + Controls + 3D Truck + Journey
      ══════════════════════════════════════════════ */}
      <section className="vd-hero" aria-label="Volunteer Driver hero">

        {/* Identity */}
        <div className="vd-hero-identity">
          <span className="vd-hero-role">Volunteer Driver</span>

          <div className="vd-hero-name-row">
            <h1 className="vd-hero-name">{displayName}</h1>
            <span
              className={`vd-hero-status-dot ${isOnline ? 'vd-hero-status-dot--online' : 'vd-hero-status-dot--offline'}`}
              title={isOnline ? 'Online' : 'Offline'}
              aria-label={isOnline ? 'Currently online' : 'Currently offline'}
            />
            <span className={`vd-hero-status-text ${isOnline ? 'vd-hero-status-text--online' : 'vd-hero-status-text--offline'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <p className="vd-hero-tagline">
            {isOnline && isAvailableLocal
              ? 'Ready for your next delivery?'
              : isOnline
                ? 'You are online but marked unavailable.'
                : 'Go online when you\'re ready to deliver.'}
          </p>

          {/* In-Transit indicator — only when actively moving a delivery */}
          {deliveryState === 'transit' && (
            <div className="vd-transit-badge" role="status" aria-live="polite">
              <span className="vd-transit-badge-dot" aria-hidden="true" />
              In Transit
            </div>
          )}
        </div>

        {/* Status + Availability controls — inline in hero, above truck */}
        <div className="vd-hero-controls">
          <DriverStatusControls
            isOnline={isOnline}
            isAvailable={isAvailableLocal}
            onToggleOnline={handleToggleOnline}
            onToggleAvailable={setIsAvailableLocal}
            loading={actionLoading}
          />
        </div>

        {/* 3D Truck — the visual identity */}
        <div className="vd-truck-section">
          <TruckViewer reducedMotion={prefersReducedMotion} deliveryState={deliveryState} />
        </div>

        {/* Logistics flow */}
        <LogisticsFlow activeStep={journeyStep} />

      </section>

{/* ══════════════════════════════════════════════
          FLASH / ERROR
      ══════════════════════════════════════════════ */}
      {flash && (
        <AlertBanner
          type={flash.type}
          message={flash.message}
          onDismiss={() => setFlash(null)}
        />
      )}
      {error && <AlertBanner type="error" message={error} />}

      {/* ── Refresh ── */}
      <div className="vd-refresh-row">
        <Button
          onClick={fetchData}
          variant="icon"
          size="sm"
          icon={RefreshCw}
          loading={loading}
          aria-label="Refresh assignments"
          title="Refresh"
        />
      </div>

      {/* ══════════════════════════════════════════════
          PENDING ASSIGNMENTS
      ══════════════════════════════════════════════ */}
      <section className="vd-section" aria-label="Pending assignments">
        <div className="vd-section-header">
          <div>
            <div className="vd-section-title-row">
              <ClipboardList size={16} className="text-[#FF5A2F]" aria-hidden="true" />
              <h2 className="vd-section-title">Pending Assignments</h2>
              {pendingAssignments.length > 0 && (
                <span className="vd-count-badge">{pendingAssignments.length} pending</span>
              )}
            </div>
            <p className="vd-section-subtitle">Nearby donation opportunities ready for pickup.</p>
          </div>

          {/* Bulk actions — only when multiple pending */}
          {pendingAssignments.length > 1 && (
            <div className="vd-bulk-actions">
              <Button
                id="accept-all-btn"
                onClick={handleAcceptAll}
                disabled={actionLoading}
                loading={actionLoading}
                loadingText="Accepting…"
                variant="primary"
                size="sm"
                icon={CheckCheck}
              >
                Accept All
              </Button>
              <Button
                id="reject-all-btn"
                onClick={() => setShowRejectAllConfirm(true)}
                disabled={actionLoading}
                variant="danger"
                size="sm"
                icon={XCircle}
              >
                Reject All
              </Button>
            </div>
          )}
        </div>

        {error ? (
          <div className="vd-empty-state">
            <AlertCircle size={28} className="vd-empty-icon text-red-500" aria-hidden="true" />
            <p className="vd-empty-title">Unable to load assignments</p>
            <p className="vd-empty-body">{error}</p>
            <Button
              onClick={fetchData}
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        ) : pendingAssignments.length > 0 ? (
          <div className="vd-assignment-grid">
            {pendingAssignments.map(a => (
              <PendingAssignmentCard
                key={a.assignment_id ?? a.id}
                assignment={a}
                onAccept={handleAccept}
                onDecline={handleDecline}
                loading={actionLoading}
              />
            ))}
          </div>
        ) : (
          <div className="vd-empty-state">
            {!isOnline ? (
              <>
                <WifiOff size={28} className="vd-empty-icon" aria-hidden="true" />
                <p className="vd-empty-title">You&apos;re currently offline.</p>
                <p className="vd-empty-body">Go online when you&apos;re ready to receive delivery assignments.</p>
              </>
            ) : !isAvailableLocal ? (
              <>
                <ShieldOff size={28} className="vd-empty-icon" aria-hidden="true" />
                <p className="vd-empty-title">You&apos;re currently unavailable.</p>
                <p className="vd-empty-body">Set yourself as Available to accept incoming assignments.</p>
              </>
            ) : (
              <>
                <ClipboardList size={28} className="vd-empty-icon" aria-hidden="true" />
                <p className="vd-empty-title">No pending assignments</p>
                <p className="vd-empty-body">You&apos;re all caught up. New delivery opportunities will appear here.</p>
              </>
            )}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════
          ACTIVE DELIVERY
      ══════════════════════════════════════════════ */}
      {activeAssignments.length > 0 && (
        <section className="vd-section" aria-label="Active delivery">
          <div className="vd-section-header">
            <div className="vd-section-title-row">
              <Truck size={16} className="text-[#FF5A2F]" aria-hidden="true" />
              <h2 className="vd-section-title">Active Delivery</h2>
              <span className="vd-count-badge vd-count-badge--active">{activeAssignments.length}</span>
            </div>
          </div>
          <div className="vd-active-list">
            {activeAssignments.map(a => (
              <ActiveDeliveryCard
                key={a.assignment_id ?? a.id}
                assignment={a}
                onComplete={handleComplete}
                loading={actionLoading}
              />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          COMPLETED DELIVERIES
      ══════════════════════════════════════════════ */}
      {historyAssignments.length > 0 && (
        <section className="vd-section" aria-label="Delivery history">
          <div className="vd-section-header">
            <div className="vd-section-title-row">
              <History size={16} className="text-slate-400" aria-hidden="true" />
              <h2 className="vd-section-title">Completed Deliveries</h2>
              <span className="vd-count-badge vd-count-badge--muted">{historyAssignments.length}</span>
            </div>
          </div>
          <div className="vd-history-list">
            {historyAssignments.map(a => (
              <CompletedRow key={a.assignment_id ?? a.id} assignment={a} />
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════
          ATTRIBUTION (CC-BY required)
      ══════════════════════════════════════════════ */}
      <footer className="vd-attribution" aria-label="3D model attribution">
        <p>
          3D truck model:{' '}
          <a
            href="https://poly.pizza/m/truck-poly-by-google"
            target="_blank"
            rel="noopener noreferrer"
            className="vd-attribution-link"
          >
            Truck by Poly by Google
          </a>
          {' '}via{' '}
          <a
            href="https://poly.pizza"
            target="_blank"
            rel="noopener noreferrer"
            className="vd-attribution-link"
          >
            Poly Pizza
          </a>
          {' '}·{' '}
          <a
            href="https://creativecommons.org/licenses/by/3.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="vd-attribution-link"
          >
            CC-BY
          </a>
        </p>
      </footer>

    </div>
  );
};

export default VolunteerDashboard;
