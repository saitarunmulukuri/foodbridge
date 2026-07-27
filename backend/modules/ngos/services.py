"""Service layer for the NGO module — Profile + Capacity Management.

Sprint 3.1: NGOProfileService
Sprint 3.2: NGOCapacityService

Capacity Business Logic:
    The NGODailyCapacity model stores:
        max_meals          — maximum daily intake capacity
        remaining_capacity — remaining capacity (kept in sync)

    The service computes:
        allocated_capacity = max_meals - remaining_capacity
        remaining_capacity = maximum_capacity - allocated_capacity

    This preserves the model's existing structure while exposing the
    sprint-specified API contract (maximum_capacity, allocated_capacity,
    remaining_capacity).

    Crucially: remaining_capacity is NEVER accepted from the client.
    It is always derived server-side before writing to the database.
"""

import logging
from typing import Dict, List, Optional

from backend.database import db
from backend.modules.ngos.exceptions import (
    CapacityReductionBelowAllocatedException,
    CapacityValidationException,
    NGONotFoundException,
)
from backend.modules.ngos.models import NGO, NGODailyCapacity
from backend.modules.ngos.permissions import require_ngo_role
from backend.modules.ngos.repositories import NGORepository
from backend.modules.ngos.schemas import (
    NGOCapacityResponseSchema,
    NGOProfileResponseSchema,
)
from backend.shared.constants.enums import CapacityStatus, DayOfWeek

logger = logging.getLogger(__name__)

_profile_response_schema = NGOProfileResponseSchema()
_capacity_response_schema = NGOCapacityResponseSchema()


# -----------------------------------------------------------------------
# Sprint 3.1: Profile Service
# -----------------------------------------------------------------------


class NGOProfileService:
    """Service orchestrating NGO profile read and update operations."""

    def __init__(self, repository: Optional[NGORepository] = None) -> None:
        self.repository = repository or NGORepository()

    def get_my_profile(self, user_id: int, role: str) -> dict:
        """Return the authenticated NGO's profile."""
        require_ngo_role(user_id, role)
        ngo = self.repository.find_by_user_id(user_id)
        if ngo is None:
            raise NGONotFoundException(user_id)
        logger.info("NGO profile retrieved: user_id=%s ngo_id=%s.", user_id, ngo.ngo_id)
        return self._serialize_profile(ngo)

    def update_my_profile(self, user_id: int, role: str, validated_data: dict) -> dict:
        """Apply validated partial updates to the authenticated NGO's profile."""
        require_ngo_role(user_id, role)
        ngo = self.repository.find_by_user_id(user_id)
        if ngo is None:
            raise NGONotFoundException(user_id)
        try:
            self.repository.apply_profile_update(ngo, validated_data)
            db.session.commit()
            logger.info(
                "NGO profile updated: user_id=%s ngo_id=%s fields=%s.",
                user_id, ngo.ngo_id, list(validated_data.keys()),
            )
        except Exception:
            db.session.rollback()
            logger.exception(
                "NGO profile update failed for ngo_id=%s. Transaction rolled back.", ngo.ngo_id
            )
            raise
        return self._serialize_profile(ngo)

    @staticmethod
    def _serialize_profile(ngo: NGO) -> dict:
        return _profile_response_schema.dump({
            "ngo_id": ngo.ngo_id,
            "user_id": ngo.user_id,
            "organisation_name": ngo.organisation_name,
            "registration_number": ngo.registration_number,
            "contact_person": ngo.contact_person,
            "phone": ngo.phone,
            "address": ngo.address,
            "latitude": ngo.latitude,
            "longitude": ngo.longitude,
            "service_radius_km": ngo.service_radius_km,
            "verification_status": ngo.verification_status.value,
            "is_active": ngo.is_active,
            "created_at": ngo.created_at,
            "updated_at": ngo.updated_at,
        })


# -----------------------------------------------------------------------
# Sprint 3.2: Capacity Service
# -----------------------------------------------------------------------


class NGOCapacityService:
    """Service orchestrating NGO daily capacity read and update operations.

    Capacity Computation Contract:
        All computations follow this invariant:
            allocated_capacity = max_meals - remaining_capacity
            remaining_capacity = maximum_capacity - allocated_capacity

        The service enforces:
            1. maximum_capacity > 0 (validated by schema before this layer).
            2. maximum_capacity ≥ current allocated_capacity (business rule).
            3. remaining_capacity is always recomputed, never accepted from client.
    """

    def __init__(self, repository: Optional[NGORepository] = None) -> None:
        self.repository = repository or NGORepository()

    def get_my_capacity(self, user_id: int, role: str) -> dict:
        """Return all daily capacity records for the authenticated NGO.

        Authorization:
            Caller must hold the NGO role.

        Returns:
            Dict with ``capacities`` list and ``total`` count.

        Raises:
            InsufficientRoleException: If role ≠ NGO.
            NGONotFoundException: If no NGO profile exists for user_id.
        """
        require_ngo_role(user_id, role)

        ngo = self.repository.find_by_user_id(user_id)
        if ngo is None:
            raise NGONotFoundException(user_id)

        capacity_records = self.repository.find_all_capacities(ngo.ngo_id)

        serialised = [
            self._serialize_capacity(record)
            for record in capacity_records
        ]

        logger.info(
            "NGO capacity retrieved: user_id=%s ngo_id=%s records=%d.",
            user_id, ngo.ngo_id, len(serialised),
        )
        return {"capacities": serialised, "total": len(serialised)}

    def update_my_capacity(
        self, user_id: int, role: str, validated_data: dict
    ) -> dict:
        """Create or update a daily capacity record for the authenticated NGO.

        Authorization:
            Caller must hold the NGO role.

        Business Rules:
            1. maximum_capacity must be > 0 (enforced by schema).
            2. maximum_capacity must be ≥ current allocated_capacity.
               If reducing maximum_capacity below allocated, HTTP 400 is raised.
            3. remaining_capacity = maximum_capacity - allocated_capacity.
               This is always computed server-side, never accepted from client.

        Args:
            user_id: JWT identity (integer).
            role: JWT role claim.
            validated_data: Deserialised PUT payload dict with:
                - day_of_week (str)
                - maximum_capacity (int)
                - status (str | None)

        Returns:
            Serialised capacity record dictionary.

        Raises:
            InsufficientRoleException: If role ≠ NGO.
            NGONotFoundException: If no NGO profile exists for user_id.
            CapacityReductionBelowAllocatedException: If maximum_capacity < allocated.
        """
        require_ngo_role(user_id, role)

        ngo = self.repository.find_by_user_id(user_id)
        if ngo is None:
            raise NGONotFoundException(user_id)

        day_str = validated_data["day_of_week"]
        new_maximum = validated_data["maximum_capacity"]
        new_status_str = validated_data.get("status")

        # Resolve enum values
        day_of_week = DayOfWeek(day_str)
        new_status = CapacityStatus(new_status_str) if new_status_str else None

        # Load existing record (if any) to determine current allocated amount
        existing = self.repository.find_capacity_by_day(ngo.ngo_id, day_of_week)
        allocated_capacity = self._compute_allocated(existing)

        # Business rule: maximum_capacity must not be reduced below allocated
        if new_maximum < allocated_capacity:
            raise CapacityReductionBelowAllocatedException(
                day_of_week=day_str,
                maximum=new_maximum,
                allocated=allocated_capacity,
            )

        # Compute new remaining capacity server-side
        new_remaining = new_maximum - allocated_capacity

        try:
            capacity = self.repository.upsert_capacity(
                ngo_id=ngo.ngo_id,
                day_of_week=day_of_week,
                max_meals=new_maximum,
                remaining_capacity=new_remaining,
                status=new_status,
            )
            db.session.commit()
            db.session.refresh(capacity)
            logger.info(
                "NGO capacity updated: user_id=%s ngo_id=%s day=%s "
                "max=%s allocated=%s remaining=%s.",
                user_id, ngo.ngo_id, day_str,
                new_maximum, allocated_capacity, new_remaining,
            )
        except Exception:
            db.session.rollback()
            logger.exception(
                "NGO capacity update failed for ngo_id=%s day=%s. "
                "Transaction rolled back.",
                ngo.ngo_id, day_str,
            )
            raise

        return self._serialize_capacity(capacity)

    # ------------------------------------------------------------------
    # Private Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_allocated(capacity: Optional[NGODailyCapacity]) -> int:
        """Derive the allocated meal count from an existing capacity record.

        Formula:
            allocated_capacity = max_meals - remaining_capacity

        For new records (capacity is None), allocated_capacity defaults to 0.

        Args:
            capacity: Existing NGODailyCapacity ORM instance, or None.

        Returns:
            Integer allocated capacity.
        """
        if capacity is None:
            return 0
        return max(0, int(capacity.max_meals) - int(capacity.remaining_capacity))

    @staticmethod
    def _serialize_capacity(record: NGODailyCapacity) -> dict:
        """Serialise an NGODailyCapacity ORM instance to a response dict.

        Computes allocated_capacity and remaining_capacity from stored values.
        """
        max_meals = int(record.max_meals)
        stored_remaining = int(record.remaining_capacity)
        allocated = max(0, max_meals - stored_remaining)
        remaining = max_meals - allocated  # == stored_remaining, for clarity

        return _capacity_response_schema.dump({
            "capacity_id": record.capacity_id,
            "ngo_id": record.ngo_id,
            "day_of_week": record.day_of_week.value if record.day_of_week else None,
            "maximum_capacity": max_meals,
            "allocated_capacity": allocated,
            "remaining_capacity": remaining,
            "status": record.status.value if record.status else None,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        })
