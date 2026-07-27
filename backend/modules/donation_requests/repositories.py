"""Repository for the Donation Request module — Sprint 4.1.

Architecture Rules:
    - Uses SQLAlchemy 2.x select() / session.execute() / .scalars() style.
    - All reads use joinedload/contains_eager to avoid N+1 queries.
    - Commit / rollback is always delegated to the service layer.
    - No writing is performed except in the accept/decline mutation methods.

ORM Traversal:
    DonationRequest (API concept) is persisted as NGORequest.
    To reach the donation_id, we join through RecommendationCycle:
        NGORequest → RecommendationCycle → Donation
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select, update
from sqlalchemy.orm import Session, joinedload, contains_eager

from backend.database import db
from backend.modules.ngos.models import NGO, NGORequest, NGORequestHistory
from backend.modules.donations.models import Donation, RecommendationCycle
from backend.shared.constants.enums import DonationStatus, RequestStatus

logger = logging.getLogger(__name__)


class DonationRequestRepository:
    """Repository encapsulating all database access for the Donation Request module."""

    def __init__(self, session: Optional[Session] = None) -> None:
        self._session: Session = session or db.session

    # ------------------------------------------------------------------
    # NGO Profile lookup (for authorization)
    # ------------------------------------------------------------------

    def find_ngo_by_user_id(self, user_id: int) -> Optional[NGO]:
        """Resolve the NGO entity for a given JWT user_id.

        Args:
            user_id: The user_id from the JWT identity claim.

        Returns:
            NGO ORM instance if found, otherwise None.
        """
        stmt = select(NGO).where(NGO.user_id == user_id)
        return self._session.execute(stmt).scalars().first()

    # ------------------------------------------------------------------
    # Request Queries
    # ------------------------------------------------------------------

    def find_requests_for_ngo(self, ngo_id: int) -> List[NGORequest]:
        """Load all donation requests (NGORequest) assigned to an NGO.

        Each request is eager-loaded with its RecommendationCycle so that
        donation_id is accessible without additional queries.

        Args:
            ngo_id: The NGO's primary key.

        Returns:
            List of NGORequest instances, newest first.
        """
        stmt = (
            select(NGORequest)
            .where(NGORequest.ngo_id == ngo_id)
            .join(NGORequest.recommendation_cycle)
            .options(
                contains_eager(NGORequest.recommendation_cycle).joinedload(
                    RecommendationCycle.donation
                )
            )
            .order_by(NGORequest.created_at.desc())
        )
        results = self._session.execute(stmt).unique().scalars().all()
        logger.debug(
            "DonationRequestRepository: found %d requests for ngo_id=%s.",
            len(results),
            ngo_id,
        )
        return list(results)

    def find_request_by_id(self, request_id: int) -> Optional[NGORequest]:
        """Load a single NGORequest by its primary key.

        Eager-loads RecommendationCycle → Donation for donation_id access.

        Args:
            request_id: The ngo_request_id primary key.

        Returns:
            NGORequest instance if found, otherwise None.
        """
        stmt = (
            select(NGORequest)
            .where(NGORequest.ngo_request_id == request_id)
            .join(NGORequest.recommendation_cycle)
            .options(
                contains_eager(NGORequest.recommendation_cycle).joinedload(
                    RecommendationCycle.donation
                )
            )
        )
        result = self._session.execute(stmt).unique().scalars().first()
        logger.debug(
            "DonationRequestRepository: request_id=%s → %s.",
            request_id,
            "found" if result else "not found",
        )
        return result

    def find_pending_requests_for_cycle(
        self, recommendation_cycle_id: int, exclude_request_id: int
    ) -> List[NGORequest]:
        """Load all PENDING requests in a cycle, excluding one specific request.

        Used during accept flow to cancel competing PENDING requests.

        Args:
            recommendation_cycle_id: The cycle to search within.
            exclude_request_id: The request_id that was just ACCEPTED (exclude it).

        Returns:
            List of competing PENDING NGORequest instances.
        """
        stmt = (
            select(NGORequest)
            .where(
                NGORequest.recommendation_cycle_id == recommendation_cycle_id,
                NGORequest.ngo_request_id != exclude_request_id,
                NGORequest.status == RequestStatus.PENDING,
            )
        )
        results = self._session.execute(stmt).scalars().all()
        logger.debug(
            "DonationRequestRepository: %d competing PENDING requests in cycle %s.",
            len(results),
            recommendation_cycle_id,
        )
        return list(results)

    # ------------------------------------------------------------------
    # Mutation Methods (no commit — service owns transaction)
    # ------------------------------------------------------------------

    def accept_request(self, request: NGORequest) -> NGORequest:
        """Mark a donation request as ACCEPTED and record the response timestamp.

        Does NOT commit. Service layer owns the transaction.

        Args:
            request: The NGORequest ORM instance to accept.

        Returns:
            The mutated NGORequest instance.
        """
        request.status = RequestStatus.ACCEPTED
        request.responded_at = datetime.now(timezone.utc)
        logger.debug(
            "DonationRequestRepository: ngo_request_id=%s → ACCEPTED.",
            request.ngo_request_id,
        )
        return request

    def decline_request(
        self, request: NGORequest, reason: Optional[str]
    ) -> NGORequest:
        """Mark a donation request as REJECTED and record reason + timestamp.

        Does NOT commit. Service layer owns the transaction.

        Args:
            request: The NGORequest ORM instance to decline.
            reason: Optional human-readable rejection reason.

        Returns:
            The mutated NGORequest instance.
        """
        request.status = RequestStatus.REJECTED
        request.responded_at = datetime.now(timezone.utc)
        request.rejection_reason = reason
        logger.debug(
            "DonationRequestRepository: ngo_request_id=%s → REJECTED reason='%s'.",
            request.ngo_request_id,
            reason,
        )
        return request

    def cancel_competing_requests(self, requests: List[NGORequest]) -> int:
        """Mark all supplied PENDING requests as AUTO_CANCELLED.

        Called after one request in a cycle is accepted to cancel the rest.
        Does NOT commit. Service layer owns the transaction.

        Args:
            requests: List of NGORequest instances to cancel.

        Returns:
            Number of requests cancelled.
        """
        now = datetime.now(timezone.utc)
        for req in requests:
            req.status = RequestStatus.AUTO_CANCELLED
            req.responded_at = now
        logger.debug(
            "DonationRequestRepository: cancelled %d competing requests.",
            len(requests),
        )
        return len(requests)

    def set_donation_status(
        self, donation: Donation, new_status: DonationStatus
    ) -> Donation:
        """Update the status of a Donation record.

        Does NOT commit. Service layer owns the transaction.

        Args:
            donation: The Donation ORM instance to update.
            new_status: The new DonationStatus value.

        Returns:
            The mutated Donation instance.
        """
        old_status = donation.status
        donation.status = new_status
        logger.debug(
            "DonationRequestRepository: donation_id=%s %s → %s.",
            donation.donation_id,
            old_status.value,
            new_status.value,
        )
        return donation
