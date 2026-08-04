"""Repository abstraction for Donations domain database operations.

Architecture Rules:
    - This repository operates exclusively on the current SQLAlchemy session.
    - Repositories MUST NEVER commit transactions (no session.commit() calls here).
    - Transaction ownership and boundaries belong strictly to the Service layer.
    - All database queries use modern SQLAlchemy 2.x ``select()`` syntax.
"""

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from backend.database import db
from backend.modules.donations.models import (
    Donation,
    DonationItem,
    DonationStatusHistory,
)
from backend.modules.donors.models import Donor


class DonationRepository:
    """Repository encapsulating database persistence operations for Donations.

    Methods stage operations (add/flush) into the session without committing.
    The calling Service layer handles transaction commits and rollbacks.
    """

    def __init__(self, session: Optional[Session] = None) -> None:
        self._session: Session = session or db.session

    def find_donor_by_user_id(self, user_id: int) -> Optional[Donor]:
        """Resolve a Donor profile from the authenticated user's ID.

        Used to obtain ``donor_id`` for the donation foreign key without
        accepting it from the client payload.

        Args:
            user_id: Integer user ID from the JWT ``sub`` claim.

        Returns:
            Donor instance if found, otherwise None.
        """
        stmt = select(Donor).where(Donor.user_id == user_id)
        return self._session.execute(stmt).scalars().first()

    def stage_donation(self, donation: Donation) -> Donation:
        """Stage a Donation entity into the current session and flush to obtain PK.

        ``flush()`` writes the INSERT to the database within the current
        transaction without committing. This makes ``donation.donation_id``
        immediately available for child FK references (items, status history).

        Args:
            donation: Populated Donation model instance.

        Returns:
            The staged Donation instance with ``donation_id`` populated.
        """
        self._session.add(donation)
        self._session.flush()
        return donation

    def stage_items(self, items: List[DonationItem]) -> None:
        """Stage a list of DonationItem entities into the current session.

        Must be called after ``stage_donation()`` so that
        ``donation.donation_id`` has been generated and set on each item.

        Args:
            items: List of populated DonationItem model instances.
        """
        self._session.add_all(items)

    def stage_status_history(
        self, status_history: DonationStatusHistory
    ) -> DonationStatusHistory:
        """Stage a DonationStatusHistory audit record into the current session.

        Enforces repository consistency for status audit records. Does not
        commit the transaction.

        Args:
            status_history: Populated DonationStatusHistory model instance.

        Returns:
            The staged DonationStatusHistory instance.
        """
        self._session.add(status_history)
        return status_history

    def find_donation_by_id(self, donation_id: int) -> Optional[Donation]:
        """Load a single Donation by primary key, eagerly loading items.

        Args:
            donation_id: Integer primary key.

        Returns:
            Donation instance with items loaded, or None.
        """
        stmt = (
            select(Donation)
            .where(Donation.donation_id == donation_id)
            .options(joinedload(Donation.items))
        )
        return self._session.execute(stmt).unique().scalars().first()

    def find_donations_by_donor(self, donor_id: int) -> List[Donation]:
        """Return all donations for a given donor_id, ordered by creation date descending.

        Args:
            donor_id: Integer donor PK.

        Returns:
            List of Donation instances (items NOT eagerly loaded for list performance).
        """
        stmt = (
            select(Donation)
            .where(Donation.donor_id == donor_id)
            .order_by(Donation.created_at.desc())
        )
        return list(self._session.execute(stmt).scalars().all())
