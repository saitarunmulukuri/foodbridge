"""Repository abstraction for Authentication domain database operations.

Note: This repository does NOT commit database transactions.
Transaction management (commit/rollback) is strictly the responsibility
of the Service layer.
"""

from typing import Optional, Union

from sqlalchemy.orm import Session

from backend.database import db
from backend.modules.authentication.models import User
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO
from backend.modules.volunteers.models import Volunteer


class AuthenticationRepository:
    """Repository encapsulating database query operations for Authentication.

    All methods operate within the current database session. No commit or
    rollback operations are performed here.
    """

    def __init__(self, session: Optional[Session] = None) -> None:
        self._session = session or db.session

    def find_by_email(self, email: str) -> Optional[User]:
        """Find a user record by their normalized email address.

        Args:
            email: Normalized (lowercased, stripped) email address.

        Returns:
            User instance if found, otherwise None.
        """
        return (
            self._session.query(User)
            .filter(User.email == email)
            .first()
        )

    def exists_by_email(self, email: str) -> bool:
        """Check whether a user with the given normalized email already exists.

        Args:
            email: Normalized (lowercased, stripped) email address.

        Returns:
            True if an account exists, False otherwise.
        """
        return (
            self._session.query(User.user_id)
            .filter(User.email == email)
            .first()
            is not None
        )

    def exists_ngo_registration_number(self, registration_number: str) -> bool:
        """Check whether an NGO registration number is already registered.

        Args:
            registration_number: Stripped NGO registration number string.

        Returns:
            True if the registration number exists, False otherwise.
        """
        return (
            self._session.query(NGO.ngo_id)
            .filter(NGO.registration_number == registration_number)
            .first()
            is not None
        )

    def stage_user_and_profile(
        self, user: User, profile: Union[Donor, NGO, Volunteer]
    ) -> User:
        """Stage a User entity and its role-specific profile entity into the current session.

        This method uses session.flush() to obtain the generated user_id primary key
        (required for the profile foreign key) without committing the transaction.
        The calling Service is responsible for committing or rolling back.

        Args:
            user: Populated User model instance (not yet persisted).
            profile: Populated role-specific profile model instance (Donor, NGO, or Volunteer).

        Returns:
            The staged User instance with user_id populated after flush.
        """
        self._session.add(user)
        # Flush to generate user.user_id before assigning to the profile FK
        self._session.flush()

        profile.user_id = user.user_id
        self._session.add(profile)
        return user
