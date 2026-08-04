"""Marshmallow schemas for the NGO module (Profile + Capacity Management).

Sprint 3.1: NGOProfileUpdateSchema, NGOProfileResponseSchema
Sprint 3.2: NGOCapacityUpdateSchema, NGOCapacityResponseSchema,
            NGOCapacityListResponseSchema

Capacity Model Note (Sprint 3.2):
    The API exposes: date, maximum_capacity, allocated_capacity, remaining_capacity.
    These map to the NGODateCapacity ORM model as follows:

        API Field            │  ORM Column
        ─────────────────────┼──────────────────────
        maximum_capacity     │  max_meals
        allocated_capacity   │  allocated_meals  (system-managed, never client input)
        remaining_capacity   │  COMPUTED: max_meals - allocated_meals (never stored)

    Client PUT input: only ``date`` and ``maximum_capacity``.
    ``allocated_capacity`` and ``remaining_capacity`` are read-only.
"""

from marshmallow import EXCLUDE, Schema, ValidationError, fields, validate, validates_schema

from backend.modules.ngos.validators import (
    validate_city,
    validate_country,
    validate_date_not_in_past,
    validate_latitude,
    validate_longitude,
    validate_maximum_capacity,
    validate_phone,
    validate_postal_code,
    validate_service_radius,
    validate_state,
    validate_website_url,
)


# -----------------------------------------------------------------------
# Sprint 3.1: Profile Schemas
# -----------------------------------------------------------------------


class NGOProfileUpdateSchema(Schema):
    """Schema for validating PATCH /api/v1/ngos/me request body.

    All fields optional — at least one must be provided.

    Read-only fields (silently excluded via Meta.unknown = EXCLUDE):
        email, registration_number, verification_status, role

    Business rules enforced downstream (service layer):
        - registration_number cannot be changed after verification.
        - verification_status is always read-only.
        - email is always read-only (belongs to the User entity).
    """

    class Meta:
        unknown = EXCLUDE

    # Identity / organisation
    organisation_name = fields.Str(required=False, validate=validate.Length(min=2, max=200))
    contact_person = fields.Str(required=False, validate=validate.Length(min=2, max=100))
    phone = fields.Str(required=False, validate=validate_phone)

    # Location
    address = fields.Str(required=False, validate=validate.Length(min=5, max=500))
    city = fields.Str(required=False, validate=validate_city)
    state = fields.Str(required=False, validate=validate_state)
    country = fields.Str(required=False, validate=validate_country)
    postal_code = fields.Str(required=False, validate=validate_postal_code)
    latitude = fields.Decimal(required=False, as_string=False, validate=validate_latitude)
    longitude = fields.Decimal(required=False, as_string=False, validate=validate_longitude)

    # About
    description = fields.Str(required=False, validate=validate.Length(max=2000))
    website = fields.Str(required=False, validate=validate_website_url)

    # Operational (preserved from existing Sprint 3.2 scope)
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
    """Response schema for GET /api/v1/ngos/me and PATCH /api/v1/ngos/me.

    All spec-mandated fields are serialised here.
    email is sourced from the related User entity, not the NGO model itself.
    verification_status is included as a read-only informational field.
    """

    ngo_id = fields.Int(dump_default=None)
    user_id = fields.Int(dump_default=None)
    organisation_name = fields.Str(dump_default=None)
    registration_number = fields.Str(dump_default=None)
    contact_person = fields.Str(dump_default=None)
    phone = fields.Str(dump_default=None)
    email = fields.Email(dump_default=None)

    # Location
    address = fields.Str(dump_default=None)
    city = fields.Str(dump_default=None)
    state = fields.Str(dump_default=None)
    country = fields.Str(dump_default=None)
    postal_code = fields.Str(dump_default=None)
    latitude = fields.Decimal(as_string=True, dump_default=None)
    longitude = fields.Decimal(as_string=True, dump_default=None)

    # About
    description = fields.Str(dump_default=None)
    website = fields.Str(dump_default=None)

    # Operational
    service_radius_km = fields.Int(dump_default=None)

    # Status (read-only)
    verification_status = fields.Str(dump_default=None)
    is_active = fields.Bool(dump_default=None)

    # Timestamps
    created_at = fields.DateTime(format="iso", dump_default=None)
    updated_at = fields.DateTime(format="iso", dump_default=None)


# -----------------------------------------------------------------------
# Sprint 3.2: Capacity Schemas
# -----------------------------------------------------------------------


class NGOCapacityUpdateSchema(Schema):
    """Schema for validating PUT /api/v1/ngos/me/capacity request body.

    Accepted fields:
        date:             Target calendar date (YYYY-MM-DD, required, not in past).
        maximum_capacity: New maximum daily meal intake (required, > 0).

    Read-only — silently excluded (Meta.unknown = EXCLUDE):
        allocated_capacity  (system-managed, set by the Decision Engine)
        remaining_capacity  (computed: maximum_capacity - allocated_capacity)
        date_capacity_id    (system-assigned)
        ngo_id              (from JWT identity)

    Business rules enforced downstream (service layer):
        maximum_capacity must be ≥ current allocated_capacity.
    """

    class Meta:
        unknown = EXCLUDE

    date = fields.Date(
        format="%Y-%m-%d",
        required=True,
        validate=validate_date_not_in_past,
        metadata={"description": "Target capacity date in YYYY-MM-DD format."},
    )
    maximum_capacity = fields.Int(
        required=True,
        validate=validate_maximum_capacity,
        metadata={"description": "Maximum number of meals the NGO can accept on this date."},
    )


class NGOCapacityResponseSchema(Schema):
    """Response schema for GET and PUT /api/v1/ngos/me/capacity.

    Computed fields (never stored in DB):
        remaining_capacity = maximum_capacity - allocated_capacity

    The ``date`` field is serialised as an ISO 8601 string (YYYY-MM-DD).
    """

    date_capacity_id = fields.Int(dump_default=None)
    ngo_id = fields.Int(dump_default=None)
    date = fields.Date(format="%Y-%m-%d", dump_default=None)

    # Capacity figures
    maximum_capacity = fields.Int(dump_default=None)    # stored as max_meals
    allocated_capacity = fields.Int(dump_default=None)  # stored as allocated_meals
    remaining_capacity = fields.Int(dump_default=None)  # computed: max - allocated

    created_at = fields.DateTime(format="iso", dump_default=None)
    updated_at = fields.DateTime(format="iso", dump_default=None)


class NGOCapacityListResponseSchema(Schema):
    """Response schema for GET /api/v1/ngos/me/capacity (all dates)."""

    capacities = fields.List(fields.Nested(NGOCapacityResponseSchema))
    total = fields.Int()
