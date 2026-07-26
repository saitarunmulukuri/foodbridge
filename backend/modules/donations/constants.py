"""Constants for the Donations module.

Centralizes message strings, audit trail constants, change sources,
and default configuration parameters.
"""


class AuditMessages:
    """Standardized status history audit trail change reasons."""

    DONATION_CREATED_BY_DONOR = "Donation created by donor."


class AuditChangeSources:
    """Standardized audit trail change sources for status history events."""

    DONOR = "DONOR"
    SYSTEM = "SYSTEM"
    ADMIN = "ADMIN"
    DECISION_ENGINE = "DECISION_ENGINE"
    VOLUNTEER = "VOLUNTEER"


class DonationDefaults:
    """Default configuration constants for donation processing."""

    DEFAULT_DELIVERY_PREFERENCE = "PICKUP_REQUIRED"
    MAX_ITEMS_PER_DONATION = 20
    MIN_ITEMS_PER_DONATION = 1
