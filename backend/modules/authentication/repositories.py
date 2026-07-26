"""Repository abstraction for Authentication domain database operations.

Note: This repository does NOT commit database transactions.
Transaction management (commit/rollback) is strictly the responsibility
of the Service layer.

SQLAlchemy Style: All queries use the modern SQLAlchemy 2.x
``select()`` / ``session.execute()`` / ``.scalars()`` pattern.
Legacy ``session.query()`` is not used.
"""

from datetime import datetime
from typing import Optional, Union

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import db
from backend.modules.authentication.models import User
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO
from backend.modules.volunteers.models import Volunteer


class AuthenticationRepository:
    """Repository encapsulating all database read/write operations for Authentication.

    All methods operate within the provided or current database session.
    No commit or rollback operations are performed here — that responsibility
    belongs exclusively to the Service layer.
    """

    def __init__(self, session: Optional[Session] = None) -> None:
        self._session: Session = session or db.session

    def find_by_email(self, email: str) -> Optional[User]:
        """Find a user record by their normalized email address.

        Args:
            email: Normalized (lowercased, stripped) email address.

        Returns:
            User instance if found, otherwise None.
        """
        stmt = select(User).where(User.email == email)
        return self._session.execute(stmt).scalars().first()

    def exists_by_email(self, email: str) -> bool:
        """Check whether a user with the given normalized email already exists.

        Uses a projection query (only fetches user_id) for efficiency.

        Args:
            email: Normalized (lowercased, stripped) email address.

        Returns:
            True if an account with the email exists, False otherwise.
        """
        stmt = select(User.user_id).where(User.email == email).limit(1)
        return self._session.execute(stmt).scalar() is not None

    def exists_ngo_registration_number(self, registration_number: str) -> bool:
        """Check whether an NGO registration number is already registered.

        Uses a projection query (only fetches ngo_id) for efficiency.

        Args:
            registration_number: Stripped NGO registration number string.

        Returns:
            True if the registration number exists, False otherwise.
        """
        stmt = select(NGO.ngo_id).where(
            NGO.registration_number == registration_number
        ).limit(1)
        return self._session.execute(stmt).scalar() is not None

    def stage_user_and_profile(
        self, user: User, profile: Union[Donor, NGO, Volunteer]
    ) -> User:
        """Stage a User entity and its role-specific profile into the current session.

        Uses ``session.flush()`` to obtain the database-generated ``user_id``
        primary key before assigning it to the profile foreign key, without
        committing the transaction. The calling Service is responsible for
        committing or rolling back.

        Args:
            user: Populated User model instance (not yet persisted).
            profile: Populated Donor, NGO, or Volunteer model instance.

        Returns:
            The staged User instance with ``user_id`` populated after flush.
        """
        self._session.add(user)
        self._session.flush()  # Generates user.user_id without committing

        profile.user_id = user.user_id
        self._session.add(profile)
        return user

    def update_last_login(self, user: User, login_time: datetime) -> None:
        """Set the ``last_login`` timestamp on a user record within the current session.

        The session is NOT committed here. The calling Service is responsible
        for committing after all login side-effects have been applied.

        Args:
            user: The authenticated User model instance.
            login_time: UTC datetime representing the login event.
        """
        user.last_login = login_time
        self._session.add(user)
