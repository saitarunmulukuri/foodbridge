"""Field-level validators for the Donations module.

Used as Marshmallow field-level validators.
All functions raise ``marshmallow.ValidationError`` on failure.
"""

from typing import Union
from marshmallow import ValidationError

from backend.shared.constants.enums import (
    DeliveryPreference,
    FoodType,
    ItemCategory,
    QuantityUnit,
)


def validate_positive_quantity(value: Union[int, float, str]) -> None:
    """Assert quantity is strictly greater than zero.

    Args:
        value: Numeric quantity value from the request payload.

    Raises:
        ValidationError: If value is zero, negative, or non-numeric.
    """
    try:
        numeric_val = float(value)
        if numeric_val <= 0:
            raise ValidationError("Quantity must be greater than zero.")
    except (TypeError, ValueError):
        raise ValidationError("Quantity must be a valid positive number.")


def validate_latitude(value: Union[int, float, str]) -> None:
    """Assert latitude is within valid geographic boundaries (-90 to +90 degrees).

    Standard WGS-84 coordinate precision rule:
        Stored as DECIMAL(10, 7) in the database.

    Args:
        value: Latitude float/decimal from the request.

    Raises:
        ValidationError: If value is outside [-90, 90].
    """
    try:
        lat = float(value)
        if lat < -90.0 or lat > 90.0:
            raise ValidationError("Latitude must be between -90 and 90 degrees.")
    except (TypeError, ValueError):
        raise ValidationError("Latitude must be a valid numeric coordinate.")


def validate_longitude(value: Union[int, float, str]) -> None:
    """Assert longitude is within valid geographic boundaries (-180 to +180 degrees).

    Standard WGS-84 coordinate precision rule:
        Stored as DECIMAL(10, 7) in the database.

    Args:
        value: Longitude float/decimal from the request.

    Raises:
        ValidationError: If value is outside [-180, 180].
    """
    try:
        lon = float(value)
        if lon < -180.0 or lon > 180.0:
            raise ValidationError("Longitude must be between -180 and 180 degrees.")
    except (TypeError, ValueError):
        raise ValidationError("Longitude must be a valid numeric coordinate.")


def validate_item_category(value: str) -> None:
    """Assert the item category is a recognized ItemCategory enum value.

    Args:
        value: Raw category string from the request payload.

    Raises:
        ValidationError: If not a valid ItemCategory value.
    """
    allowed = [c.value for c in ItemCategory]
    try:
        ItemCategory(value.upper())
    except (ValueError, AttributeError):
        raise ValidationError(
            f"Invalid category '{value}'. Allowed values: {', '.join(allowed)}."
        )


def validate_food_type(value: str) -> None:
    """Assert the food type is a recognized FoodType enum value.

    Args:
        value: Raw food_type string from the request payload.

    Raises:
        ValidationError: If not a valid FoodType value.
    """
    allowed = [t.value for t in FoodType]
    try:
        FoodType(value.upper())
    except (ValueError, AttributeError):
        raise ValidationError(
            f"Invalid food_type '{value}'. Allowed values: {', '.join(allowed)}."
        )


def validate_quantity_unit(value: str) -> None:
    """Assert the quantity unit is a recognized QuantityUnit enum value.

    Args:
        value: Raw unit string from the request payload.

    Raises:
        ValidationError: If not a valid QuantityUnit value.
    """
    allowed = [u.value for u in QuantityUnit]
    try:
        QuantityUnit(value.upper())
    except (ValueError, AttributeError):
        raise ValidationError(
            f"Invalid unit '{value}'. Allowed values: {', '.join(allowed)}."
        )


def validate_delivery_preference(value: str) -> None:
    """Assert the delivery preference is a recognized DeliveryPreference enum value.

    Args:
        value: Raw delivery_preference string from the request payload.

    Raises:
        ValidationError: If not a valid DeliveryPreference value.
    """
    allowed = [p.value for p in DeliveryPreference]
    try:
        DeliveryPreference(value.upper())
    except (ValueError, AttributeError):
        raise ValidationError(
            f"Invalid delivery_preference '{value}'. Allowed values: {', '.join(allowed)}."
        )
