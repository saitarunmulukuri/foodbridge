"""Marshmallow serialization and validation schemas for Registration."""

from marshmallow import Schema, fields, validates_schema, ValidationError, validate
from backend.shared.constants.enums import UserRole, VehicleType
from backend.modules.authentication.validators import (
    validate_password_policy,
    validate_registration_role,
)


class DonorProfileSchema(Schema):
    """Schema for Donor role profile registration data."""

    organisation_name = fields.Str(required=True, validate=validate.Length(min=2, max=200))
    contact_person = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    phone = fields.Str(required=True, validate=validate.Length(min=5, max=20))
    address = fields.Str(required=True, validate=validate.Length(min=5))
    latitude = fields.Decimal(required=False, missing=0.0, as_string=False)
    longitude = fields.Decimal(required=False, missing=0.0, as_string=False)


class NGOProfileSchema(Schema):
    """Schema for NGO role profile registration data."""

    organisation_name = fields.Str(required=True, validate=validate.Length(min=2, max=200))
    registration_number = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    contact_person = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    phone = fields.Str(required=True, validate=validate.Length(min=5, max=20))
    address = fields.Str(required=True, validate=validate.Length(min=5))
    latitude = fields.Decimal(required=False, missing=0.0, as_string=False)
    longitude = fields.Decimal(required=False, missing=0.0, as_string=False)
    service_radius_km = fields.Int(required=False, missing=15, validate=validate.Range(min=1, max=500))


class VolunteerProfileSchema(Schema):
    """Schema for Volunteer role profile registration data."""

    phone = fields.Str(required=True, validate=validate.Length(min=5, max=20))
    vehicle_type = fields.Str(
        required=True,
        validate=validate.OneOf([v.value for v in VehicleType]),
    )
    latitude = fields.Decimal(required=False, allow_none=True, as_string=False)
    longitude = fields.Decimal(required=False, allow_none=True, as_string=False)


class UserRegisterSchema(Schema):
    """Schema for user registration request payload."""

    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.Str(required=True, validate=validate_password_policy)
    password_confirmation = fields.Str(required=True)
    role = fields.Str(required=True, validate=validate_registration_role)

    # Role specific profile block
    profile = fields.Dict(required=True)

    @validates_schema
    def validate_password_match(self, data, **kwargs):
        """Ensure password and password_confirmation match."""
        if data.get("password") != data.get("password_confirmation"):
            raise ValidationError(
                {"password_confirmation": ["Password and password confirmation do not match."]}
            )

    @validates_schema
    def validate_role_profile(self, data, **kwargs):
        """Validate profile dictionary according to the specified user role."""
        role_str = data.get("role", "").upper()
        profile_data = data.get("profile")

        if not isinstance(profile_data, dict):
            raise ValidationError({"profile": ["Profile data must be a valid JSON object."]})

        if role_str == UserRole.DONOR.value:
            errors = DonorProfileSchema().validate(profile_data)
            if errors:
                raise ValidationError({"profile": errors})
        elif role_str == UserRole.NGO.value:
            errors = NGOProfileSchema().validate(profile_data)
            if errors:
                raise ValidationError({"profile": errors})
        elif role_str == UserRole.VOLUNTEER.value:
            errors = VolunteerProfileSchema().validate(profile_data)
            if errors:
                raise ValidationError({"profile": errors})


class UserRegisterResponseSchema(Schema):
    """Schema for user registration success response output."""

    user_id = fields.Int()
    email = fields.Str()
    role = fields.Str()
    account_status = fields.Str()
    created_at = fields.Str()
