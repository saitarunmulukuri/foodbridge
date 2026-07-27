"""Custom domain exceptions for the NGO module (Profile + Capacity Management).

Sprint 3.1: NGO Profile Management exceptions
Sprint 3.2: NGO Daily Capacity Management exceptions
"""

from backend.shared.exceptions.base_exceptions import (
    BadRequestException,
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

    def __init__(self, day_of_week: str, maximum: int, allocated: int) -> None:
        super().__init__(
            message=(
                f"Cannot set maximum_capacity to {maximum} for {day_of_week}: "
                f"{allocated} meals are already allocated. "
                f"maximum_capacity must be ≥ {allocated}."
            ),
            status_code=400,
            error_code="CAPACITY_REDUCTION_BELOW_ALLOCATED",
        )


class CapacityRecordNotFoundException(ResourceNotFoundException):
    """Raised when no capacity record exists for the requested day."""

    def __init__(self, day_of_week: str) -> None:
        super().__init__(
            message=f"No capacity record found for {day_of_week}.",
            status_code=404,
            error_code="CAPACITY_RECORD_NOT_FOUND",
        )
