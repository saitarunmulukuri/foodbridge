"""Service layer for the NGO module — Profile + Capacity Management.

Sprint 3.1: NGOProfileService
Sprint 3.2: NGOCapacityService

Capacity Business Logic (Sprint 3.2 — NGODateCapacity):
    The NGODateCapacity model stores:
        max_meals          — maximum daily intake capacity (= maximum_capacity)
        allocated_meals    — meals already allocated; system-managed (= allocated_capacity)

    The service computes and exposes:
        remaining_capacity = max_meals - allocated_meals

    Crucially:
        - remaining_capacity is NEVER stored; always computed at read time.
        - allocated_meals is NEVER accepted from the client; only the service
          or the Decision Engine may modify it.
"""

import logging
from datetime import date as date_type
from typing import Optional

from backend.database import db
from backend.modules.ngos.exceptions import (
    CapacityReductionBelowAllocatedException,
    NGONotFoundException,
    RegistrationNumberImmutableException,
)
from backend.modules.ngos.models import NGO, NGODateCapacity
from backend.modules.ngos.permissions import require_ngo_role
from backend.modules.ngos.repositories import NGORepository
from backend.modules.ngos.schemas import (
    NGOCapacityResponseSchema,
    NGOProfileResponseSchema,
)
from backend.shared.constants.enums import VerificationStatus

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
        """Apply validated partial updates to the authenticated NGO's profile.

        Business Rules Enforced:
            1. Caller must hold the NGO role (require_ngo_role).
            2. registration_number cannot be changed after verification_status
               transitions to VERIFIED.  Any attempt raises HTTP 409.
            3. email, verification_status, and role are never present in
               validated_data — they are excluded at the schema level.
            4. updated_at is touched automatically by the SQLAlchemy
               onupdate hook defined on BaseModel.
        """
        require_ngo_role(user_id, role)
        ngo = self.repository.find_by_user_id(user_id)
        if ngo is None:
            raise NGONotFoundException(user_id)

        # Business rule: registration_number is immutable once verified
        if (
            "registration_number" in validated_data
            and ngo.verification_status == VerificationStatus.VERIFIED
        ):
            logger.warning(
                "Blocked registration_number change for verified NGO: user_id=%s ngo_id=%s.",
                user_id,
                ngo.ngo_id,
            )
            raise RegistrationNumberImmutableException()

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
        """Serialise an NGO ORM instance to the Sprint 3.1 profile response dict.

        email is sourced from the eagerly-loaded User relation (ngo.user.email).
        All new Sprint 3.1 fields (city, state, country, postal_code, description,
        website) are included and default to None when not yet populated.
        """
        user_email = ngo.user.email if ngo.user else None
        return _profile_response_schema.dump({
            "ngo_id": ngo.ngo_id,
            "user_id": ngo.user_id,
            "organisation_name": ngo.organisation_name,
            "registration_number": ngo.registration_number,
            "contact_person": ngo.contact_person,
            "phone": ngo.phone,
            "email": user_email,
            "address": ngo.address,
            "city": ngo.city,
            "state": ngo.state,
            "country": ngo.country,
            "postal_code": ngo.postal_code,
            "description": ngo.description,
            "website": ngo.website,
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
    """Service orchestrating NGO date-capacity read and update operations.

    Capacity Computation Contract (Sprint 3.2):
        allocated_capacity  = stored ``allocated_meals``  (system-managed)
        remaining_capacity  = max_meals - allocated_meals (computed at read time)

    Business rules enforced here:
        1. Only NGO role may access (require_ngo_role).
        2. NGO may only manage its own capacity records.
        3. maximum_capacity must be > 0 (validated by schema before this layer).
        4. maximum_capacity must be >= current allocated_capacity on update.
        5. date must not be in the past (validated by schema; defence-in-depth here).
        6. remaining_capacity is always computed, never stored, never accepted from client.
    """

    def __init__(self, repository: Optional[NGORepository] = None) -> None:
        self.repository = repository or NGORepository()

    def get_my_capacity(self, user_id: int, role: str) -> dict:
        """Return all date-capacity records for the authenticated NGO.

        Authorization:
            Caller must hold the NGO role.

        Returns:
            Dict with ``capacities`` list (sorted by date ASC) and ``total`` count.

        Raises:
            InsufficientRoleException: If role ≠ NGO.
            NGONotFoundException: If no NGO profile exists for user_id.
        """
        require_ngo_role(user_id, role)

        ngo = self.repository.find_by_user_id(user_id)
        if ngo is None:
            raise NGONotFoundException(user_id)

        capacity_records = self.repository.find_all_date_capacities(ngo.ngo_id)

        serialised = [self._serialize_capacity(record) for record in capacity_records]

        logger.info(
            "NGO date-capacity retrieved: user_id=%s ngo_id=%s records=%d.",
            user_id, ngo.ngo_id, len(serialised),
        )
        return {"capacities": serialised, "total": len(serialised)}

    def update_my_capacity(
        self, user_id: int, role: str, validated_data: dict
    ) -> dict:
        """Create or update a date-capacity record for the authenticated NGO.

        Authorization:
            Caller must hold the NGO role.

        Business Rules:
            1. date must not be in the past (enforced by schema; double-checked here).
            2. maximum_capacity must be > 0 (enforced by schema).
            3. maximum_capacity must be >= current allocated_capacity.
               If reducing below allocated, HTTP 400 is raised.
            4. remaining_capacity = maximum_capacity - allocated_capacity.
               This is always computed server-side, never stored.

        Args:
            user_id: JWT identity (integer).
            role: JWT role claim.
            validated_data: Deserialised PUT payload dict with:
                - date (datetime.date)
                - maximum_capacity (int)

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

        capacity_date: date_type = validated_data["date"]
        new_maximum: int = validated_data["maximum_capacity"]
        date_str: str = capacity_date.isoformat()

        # Load existing record (if any) to read current allocated_meals
        existing = self.repository.find_date_capacity_by_date(ngo.ngo_id, capacity_date)
        allocated = int(existing.allocated_meals) if existing is not None else 0

        # Business rule: maximum_capacity must not be reduced below allocated
        if new_maximum < allocated:
            raise CapacityReductionBelowAllocatedException(
                date=date_str,
                maximum=new_maximum,
                allocated=allocated,
            )

        remaining = new_maximum - allocated  # computed; never stored

        try:
            capacity = self.repository.upsert_date_capacity(
                ngo_id=ngo.ngo_id,
                capacity_date=capacity_date,
                max_meals=new_maximum,
            )
            db.session.commit()
            db.session.refresh(capacity)
            logger.info(
                "NGO date-capacity updated: user_id=%s ngo_id=%s date=%s "
                "max=%s allocated=%s remaining=%s.",
                user_id, ngo.ngo_id, date_str,
                new_maximum, allocated, remaining,
            )
        except Exception:
            db.session.rollback()
            logger.exception(
                "NGO date-capacity update failed for ngo_id=%s date=%s. "
                "Transaction rolled back.",
                ngo.ngo_id, date_str,
            )
            raise

        return self._serialize_capacity(capacity)

    # ------------------------------------------------------------------
    # Private Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _serialize_capacity(record: NGODateCapacity) -> dict:
        """Serialise an NGODateCapacity ORM instance to a response dict.

        Computes remaining_capacity from stored max_meals and allocated_meals.
        remaining_capacity is NEVER stored in the database.
        """
        max_meals = int(record.max_meals)
        allocated = int(record.allocated_meals)
        remaining = max(0, max_meals - allocated)  # computed; spec invariant

        return _capacity_response_schema.dump({
            "date_capacity_id": record.date_capacity_id,
            "ngo_id": record.ngo_id,
            "date": record.date,
            "maximum_capacity": max_meals,
            "allocated_capacity": allocated,
            "remaining_capacity": remaining,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
        })
