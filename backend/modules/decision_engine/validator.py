"""Donation validation component for the Decision Engine.

Ensures a donation meets all technical and business pre-conditions before entering
the NGO candidate selection and eligibility pipeline.
"""

import logging
from datetime import datetime, timezone

from backend.modules.decision_engine.exceptions import (
    DonationExpiredException,
    EmptyDonationException,
    InvalidDonationStatusException,
    InvalidDonorException,
)
from backend.modules.donations.models import Donation
from backend.shared.constants.enums import AccountStatus, DonationStatus

logger = logging.getLogger(__name__)


class DonationValidator:
    """Validator component verifying donation pre-conditions for matching."""

    # Statuses permitted to enter the decision pipeline
    ALLOWED_STATUSES = (
        DonationStatus.DRAFT,
        DonationStatus.SUBMITTED,
    )

    def validate(self, donation: Donation) -> None:
        """Validate that a loaded Donation instance is eligible for NGO matching.

        Validation Steps:
            1. Verify donation status is in ALLOWED_STATUSES (DRAFT, SUBMITTED).
            2. Verify donation has not passed its expiry time.
            3. Verify donation contains at least one food item.
            4. Verify donation belongs to an active donor with an active account.

        Args:
            donation: Eager-loaded Donation model instance.

        Raises:
            InvalidDonationStatusException: If status is not permitted for matching.
            DonationExpiredException: If expiry_time <= current time.
            EmptyDonationException: If items list is empty.
            InvalidDonorException: If donor profile or user account is missing/inactive.
        """
        self._validate_status(donation)
        self._validate_expiry(donation)
        self._validate_items(donation)
        self._validate_donor(donation)

        logger.debug(
            "Donation pre-condition validation passed for donation_id=%s.",
            donation.donation_id,
        )

    def _validate_status(self, donation: Donation) -> None:
        """Assert donation status allows entry into the decision engine."""
        if donation.status not in self.ALLOWED_STATUSES:
            logger.warning(
                "Donation validation failed: donation_id=%s status='%s' not in %s.",
                donation.donation_id,
                donation.status.value,
                [s.value for s in self.ALLOWED_STATUSES],
            )
            raise InvalidDonationStatusException(
                donation_id=donation.donation_id,
                current_status=donation.status.value,
            )

    def _validate_expiry(self, donation: Donation) -> None:
        """Assert donation has not passed its expiry timestamp."""
        now_utc = datetime.now(timezone.utc)
        expiry = donation.expiry_time

        # Handle timezone-naive datetimes from DB
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)

        if expiry <= now_utc:
            logger.warning(
                "Donation validation failed: donation_id=%s has expired (expiry=%s).",
                donation.donation_id,
                donation.expiry_time.isoformat(),
            )
            raise DonationExpiredException(donation_id=donation.donation_id)

    def _validate_items(self, donation: Donation) -> None:
        """Assert donation contains at least one food item."""
        if not donation.items or len(donation.items) == 0:
            logger.warning(
                "Donation validation failed: donation_id=%s has 0 items.",
                donation.donation_id,
            )
            raise EmptyDonationException(donation_id=donation.donation_id)

    def _validate_donor(self, donation: Donation) -> None:
        """Assert donation belongs to an active donor profile with an active user account."""
        donor = donation.donor
        if donor is None or not donor.is_active:
            logger.warning(
                "Donation validation failed: donation_id=%s donor is missing or inactive.",
                donation.donation_id,
            )
            raise InvalidDonorException(
                donation_id=donation.donation_id,
                donor_id=donation.donor_id,
            )

        if donor.user is not None and donor.user.account_status != AccountStatus.ACTIVE:
            logger.warning(
                "Donation validation failed: donation_id=%s donor user account status is '%s'.",
                donation.donation_id,
                donor.user.account_status.value,
            )
            raise InvalidDonorException(
                donation_id=donation.donation_id,
                donor_id=donation.donor_id,
            )
