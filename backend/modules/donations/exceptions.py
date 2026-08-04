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


class DonationNotFoundException(BadRequestException):
    """Exception raised when a donation_id does not exist in the database."""

    def __init__(self, donation_id: int) -> None:
        from backend.shared.exceptions.base_exceptions import ResourceNotFoundException
        super().__init__(
            message=f"Donation #{donation_id} was not found.",
            status_code=404,
            error_code="DONATION_NOT_FOUND",
        )
        self.status_code = 404  # override to 404


class DonationForbiddenException(BadRequestException):
    """Exception raised when a user tries to act on a donation they do not own."""

    def __init__(self, donation_id: int) -> None:
        super().__init__(
            message=f"You do not have permission to access donation #{donation_id}.",
            status_code=403,
            error_code="DONATION_FORBIDDEN",
        )
        self.status_code = 403  # override to 403


class InvalidDonationStateException(BadRequestException):
    """Exception raised when a donation is in the wrong state for a transition."""

    def __init__(self, donation_id: int, current_status: str, required_status: str) -> None:
        super().__init__(
            message=(
                f"Donation #{donation_id} is currently '{current_status}' "
                f"and must be '{required_status}' for this operation."
            ),
            status_code=409,
            error_code="INVALID_DONATION_STATE",
        )
        self.status_code = 409
