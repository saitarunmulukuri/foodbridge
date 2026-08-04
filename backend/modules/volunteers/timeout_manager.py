"""Volunteer Assignment Timeout Manager — Sprint 5.0.

Responsibility:
    Run a database sweep to find VolunteerAssignment records whose
    ``response_deadline`` has passed and ``status`` is still PENDING.

    For each expired assignment:

    1.  Idempotency guard: re-check status inside the transaction.
    2.  Mark assignment TIMED_OUT, record timestamp and audit reason.
    3.  Append AssignmentHistory audit record.
    4.  Attempt fallback to the next volunteer candidate:
        a.  Prefer the next already-ranked assignment for the same NGO request
            (same dispatch batch, different rank) — avoids re-querying the DB.
        b.  If no pre-ranked candidates remain, re-run CandidateVolunteerFinder
            to find currently-available volunteers (avoids stale batches, but
            only as a last resort).
    5.  If a next candidate exists: create a new VolunteerAssignment + Notification.
    6.  If no candidates remain: create a SYSTEM notification for the NGO/admin.
    7.  Commit the entire unit of work as one atomic transaction.
    8.  On any failure: rollback and log; do NOT crash the scheduler.

Design decisions:
    - Re-using pre-ranked candidates first (from existing PENDING/TIMED_OUT
      assignment rows with higher ranks in the same request) mirrors how the
      NGO timeout manager re-uses the ranking_snapshot. This avoids redundant
      DB queries and produces consistent ordering.
    - CandidateVolunteerFinder re-query is a fallback: it fires only when the
      pre-ranked list is exhausted — handles the case where volunteers came
      online since the original dispatch.
    - Metrics hooks are module-level counters, ready for Prometheus/StatsD.
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.database import db
from backend.modules.donations.models import Donation, DonationStatusHistory
from backend.modules.ngos.models import NGO, NGORequest
from backend.modules.notifications.models import Notification
from backend.modules.volunteers.assignment_engine import VolunteerAssignmentEngine
from backend.modules.volunteers.candidate_finder import CandidateVolunteerFinder
from backend.modules.volunteers.models import (
    AssignmentHistory,
    Volunteer,
    VolunteerAssignment,
)
from backend.shared.constants.enums import (
    AssignmentStatus,
    DeliveryChannel,
    NotificationType,
    OperationalStatus,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level metrics counters (extension point for Prometheus / StatsD)
# ---------------------------------------------------------------------------
_metrics: Dict[str, int] = defaultdict(int)


def get_metrics() -> Dict[str, int]:
    """Return a snapshot of volunteer timeout metrics counters.

    Keys:
        volunteer_timeouts_total:        Total assignments timed out.
        volunteer_fallback_dispatched:   New assignments created as fallback.
        volunteer_requery_used:          Times CandidateVolunteerFinder was re-queried.
        volunteer_no_candidates:         NGO requests where no volunteer was found.
        volunteer_sweep_errors:          Unhandled exceptions during a sweep.
        volunteer_idempotency_skips:     Assignments skipped (already resolved).
    """
    return dict(_metrics)


def reset_metrics() -> None:
    """Reset all metrics counters to zero.  Intended for use in tests."""
    _metrics.clear()


# ---------------------------------------------------------------------------
# Volunteer Timeout Manager
# ---------------------------------------------------------------------------


class VolunteerTimeoutManager:
    """Sweeps expired VolunteerAssignment records and dispatches to next candidate.

    Args:
        session:                    SQLAlchemy session (injectable for testing).
        response_timeout_minutes:   Response window for newly-dispatched assignments.
        fallback_radius_km:         Radius used when re-querying CandidateVolunteerFinder.
    """

    def __init__(
        self,
        session: Optional[Session] = None,
        response_timeout_minutes: int = 15,
        fallback_radius_km: float = 15.0,
    ) -> None:
        self._session: Session = session or db.session
        self._response_timeout_minutes = response_timeout_minutes
        self._fallback_radius_km = fallback_radius_km
        self._assignment_engine = VolunteerAssignmentEngine()
        self._candidate_finder = CandidateVolunteerFinder(session=self._session)

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def process_expired_assignments(self) -> int:
        """Find and process all expired PENDING volunteer assignments.

        Returns:
            Number of assignments processed (timed out or escalated).
        """
        now = datetime.now(timezone.utc)
        expired_assignments = self._find_expired_assignments(now)

        if not expired_assignments:
            logger.debug(
                "VolunteerTimeoutManager: no expired assignments found at %s.", now.isoformat()
            )
            return 0

        processed = 0
        for assignment in expired_assignments:
            try:
                result = self._process_single_assignment(assignment, now)
                if result:
                    processed += 1
            except Exception:
                _metrics["volunteer_sweep_errors"] += 1
                logger.exception(
                    "VolunteerTimeoutManager: error processing assignment_id=%s — rolled back.",
                    assignment.assignment_id,
                )
                self._session.rollback()

        logger.info(
            "VolunteerTimeoutManager: sweep complete — %d/%d expired assignments processed.",
            processed,
            len(expired_assignments),
        )
        return processed

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _find_expired_assignments(self, now: datetime) -> List[VolunteerAssignment]:
        """Query all PENDING volunteer assignments whose deadline has passed."""
        now_naive = now.replace(tzinfo=None)
        stmt = (
            select(VolunteerAssignment)
            .where(
                VolunteerAssignment.status == AssignmentStatus.PENDING,
                VolunteerAssignment.response_deadline <= now_naive,
            )
            .options(
                joinedload(VolunteerAssignment.volunteer),
                joinedload(VolunteerAssignment.ngo_request).joinedload(
                    NGORequest.recommendation_cycle
                ),
            )
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def _process_single_assignment(
        self, assignment: VolunteerAssignment, now: datetime
    ) -> bool:
        """Process one expired assignment inside a single atomic transaction.

        Returns:
            True if processed, False if skipped (idempotency guard fired).
        """
        # ----------------------------------------------------------------
        # 1. Idempotency guard: recheck status inside the transaction
        # ----------------------------------------------------------------
        self._session.refresh(assignment)
        if assignment.status != AssignmentStatus.PENDING:
            _metrics["volunteer_idempotency_skips"] += 1
            logger.debug(
                "VolunteerTimeoutManager: skipping assignment_id=%s — already %s.",
                assignment.assignment_id,
                assignment.status.value,
            )
            return False

        now_naive = now.replace(tzinfo=None)
        ngo_request = assignment.ngo_request
        cycle = ngo_request.recommendation_cycle if ngo_request else None
        donation = cycle.donation if cycle else None
        donation_id = donation.donation_id if donation else "N/A"

        logger.info(
            "VolunteerTimeoutManager: timing out assignment_id=%s "
            "(rank=%s, volunteer_id=%s) for donation_id=%s.",
            assignment.assignment_id,
            assignment.assignment_rank,
            assignment.volunteer_id,
            donation_id,
        )

        # ----------------------------------------------------------------
        # 2. Mark assignment TIMED_OUT + audit history
        # ----------------------------------------------------------------
        prev_status = assignment.status
        assignment.status = AssignmentStatus.TIMED_OUT
        assignment.responded_at = now_naive

        self._session.add(
            AssignmentHistory(
                assignment_id=assignment.assignment_id,
                previous_status=prev_status,
                new_status=AssignmentStatus.TIMED_OUT,
                change_reason=(
                    f"Auto-timeout: deadline {assignment.response_deadline.isoformat()} "
                    f"passed without volunteer response (rank #{assignment.assignment_rank})."
                ),
            )
        )
        _metrics["volunteer_timeouts_total"] += 1

        # ----------------------------------------------------------------
        # 3. Find next candidate (prefer pre-ranked batch; fallback to re-query)
        # ----------------------------------------------------------------
        next_rank = assignment.assignment_rank + 1
        next_candidate = self._find_next_preranked_candidate(
            ngo_request_id=assignment.ngo_request_id,
            next_rank=next_rank,
        )
        requeried = False

        if next_candidate is None and ngo_request is not None:
            # Fallback: re-run candidate search for currently available volunteers
            next_candidate = self._requery_candidate(
                ngo_request=ngo_request,
                exclude_volunteer_ids=self._already_dispatched_volunteer_ids(
                    assignment.ngo_request_id
                ),
                current_rank=assignment.assignment_rank,
            )
            if next_candidate is not None:
                requeried = True
                _metrics["volunteer_requery_used"] += 1

        # ----------------------------------------------------------------
        # 4a. Dispatch fallback assignment
        # ----------------------------------------------------------------
        if next_candidate is not None:
            volunteer_id, score, new_rank = next_candidate
            deadline = now_naive + timedelta(minutes=self._response_timeout_minutes)

            new_assignment = VolunteerAssignment(
                ngo_request_id=assignment.ngo_request_id,
                volunteer_id=volunteer_id,
                assignment_rank=new_rank,
                assignment_score=Decimal(str(round(score, 2))),
                response_deadline=deadline,
                status=AssignmentStatus.PENDING,
            )
            self._session.add(new_assignment)
            self._session.flush()  # generate assignment_id for history

            self._session.add(
                AssignmentHistory(
                    assignment_id=new_assignment.assignment_id,
                    previous_status=None,
                    new_status=AssignmentStatus.PENDING,
                    change_reason=(
                        f"Auto-dispatched as fallback after volunteer_id="
                        f"{assignment.volunteer_id} timed out "
                        f"({'re-queried' if requeried else 'pre-ranked'})."
                    ),
                )
            )

            # Notify the new volunteer
            volunteer = self._session.get(Volunteer, volunteer_id)
            if volunteer and volunteer.user_id:
                self._session.add(
                    Notification(
                        user_id=volunteer.user_id,
                        notification_type=NotificationType.VOLUNTEER_REQUEST,
                        title="Pickup Assignment Available",
                        message=(
                            f"A food pickup request (Donation #{donation_id}) "
                            f"is available near you. Please respond within "
                            f"{self._response_timeout_minutes} minutes."
                        ),
                        delivery_channel=DeliveryChannel.IN_APP,
                    )
                )

            _metrics["volunteer_fallback_dispatched"] += 1
            logger.info(
                "VolunteerTimeoutManager: dispatched fallback assignment to "
                "volunteer_id=%s (rank=%s) for ngo_request_id=%s.",
                volunteer_id,
                new_rank,
                assignment.ngo_request_id,
            )

        # ----------------------------------------------------------------
        # 4b. No candidates — notify NGO
        # ----------------------------------------------------------------
        else:
            _metrics["volunteer_no_candidates"] += 1
            logger.warning(
                "VolunteerTimeoutManager: no volunteer candidates for "
                "ngo_request_id=%s (donation_id=%s). Sending system alert.",
                assignment.ngo_request_id,
                donation_id,
            )
            if ngo_request and ngo_request.ngo:
                ngo = ngo_request.ngo
                if hasattr(ngo, "user_id") and ngo.user_id:
                    self._session.add(
                        Notification(
                            user_id=ngo.user_id,
                            notification_type=NotificationType.SYSTEM,
                            title="Volunteer Assignment Failed",
                            message=(
                                f"No volunteer could be found for donation pickup "
                                f"(ID #{donation_id}). Please coordinate manually "
                                f"or contact support."
                            ),
                            delivery_channel=DeliveryChannel.IN_APP,
                        )
                    )

        self._session.commit()
        return True

    def _find_next_preranked_candidate(
        self,
        ngo_request_id: int,
        next_rank: int,
    ) -> Optional[tuple]:
        """Find the next pre-ranked VolunteerAssignment by rank order.

        Returns:
            Tuple of (volunteer_id, assignment_score, assignment_rank) or None.
        """
        # Look for an existing assignment at next_rank+ that hasn't been dispatched
        # (status PENDING means it was already dispatched; we want one that doesn't exist yet)
        # Actually: if VolunteerAssignmentEngine scored N candidates at dispatch time,
        # they may all have been created with status PENDING simultaneously.
        # We find the lowest-rank PENDING or already timed-out that was never dispatched.
        # In our implementation, only one assignment is dispatched at a time (rank 1 first),
        # so we look for any pre-existing row at next_rank+ that is still PENDING and
        # was not the one we just timed out.
        stmt = (
            select(VolunteerAssignment)
            .where(
                VolunteerAssignment.ngo_request_id == ngo_request_id,
                VolunteerAssignment.assignment_rank >= next_rank,
                VolunteerAssignment.status == AssignmentStatus.PENDING,
            )
            .order_by(VolunteerAssignment.assignment_rank.asc())
        )
        candidate = self._session.execute(stmt).scalars().first()
        if candidate:
            return (candidate.volunteer_id, float(candidate.assignment_score), candidate.assignment_rank)
        return None

    def _already_dispatched_volunteer_ids(self, ngo_request_id: int) -> List[int]:
        """Return volunteer_ids already assigned (in any status) for this request."""
        stmt = select(VolunteerAssignment.volunteer_id).where(
            VolunteerAssignment.ngo_request_id == ngo_request_id,
        )
        return list(self._session.execute(stmt).scalars().all())

    def _requery_candidate(
        self,
        ngo_request: NGORequest,
        exclude_volunteer_ids: List[int],
        current_rank: int,
    ) -> Optional[tuple]:
        """Re-run CandidateVolunteerFinder for currently-available volunteers.

        Excludes any volunteer who has already been dispatched for this request.

        Returns:
            Tuple of (volunteer_id, total_score, new_rank) for the best new candidate,
            or None if no candidates are available.
        """
        cycle = ngo_request.recommendation_cycle
        donation = cycle.donation if cycle else None
        if not donation:
            return None

        pickup_lat = float(donation.pickup_latitude)
        pickup_lon = float(donation.pickup_longitude)

        candidates = self._candidate_finder.find_candidates(
            pickup_lat=pickup_lat,
            pickup_lon=pickup_lon,
            max_radius_km=self._fallback_radius_km,
        )

        # Filter out already-dispatched volunteers
        filtered = [c for c in candidates if c.volunteer_id not in exclude_volunteer_ids]
        if not filtered:
            return None

        scored = self._assignment_engine.score_and_rank(filtered, max_radius_km=self._fallback_radius_km)
        if not scored:
            return None

        best = scored[0]
        new_rank = current_rank + 1
        return (best.volunteer_id, best.total_score, new_rank)
