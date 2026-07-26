"""Custom domain exceptions for the Authentication module."""

from backend.shared.exceptions.base_exceptions import (
    BadRequestException,
    ConflictException,
    UnauthorizedException,
    ValidationException,
)


# -----------------------------------------------------------------------
# Registration Exceptions
# -----------------------------------------------------------------------


class EmailAlreadyExistsException(ConflictException):
    """Exception raised when registering an email address that already exists."""

    def __init__(self, email: str) -> None:
        super().__init__(
            message=f"An account with email '{email}' already exists.",
            status_code=409,
            error_code="EMAIL_ALREADY_EXISTS",
        )


class RegistrationNumberAlreadyExistsException(ConflictException):
    """Exception raised when an NGO registration number is already registered."""

    def __init__(self, registration_number: str) -> None:
        super().__init__(
            message=f"An NGO with registration number '{registration_number}' already exists.",
            status_code=409,
            error_code="REGISTRATION_NUMBER_ALREADY_EXISTS",
        )


class InvalidRegistrationRoleException(BadRequestException):
    """Exception raised when attempting to self-register with an unauthorized role (e.g. ADMIN)."""

    def __init__(self, role: str) -> None:
        super().__init__(
            message=f"Self-registration for role '{role}' is not allowed.",
            status_code=400,
            error_code="INVALID_REGISTRATION_ROLE",
        )


class RegistrationValidationException(ValidationException):
    """Exception raised for payload validation failures during registration."""

    def __init__(self, details: dict) -> None:
        super().__init__(
            message="User registration validation failed.",
            status_code=422,
            error_code="VALIDATION_ERROR",
            details=details,
        )


# -----------------------------------------------------------------------
# Login Exceptions
# -----------------------------------------------------------------------


class InvalidCredentialsException(UnauthorizedException):
    """Exception raised for failed authentication attempts.

    Security note: This exception is intentionally generic. It must NEVER
    reveal whether the failure was caused by an unknown email or a wrong
    password, to prevent user enumeration attacks.
    """

    def __init__(self) -> None:
        super().__init__(
            message="Invalid credentials. Please check your email and password.",
            status_code=401,
            error_code="INVALID_CREDENTIALS",
        )


class AccountNotActiveException(UnauthorizedException):
    """Exception raised when a user attempts to log in with a non-ACTIVE account."""

    def __init__(self, account_status: str) -> None:
        super().__init__(
            message=f"Your account is currently '{account_status}' and cannot log in. "
                    f"Please contact support.",
            status_code=401,
            error_code="ACCOUNT_NOT_ACTIVE",
        )


class LoginValidationException(ValidationException):
    """Exception raised for payload validation failures during login."""

    def __init__(self, details: dict) -> None:
        super().__init__(
            message="Login validation failed.",
            status_code=422,
            error_code="VALIDATION_ERROR",
            details=details,
        )
