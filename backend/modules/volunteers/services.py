"""Service layer for the Volunteer Logistics module."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.database import db
from backend.modules.donations.models import Donation, DonationStatusHistory
from backend.modules.ngos.models import NGORequest
from backend.modules.volunteers.assignment_engine import VolunteerAssignmentEngine
from backend.modules.volunteers.candidate_finder import CandidateVolunteerFinder
from backend.modules.volunteers.exceptions import (
    AssignmentAlreadyResolvedException,
    AssignmentExpiredException,
    AssignmentForbiddenException,
    AssignmentNotFoundException,
    VolunteerNotFoundException,
)
from backend.modules.volunteers.models import VolunteerAssignment
from backend.modules.volunteers.permissions import require_volunteer_role
from backend.modules.volunteers.repositories import VolunteerRepository
from backend.shared.constants.enums import (
    AssignmentStatus,
    DonationStatus,
    OperationalStatus,
)

logger = logging.getLogger(__name__)

DEFAULT_VOLUNTEER_TIMEOUT_MINUTES: int = 15


class VolunteerService:
    """Service orchestrating volunteer logistics dispatch, acceptance, and delivery."""

    def __init__(
        self,
        repository: Optional[VolunteerRepository] = None,
        candidate_finder: Optional[CandidateVolunteerFinder] = None,
        assignment_engine: Optional[VolunteerAssignmentEngine] = None,
        session=None,
    ) -> None:
        self.repository = repository or VolunteerRepository()
        self._session = session or getattr(self.repository, "_session", db.session)
        self.candidate_finder = candidate_finder or CandidateVolunteerFinder(session=self._session)
        self.assignment_engine = assignment_engine or VolunteerAssignmentEngine()

    # ------------------------------------------------------------------
    # GET /api/v1/volunteers/assignments
    # ------------------------------------------------------------------

    def list_my_assignments(self, user_id: int, role: str) -> dict:
        """List all assignments for the authenticated volunteer."""
        require_volunteer_role(user_id, role)
        volunteer = self._resolve_volunteer(user_id)

        assignments = self.repository.find_assignments_for_volunteer(volunteer.volunteer_id)
        serialized = [self._serialize(assign) for assign in assignments]

        return {"assignments": serialized, "total": len(serialized)}

    # ------------------------------------------------------------------
    # GET /api/v1/volunteers/me
    # ------------------------------------------------------------------

    def get_my_profile(self, user_id: int, role: str) -> dict:
        """Return the authenticated volunteer's profile."""
        require_volunteer_role(user_id, role)
        volunteer = self._resolve_volunteer(user_id)
        return self._serialize_profile(volunteer)

    # ------------------------------------------------------------------
    # PATCH /api/v1/volunteers/me
    # ------------------------------------------------------------------

    def update_my_profile(self, user_id: int, role: str, validated_data: dict) -> dict:
        """Partially update the authenticated volunteer's profile.

        Patchable fields: phone, latitude, longitude, operational_status.
        """
        require_volunteer_role(user_id, role)
        volunteer = self._resolve_volunteer(user_id)

        changed = False
        if validated_data.get("phone") is not None:
            volunteer.phone = validated_data["phone"]
            changed = True
        if validated_data.get("latitude") is not None:
            from decimal import Decimal
            volunteer.latitude = Decimal(str(validated_data["latitude"]))
            changed = True
        if validated_data.get("longitude") is not None:
            from decimal import Decimal
            volunteer.longitude = Decimal(str(validated_data["longitude"]))
            changed = True
        if validated_data.get("operational_status") is not None:
            volunteer.operational_status = OperationalStatus(
                validated_data["operational_status"]
            )
            changed = True

        if not changed:
            from backend.shared.exceptions.base_exceptions import BadRequestException
            raise BadRequestException(
                "At least one field (phone, latitude, longitude, operational_status) "
                "must be provided."
            )

        try:
            self._session.commit()
            logger.info(
                "VolunteerService: profile updated for user_id=%s volunteer_id=%s.",
                user_id, volunteer.volunteer_id,
            )
        except Exception:
            self._session.rollback()
            logger.exception(
                "VolunteerService: update_my_profile failed for user_id=%s. Rolled back.",
                user_id,
            )
            raise

        return self._serialize_profile(volunteer)


    # ------------------------------------------------------------------
    # GET /api/v1/volunteers/assignments/<id>
    # ------------------------------------------------------------------

    def get_assignment(self, user_id: int, role: str, assignment_id: int) -> dict:
        """Get single assignment details."""
        require_volunteer_role(user_id, role)
        volunteer = self._resolve_volunteer(user_id)
        assignment = self._load_and_verify_ownership(assignment_id, volunteer.volunteer_id)
        return self._serialize(assignment)

    # ------------------------------------------------------------------
    # POST /api/v1/volunteers/assignments/<id>/accept
    # ------------------------------------------------------------------

    def accept_assignment(self, user_id: int, role: str, assignment_id: int) -> dict:
        """Accept a pickup assignment."""
        require_volunteer_role(user_id, role)
        volunteer = self._resolve_volunteer(user_id)
        assignment = self._load_and_verify_ownership(assignment_id, volunteer.volunteer_id)
        self._assert_actionable(assignment)

        ngo_request = assignment.ngo_request
        donation = ngo_request.recommendation_cycle.donation if ngo_request and ngo_request.recommendation_cycle else None

        try:
            # 1. Update assignment status -> ACCEPTED
            self.repository.update_assignment_status(
                assignment=assignment,
                new_status=AssignmentStatus.ACCEPTED,
                changed_by_user_id=user_id,
                reason="Accepted by volunteer.",
            )

            # 2. Update volunteer status -> BUSY
            volunteer.operational_status = OperationalStatus.BUSY

            # 3. Update donation status -> PICKUP_IN_PROGRESS
            if donation:
                prev_status = donation.status
                donation.status = DonationStatus.PICKUP_IN_PROGRESS
                self._session.add(
                    DonationStatusHistory(
                        donation_id=donation.donation_id,
                        previous_status=prev_status,
                        new_status=DonationStatus.PICKUP_IN_PROGRESS,
                        changed_by_user_id=user_id,
                        change_reason=f"Pickup accepted by Volunteer #{volunteer.volunteer_id}",
                    )
                )

            # 4. Cancel competing PENDING assignments for this request
            competing = self.repository.find_pending_assignments_for_request(
                ngo_request_id=assignment.ngo_request_id,
                exclude_assignment_id=assignment_id,
            )
            for comp in competing:
                self.repository.update_assignment_status(
                    assignment=comp,
                    new_status=AssignmentStatus.AUTO_CANCELLED,
                    reason="Cancelled because another volunteer accepted pickup.",
                )

            self._session.commit()
            logger.info("VolunteerService: assignment_id=%s ACCEPTED by volunteer_id=%s.", assignment_id, volunteer.volunteer_id)
        except Exception:
            self._session.rollback()
            logger.exception("VolunteerService: accept_assignment failed for assignment_id=%s. Rolled back.", assignment_id)
            raise

        return self._serialize(assignment)

    # ------------------------------------------------------------------
    # POST /api/v1/volunteers/assignments/<id>/decline
    # ------------------------------------------------------------------

    def decline_assignment(
        self, user_id: int, role: str, assignment_id: int, reason: Optional[str] = None
    ) -> dict:
        """Decline a pickup assignment and trigger fallback to next ranked volunteer."""
        require_volunteer_role(user_id, role)
        volunteer = self._resolve_volunteer(user_id)
        assignment = self._load_and_verify_ownership(assignment_id, volunteer.volunteer_id)
        self._assert_actionable(assignment)

        try:
            self.repository.update_assignment_status(
                assignment=assignment,
                new_status=AssignmentStatus.REJECTED,
                changed_by_user_id=user_id,
                reason=reason or "Declined by volunteer.",
            )
            self._session.commit()
            logger.info("VolunteerService: assignment_id=%s DECLINED by volunteer_id=%s.", assignment_id, volunteer.volunteer_id)
        except Exception:
            self._session.rollback()
            logger.exception("VolunteerService: decline_assignment failed for assignment_id=%s. Rolled back.", assignment_id)
            raise

        return self._serialize(assignment)

    # ------------------------------------------------------------------
    # POST /api/v1/volunteers/assignments/<id>/complete
    # ------------------------------------------------------------------

    def complete_delivery(self, user_id: int, role: str, assignment_id: int) -> dict:
        """Mark food pickup delivery as completed."""
        require_volunteer_role(user_id, role)
        volunteer = self._resolve_volunteer(user_id)
        assignment = self._load_and_verify_ownership(assignment_id, volunteer.volunteer_id)

        if assignment.status != AssignmentStatus.ACCEPTED:
            raise AssignmentAlreadyResolvedException(assignment_id, assignment.status.value)

        ngo_request = assignment.ngo_request
        donation = ngo_request.recommendation_cycle.donation if ngo_request and ngo_request.recommendation_cycle else None

        try:
            # 1. Update volunteer operational status -> AVAILABLE
            volunteer.operational_status = OperationalStatus.AVAILABLE

            # 2. Update donation status -> COMPLETED
            if donation:
                prev_status = donation.status
                donation.status = DonationStatus.COMPLETED
                self._session.add(
                    DonationStatusHistory(
                        donation_id=donation.donation_id,
                        previous_status=prev_status,
                        new_status=DonationStatus.COMPLETED,
                        changed_by_user_id=user_id,
                        change_reason=f"Delivery completed by Volunteer #{volunteer.volunteer_id}",
                    )
                )

            self._session.commit()
            logger.info("VolunteerService: delivery COMPLETED for assignment_id=%s by volunteer_id=%s.", assignment_id, volunteer.volunteer_id)
        except Exception:
            self._session.rollback()

            logger.exception("VolunteerService: complete_delivery failed for assignment_id=%s. Rolled back.", assignment_id)
            raise

        return self._serialize(assignment)

    # ------------------------------------------------------------------
    # Initial Dispatch Entry Point (Sprint 4.2 / 5.5)
    # ------------------------------------------------------------------

    def dispatch_initial_assignment(self, ngo_request_id: int) -> Optional[dict]:
        """Find candidate volunteers and dispatch rank-1 assignment for an accepted NGORequest."""
        ngo_request = self._session.get(NGORequest, ngo_request_id)
        if not ngo_request or not ngo_request.recommendation_cycle or not ngo_request.recommendation_cycle.donation:
            return None

        donation = ngo_request.recommendation_cycle.donation
        if not donation.pickup_latitude or not donation.pickup_longitude:
            return None

        pickup_lat = float(donation.pickup_latitude)
        pickup_lon = float(donation.pickup_longitude)

        candidates = self.candidate_finder.find_candidates(pickup_lat=pickup_lat, pickup_lon=pickup_lon)
        if not candidates:
            logger.warning("VolunteerService: No candidate volunteers found within radius for ngo_request_id=%s.", ngo_request_id)
            return None

        scored = self.assignment_engine.score_and_rank(candidates)
        if not scored:
            return None

        top_vol = scored[0]
        now = datetime.now(timezone.utc)
        deadline = now + timedelta(minutes=DEFAULT_VOLUNTEER_TIMEOUT_MINUTES)

        from decimal import Decimal
        from backend.modules.volunteers.models import AssignmentHistory

        assignment = VolunteerAssignment(
            ngo_request_id=ngo_request_id,
            volunteer_id=top_vol.volunteer_id,
            assignment_rank=1,
            assignment_score=Decimal(str(top_vol.total_score)),
            response_deadline=deadline,
            status=AssignmentStatus.PENDING,
        )
        self._session.add(assignment)
        self._session.flush()

        self._session.add(
            AssignmentHistory(
                assignment_id=assignment.assignment_id,
                previous_status=None,
                new_status=AssignmentStatus.PENDING,
                change_reason="Initial volunteer dispatch after NGO acceptance.",
            )
        )
        self._session.commit()
        logger.info(
            "VolunteerService: Dispatched rank-1 assignment #%s to volunteer_id=%s for ngo_request_id=%s.",
            assignment.assignment_id, top_vol.volunteer_id, ngo_request_id
        )
        return self._serialize(assignment)

    # ------------------------------------------------------------------
    # Private Helpers
    # ------------------------------------------------------------------

    def _resolve_volunteer(self, user_id: int):
        volunteer = self.repository.find_volunteer_by_user_id(user_id)
        if not volunteer:
            raise VolunteerNotFoundException(user_id)
        return volunteer

    def _load_and_verify_ownership(self, assignment_id: int, volunteer_id: int) -> VolunteerAssignment:
        assignment = self.repository.find_assignment_by_id(assignment_id)
        if not assignment:
            raise AssignmentNotFoundException(assignment_id)
        if assignment.volunteer_id != volunteer_id:
            raise AssignmentForbiddenException(assignment_id)
        return assignment

    @staticmethod
    def _assert_actionable(assignment: VolunteerAssignment) -> None:
        if assignment.status != AssignmentStatus.PENDING:
            raise AssignmentAlreadyResolvedException(assignment.assignment_id, assignment.status.value)

        now = datetime.now(timezone.utc)
        deadline = assignment.response_deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if now > deadline:
            raise AssignmentExpiredException(assignment.assignment_id)

    @staticmethod
    def _serialize(assignment: VolunteerAssignment) -> dict:
        return {
            "assignment_id": assignment.assignment_id,
            "ngo_request_id": assignment.ngo_request_id,
            "volunteer_id": assignment.volunteer_id,
            "rank": assignment.assignment_rank,
            "score": float(assignment.assignment_score),
            "status": assignment.status.value,
            "response_deadline": assignment.response_deadline.isoformat(),
            "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
        }

    @staticmethod
    def _serialize_profile(volunteer: "Volunteer") -> dict:
        """Serialize a Volunteer instance to a plain dict for the API response."""
        return {
            "volunteer_id": volunteer.volunteer_id,
            "user_id": volunteer.user_id,
            "phone": volunteer.phone,
            "vehicle_type": volunteer.vehicle_type.value,
            "latitude": float(volunteer.latitude) if volunteer.latitude is not None else None,
            "longitude": float(volunteer.longitude) if volunteer.longitude is not None else None,
            "operational_status": volunteer.operational_status.value,
            "verification_status": volunteer.verification_status.value,
            "is_active": volunteer.is_active,
        }
