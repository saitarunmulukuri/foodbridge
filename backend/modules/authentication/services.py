"""Service layer executing domain business logic for Authentication.

Transaction management (commit/rollback) lives exclusively here.
All security utilities are imported from ``backend/shared/security/``.
JWT generation is delegated to ``authentication/jwt.py``.

Design notes:
    - The public interface is minimal: register_user() and login_user().
    - Private helpers isolate individual workflow steps for testability.
    - _log_login_event() is a prepared extension point for future audit
      logging without requiring structural changes to this service.
    - Timing attack mitigation: verify_password() is always called, even
      when no user record is found, to prevent response-time enumeration.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple, Union

from backend.database import db
from backend.modules.authentication.exceptions import (
    AccountNotActiveException,
    EmailAlreadyExistsException,
    InvalidCredentialsException,
    InvalidRegistrationRoleException,
    RegistrationNumberAlreadyExistsException,
)
from backend.modules.authentication.jwt import generate_tokens
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
from backend.shared.security import (
    DUMMY_HASH,
    hash_password,
    normalize_email,
    verify_password,
)

logger = logging.getLogger(__name__)


class AuthenticationService:
    """Service encapsulating Registration and Login business rules.

    The public interface exposes high-level orchestration methods only.
    All implementation details are isolated into private helpers to keep
    individual steps focused, testable, and independently evolvable.

    Transaction management (commit/rollback) is performed exclusively here.
    """

    def __init__(self, repository: Optional[AuthenticationRepository] = None) -> None:
        self.repository = repository or AuthenticationRepository()

    # ------------------------------------------------------------------
    # Public Interface — Registration (Sprint 1.1)
    # ------------------------------------------------------------------

    def register_user(
        self, registration_data: Dict[str, Any]
    ) -> Tuple[User, Union[Donor, NGO, Volunteer]]:
        """Orchestrate new user registration within a single atomic transaction.

        Steps:
            1. Normalize email and resolve role.
            2. Validate pre-conditions (uniqueness).
            3. Hash password and determine account status.
            4. Construct User and role-specific profile entities.
            5. Stage both and commit. Rollback and re-raise on failure.

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
                "User registered: user_id=%s, role=%s, account_status=%s",
                user.user_id,
                role_enum.value,
                account_status.value,
            )
        except Exception:
            db.session.rollback()
            logger.exception(
                "Registration transaction failed: email=%s, role=%s",
                email,
                role_enum.value,
            )
            raise

        return user, profile

    # ------------------------------------------------------------------
    # Public Interface — Login (Sprint 1.2)
    # ------------------------------------------------------------------

    def login_user(self, login_data: Dict[str, Any]) -> Dict[str, Any]:
        """Authenticate a user and return JWT access and refresh tokens.

        Security rules:
            - Email-not-found and wrong-password produce an identical
              ``INVALID_CREDENTIALS`` response to prevent user enumeration.
            - verify_password() is called even when no user is found
              (using DUMMY_HASH) to maintain a consistent response time
              and resist timing-based enumeration attacks.
            - Account status is only revealed explicitly after successful
              credential verification (the user already knows their status).
            - last_login is updated within the same commit as token issuance.

        Steps:
            1. Normalize email.
            2. Find user; run dummy verify if not found (timing safety).
            3. Verify password against stored hash.
            4. Enforce ACTIVE account status.
            5. Update last_login and commit.
            6. Issue and return tokens.

        Args:
            login_data: Validated payload from UserLoginSchema.load().

        Returns:
            Dictionary containing access_token, refresh_token, token_type,
            expires_in, and a basic user information block.

        Raises:
            InvalidCredentialsException: If email is not found or password is wrong.
            AccountNotActiveException: If the account status is not ACTIVE.
        """
        email = normalize_email(login_data["email"])
        raw_password = login_data["password"]

        user = self.repository.find_by_email(email)
        authenticated = self._authenticate_credentials(user, raw_password)

        if not authenticated:
            raise InvalidCredentialsException()

        self._enforce_account_active(user)

        login_time = datetime.now(timezone.utc)
        try:
            self.repository.update_last_login(user, login_time)
            db.session.commit()
            logger.info(
                "Login successful: user_id=%s, role=%s",
                user.user_id,
                user.role.value,
            )
        except Exception:
            db.session.rollback()
            logger.exception(
                "Login transaction failed (last_login update): user_id=%s",
                user.user_id if user else "unknown",
            )
            raise

        self._log_login_event(user, login_time)

        tokens = generate_tokens(user)
        tokens["user"] = {
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role.value,
            "account_status": user.account_status.value,
        }
        return tokens

    # ------------------------------------------------------------------
    # Private Helpers — Login
    # ------------------------------------------------------------------

    def _authenticate_credentials(
        self, user: Optional[User], raw_password: str
    ) -> bool:
        """Verify credentials in constant time to resist timing enumeration.

        When no user record is found, ``verify_password`` is still called
        with a ``DUMMY_HASH`` to ensure the response time is indistinguishable
        from a failed password match. This prevents an attacker from
        distinguishing 'email not found' from 'wrong password' via timing.

        Args:
            user: User instance from the database, or None if not found.
            raw_password: Plaintext password from the login request.

        Returns:
            True if a real user was found and the password matched,
            False in all other cases.
        """
        if user is None:
            # Always run a hash check to normalize response time
            logger.warning("Login failed: email not found (timing-safe path executed).")
            verify_password(raw_password, DUMMY_HASH)
            return False

        if not verify_password(raw_password, user.password_hash):
            logger.warning(
                "Login failed: invalid password [user_id=%s]", user.user_id
            )
            return False

        return True

    def _enforce_account_active(self, user: User) -> None:
        """Raise AccountNotActiveException if the user's account is not ACTIVE.

        This check is performed after credential verification to avoid
        exposing whether an account exists for unregistered email addresses.

        Args:
            user: Credential-verified User instance.

        Raises:
            AccountNotActiveException: If account_status is not ACTIVE.
        """
        if user.account_status != AccountStatus.ACTIVE:
            logger.warning(
                "Login rejected: account not active [user_id=%s, status=%s]",
                user.user_id,
                user.account_status.value,
            )
            raise AccountNotActiveException(user.account_status.value)

    def _log_login_event(self, user: User, login_time: datetime) -> None:
        """Emit a structured log entry for a successful login event.

        This is a prepared extension point for future persistent audit logging
        (e.g. writing to an ``audit_logs`` table). Currently writes to the
        application logger only. No database writes occur here.

        When audit persistence is required (Sprint future):
            1. Inject an AuditLogRepository into AuthenticationService.
            2. Call repository.record_login_event(user, login_time) here.
            3. The method signature does not need to change.

        Args:
            user: The successfully authenticated User instance.
            login_time: UTC datetime of the login event.
        """
        logger.info(
            "LOGIN_AUDIT: user_id=%s, role=%s, email=%s, timestamp=%s",
            user.user_id,
            user.role.value,
            user.email,
            login_time.isoformat(),
        )

    # ------------------------------------------------------------------
    # Private Helpers — Registration
    # ------------------------------------------------------------------

    def _resolve_role(self, role_str: str) -> UserRole:
        """Convert a raw role string to a validated UserRole enum.

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
        """Assert uniqueness pre-conditions before creating any database records.

        Args:
            email: Normalized email address.
            role_enum: Resolved UserRole enum.
            profile_data: Role-specific profile fields.

        Raises:
            EmailAlreadyExistsException: If the email is already registered.
            RegistrationNumberAlreadyExistsException: If the NGO reg number exists.
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
                    "Registration rejected: NGO registration number taken [reg_num=%s]",
                    reg_num,
                )
                raise RegistrationNumberAlreadyExistsException(reg_num)

    def _determine_account_status(self, role_enum: UserRole) -> AccountStatus:
        """Return the initial AccountStatus for a newly registered user.

        Business rules:
            DONOR     → ACTIVE   (immediate platform access)
            VOLUNTEER → ACTIVE   (immediate platform access)
            NGO       → PENDING  (requires admin verification before use)

        Args:
            role_enum: Validated UserRole enum.

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
        """Construct an unpersisted User model instance.

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
        """Construct the role-specific unpersisted profile model instance.

        Latitude and longitude default to None (NULL in the database) when
        not provided. Using 0.0 is explicitly avoided because the geographic
        coordinate (0°N, 0°E) is a real, valid location that would corrupt
        the Decision Engine's distance-based NGO ranking calculations.

        Args:
            role_enum: Validated UserRole enum.
            profile_data: Role-specific fields from the registration payload.

        Returns:
            Unpersisted Donor, NGO, or Volunteer model instance.

        Raises:
            InvalidRegistrationRoleException: If no factory exists for the role.
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
