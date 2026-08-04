"""Custom domain exceptions for the NGO module (Profile + Capacity Management).

Sprint 3.1: NGO Profile Management exceptions
Sprint 3.2: NGO Date Capacity Management exceptions
"""

from backend.shared.exceptions.base_exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    ResourceNotFoundException,
    ValidationException,
)


# -----------------------------------------------------------------------
# Sprint 3.1: Profile Management Exceptions
# -----------------------------------------------------------------------


class NGONotFoundException(ResourceNotFoundException):
    """Raised when an NGO profile cannot be found for the authenticated user."""

    def __init__(self, user_id: int) -> None:
        super().__init__(
            message=f"NGO profile not found for user {user_id}.",
            status_code=404,
            error_code="NGO_NOT_FOUND",
        )


class NGOProfileValidationException(ValidationException):
    """Raised when PATCH /ngos/me payload fails validation."""

    def __init__(self, errors: dict) -> None:
        super().__init__(
            message="NGO profile update validation failed.",
            status_code=422,
            error_code="NGO_PROFILE_VALIDATION_ERROR",
            details=errors,
        )


class InsufficientRoleException(ForbiddenException):
    """Raised when a non-NGO user attempts to access NGO endpoints."""

    def __init__(self) -> None:
        super().__init__(
            message="Access denied. Only NGO accounts may access this resource.",
            status_code=403,
            error_code="INSUFFICIENT_ROLE",
        )


class RegistrationNumberImmutableException(ConflictException):
    """Raised when a verified NGO attempts to change its registration number.

    Business Rule:
        Once an NGO's verification_status is VERIFIED, its registration_number
        is locked and cannot be modified through the self-service profile API.
        An admin must perform any correction via the admin panel.
    """

    def __init__(self) -> None:
        super().__init__(
            message=(
                "registration_number cannot be changed after the NGO has been verified. "
                "Contact an administrator to request a correction."
            ),
            status_code=409,
            error_code="REGISTRATION_NUMBER_IMMUTABLE",
        )


# -----------------------------------------------------------------------
# Sprint 3.2: Capacity Management Exceptions
# -----------------------------------------------------------------------


class CapacityValidationException(ValidationException):
    """Raised when PUT /ngos/me/capacity payload fails validation."""

    def __init__(self, errors: dict) -> None:
        super().__init__(
            message="Capacity update validation failed.",
            status_code=422,
            error_code="CAPACITY_VALIDATION_ERROR",
            details=errors,
        )


class CapacityReductionBelowAllocatedException(BadRequestException):
    """Raised when maximum_capacity would be set below the currently allocated amount.

    Business Rule:
        maximum_capacity must never be reduced below allocated_capacity
        (the volume already committed to pending/active donations).
    """

    def __init__(self, date: str, maximum: int, allocated: int) -> None:
        super().__init__(
            message=(
                f"Cannot set maximum_capacity to {maximum} for {date}: "
                f"{allocated} meals are already allocated. "
                f"maximum_capacity must be \u2265 {allocated}."
            ),
            status_code=400,
            error_code="CAPACITY_REDUCTION_BELOW_ALLOCATED",
        )


class CapacityRecordNotFoundException(ResourceNotFoundException):
    """Raised when no capacity record exists for the requested date."""

    def __init__(self, date: str) -> None:
        super().__init__(
            message=f"No capacity record found for {date}.",
            status_code=404,
            error_code="CAPACITY_RECORD_NOT_FOUND",
        )


class PastDateException(BadRequestException):
    """Raised when an NGO attempts to set capacity for a past date.

    Business Rule (Sprint 3.2):
        Capacity records can only be created or updated for today or
        future dates. Historical dates are immutable.
    """

    def __init__(self, date: str) -> None:
        super().__init__(
            message=(
                f"Cannot set capacity for past date {date}. "
                "Capacity records may only be created or updated for "
                "today or future dates."
            ),
            status_code=400,
            error_code="CAPACITY_PAST_DATE",
        )
