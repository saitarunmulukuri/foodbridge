"""Custom domain exceptions for the Decision Engine module.

Exception Hierarchy:
    DecisionEngineError (base)
        ├── DonationValidationError (base for all donation pre-condition failures)
        │       ├── DonationNotFoundException
        │       ├── InvalidDonationStatusException
        │       ├── DonationExpiredException
        │       ├── EmptyDonationException
        │       └── InvalidDonorException
        └── MatchingError (base for pipeline execution failures)
                └── NoEligibleNGOsException
"""

from backend.shared.exceptions.base_exceptions import (
    BadRequestException,
    ResourceNotFoundException,
)


# -----------------------------------------------------------------------
# Base Exception
# -----------------------------------------------------------------------


class DecisionEngineError(Exception):
    """Base class for all Decision Engine domain exceptions."""


# -----------------------------------------------------------------------
# Donation Validation Exceptions
# -----------------------------------------------------------------------


class DonationNotFoundException(ResourceNotFoundException):
    """Raised when a requested donation does not exist in the database."""

    def __init__(self, donation_id: int) -> None:
        super().__init__(
            message=f"Donation with ID {donation_id} was not found.",
            status_code=404,
            error_code="DONATION_NOT_FOUND",
        )


class InvalidDonationStatusException(BadRequestException):
    """Raised when a donation is not in a valid state for the matching pipeline."""

    def __init__(self, donation_id: int, current_status: str) -> None:
        super().__init__(
            message=(
                f"Donation {donation_id} is in status '{current_status}' "
                f"and cannot enter the matching pipeline."
            ),
            status_code=400,
            error_code="INVALID_DONATION_STATUS",
        )


class DonationExpiredException(BadRequestException):
    """Raised when a donation has passed its expiry timestamp."""

    def __init__(self, donation_id: int) -> None:
        super().__init__(
            message=(
                f"Donation {donation_id} has expired and is no longer "
                f"eligible for matching."
            ),
            status_code=400,
            error_code="DONATION_EXPIRED",
        )


class EmptyDonationException(BadRequestException):
    """Raised when a donation contains no food items."""

    def __init__(self, donation_id: int) -> None:
        super().__init__(
            message=f"Donation {donation_id} contains no food items and cannot be matched.",
            status_code=400,
            error_code="EMPTY_DONATION",
        )


class InvalidDonorException(BadRequestException):
    """Raised when the donor associated with a donation is invalid or inactive."""

    def __init__(self, donation_id: int, donor_id: int) -> None:
        super().__init__(
            message=(
                f"Donation {donation_id} is associated with invalid or "
                f"inactive donor profile {donor_id}."
            ),
            status_code=400,
            error_code="INVALID_DONOR",
        )


# -----------------------------------------------------------------------
# Matching Pipeline Exceptions
# -----------------------------------------------------------------------


class NoEligibleNGOsException(ResourceNotFoundException):
    """Raised when no candidate NGOs pass the eligibility filter pipeline."""

    def __init__(self, donation_id: int) -> None:
        super().__init__(
            message=(
                f"No eligible NGOs found for donation {donation_id} at this time."
            ),
            status_code=404,
            error_code="NO_ELIGIBLE_NGOS",
        )
