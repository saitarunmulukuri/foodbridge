"""Service layer for the Donation Request module — Sprint 4.1.

Orchestrates authorization, data retrieval, business rule enforcement,
mutation, and response serialisation for donation request endpoints.

Business Rules enforced here:
    1. Only NGO role may access these endpoints.
    2. Only the assigned NGO (ngo_id match) may accept or decline a request.
    3. Only PENDING requests may be accepted or declined.
    4. A PENDING request past its response_deadline is treated as EXPIRED.
    5. On ACCEPT:
       a. Request → ACCEPTED
       b. Donation → NGO_ACCEPTED
       c. All other PENDING requests in the same cycle → AUTO_CANCELLED
       d. All mutations are committed atomically.
    6. On DECLINE:
       a. Request → REJECTED (displayed as DECLINED)
       b. Optional rejection_reason stored.

Status Display Mapping (API → ORM):
    PENDING   → PENDING
    ACCEPTED  → ACCEPTED
    DECLINED  → REJECTED
    EXPIRED   → TIMED_OUT
    CANCELLED → AUTO_CANCELLED
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from backend.database import db
from backend.modules.donation_requests.exceptions import (
    DonationRequestAlreadyResolvedException,
    DonationRequestExpiredException,
    DonationRequestForbiddenException,
    DonationRequestNotFoundException,
)
from backend.modules.donation_requests.permissions import require_ngo_role
from backend.modules.donation_requests.repositories import DonationRequestRepository
from backend.modules.donation_requests.schemas import (
    DonationRequestResponseSchema,
)
from backend.modules.ngos.exceptions import NGONotFoundException
from backend.modules.ngos.models import NGORequest
from backend.modules.donations.models import Donation
from backend.shared.constants.enums import DonationStatus, RequestStatus

logger = logging.getLogger(__name__)

_response_schema = DonationRequestResponseSchema()

# ORM status → API display status
_STATUS_DISPLAY_MAP = {
    RequestStatus.PENDING: "PENDING",
    RequestStatus.ACCEPTED: "ACCEPTED",
    RequestStatus.REJECTED: "DECLINED",
    RequestStatus.TIMED_OUT: "EXPIRED",
    RequestStatus.AUTO_CANCELLED: "CANCELLED",
}

# Statuses that are considered terminal (request already resolved)
_TERMINAL_STATUSES = {
    RequestStatus.ACCEPTED,
    RequestStatus.REJECTED,
    RequestStatus.TIMED_OUT,
    RequestStatus.AUTO_CANCELLED,
}


class DonationRequestService:
    """Service orchestrating the Donation Request workflow.

    Authorization is enforced at the top of every public method.
    Ownership is verified by comparing the request's ngo_id to the
    authenticated NGO's ngo_id resolved from the JWT user_id.
    """

    def __init__(
        self, repository: Optional[DonationRequestRepository] = None
    ) -> None:
        self.repository = repository or DonationRequestRepository()

    # ------------------------------------------------------------------
    # GET /api/v1/ngo/requests
    # ------------------------------------------------------------------

    def list_my_requests(self, user_id: int, role: str) -> dict:
        """Return all donation requests assigned to the authenticated NGO.

        Args:
            user_id: JWT ``sub`` claim (integer).
            role: JWT ``role`` claim string.

        Returns:
            Dict with ``requests`` list and ``total`` count.

        Raises:
            InsufficientRoleException: If role ≠ NGO.
            NGONotFoundException: If no NGO profile exists for user_id.
        """
        require_ngo_role(user_id, role)
        ngo = self._resolve_ngo(user_id)

        requests = self.repository.find_requests_for_ngo(ngo.ngo_id)
        serialised = [self._serialize(req) for req in requests]

        logger.info(
            "DonationRequestService: listed %d requests for ngo_id=%s user_id=%s.",
            len(serialised),
            ngo.ngo_id,
            user_id,
        )
        return {"requests": serialised, "total": len(serialised)}

    # ------------------------------------------------------------------
    # GET /api/v1/ngo/requests/{id}
    # ------------------------------------------------------------------

    def get_request(self, user_id: int, role: str, request_id: int) -> dict:
        """Return a single donation request by its ID.

        Authorization:
            Only the assigned NGO may view this request.

        Args:
            user_id: JWT ``sub`` claim.
            role: JWT ``role`` claim.
            request_id: The ngo_request_id to retrieve.

        Returns:
            Serialised donation request dict.

        Raises:
            InsufficientRoleException: If role ≠ NGO.
            NGONotFoundException: If no NGO profile for user_id.
            DonationRequestNotFoundException: If request_id does not exist.
            DonationRequestForbiddenException: If request belongs to another NGO.
        """
        require_ngo_role(user_id, role)
        ngo = self._resolve_ngo(user_id)
        request = self._load_and_verify_ownership(request_id, ngo.ngo_id)
        return self._serialize(request)

    # ------------------------------------------------------------------
    # POST /api/v1/ngo/requests/{id}/accept
    # ------------------------------------------------------------------

    def accept_request(self, user_id: int, role: str, request_id: int) -> dict:
        """Accept a donation request.

        Business Flow:
            1. Verify NGO role and ownership.
            2. Assert request is PENDING and not past deadline.
            3. Mark request as ACCEPTED.
            4. Set donation status → NGO_ACCEPTED.
            5. Cancel all other PENDING requests in the same recommendation cycle.
            6. Commit atomically.

        Args:
            user_id: JWT identity.
            role: JWT role claim.
            request_id: The ngo_request_id to accept.

        Returns:
            Serialised accepted donation request dict.

        Raises:
            InsufficientRoleException: If role ≠ NGO.
            NGONotFoundException: If no NGO profile for user_id.
            DonationRequestNotFoundException: If request_id not found.
            DonationRequestForbiddenException: If request belongs to another NGO.
            DonationRequestAlreadyResolvedException: If request not PENDING.
            DonationRequestExpiredException: If past response_deadline.
        """
        require_ngo_role(user_id, role)
        ngo = self._resolve_ngo(user_id)
        request = self._load_and_verify_ownership(request_id, ngo.ngo_id)
        self._assert_actionable(request)

        # Load the donation (accessible through the eager-loaded cycle)
        donation = request.recommendation_cycle.donation

        try:
            # Step 1: Accept this request
            self.repository.accept_request(request)

            # Step 2: Transition donation → NGO_ACCEPTED
            self.repository.set_donation_status(donation, DonationStatus.NGO_ACCEPTED)

            # Step 3: Cancel all other PENDING requests in this cycle
            competing = self.repository.find_pending_requests_for_cycle(
                recommendation_cycle_id=request.recommendation_cycle_id,
                exclude_request_id=request_id,
            )
            cancelled_count = self.repository.cancel_competing_requests(competing)

            db.session.commit()

            logger.info(
                "DonationRequestService: ACCEPTED request_id=%s ngo_id=%s "
                "donation_id=%s — cancelled %d competing requests.",
                request_id,
                ngo.ngo_id,
                donation.donation_id,
                cancelled_count,
            )
        except Exception:
            db.session.rollback()
            logger.exception(
                "DonationRequestService: accept failed for request_id=%s. Rolled back.",
                request_id,
            )
            raise

        return self._serialize(request)

    # ------------------------------------------------------------------
    # POST /api/v1/ngo/requests/{id}/decline
    # ------------------------------------------------------------------

    def decline_request(
        self,
        user_id: int,
        role: str,
        request_id: int,
        decline_reason: Optional[str],
    ) -> dict:
        """Decline a donation request.

        Business Flow:
            1. Verify NGO role and ownership.
            2. Assert request is PENDING and not past deadline.
            3. Mark request as REJECTED (displayed as DECLINED).
            4. Store optional rejection_reason.
            5. Commit atomically.

        Args:
            user_id: JWT identity.
            role: JWT role claim.
            request_id: The ngo_request_id to decline.
            decline_reason: Optional reason string.

        Returns:
            Serialised declined donation request dict.
        """
        require_ngo_role(user_id, role)
        ngo = self._resolve_ngo(user_id)
        request = self._load_and_verify_ownership(request_id, ngo.ngo_id)
        self._assert_actionable(request)

        try:
            self.repository.decline_request(request, decline_reason)
            db.session.commit()
            logger.info(
                "DonationRequestService: DECLINED request_id=%s ngo_id=%s.",
                request_id,
                ngo.ngo_id,
            )
        except Exception:
            db.session.rollback()
            logger.exception(
                "DonationRequestService: decline failed for request_id=%s. Rolled back.",
                request_id,
            )
            raise

        return self._serialize(request)

    # ------------------------------------------------------------------
    # Private Helpers
    # ------------------------------------------------------------------

    def _resolve_ngo(self, user_id: int):
        """Resolve NGO entity from JWT user_id or raise NGONotFoundException."""
        ngo = self.repository.find_ngo_by_user_id(user_id)
        if ngo is None:
            raise NGONotFoundException(user_id)
        return ngo

    def _load_and_verify_ownership(
        self, request_id: int, ngo_id: int
    ) -> NGORequest:
        """Load a request by ID and assert it belongs to the given NGO.

        Raises:
            DonationRequestNotFoundException: If not found.
            DonationRequestForbiddenException: If owned by a different NGO.
        """
        request = self.repository.find_request_by_id(request_id)
        if request is None:
            raise DonationRequestNotFoundException(request_id)
        if request.ngo_id != ngo_id:
            logger.warning(
                "DonationRequestService: ownership violation — "
                "ngo_id=%s tried to act on request_id=%s owned by ngo_id=%s.",
                ngo_id,
                request_id,
                request.ngo_id,
            )
            raise DonationRequestForbiddenException(request_id)
        return request

    @staticmethod
    def _assert_actionable(request: NGORequest) -> None:
        """Assert a request can be accepted or declined.

        Raises:
            DonationRequestAlreadyResolvedException: If status is terminal.
            DonationRequestExpiredException: If past response_deadline.
        """
        if request.status in _TERMINAL_STATUSES:
            raise DonationRequestAlreadyResolvedException(
                request_id=request.ngo_request_id,
                current_status=_STATUS_DISPLAY_MAP.get(request.status, request.status.value),
            )

        now = datetime.now(timezone.utc)
        deadline = request.response_deadline
        # Make deadline timezone-aware if stored as naive UTC
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        if now > deadline:
            raise DonationRequestExpiredException(request.ngo_request_id)

    @staticmethod
    def _serialize(request: NGORequest) -> dict:
        """Serialise an NGORequest ORM instance to the API response dict."""
        # Resolve donation_id through the loaded recommendation_cycle
        donation_id = None
        if request.recommendation_cycle:
            donation_id = request.recommendation_cycle.donation_id

        display_status = _STATUS_DISPLAY_MAP.get(request.status, request.status.value)

        return _response_schema.dump({
            "request_id": request.ngo_request_id,
            "donation_id": donation_id,
            "ngo_id": request.ngo_id,
            "status": display_status,
            "recommendation_score": request.recommendation_score,
            "recommendation_rank": request.recommendation_rank,
            "decline_reason": request.rejection_reason,
            "created_at": request.created_at,
            "responded_at": request.responded_at,
            "expires_at": request.response_deadline,
        })
