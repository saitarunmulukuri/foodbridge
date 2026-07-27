"""Field-level validators for the NGO module (Profile + Capacity Management).

Sprint 3.1: Profile validators — phone, website, coordinates, service_radius
Sprint 3.2: Capacity validators — maximum_capacity, day_of_week
"""

import re
from urllib.parse import urlparse

from marshmallow import ValidationError

from backend.shared.constants.enums import DayOfWeek

# -----------------------------------------------------------------------
# Sprint 3.1: Profile Validators
# -----------------------------------------------------------------------

_PHONE_RE = re.compile(r"^\+?[0-9\s\-().]{7,20}$")


def validate_phone(value: str) -> None:
    """Validate phone number format (7–20 chars, digits/spaces/hyphens/parens/dots)."""
    stripped = value.strip()
    if not _PHONE_RE.match(stripped):
        raise ValidationError(
            "Phone number must be 7–20 characters and may contain digits, "
            "spaces, hyphens, parentheses, dots, and an optional leading '+'."
        )


def validate_website_url(value: str) -> None:
    """Validate that a website URL uses HTTP or HTTPS and has a valid domain."""
    try:
        parsed = urlparse(value.strip())
        if parsed.scheme not in ("http", "https"):
            raise ValueError("scheme not http/https")
        if not parsed.netloc or "." not in parsed.netloc:
            raise ValueError("missing or invalid domain")
    except Exception:
        raise ValidationError(
            "Website must be a valid HTTP or HTTPS URL (e.g. https://example.org)."
        )


def validate_latitude(value) -> None:
    """Validate latitude is within WGS-84 range [-90, 90]."""
    try:
        fval = float(value)
    except (TypeError, ValueError):
        raise ValidationError("Latitude must be a numeric value.")
    if not (-90.0 <= fval <= 90.0):
        raise ValidationError("Latitude must be between -90.0 and 90.0.")


def validate_longitude(value) -> None:
    """Validate longitude is within WGS-84 range [-180, 180]."""
    try:
        fval = float(value)
    except (TypeError, ValueError):
        raise ValidationError("Longitude must be a numeric value.")
    if not (-180.0 <= fval <= 180.0):
        raise ValidationError("Longitude must be between -180.0 and 180.0.")


def validate_service_radius(value: int) -> None:
    """Validate service radius is a positive integer."""
    if not isinstance(value, int) or value <= 0:
        raise ValidationError("service_radius_km must be a positive integer (≥ 1).")


# -----------------------------------------------------------------------
# Sprint 3.2: Capacity Validators
# -----------------------------------------------------------------------

_VALID_DAYS = {d.value for d in DayOfWeek}


def validate_maximum_capacity(value: int) -> None:
    """Validate that maximum_capacity is a strictly positive integer.

    Business Rule:
        maximum_capacity must be > 0. Zero capacity makes no operational sense.

    Args:
        value: The maximum daily meal capacity submitted.

    Raises:
        ValidationError: If value is not a positive integer.
    """
    if not isinstance(value, int) or value <= 0:
        raise ValidationError(
            "maximum_capacity must be a positive integer greater than zero."
        )


def validate_day_of_week(value: str) -> None:
    """Validate that the supplied string is a valid DayOfWeek enum value.

    Args:
        value: Day-of-week string (e.g. 'MONDAY', 'TUESDAY').

    Raises:
        ValidationError: If value is not a valid DayOfWeek.
    """
    if value.upper() not in _VALID_DAYS:
        raise ValidationError(
            f"day_of_week must be one of: {sorted(_VALID_DAYS)}."
        )
