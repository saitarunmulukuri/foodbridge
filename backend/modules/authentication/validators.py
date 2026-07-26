"""Input validators for the Authentication registration module.

These validators are used as Marshmallow field-level validators.
They raise marshmallow.ValidationError on failure.
"""

import re

from marshmallow import ValidationError

from backend.shared.constants.enums import UserRole

# Matches passwords with: ≥8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special char
_SPECIAL_CHAR_PATTERN = re.compile(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?]")


def validate_password_policy(password: str) -> None:
    """Validate a password against the FoodBridge password policy.

    Policy requirements:
        - Minimum 8 characters.
        - At least 1 uppercase letter (A-Z).
        - At least 1 lowercase letter (a-z).
        - At least 1 digit (0-9).
        - At least 1 special character.

    Args:
        password: Raw plaintext password string from the request.

    Raises:
        ValidationError: If any policy requirement is not met.
    """
    if not password:
        raise ValidationError("Password is required.")

    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long.")

    if not re.search(r"[A-Z]", password):
        raise ValidationError("Password must contain at least one uppercase letter.")

    if not re.search(r"[a-z]", password):
        raise ValidationError("Password must contain at least one lowercase letter.")

    if not re.search(r"\d", password):
        raise ValidationError("Password must contain at least one digit.")

    if not _SPECIAL_CHAR_PATTERN.search(password):
        raise ValidationError("Password must contain at least one special character.")


def validate_registration_role(role_str: str) -> None:
    """Validate that a role is permitted for public self-registration.

    Allowed roles: DONOR, NGO, VOLUNTEER.
    Rejected roles: ADMIN (and any unrecognized value).

    Args:
        role_str: Raw role string from the registration payload.

    Raises:
        ValidationError: If the role is unrecognized or restricted.
    """
    try:
        role_enum = UserRole(role_str.upper())
    except ValueError:
        allowed = ", ".join(
            r.value for r in UserRole if r != UserRole.ADMIN
        )
        raise ValidationError(
            f"Invalid role '{role_str}'. Allowed roles: {allowed}."
        )

    if role_enum == UserRole.ADMIN:
        raise ValidationError("Self-registration for the ADMIN role is not permitted.")
