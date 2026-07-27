"""Custom domain exceptions for the Donation Request module — Sprint 4.1.

Exception Hierarchy:
    DonationRequestError (informational base)
        ├── DonationRequestNotFoundException
        ├── DonationRequestForbiddenException
        ├── DonationRequestAlreadyResolvedException
        └── DonationRequestExpiredException
"""

from backend.shared.exceptions.base_exceptions import (
    ForbiddenException,
    ResourceNotFoundException,
    BadRequestException,
    ValidationException,
)


class DonationRequestNotFoundException(ResourceNotFoundException):
    """Raised when a donation request (ngo_request_id) is not found."""

    def __init__(self, request_id: int) -> None:
        super().__init__(
            message=f"Donation request {request_id} was not found.",
            status_code=404,
            error_code="DONATION_REQUEST_NOT_FOUND",
        )


class DonationRequestForbiddenException(ForbiddenException):
    """Raised when an NGO attempts to act on a request that belongs to another NGO."""

    def __init__(self, request_id: int) -> None:
        super().__init__(
            message=(
                f"You are not authorised to act on donation request {request_id}. "
                f"Only the assigned NGO may accept or decline this request."
            ),
            status_code=403,
            error_code="DONATION_REQUEST_FORBIDDEN",
        )


class DonationRequestAlreadyResolvedException(BadRequestException):
    """Raised when an NGO attempts to accept or decline an already-resolved request.

    A request is 'resolved' if its status is ACCEPTED, REJECTED, TIMED_OUT,
    or AUTO_CANCELLED — i.e. it is no longer in the PENDING state.
    """

    def __init__(self, request_id: int, current_status: str) -> None:
        super().__init__(
            message=(
                f"Donation request {request_id} cannot be actioned: "
                f"it is already in status '{current_status}'."
            ),
            status_code=409,
            error_code="DONATION_REQUEST_ALREADY_RESOLVED",
        )


class DonationRequestExpiredException(BadRequestException):
    """Raised when an NGO attempts to accept or decline an expired request."""

    def __init__(self, request_id: int) -> None:
        super().__init__(
            message=(
                f"Donation request {request_id} has passed its response deadline "
                f"and can no longer be accepted or declined."
            ),
            status_code=410,
            error_code="DONATION_REQUEST_EXPIRED",
        )


class DonationRequestValidationException(ValidationException):
    """Raised when a decline payload fails schema validation."""

    def __init__(self, errors: dict) -> None:
        super().__init__(
            message="Donation request action validation failed.",
            status_code=422,
            error_code="DONATION_REQUEST_VALIDATION_ERROR",
            details=errors,
        )


class InsufficientRoleException(ForbiddenException):
    """Raised when a non-NGO user attempts to access donation request endpoints."""

    def __init__(self) -> None:
        super().__init__(
            message="Access denied. Only NGO accounts may access donation requests.",
            status_code=403,
            error_code="INSUFFICIENT_ROLE",
        )
