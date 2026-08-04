"""NGO Request Timeout Manager — Sprint 5.0.

Responsibility:
    Run a database sweep to find NGORequest records whose ``response_deadline``
    has passed and ``status`` is still PENDING.  For each expired request:

    1.  Idempotency guard: re-check status inside the transaction.
    2.  Mark the request TIMED_OUT, recording the timeout timestamp and reason.
    3.  Append NGORequestHistory audit record.
    4.  Read the original ranking snapshot from the DecisionEngineRun (never
        recompute rankings — use the original ordered list).
    5.  Identify the next uncontacted NGO from that snapshot.
    6.  If found: create a new NGORequest + Notification for the next NGO.
    7.  If exhausted: transition Donation status → EXPIRED + DonationStatusHistory.
    8.  Commit the entire operation as a single atomic transaction.
    9.  On any failure: rollback and log; do NOT crash the scheduler.

Design decisions:
    - Reads `ranking_snapshot` JSON from DecisionEngineRun. This is the canonical
      source of truth for the ranked NGO order — never re-running the engine.
    - Uses `response_deadline` index (idx_ngo_requests_status_deadline) for
      efficient sweeps even as the table grows.
    - Metrics hooks are plain counters in a module-level dict — zero-cost to
      consume; ready for Prometheus/StatsD integration.
"""

import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.database import db
from backend.modules.donations.models import (
    Donation,
    DonationStatusHistory,
    DecisionEngineRun,
    RecommendationCycle,
)
from backend.modules.ngos.models import NGO, NGORequest, NGORequestHistory
from backend.modules.notifications.models import Notification
from backend.shared.constants.enums import (
    DeliveryChannel,
    DonationStatus,
    NotificationType,
    RequestStatus,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level metrics counters (extension point for Prometheus / StatsD)
# ---------------------------------------------------------------------------
_metrics: Dict[str, int] = defaultdict(int)


def get_metrics() -> Dict[str, int]:
    """Return a snapshot of timeout manager metrics counters.

    Keys:
        ngo_timeouts_total:          Total NGO requests timed out.
        ngo_fallback_dispatched:     New NGO requests created as fallback.
        ngo_donations_expired:       Donations expired because all NGOs exhausted.
        ngo_sweep_errors:            Unhandled exceptions during a sweep.
        ngo_idempotency_skips:       Requests skipped (already resolved) during sweep.
    """
    return dict(_metrics)


def reset_metrics() -> None:
    """Reset all metrics counters to zero.  Intended for use in tests."""
    _metrics.clear()


# ---------------------------------------------------------------------------
# NGO Timeout Manager
# ---------------------------------------------------------------------------


class NGOTimeoutManager:
    """Sweeps expired NGORequest records and dispatches to the next ranked NGO.

    Lifecycle:
        Instantiate once per application context. The ``process_expired_requests``
        method is the entry point called by the scheduler on each interval tick.

    Args:
        session:                    SQLAlchemy session (injected for testing).
        response_timeout_minutes:   New NGO response window for fallback requests.
    """

    def __init__(
        self,
        session: Optional[Session] = None,
        response_timeout_minutes: int = 30,
    ) -> None:
        self._session: Session = session or db.session
        self._response_timeout_minutes = response_timeout_minutes

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def process_expired_requests(self) -> int:
        """Find and process all expired PENDING NGO requests.

        Returns:
            Number of requests that were processed (timed out or escalated).
        """
        now = datetime.now(timezone.utc)
        expired_requests = self._find_expired_requests(now)

        if not expired_requests:
            logger.debug("NGOTimeoutManager: no expired requests found at %s.", now.isoformat())
            return 0

        processed = 0
        for request in expired_requests:
            try:
                result = self._process_single_request(request, now)
                if result:
                    processed += 1
            except Exception:
                _metrics["ngo_sweep_errors"] += 1
                logger.exception(
                    "NGOTimeoutManager: error processing ngo_request_id=%s — rolled back.",
                    request.ngo_request_id,
                )
                self._session.rollback()

        logger.info(
            "NGOTimeoutManager: sweep complete — %d/%d expired requests processed.",
            processed,
            len(expired_requests),
        )
        return processed

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _find_expired_requests(self, now: datetime) -> List[NGORequest]:
        """Query all PENDING NGO requests whose deadline has passed."""
        # Strip timezone for comparison if DB stores naive datetimes
        now_naive = now.replace(tzinfo=None)
        stmt = (
            select(NGORequest)
            .where(
                NGORequest.status == RequestStatus.PENDING,
                NGORequest.response_deadline <= now_naive,
            )
            .options(
                joinedload(NGORequest.recommendation_cycle).joinedload(
                    RecommendationCycle.decision_engine_run
                ),
                joinedload(NGORequest.recommendation_cycle).joinedload(
                    RecommendationCycle.donation
                ),
            )
        )
        return list(self._session.execute(stmt).unique().scalars().all())

    def _process_single_request(self, request: NGORequest, now: datetime) -> bool:
        """Process one expired request inside a single atomic transaction.

        Returns:
            True if processed, False if skipped (idempotency guard fired).
        """
        # ----------------------------------------------------------------
        # 1. Idempotency guard: recheck status in-transaction
        # ----------------------------------------------------------------
        self._session.refresh(request)
        if request.status != RequestStatus.PENDING:
            _metrics["ngo_idempotency_skips"] += 1
            logger.debug(
                "NGOTimeoutManager: skipping ngo_request_id=%s — already %s.",
                request.ngo_request_id,
                request.status.value,
            )
            return False

        cycle = request.recommendation_cycle
        donation = cycle.donation if cycle else None
        run = cycle.decision_engine_run if cycle else None

        donation_id = donation.donation_id if donation else "N/A"
        cycle_id = cycle.recommendation_cycle_id if cycle else "N/A"

        logger.info(
            "NGOTimeoutManager: timing out ngo_request_id=%s (rank=%s, ngo_id=%s) "
            "for donation_id=%s cycle_id=%s.",
            request.ngo_request_id,
            request.recommendation_rank,
            request.ngo_id,
            donation_id,
            cycle_id,
        )

        # ----------------------------------------------------------------
        # 2. Mark current request TIMED_OUT
        # ----------------------------------------------------------------
        now_naive = now.replace(tzinfo=None)
        prev_status = request.status
        request.status = RequestStatus.TIMED_OUT
        request.responded_at = now_naive
        request.rejection_reason = "Automatically timed out — no response within deadline."

        self._session.add(
            NGORequestHistory(
                ngo_request_id=request.ngo_request_id,
                previous_status=prev_status,
                new_status=RequestStatus.TIMED_OUT,
                change_reason=(
                    f"Auto-timeout: deadline {request.response_deadline.isoformat()} "
                    f"passed without NGO response (retry #{request.recommendation_rank})."
                ),
            )
        )
        _metrics["ngo_timeouts_total"] += 1

        # ----------------------------------------------------------------
        # 3. Determine next NGO from the original ranking snapshot
        # ----------------------------------------------------------------
        next_rank = request.recommendation_rank + 1
        next_ngo_entry = self._find_next_ngo_from_snapshot(
            run=run,
            cycle=cycle,
            next_rank=next_rank,
        )

        if next_ngo_entry:
            # ----------------------------------------------------------------
            # 4a. Fallback: dispatch to next ranked NGO
            # ----------------------------------------------------------------
            self._dispatch_next_ngo(
                cycle=cycle,
                ngo_entry=next_ngo_entry,
                now_naive=now_naive,
                donation_id=donation_id,
            )
            _metrics["ngo_fallback_dispatched"] += 1
        else:
            # ----------------------------------------------------------------
            # 4b. Exhausted: all NGOs in cycle have been tried → EXPIRE donation
            # ----------------------------------------------------------------
            if donation:
                self._expire_donation(donation, now_naive, cycle_id)
            _metrics["ngo_donations_expired"] += 1

        self._session.commit()
        return True

    def _find_next_ngo_from_snapshot(
        self,
        run: Optional[DecisionEngineRun],
        cycle: Optional[RecommendationCycle],
        next_rank: int,
    ) -> Optional[Dict[str, Any]]:
        """Find the next NGO entry from DecisionEngineRun.ranking_snapshot.

        The snapshot is a dict ``{"recommendations": [{"rank": 1, "ngo_id": ...}, ...]}``.
        We also verify no existing NGORequest already exists for that rank in this
        cycle (prevents duplicate dispatch if a sweep runs twice concurrently).
        """
        if not run or not run.ranking_snapshot:
            return None

        recommendations: List[Dict] = run.ranking_snapshot.get("recommendations", [])
        # Sort by rank to guarantee order
        recommendations_sorted = sorted(recommendations, key=lambda r: r["rank"])

        for entry in recommendations_sorted:
            if entry["rank"] < next_rank:
                continue
            # Verify no existing request at this rank for this cycle
            existing = self._session.execute(
                select(NGORequest).where(
                    NGORequest.recommendation_cycle_id == cycle.recommendation_cycle_id,
                    NGORequest.recommendation_rank == entry["rank"],
                )
            ).scalars().first()
            if existing is None:
                return entry

        return None

    def _dispatch_next_ngo(
        self,
        cycle: RecommendationCycle,
        ngo_entry: Dict[str, Any],
        now_naive: datetime,
        donation_id: Any,
    ) -> None:
        """Create a new NGORequest and in-app Notification for the next ranked NGO."""
        deadline = now_naive + timedelta(minutes=self._response_timeout_minutes)
        new_request = NGORequest(
            recommendation_cycle_id=cycle.recommendation_cycle_id,
            ngo_id=ngo_entry["ngo_id"],
            recommendation_rank=ngo_entry["rank"],
            recommendation_score=ngo_entry["total_score"],
            response_deadline=deadline,
            status=RequestStatus.PENDING,
        )
        self._session.add(new_request)

        # Resolve NGO user_id for notification
        ngo = self._session.get(NGO, ngo_entry["ngo_id"])
        if ngo and ngo.user_id:
            self._session.add(
                Notification(
                    user_id=ngo.user_id,
                    notification_type=NotificationType.NGO_REQUEST,
                    title="Surplus Food Donation Request — Your Turn",
                    message=(
                        f"A surplus food donation offer (ID #{donation_id}) "
                        f"is now assigned to your organisation (rank {ngo_entry['rank']}). "
                        f"Please respond within {self._response_timeout_minutes} minutes."
                    ),
                    delivery_channel=DeliveryChannel.IN_APP,
                )
            )

        logger.info(
            "NGOTimeoutManager: dispatched fallback NGORequest to ngo_id=%s (rank=%s) "
            "for donation_id=%s.",
            ngo_entry["ngo_id"],
            ngo_entry["rank"],
            donation_id,
        )

    def _expire_donation(
        self,
        donation: Donation,
        now_naive: datetime,
        cycle_id: Any,
    ) -> None:
        """Transition donation status to EXPIRED — no NGO candidates remain."""
        prev_status = donation.status
        donation.status = DonationStatus.EXPIRED
        self._session.add(
            DonationStatusHistory(
                donation_id=donation.donation_id,
                previous_status=prev_status,
                new_status=DonationStatus.EXPIRED,
                change_reason=(
                    f"All NGO candidates in RecommendationCycle #{cycle_id} "
                    f"timed out or rejected the request."
                ),
            )
        )
        logger.warning(
            "NGOTimeoutManager: donation_id=%s EXPIRED — no remaining NGO candidates.",
            donation.donation_id,
        )
