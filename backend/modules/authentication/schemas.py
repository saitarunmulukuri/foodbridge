"""Marshmallow serialization and validation schemas for the Authentication module."""

from marshmallow import Schema, ValidationError, fields, validate, validates_schema

from backend.shared.constants.enums import UserRole, VehicleType
from backend.modules.authentication.validators import (
    validate_password_policy,
    validate_registration_role,
)


# -----------------------------------------------------------------------
# Registration Profile Sub-Schemas
# -----------------------------------------------------------------------


class DonorProfileSchema(Schema):
    """Schema for Donor role profile registration data."""

    organisation_name = fields.Str(required=True, validate=validate.Length(min=2, max=200))
    contact_person = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    phone = fields.Str(required=True, validate=validate.Length(min=5, max=20))
    address = fields.Str(required=True, validate=validate.Length(min=5))
    latitude = fields.Decimal(required=False, load_default=None, allow_none=True, as_string=False)
    longitude = fields.Decimal(required=False, load_default=None, allow_none=True, as_string=False)


class NGOProfileSchema(Schema):
    """Schema for NGO role profile registration data."""

    organisation_name = fields.Str(required=True, validate=validate.Length(min=2, max=200))
    registration_number = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    contact_person = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    phone = fields.Str(required=True, validate=validate.Length(min=5, max=20))
    address = fields.Str(required=True, validate=validate.Length(min=5))
    latitude = fields.Decimal(required=False, load_default=None, allow_none=True, as_string=False)
    longitude = fields.Decimal(required=False, load_default=None, allow_none=True, as_string=False)
    service_radius_km = fields.Int(
        required=False, load_default=15, validate=validate.Range(min=1, max=500)
    )


class VolunteerProfileSchema(Schema):
    """Schema for Volunteer role profile registration data."""

    phone = fields.Str(required=True, validate=validate.Length(min=5, max=20))
    vehicle_type = fields.Str(
        required=True,
        validate=validate.OneOf([v.value for v in VehicleType]),
    )
    latitude = fields.Decimal(required=False, load_default=None, allow_none=True, as_string=False)
    longitude = fields.Decimal(required=False, load_default=None, allow_none=True, as_string=False)


# -----------------------------------------------------------------------
# Registration Schemas
# -----------------------------------------------------------------------


class UserRegisterSchema(Schema):
    """Schema for validating the user registration request payload."""

    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.Str(required=False, allow_none=True, validate=validate_password_policy)
    password_confirmation = fields.Str(required=False, allow_none=True)
    google_subject_id = fields.Str(required=False, allow_none=True)
    role = fields.Str(required=True, validate=validate_registration_role)
    profile = fields.Dict(required=True)

    @validates_schema
    def validate_password_match(self, data: dict, **kwargs) -> None:
        """Ensure password is provided for standard registration, and matches confirmation."""
        google_sub = data.get("google_subject_id")
        password = data.get("password")
        password_confirm = data.get("password_confirmation")

        if not google_sub and not password:
            raise ValidationError(
                {"password": ["Password is required for standard email registration."]}
            )

        if password or password_confirm:
            if password != password_confirm:
                raise ValidationError(
                    {"password_confirmation": ["Password and confirmation do not match."]}
                )

    @validates_schema
    def validate_role_profile(self, data: dict, **kwargs) -> None:
        """Validate the profile block against the role-specific sub-schema."""
        role_str = data.get("role", "").upper()
        profile_data = data.get("profile")

        if not isinstance(profile_data, dict):
            raise ValidationError({"profile": ["Profile data must be a valid JSON object."]})

        schema_map = {
            UserRole.DONOR.value: DonorProfileSchema,
            UserRole.NGO.value: NGOProfileSchema,
            UserRole.VOLUNTEER.value: VolunteerProfileSchema,
        }
        profile_schema_cls = schema_map.get(role_str)
        if profile_schema_cls:
            errors = profile_schema_cls().validate(profile_data)
            if errors:
                raise ValidationError({"profile": errors})


class UserRegisterResponseSchema(Schema):
    """Schema for the user registration success response body."""

    user_id = fields.Int()
    email = fields.Str()
    role = fields.Str()
    account_status = fields.Str()
    created_at = fields.Str()


# -----------------------------------------------------------------------
# Login Schemas
# -----------------------------------------------------------------------


class UserLoginSchema(Schema):
    """Schema for validating the user login request payload."""

    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.Str(required=True, validate=validate.Length(min=1, max=1024))


class UserLoginResponseSchema(Schema):
    """Schema for the user login success response body."""

    access_token = fields.Str()
    refresh_token = fields.Str()
    token_type = fields.Str()
    expires_in = fields.Int(
        metadata={"description": "Access token lifetime in seconds, per JWT configuration."}
    )
    user = fields.Dict()


# -----------------------------------------------------------------------
# Google Authentication Schemas
# -----------------------------------------------------------------------


class GoogleAuthRequestSchema(Schema):
    """Schema for validating Google OAuth authentication payloads."""

    credential = fields.Str(required=False, allow_none=True)
    id_token = fields.Str(required=False, allow_none=True)
    code = fields.Str(required=False, allow_none=True)

    @validates_schema
    def validate_token_presence(self, data: dict, **kwargs) -> None:
        """Ensure at least one Google authentication token/credential is provided."""
        if not data.get("credential") and not data.get("id_token") and not data.get("code"):
            raise ValidationError(
                {"credential": ["Either 'credential', 'id_token', or 'code' is required."]}
            )

