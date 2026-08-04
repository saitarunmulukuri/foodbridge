"""Repository for NGO module — Profile + Capacity Management.

Sprint 3.1: find_by_user_id(), apply_profile_update()
Sprint 3.2: find_all_date_capacities(), find_date_capacity_by_date(), upsert_date_capacity()

Architecture Rules:
    - Uses SQLAlchemy 2.x select() / session.execute() / .scalars() style.
    - Commit / rollback is always delegated to the service layer.
    - All reads use joinedload where relationships are needed.

Capacity Model Mapping (Sprint 3.2 — NGODateCapacity):
    API concept          │  ORM column (NGODateCapacity)
    ─────────────────────┼──────────────────────────────
    maximum_capacity     │  max_meals
    allocated_capacity   │  allocated_meals  (stored, system-managed)
    remaining_capacity   │  COMPUTED: max_meals - allocated_meals (never stored)
"""

import logging
from datetime import date as date_type
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.database import db
from backend.modules.ngos.models import NGO, NGODateCapacity

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
            logger.debug(
                "NGORepository: loaded ngo_id=%s for user_id=%s.", result.ngo_id, user_id
            )
        return result

    def apply_profile_update(self, ngo: NGO, updates: dict) -> NGO:
        """Apply validated profile field updates to an NGO ORM instance.

        Uses an explicit whitelist to prevent mass-assignment of read-only
        or system-managed fields (e.g. registration_number, verification_status).

        Does NOT commit. Service layer owns the transaction.
        """
        allowed_fields = {
            "organisation_name",
            "contact_person",
            "phone",
            "address",
            "city",
            "state",
            "country",
            "postal_code",
            "description",
            "website",
            "latitude",
            "longitude",
            "service_radius_km",
        }
        applied = []
        for field, value in updates.items():
            if field in allowed_fields:
                setattr(ngo, field, value)
                applied.append(field)
        logger.debug("NGORepository: applied %s to ngo_id=%s.", applied, ngo.ngo_id)
        return ngo

    # ------------------------------------------------------------------
    # Sprint 3.2: Date Capacity Methods
    # ------------------------------------------------------------------

    def find_all_date_capacities(self, ngo_id: int) -> List[NGODateCapacity]:
        """Load all NGODateCapacity records for a given NGO, ordered by date ascending.

        Args:
            ngo_id: The NGO's primary key.

        Returns:
            List of NGODateCapacity instances (may be empty if none configured).
        """
        stmt = (
            select(NGODateCapacity)
            .where(NGODateCapacity.ngo_id == ngo_id)
            .order_by(NGODateCapacity.date)
        )
        results = self._session.execute(stmt).scalars().all()
        logger.debug(
            "NGORepository: loaded %d date-capacity records for ngo_id=%s.",
            len(results),
            ngo_id,
        )
        return list(results)

    def find_date_capacity_by_date(
        self, ngo_id: int, capacity_date: date_type
    ) -> Optional[NGODateCapacity]:
        """Load a single NGODateCapacity record for an NGO on a specific calendar date.

        Args:
            ngo_id: The NGO's primary key.
            capacity_date: The target calendar date.

        Returns:
            NGODateCapacity instance if found, otherwise None.
        """
        stmt = (
            select(NGODateCapacity)
            .where(
                NGODateCapacity.ngo_id == ngo_id,
                NGODateCapacity.date == capacity_date,
            )
        )
        result = self._session.execute(stmt).scalars().first()
        logger.debug(
            "NGORepository: date-capacity for ngo_id=%s date=%s → %s.",
            ngo_id,
            capacity_date.isoformat(),
            "found" if result else "not found",
        )
        return result

    def upsert_date_capacity(
        self,
        ngo_id: int,
        capacity_date: date_type,
        max_meals: int,
    ) -> NGODateCapacity:
        """Create or update an NGO's capacity record for a specific calendar date.

        Upsert Strategy:
            - If a record exists for (ngo_id, date), update ``max_meals`` only.
            - If no record exists, create a new one with ``allocated_meals = 0``.

        Important:
            ``allocated_meals`` is NEVER modified here — it is system-managed
            by the Decision Engine allocation process.

        Does NOT commit. Service layer owns the transaction.

        Args:
            ngo_id: The NGO's primary key.
            capacity_date: The target calendar date.
            max_meals: New maximum meal capacity for the date.

        Returns:
            The created or updated NGODateCapacity ORM instance.
        """
        existing = self.find_date_capacity_by_date(ngo_id, capacity_date)

        if existing is not None:
            existing.max_meals = max_meals
            logger.debug(
                "NGORepository: updated date-capacity for ngo_id=%s date=%s max=%s.",
                ngo_id,
                capacity_date.isoformat(),
                max_meals,
            )
            return existing

        new_record = NGODateCapacity(
            ngo_id=ngo_id,
            date=capacity_date,
            max_meals=max_meals,
            allocated_meals=0,
        )
        self._session.add(new_record)
        logger.debug(
            "NGORepository: created date-capacity for ngo_id=%s date=%s max=%s.",
            ngo_id,
            capacity_date.isoformat(),
            max_meals,
        )
        return new_record
