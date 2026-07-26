"""Custom domain exceptions for the Donations module."""

from backend.shared.exceptions.base_exceptions import (
    BadRequestException,
    ForbiddenException,
    ValidationException,
)


class InsufficientRoleException(ForbiddenException):
    """Exception raised when the caller's role is not permitted for this action.

    Returned when a non-DONOR account (NGO, VOLUNTEER, ADMIN) attempts to create a donation.
    """

    def __init__(self, required_role: str) -> None:
        super().__init__(
            message=f"Access denied. This action requires the '{required_role}' role.",
            status_code=403,
            error_code="INSUFFICIENT_ROLE",
        )


class DonorProfileNotFoundException(ForbiddenException):
    """Exception raised when an authenticated DONOR user has no associated donor profile.

    This indicates the user registered as DONOR but the donor profile record
    is missing — acts as a database data integrity guard.
    """

    def __init__(self, user_id: int) -> None:
        super().__init__(
            message="No donor profile was found for this account. "
                    "Please complete your donor profile before creating a donation.",
            status_code=403,
            error_code="DONOR_PROFILE_NOT_FOUND",
        )


class DonationValidationException(ValidationException):
    """Exception raised for payload validation failures during donation creation."""

    def __init__(self, details: dict) -> None:
        super().__init__(
            message="Donation creation validation failed.",
            status_code=422,
            error_code="VALIDATION_ERROR",
            details=details,
        )


class InvalidDonationWindowException(BadRequestException):
    """Exception raised when pickup or expiry time ordering constraints are violated."""

    def __init__(self, message: str) -> None:
        super().__init__(
            message=message,
            status_code=400,
            error_code="INVALID_DONATION_WINDOW",
        )
