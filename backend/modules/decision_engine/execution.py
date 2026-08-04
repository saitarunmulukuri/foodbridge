"""Execution Persistence and NGO Request Dispatcher for the Decision Engine.

Sprint 3.3 Responsibility:
    Persist Decision Engine technical run logs (DecisionEngineRun) and business
    cycles (RecommendationCycle) into the database. Dispatch the primary NGORequest
    to the top-ranked candidate (rank 1) and create an in-app notification.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.database import db
from backend.modules.decision_engine.dto import DecisionEngineResult, Recommendation
from backend.modules.donations.models import (
    DecisionEngineRun,
    Donation,
    DonationStatusHistory,
    RecommendationCycle,
)
from backend.modules.ngos.models import NGO, NGORequest
from backend.modules.notifications.models import Notification
from backend.shared.constants.enums import (
    DeliveryChannel,
    DonationStatus,
    ExecutionStatus,
    NotificationType,
    RequestStatus,
    TriggerReason,
)

logger = logging.getLogger(__name__)

DEFAULT_RESPONSE_TIMEOUT_MINUTES: int = 30


class DecisionEngineExecutionManager:
    """Manager handling database persistence of engine runs and dispatching requests."""

    def __init__(self, session=None) -> None:
        self._session = session or db.session

    def persist_and_dispatch(
        self,
        result: DecisionEngineResult,
        started_at: datetime,
        completed_at: datetime,
        trigger_reason: TriggerReason = TriggerReason.NEW_DONATION,
        response_timeout_minutes: int = DEFAULT_RESPONSE_TIMEOUT_MINUTES,
    ) -> RecommendationCycle:
        """Persist execution audit records, create RecommendationCycle, and dispatch rank 1 NGORequest.

        Args:
            result: The DecisionEngineResult output from DecisionEngineService.
            started_at: Execution start timestamp (UTC).
            completed_at: Execution completion timestamp (UTC).
            trigger_reason: Event reason for triggering matching cycle.
            response_timeout_minutes: Response deadline duration for the dispatched NGO.

        Returns:
            The created RecommendationCycle ORM model instance.
        """
        execution_time_ms = int((completed_at - started_at).total_seconds() * 1000)

        # 1. Build ranking snapshot JSON for auditability
        ranking_snapshot = [
            {
                "rank": rec.rank,
                "ngo_id": rec.ngo_id,
                "total_score": rec.total_score,
                "distance_km": rec.distance_km,
                "distance_score": rec.distance_score,
                "capacity_score": rec.capacity_score,
                "compatibility_score": rec.compatibility_score,
                "reliability_score_weighted": rec.reliability_score_weighted,
                "response_score": rec.response_score,
            }
            for rec in result.recommendations
        ]

        # 2. Create DecisionEngineRun log record
        run_record = DecisionEngineRun(
            donation_id=result.donation_id,
            algorithm_version=result.algorithm_version,
            execution_status=ExecutionStatus.SUCCESS,
            started_at=started_at,
            completed_at=completed_at,
            execution_time_ms=execution_time_ms,
            ranking_snapshot={"recommendations": ranking_snapshot},
        )
        self._session.add(run_record)
        self._session.flush()  # Generate run_record.decision_engine_run_id

        # 3. Create RecommendationCycle record
        cycle = RecommendationCycle(
            donation_id=result.donation_id,
            decision_engine_run_id=run_record.decision_engine_run_id,
            algorithm_version=result.algorithm_version,
            trigger_reason=trigger_reason,
        )
        self._session.add(cycle)
        self._session.flush()  # Generate cycle.recommendation_cycle_id

        # 4. Dispatch rank 1 recommendation (if recommendations exist)
        if result.recommendations:
            top_rec = result.recommendations[0]
            deadline = completed_at + timedelta(minutes=response_timeout_minutes)

            ngo_request = NGORequest(
                recommendation_cycle_id=cycle.recommendation_cycle_id,
                ngo_id=top_rec.ngo_id,
                recommendation_rank=top_rec.rank,
                recommendation_score=top_rec.total_score,
                response_deadline=deadline,
                status=RequestStatus.PENDING,
            )
            self._session.add(ngo_request)

            # Load NGO to resolve user_id for notification
            ngo = self._session.query(NGO).filter(NGO.ngo_id == top_rec.ngo_id).first()
            if ngo and ngo.user_id:
                notification = Notification(
                    user_id=ngo.user_id,
                    notification_type=NotificationType.NGO_REQUEST,
                    title="New Surplus Food Donation Request Available",
                    message=(
                        f"A new surplus food donation offer (ID #{result.donation_id}) "
                        f"has been matched to your organization. You have {response_timeout_minutes} "
                        f"minutes to respond."
                    ),
                    delivery_channel=DeliveryChannel.IN_APP,
                )
                self._session.add(notification)


            # 5. Update Donation status -> PENDING_NGO
            donation = self._session.query(Donation).filter(Donation.donation_id == result.donation_id).first()
            if donation:
                prev_status = donation.status
                donation.status = DonationStatus.PENDING_NGO
                history = DonationStatusHistory(
                    donation_id=donation.donation_id,
                    previous_status=prev_status,
                    new_status=DonationStatus.PENDING_NGO,
                    change_reason=f"Matched via DecisionEngine (Cycle #{cycle.recommendation_cycle_id})",
                )
                self._session.add(history)

        self._session.commit()
        logger.info(
            "Persisted DecisionEngineRun #%s and RecommendationCycle #%s for donation_id=%s.",
            run_record.decision_engine_run_id,
            cycle.recommendation_cycle_id,
            result.donation_id,
        )
        return cycle

    def persist_failure(
        self,
        donation_id: int,
        started_at: datetime,
        completed_at: datetime,
        execution_status: ExecutionStatus,
        failure_reason: str,
    ) -> DecisionEngineRun:
        """Persist an audit record for a failed or un-matched Decision Engine run.

        Args:
            donation_id: Primary key of the donation.
            started_at: Start timestamp (UTC).
            completed_at: Completion/Failure timestamp (UTC).
            execution_status: Status enum (NO_CANDIDATES or FAILED).
            failure_reason: Description of the failure or qualification issue.

        Returns:
            The created DecisionEngineRun ORM record.
        """
        execution_time_ms = int((completed_at - started_at).total_seconds() * 1000)

        run_record = DecisionEngineRun(
            donation_id=donation_id,
            algorithm_version="1.0",
            execution_status=execution_status,
            started_at=started_at,
            completed_at=completed_at,
            execution_time_ms=execution_time_ms,
            failure_reason=failure_reason,
            ranking_snapshot=None,
        )
        self._session.add(run_record)
        self._session.commit()

        logger.warning(
            "Persisted failed DecisionEngineRun #%s status=%s for donation_id=%s: %s",
            run_record.decision_engine_run_id,
            execution_status.value,
            donation_id,
            failure_reason,
        )
        return run_record
