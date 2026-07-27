"""Repository for NGO module — Profile + Capacity Management.

Sprint 3.1: find_by_user_id(), apply_profile_update()
Sprint 3.2: find_all_capacities(), find_capacity_by_day(), upsert_capacity()

Architecture Rules:
    - Uses SQLAlchemy 2.x select() / session.execute() / .scalars() style.
    - Commit / rollback is always delegated to the service layer.
    - All reads use joinedload where relationships are needed.

Capacity Model Mapping:
    API concept          │  ORM column (NGODailyCapacity)
    ─────────────────────┼──────────────────────────────
    maximum_capacity     │  max_meals
    allocated_capacity   │  max_meals - remaining_capacity (computed)
    remaining_capacity   │  remaining_capacity (stored, kept in sync by service)
"""

import logging
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.database import db
from backend.modules.ngos.models import NGO, NGODailyCapacity
from backend.shared.constants.enums import CapacityStatus, DayOfWeek

logger = logging.getLogger(__name__)


class NGORepository:
    """Repository encapsulating all database access for the NGO module."""

    def __init__(self, session: Optional[Session] = None) -> None:
        self._session: Session = session or db.session

    # ------------------------------------------------------------------
    # Sprint 3.1: Profile Methods
    # ------------------------------------------------------------------

    def find_by_user_id(self, user_id: int) -> Optional[NGO]:
        """Load an NGO entity by linked user_id, with User eager-loaded."""
        stmt = (
            select(NGO)
            .where(NGO.user_id == user_id)
            .options(joinedload(NGO.user))
        )
        result = self._session.execute(stmt).unique().scalars().first()
        if result is None:
            logger.debug("NGORepository: no profile for user_id=%s.", user_id)
        else:
            logger.debug("NGORepository: loaded ngo_id=%s for user_id=%s.", result.ngo_id, user_id)
        return result

    def apply_profile_update(self, ngo: NGO, updates: dict) -> NGO:
        """Apply validated profile field updates to an NGO ORM instance.

        Does NOT commit. Service layer owns the transaction.
        """
        allowed_fields = {
            "organisation_name", "contact_person", "phone", "address",
            "latitude", "longitude", "service_radius_km",
        }
        applied = []
        for field, value in updates.items():
            if field in allowed_fields:
                setattr(ngo, field, value)
                applied.append(field)
        logger.debug("NGORepository: applied %s to ngo_id=%s.", applied, ngo.ngo_id)
        return ngo

    # ------------------------------------------------------------------
    # Sprint 3.2: Capacity Methods
    # ------------------------------------------------------------------

    def find_all_capacities(self, ngo_id: int) -> List[NGODailyCapacity]:
        """Load all NGODailyCapacity records for a given NGO.

        Args:
            ngo_id: The NGO's primary key.

        Returns:
            List of NGODailyCapacity instances (may be empty if none configured).
        """
        stmt = (
            select(NGODailyCapacity)
            .where(NGODailyCapacity.ngo_id == ngo_id)
            .order_by(NGODailyCapacity.day_of_week)
        )
        results = self._session.execute(stmt).scalars().all()
        logger.debug(
            "NGORepository: loaded %d capacity records for ngo_id=%s.",
            len(results),
            ngo_id,
        )
        return list(results)

    def find_capacity_by_day(
        self, ngo_id: int, day_of_week: DayOfWeek
    ) -> Optional[NGODailyCapacity]:
        """Load a single capacity record for an NGO on a specific day.

        Args:
            ngo_id: The NGO's primary key.
            day_of_week: The target DayOfWeek enum value.

        Returns:
            NGODailyCapacity instance if found, otherwise None.
        """
        stmt = (
            select(NGODailyCapacity)
            .where(
                NGODailyCapacity.ngo_id == ngo_id,
                NGODailyCapacity.day_of_week == day_of_week,
            )
        )
        result = self._session.execute(stmt).scalars().first()
        logger.debug(
            "NGORepository: capacity for ngo_id=%s day=%s → %s.",
            ngo_id,
            day_of_week.value,
            "found" if result else "not found",
        )
        return result

    def upsert_capacity(
        self,
        ngo_id: int,
        day_of_week: DayOfWeek,
        max_meals: int,
        remaining_capacity: int,
        status: Optional[CapacityStatus] = None,
    ) -> NGODailyCapacity:
        """Create or update an NGO's daily capacity record for a given day.

        Upsert Strategy:
            - If a record exists for (ngo_id, day_of_week), update it.
            - If no record exists, create a new one.

        Does NOT commit. Service layer owns the transaction.

        Args:
            ngo_id: The NGO's primary key.
            day_of_week: The target DayOfWeek enum value.
            max_meals: New maximum meal capacity for the day.
            remaining_capacity: New remaining capacity (service-computed).
            status: Optional CapacityStatus to set. If None, existing status
                    is preserved (or defaults to ACTIVE for new records).

        Returns:
            The created or updated NGODailyCapacity ORM instance.
        """
        existing = self.find_capacity_by_day(ngo_id, day_of_week)

        if existing is not None:
            existing.max_meals = max_meals
            existing.remaining_capacity = remaining_capacity
            if status is not None:
                existing.status = status
            logger.debug(
                "NGORepository: updated capacity for ngo_id=%s day=%s max=%s remaining=%s.",
                ngo_id, day_of_week.value, max_meals, remaining_capacity,
            )
            return existing
        else:
            new_record = NGODailyCapacity(
                ngo_id=ngo_id,
                day_of_week=day_of_week,
                max_meals=max_meals,
                remaining_capacity=remaining_capacity,
                status=status if status is not None else CapacityStatus.ACTIVE,
            )
            self._session.add(new_record)
            logger.debug(
                "NGORepository: created capacity for ngo_id=%s day=%s max=%s.",
                ngo_id, day_of_week.value, max_meals,
            )
            return new_record
