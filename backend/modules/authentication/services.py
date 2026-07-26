"""Service layer executing domain business logic for Authentication.

Transaction management (commit/rollback) lives here.
Password security utilities are imported from shared/security/password.py.
"""

import logging
from typing import Any, Dict, Optional, Tuple, Union

from backend.database import db
from backend.modules.authentication.exceptions import (
    EmailAlreadyExistsException,
    InvalidRegistrationRoleException,
    RegistrationNumberAlreadyExistsException,
)
from backend.modules.authentication.models import User
from backend.modules.authentication.repositories import AuthenticationRepository
from backend.modules.donors.models import Donor
from backend.modules.ngos.models import NGO
from backend.modules.volunteers.models import Volunteer
from backend.shared.constants.enums import (
    AccountStatus,
    UserRole,
    VehicleType,
    VerificationStatus,
)
from backend.shared.security import hash_password, normalize_email

logger = logging.getLogger(__name__)


class AuthenticationService:
    """Service encapsulating user registration business rules and transaction management.

    The public interface exposes only high-level orchestration methods.
    Internal implementation details are separated into private helpers.
    """

    def __init__(self, repository: Optional[AuthenticationRepository] = None) -> None:
        self.repository = repository or AuthenticationRepository()

    # ------------------------------------------------------------------
    # Public Interface
    # ------------------------------------------------------------------

    def register_user(
        self, registration_data: Dict[str, Any]
    ) -> Tuple[User, Union[Donor, NGO, Volunteer]]:
        """Orchestrate new user registration within a single atomic transaction.

        Steps:
            1. Normalize and validate pre-conditions.
            2. Create the User entity.
            3. Create the role-specific profile entity.
            4. Stage both entities and commit the transaction.
            5. Rollback and re-raise on any failure.

        Args:
            registration_data: Validated payload from UserRegisterSchema.load().

        Returns:
            Tuple of (created User, created role-specific profile).

        Raises:
            EmailAlreadyExistsException: If email is already registered.
            InvalidRegistrationRoleException: If the role is not allowed for self-registration.
            RegistrationNumberAlreadyExistsException: If the NGO registration number is taken.
        """
        email = normalize_email(registration_data["email"])
        role_enum = self._resolve_role(registration_data["role"])
        profile_data = registration_data["profile"]

        self._validate_registration(email, role_enum, profile_data)

        password_hash = hash_password(registration_data["password"])
        account_status = self._determine_account_status(role_enum)

        user = self._create_user(email, password_hash, role_enum, account_status)
        profile = self._create_profile(role_enum, profile_data)

        try:
            self.repository.stage_user_and_profile(user, profile)
            db.session.commit()
            logger.info(
                "User registered successfully: user_id=%s, role=%s, account_status=%s",
                user.user_id,
                role_enum.value,
                account_status.value,
            )
        except Exception:
            db.session.rollback()
            logger.exception(
                "Transaction failed during registration for email=%s, role=%s",
                email,
                role_enum.value,
            )
            raise

        return user, profile

    # ------------------------------------------------------------------
    # Private Helpers
    # ------------------------------------------------------------------

    def _resolve_role(self, role_str: str) -> UserRole:
        """Convert raw role string to a validated UserRole enum.

        Args:
            role_str: Raw role string from the registration payload.

        Returns:
            Validated UserRole enum value.

        Raises:
            InvalidRegistrationRoleException: If the role is unrecognized or ADMIN.
        """
        try:
            role_enum = UserRole(role_str.upper())
        except ValueError:
            raise InvalidRegistrationRoleException(role_str)

        if role_enum == UserRole.ADMIN:
            raise InvalidRegistrationRoleException("ADMIN")

        return role_enum

    def _validate_registration(
        self,
        email: str,
        role_enum: UserRole,
        profile_data: Dict[str, Any],
    ) -> None:
        """Check pre-conditions before creating any database records.

        Validates:
            - Email uniqueness.
            - NGO registration number uniqueness (if applicable).

        Args:
            email: Normalized email address.
            role_enum: Resolved UserRole enum.
            profile_data: Role-specific profile fields from the request.

        Raises:
            EmailAlreadyExistsException: If the email is already registered.
            RegistrationNumberAlreadyExistsException: If the NGO registration number exists.
        """
        if self.repository.exists_by_email(email):
            logger.warning(
                "Registration rejected: email already exists [email=%s]", email
            )
            raise EmailAlreadyExistsException(email)

        if role_enum == UserRole.NGO:
            reg_num = profile_data.get("registration_number", "").strip()
            if self.repository.exists_ngo_registration_number(reg_num):
                logger.warning(
                    "Registration rejected: NGO registration number already exists "
                    "[registration_number=%s]",
                    reg_num,
                )
                raise RegistrationNumberAlreadyExistsException(reg_num)

    def _determine_account_status(self, role_enum: UserRole) -> AccountStatus:
        """Determine the initial AccountStatus for a newly registered user.

        Business rules:
            - DONOR   → ACTIVE
            - VOLUNTEER → ACTIVE
            - NGO     → PENDING (requires admin verification)

        Args:
            role_enum: Resolved UserRole enum.

        Returns:
            Appropriate AccountStatus enum value.
        """
        if role_enum in (UserRole.DONOR, UserRole.VOLUNTEER):
            return AccountStatus.ACTIVE
        return AccountStatus.PENDING

    def _create_user(
        self,
        email: str,
        password_hash: str,
        role_enum: UserRole,
        account_status: AccountStatus,
    ) -> User:
        """Construct a new User model instance.

        Args:
            email: Normalized email address.
            password_hash: bcrypt-hashed password string.
            role_enum: Validated UserRole enum.
            account_status: Initial account status.

        Returns:
            Unpersisted User model instance.
        """
        return User(
            email=email,
            password_hash=password_hash,
            role=role_enum,
            account_status=account_status,
        )

    def _create_profile(
        self,
        role_enum: UserRole,
        profile_data: Dict[str, Any],
    ) -> Union[Donor, NGO, Volunteer]:
        """Construct the role-specific profile model instance.

        Coordinates (latitude/longitude) are stored as NULL when not provided
        by the client. Defaulting to 0.0 is explicitly avoided because the
        coordinate (0, 0) is a valid geographic location that would corrupt
        Decision Engine distance calculations.

        Args:
            role_enum: Validated UserRole enum.
            profile_data: Role-specific fields from the registration payload.

        Returns:
            Unpersisted Donor, NGO, or Volunteer model instance.

        Raises:
            InvalidRegistrationRoleException: If the role has no profile factory.
        """
        if role_enum == UserRole.DONOR:
            return Donor(
                organisation_name=profile_data["organisation_name"],
                contact_person=profile_data["contact_person"],
                phone=profile_data["phone"],
                address=profile_data["address"],
                latitude=profile_data.get("latitude") or None,
                longitude=profile_data.get("longitude") or None,
                verification_status=VerificationStatus.PENDING,
                is_active=True,
            )

        if role_enum == UserRole.NGO:
            return NGO(
                organisation_name=profile_data["organisation_name"],
                registration_number=profile_data["registration_number"].strip(),
                contact_person=profile_data["contact_person"],
                phone=profile_data["phone"],
                address=profile_data["address"],
                latitude=profile_data.get("latitude") or None,
                longitude=profile_data.get("longitude") or None,
                service_radius_km=profile_data.get("service_radius_km", 15),
                verification_status=VerificationStatus.PENDING,
                is_active=True,
            )

        if role_enum == UserRole.VOLUNTEER:
            vehicle_type_enum = VehicleType(profile_data["vehicle_type"].upper())
            return Volunteer(
                phone=profile_data["phone"],
                vehicle_type=vehicle_type_enum,
                latitude=profile_data.get("latitude") or None,
                longitude=profile_data.get("longitude") or None,
                verification_status=VerificationStatus.PENDING,
                is_active=True,
            )

        raise InvalidRegistrationRoleException(role_enum.value)
