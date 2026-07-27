"""Marshmallow schemas for the NGO module (Profile + Capacity Management).

Sprint 3.1: NGOProfileUpdateSchema, NGOProfileResponseSchema
Sprint 3.2: NGOCapacityReadSchema, NGOCapacityUpdateSchema, NGOCapacityResponseSchema

Capacity Model Note:
    The API exposes three fields: maximum_capacity, allocated_capacity, remaining_capacity.
    These map to the NGODailyCapacity ORM model as follows:

        API Field            │  ORM Column
        ─────────────────────┼──────────────────────
        maximum_capacity     │  max_meals
        allocated_capacity   │  COMPUTED: max_meals - remaining_capacity
        remaining_capacity   │  COMPUTED: not stored, calculated at read time

    remaining_capacity is NEVER stored as a raw input — it is always derived:
        remaining_capacity = maximum_capacity - allocated_capacity
"""

from marshmallow import EXCLUDE, Schema, ValidationError, fields, validate, validates_schema

from backend.modules.ngos.validators import (
    validate_day_of_week,
    validate_latitude,
    validate_longitude,
    validate_maximum_capacity,
    validate_phone,
    validate_service_radius,
    validate_website_url,
)


# -----------------------------------------------------------------------
# Sprint 3.1: Profile Schemas
# -----------------------------------------------------------------------


class NGOProfileUpdateSchema(Schema):
    """Schema for validating PATCH /api/v1/ngos/me request body.

    All fields optional — at least one must be provided.
    Unknown fields (email, registration_number, etc.) are silently excluded.
    """

    class Meta:
        unknown = EXCLUDE

    # Identity / organisation
    organisation_name = fields.Str(required=False, validate=validate.Length(min=2, max=200))
    contact_person = fields.Str(required=False, validate=validate.Length(min=2, max=100))
    phone = fields.Str(required=False, validate=validate_phone)

    # Location
    address = fields.Str(required=False, validate=validate.Length(min=5, max=500))
    latitude = fields.Decimal(required=False, as_string=False, validate=validate_latitude)
    longitude = fields.Decimal(required=False, as_string=False, validate=validate_longitude)

    # Operational
    service_radius_km = fields.Int(required=False, validate=validate_service_radius)

    @validates_schema
    def validate_at_least_one_field(self, data: dict, **kwargs) -> None:
        """Reject requests that provide no updatable fields."""
        if not data:
            raise ValidationError(
                {"_schema": ["At least one updatable field must be provided."]}
            )

    @validates_schema
    def validate_coordinate_pair(self, data: dict, **kwargs) -> None:
        """Enforce latitude + longitude coordinate pair completeness."""
        lat = data.get("latitude")
        lon = data.get("longitude")
        if lat is not None and lon is None:
            raise ValidationError({"longitude": ["longitude is required when latitude is provided."]})
        if lon is not None and lat is None:
            raise ValidationError({"latitude": ["latitude is required when longitude is provided."]})


class NGOProfileResponseSchema(Schema):
    """Response schema for GET /api/v1/ngos/me and PATCH /api/v1/ngos/me."""

    ngo_id = fields.Int(dump_default=None)
    user_id = fields.Int(dump_default=None)
    organisation_name = fields.Str(dump_default=None)
    registration_number = fields.Str(dump_default=None)
    contact_person = fields.Str(dump_default=None)
    phone = fields.Str(dump_default=None)
    address = fields.Str(dump_default=None)
    latitude = fields.Decimal(as_string=True, dump_default=None)
    longitude = fields.Decimal(as_string=True, dump_default=None)
    service_radius_km = fields.Int(dump_default=None)
    verification_status = fields.Str(dump_default=None)
    is_active = fields.Bool(dump_default=None)
    created_at = fields.DateTime(format="iso", dump_default=None)
    updated_at = fields.DateTime(format="iso", dump_default=None)


# -----------------------------------------------------------------------
# Sprint 3.2: Capacity Schemas
# -----------------------------------------------------------------------


class NGOCapacityUpdateSchema(Schema):
    """Schema for validating PUT /api/v1/ngos/me/capacity request body.

    Fields:
        day_of_week: Target day — MONDAY through SUNDAY (required).
        maximum_capacity: New maximum daily meal intake limit (required, > 0).
        status: Optional CapacityStatus override (ACTIVE, PAUSED, FULL).
            If not provided, status remains unchanged on update.

    Business Rules enforced downstream (in service layer):
        - maximum_capacity must be ≥ current allocated_capacity.
        - remaining_capacity is calculated, not accepted from client.

    Read-only (never accepted from client):
        - allocated_capacity  (computed from historical allocations)
        - remaining_capacity  (computed: maximum_capacity - allocated_capacity)
        - capacity_id         (system assigned)
        - ngo_id              (from JWT identity)
    """

    class Meta:
        unknown = EXCLUDE

    day_of_week = fields.Str(
        required=True,
        validate=validate_day_of_week,
    )
    maximum_capacity = fields.Int(
        required=True,
        validate=validate_maximum_capacity,
    )
    status = fields.Str(
        required=False,
        load_default=None,
        validate=validate.OneOf(
            ["ACTIVE", "PAUSED", "FULL"],
            error="status must be one of: ACTIVE, PAUSED, FULL.",
        ),
    )

    @validates_schema
    def normalise_day_of_week(self, data: dict, **kwargs) -> None:
        """Normalise day_of_week to uppercase for consistent enum mapping."""
        if "day_of_week" in data:
            data["day_of_week"] = data["day_of_week"].upper()


class NGOCapacityResponseSchema(Schema):
    """Response schema for GET and PUT /api/v1/ngos/me/capacity.

    Computed fields:
        allocated_capacity  = max_meals - remaining_capacity  (from stored model)
        remaining_capacity  = maximum_capacity - allocated_capacity

    These are computed in the service layer and passed as plain dict values.
    """

    capacity_id = fields.Int(dump_default=None)
    ngo_id = fields.Int(dump_default=None)
    day_of_week = fields.Str(dump_default=None)

    # Capacity figures (all computed or mapped — none taken raw from client)
    maximum_capacity = fields.Int(dump_default=None)   # maps to model.max_meals
    allocated_capacity = fields.Int(dump_default=None)  # computed: max - remaining
    remaining_capacity = fields.Int(dump_default=None)  # derived: max - allocated

    status = fields.Str(dump_default=None)
    created_at = fields.DateTime(format="iso", dump_default=None)
    updated_at = fields.DateTime(format="iso", dump_default=None)


class NGOCapacityListResponseSchema(Schema):
    """Response schema for GET /api/v1/ngos/me/capacity (all days)."""

    capacities = fields.List(fields.Nested(NGOCapacityResponseSchema))
    total = fields.Int()
