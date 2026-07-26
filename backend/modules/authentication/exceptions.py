"""Custom domain exceptions for the Authentication module."""

from backend.shared.exceptions.base_exceptions import (
    BadRequestException,
    ConflictException,
    ValidationException,
)


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
