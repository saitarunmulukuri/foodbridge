"""Repository abstraction for Decision Engine read-only database operations.

Architecture Rules:
    - ALL queries are strictly READ-ONLY (SELECT statements only).
    - Repositories MUST NEVER commit, rollback, or write to the database.
    - SQLAlchemy 2.x ``select()`` / ``session.execute()`` / ``.scalars()`` style.
    - ``joinedload`` is used for all relationship loading to prevent N+1 queries.

Methods provided:
    load_donation(donation_id)  →  Donation | None
    load_candidate_ngos()       →  List[NGO]
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import and_, select
from sqlalchemy.orm import Session, joinedload

from backend.database import db
from backend.modules.donations.models import Donation
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO, NGODailyCapacity
from backend.shared.constants.enums import (
    CapacityStatus,
    DayOfWeek,
    VerificationStatus,
)

logger = logging.getLogger(__name__)


class DecisionEngineRepository:
    """Read-only repository providing data access for the Decision Engine pipeline.

    All database reads are encapsulated here. No business logic. No writes.
    """

    def __init__(self, session: Optional[Session] = None) -> None:
        self._session: Session = session or db.session

    # ------------------------------------------------------------------
    # Primary Interface Methods
    # ------------------------------------------------------------------

    def load_donation(self, donation_id: int) -> Optional[Donation]:
        """Load a Donation entity by primary key with related entities eager-loaded.

        Eager-loads:
            - ``Donation.items``           — food item list for type compatibility checks.
            - ``Donation.donor.user``      — donor profile + user account for validation.

        Args:
            donation_id: The integer primary key of the donation.

        Returns:
            Donation ORM instance if found, otherwise None.
        """
        stmt = (
            select(Donation)
            .where(Donation.donation_id == donation_id)
            .options(
                joinedload(Donation.items),
                joinedload(Donation.donor).joinedload(Donor.user),
            )
        )
        result = self._session.execute(stmt).unique().scalars().first()

        if result is None:
            logger.debug("Repository: donation_id=%s not found.", donation_id)
        else:
            logger.debug(
                "Repository: loaded donation_id=%s status='%s'.",
                donation_id,
                result.status.value,
            )
        return result

    def load_candidate_ngos(self) -> List[NGO]:
        """Load candidate NGOs satisfying all database-level constraints.

        Database-Level Constraints (indexed column filters):
            1. ``ngo.is_active = True``
            2. ``ngo.verification_status = VERIFIED``

        Eager-loaded Relationships:
            - ``NGO.daily_capacities`` — filtered to today's ACTIVE record only.
              This serves double duty: the joinedload eliminates N+1 queries,
              and the filtered join implicitly excludes NGOs with no active
              capacity record for today (i.e., NGOs that are PAUSED or FULL today
              have no matching row in the eager-loaded list).
            - ``NGO.ngo_requests`` — complete history for reliability score
              computation in the DTO translation layer.

        Performance:
            Single SQL query with JOINs. No Python-level filtering of ORM collections
            is performed here. Python-layer business filters are applied downstream
            by the EligibilityFilterPipeline.

        Returns:
            List of NGO ORM instances pre-qualified at the database level.
        """
        today_dow = self._get_today_day_of_week()

        stmt = (
            select(NGO)
            .where(
                and_(
                    NGO.is_active.is_(True),
                    NGO.verification_status == VerificationStatus.VERIFIED,
                )
            )
            .options(
                joinedload(
                    NGO.daily_capacities.and_(
                        and_(
                            NGODailyCapacity.day_of_week == today_dow,
                            NGODailyCapacity.status == CapacityStatus.ACTIVE,
                        )
                    )
                ),
                joinedload(NGO.ngo_requests),
            )
        )

        ngos = self._session.execute(stmt).unique().scalars().all()
        logger.info(
            "Repository: loaded %d active + verified candidate NGOs.",
            len(ngos),
        )
        return list(ngos)

    # ------------------------------------------------------------------
    # Backward-Compatibility Aliases (Sprint 3.1 method names)
    # ------------------------------------------------------------------

    def find_donation_with_details(self, donation_id: int) -> Optional[Donation]:
        """Alias for load_donation(). Preserved for Sprint 3.1 backward compatibility."""
        return self.load_donation(donation_id)

    def find_candidate_ngos(self) -> List[NGO]:
        """Alias for load_candidate_ngos(). Preserved for Sprint 3.1 backward compatibility."""
        return self.load_candidate_ngos()

    # ------------------------------------------------------------------
    # Private Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _get_today_day_of_week() -> DayOfWeek:
        """Return the current UTC weekday as a DayOfWeek enum value."""
        utc_now = datetime.now(timezone.utc)
        day_name = utc_now.strftime("%A").upper()  # e.g. "MONDAY"
        return DayOfWeek(day_name)
