"""Marshmallow schemas for the Donations module.

Handles request payload validation and response serialization for Sprint 2.1
(Donation Creation).
"""

from marshmallow import (
    Schema,
    ValidationError,
    fields,
    validate,
    validates_schema,
)

from backend.modules.donations.constants import DonationDefaults
from backend.modules.donations.validators import (
    validate_delivery_preference,
    validate_food_type,
    validate_item_category,
    validate_latitude,
    validate_longitude,
    validate_positive_quantity,
    validate_quantity_unit,
)


# -----------------------------------------------------------------------
# Donation Item Sub-Schema
# -----------------------------------------------------------------------


class DonationItemCreateSchema(Schema):
    """Schema for validating a single food item within a donation request.

    Extensibility Note:
        Future iterations may add a ``display_order`` (Integer) field to support
        custom item ordering without changing this schema's interface.
    """

    item_name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=150),
    )
    category = fields.Str(required=True, validate=validate_item_category)
    quantity = fields.Decimal(
        required=True,
        validate=validate_positive_quantity,
        as_string=False,
    )
    unit = fields.Str(required=True, validate=validate_quantity_unit)
    food_type = fields.Str(required=True, validate=validate_food_type)
    contains_allergens = fields.Bool(required=False, load_default=False)
    allergen_details = fields.Str(
        required=False,
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=500),
    )


# -----------------------------------------------------------------------
# Donation Creation Request Schema
# -----------------------------------------------------------------------


class DonationCreateSchema(Schema):
    """Schema for validating the POST /api/v1/donations request payload.

    Pickup Window Architecture:
        ``available_from`` represents the start of the donor's pickup availability window
        (pickup_start). ``expiry_time`` represents food safety expiration.
        Future schema iterations can accept an explicit ``pickup_end`` field without
        breaking this contract.

    Security Rule:
        ``donor_id`` is intentionally excluded from this schema. The donor profile
        is ALWAYS resolved server-side from the authenticated JWT token identity
        (user_id → Donor lookup).

    Cross-field Validation Rules (enforced in ``validates_schema``):
        1. ``expiry_time`` must be strictly after ``available_from``.
        2. ``items`` list length must be between 1 and MAX_ITEMS_PER_DONATION (20).
        3. If ``pickup_latitude`` is supplied, ``pickup_longitude`` must also be present
           and vice-versa (coordinate pair completeness).
    """

    # Core details
    donation_title = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=150),
    )
    description = fields.Str(
        required=False,
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=1000),
    )

    # Time window fields
    prepared_time = fields.DateTime(required=False, load_default=None, allow_none=True)
    available_from = fields.DateTime(required=True)  # Acts as pickup_start
    expiry_time = fields.DateTime(required=True)

    # Quantity summary
    total_quantity = fields.Decimal(
        required=True,
        validate=validate_positive_quantity,
        as_string=False,
    )
    quantity_unit = fields.Str(required=True, validate=validate_quantity_unit)

    # Pickup location
    pickup_address = fields.Str(
        required=True,
        validate=validate.Length(min=5, max=500),
    )
    pickup_landmark = fields.Str(
        required=False,
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=200),
    )
    pickup_city = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    pickup_state = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    pickup_postal_code = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=20),
    )
    pickup_latitude = fields.Decimal(
        required=True,
        as_string=False,
        validate=validate_latitude,
    )
    pickup_longitude = fields.Decimal(
        required=True,
        as_string=False,
        validate=validate_longitude,
    )

    # Logistics
    delivery_preference = fields.Str(
        required=False,
        load_default=DonationDefaults.DEFAULT_DELIVERY_PREFERENCE,
        validate=validate_delivery_preference,
    )
    special_instructions = fields.Str(
        required=False,
        load_default=None,
        allow_none=True,
        validate=validate.Length(max=500),
    )

    # Items — min 1, max 20
    items = fields.List(
        fields.Nested(DonationItemCreateSchema),
        required=True,
        validate=validate.Length(
            min=DonationDefaults.MIN_ITEMS_PER_DONATION,
            max=DonationDefaults.MAX_ITEMS_PER_DONATION,
            error=(
                f"A donation must contain between {DonationDefaults.MIN_ITEMS_PER_DONATION} "
                f"and {DonationDefaults.MAX_ITEMS_PER_DONATION} items."
            ),
        ),
    )

    @validates_schema
    def validate_time_window(self, data: dict, **kwargs) -> None:
        """Enforce logical time ordering constraints.

        Rule:
            expiry_time must be strictly after available_from (pickup start).
        """
        available_from = data.get("available_from")
        expiry_time = data.get("expiry_time")

        if available_from and expiry_time:
            if expiry_time <= available_from:
                raise ValidationError(
                    {
                        "expiry_time": [
                            "expiry_time must be strictly after available_from (pickup start)."
                        ]
                    }
                )

    @validates_schema
    def validate_coordinate_pair(self, data: dict, **kwargs) -> None:
        """Enforce geographic coordinate pair completeness.

        Rule:
            Latitude and longitude must both be present together.
        """
        lat = data.get("pickup_latitude")
        lon = data.get("pickup_longitude")

        if lat is not None and lon is None:
            raise ValidationError(
                {"pickup_longitude": ["pickup_longitude is required when pickup_latitude is provided."]}
            )
        if lon is not None and lat is None:
            raise ValidationError(
                {"pickup_latitude": ["pickup_latitude is required when pickup_longitude is provided."]}
            )


# -----------------------------------------------------------------------
# Response Schemas
# -----------------------------------------------------------------------


class DonationCreateResponseSchema(Schema):
    """Response schema for donation creation endpoint.

    Lifecycle Consistency Note:
        The initial lifecycle status returned is ``DRAFT``, matching the
        approved MySQL schema ENUM default:
        ``status ENUM('DRAFT', 'SUBMITTED', ...) DEFAULT 'DRAFT'``.
        All modules (model, repository, service, routes, audit trail)
        consistently use ``DRAFT``.
    """

    donation_id = fields.Int()
    status = fields.Str()
    created_at = fields.DateTime(format="iso")
