/**
 * donationStatuses.js
 *
 * Single source of truth for donation status classification.
 * Derived STRICTLY from backend DonationStatus enum in
 * backend/shared/constants/enums.py
 *
 * Backend DonationStatus values:
 *   DRAFT, SUBMITTED, PENDING_NGO, NGO_ACCEPTED, VOLUNTEER_PENDING,
 *   PICKUP_IN_PROGRESS, DELIVERED, COMPLETED, EXPIRED, CANCELLED
 *
 * IMPORTANT: Do NOT add statuses that don't exist in the backend enum.
 * Previously invented statuses ACCEPTED, ASSIGNED, IN_TRANSIT, DECLINED
 * have been removed.
 */

/**
 * Donation is in progress — matched or being fulfilled.
 * Used for "In Progress" counts, expiry urgency, journey active state.
 */
export const IN_PROGRESS_STATUSES = new Set([
  'SUBMITTED',
  'PENDING_NGO',
  'NGO_ACCEPTED',
  'VOLUNTEER_PENDING',
  'PICKUP_IN_PROGRESS',
]);

/**
 * Donation has been successfully completed.
 */
export const COMPLETED_STATUSES = new Set([
  'DELIVERED',
  'COMPLETED',
]);

/**
 * Donation has ended without completion (terminal, no further action).
 */
export const TERMINAL_STATUSES = new Set([
  'EXPIRED',
  'CANCELLED',
]);

/**
 * All non-draft, non-terminal statuses — donation is "live" in the network.
 */
export const ACTIVE_STATUSES = new Set([
  ...IN_PROGRESS_STATUSES,
]);

/**
 * Statuses where showing an expiry countdown makes sense.
 * (Donation is live and hasn't yet been matched to completion.)
 */
export const EXPIRY_COUNTDOWN_STATUSES = new Set([
  'SUBMITTED',
  'PENDING_NGO',
  'NGO_ACCEPTED',
  'VOLUNTEER_PENDING',
  'PICKUP_IN_PROGRESS',
]);

/**
 * Determine the derived presentation state of a donation.
 * Uses both status AND expiry time for correct display.
 */
export function resolveDonationState(donation) {
  const status = donation?.status;
  if (!status) return { isActive: false, isCompleted: false, isTerminal: false, isExpired: false, isDraft: true };

  const now = Date.now();
  const expiryMs = donation.expiry_time ? new Date(donation.expiry_time).getTime() : null;
  const pastExpiry = expiryMs !== null && expiryMs < now;

  const isTerminal = TERMINAL_STATUSES.has(status);
  const isCompleted = COMPLETED_STATUSES.has(status);
  const isDraft = status === 'DRAFT';

  // A donation whose expiry has passed but backend hasn't updated status yet
  const isExpiredInFlight = ACTIVE_STATUSES.has(status) && pastExpiry;

  // "Active" = in flight and not past expiry
  const isActive = ACTIVE_STATUSES.has(status) && !pastExpiry;

  // Show expiry countdown only when active and not past expiry
  const showExpiry = isActive && expiryMs !== null;

  return {
    isDraft,
    isActive,
    isCompleted,
    isTerminal,
    isExpiredInFlight,
    isExpired: isTerminal || isExpiredInFlight,
    showExpiry,
  };
}
