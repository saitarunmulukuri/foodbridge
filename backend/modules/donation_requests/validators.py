"""Field-level validators for the Donation Request module — Sprint 4.1."""

from marshmallow import ValidationError


def validate_decline_reason(value: str) -> None:
    """Validate that a decline reason is a non-empty string within length limits.

    Args:
        value: The reason text provided by the NGO.

    Raises:
        ValidationError: If value is empty or exceeds 1000 characters.
    """
    stripped = value.strip() if value else ""
    if not stripped:
        raise ValidationError("decline_reason must not be empty.")
    if len(stripped) > 1000:
        raise ValidationError("decline_reason must not exceed 1000 characters.")
