"""Email normalization utility for FoodBridge.

Provides a consistent, single-source-of-truth function for normalizing
email addresses before storage or database lookup. Full format validation
is handled by Marshmallow schemas at the API boundary.
"""

import logging

logger = logging.getLogger(__name__)


def normalize_email(email: str) -> str:
    """Normalize an email address for consistent storage and lookup.

    Normalization steps:
        1. Strip leading and trailing whitespace.
        2. Convert to lowercase.
        3. Assert the result is structurally non-empty.

    Full email format validation (RFC 5322) is the responsibility of
    Marshmallow's ``fields.Email`` at the API input boundary.
    This function performs only the normalization required for safe
    database storage and lookup.

    Args:
        email: Raw email string from the client.

    Returns:
        Normalized email string.

    Raises:
        ValueError: If the input is not a string or is empty after normalization.
    """
    if not email or not isinstance(email, str):
        raise ValueError("Email must be a non-empty string.")

    normalized = email.strip().lower()

    if not normalized:
        raise ValueError("Email address cannot be empty after normalization.")

    # Lightweight structural guard — full validation is handled by Marshmallow
    if "@" not in normalized or "." not in normalized.split("@")[-1]:
        raise ValueError(
            f"Normalized email '{normalized}' does not appear structurally valid."
        )

    return normalized
