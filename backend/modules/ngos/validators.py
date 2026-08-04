"""Field-level validators for the NGO module (Profile + Capacity Management).

Sprint 3.1: Profile validators — phone, website, coordinates, service_radius,
            city, state, country, postal_code
Sprint 3.2: Capacity validators — maximum_capacity, day_of_week, date
"""

import re
from datetime import date as date_type, datetime, timezone
from urllib.parse import urlparse

from marshmallow import ValidationError

from backend.shared.constants.enums import DayOfWeek

# -----------------------------------------------------------------------
# Sprint 3.1: Profile Validators
# -----------------------------------------------------------------------

_PHONE_RE = re.compile(r"^\+?[0-9\s\-().]{7,20}$")
_POSTAL_CODE_RE = re.compile(r"^[A-Za-z0-9\s\-]{2,20}$")


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


def validate_date_not_in_past(value: date_type) -> None:
    """Validate that a calendar date is today or in the future (UTC).

    Used with ``fields.Date()``, so ``value`` is already a parsed
    ``datetime.date`` object — format errors are handled by marshmallow.

    Business Rule (Sprint 3.2):
        An NGO cannot set capacity for a date that has already passed.
        The comparison uses UTC date for consistency across deployments.

    Args:
        value: Parsed calendar date from the request payload.

    Raises:
        ValidationError: If ``value`` is strictly before today (UTC).
    """
    today: date_type = datetime.now(timezone.utc).date()
    if value < today:
        raise ValidationError(
            f"date cannot be in the past. "
            f"Earliest allowed date is {today.isoformat()}."
        )


def validate_city(value: str) -> None:
    """Validate city name is non-empty and within the 100-character column limit.

    Args:
        value: City string from the request payload.

    Raises:
        ValidationError: If the value is blank or exceeds 100 characters.
    """
    stripped = value.strip()
    if not stripped:
        raise ValidationError("city must not be blank.")
    if len(stripped) > 100:
        raise ValidationError("city must be 100 characters or fewer.")


def validate_state(value: str) -> None:
    """Validate state/province name is non-empty and within 100 characters.

    Args:
        value: State string from the request payload.

    Raises:
        ValidationError: If the value is blank or exceeds 100 characters.
    """
    stripped = value.strip()
    if not stripped:
        raise ValidationError("state must not be blank.")
    if len(stripped) > 100:
        raise ValidationError("state must be 100 characters or fewer.")


def validate_country(value: str) -> None:
    """Validate country name is non-empty and within 100 characters.

    Args:
        value: Country string from the request payload.

    Raises:
        ValidationError: If the value is blank or exceeds 100 characters.
    """
    stripped = value.strip()
    if not stripped:
        raise ValidationError("country must not be blank.")
    if len(stripped) > 100:
        raise ValidationError("country must be 100 characters or fewer.")


def validate_postal_code(value: str) -> None:
    """Validate postal / PIN code format (alphanumeric, spaces, hyphens; 2–20 chars).

    Accepts international formats (e.g. '500032', 'SW1A 1AA', '10001-1234').

    Args:
        value: Postal code string from the request payload.

    Raises:
        ValidationError: If the value does not match the expected pattern.
    """
    stripped = value.strip()
    if not _POSTAL_CODE_RE.match(stripped):
        raise ValidationError(
            "postal_code must be 2–20 alphanumeric characters "
            "(spaces and hyphens allowed)."
        )


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
