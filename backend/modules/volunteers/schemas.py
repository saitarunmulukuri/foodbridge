"""Marshmallow serialization schemas for the Volunteer module."""

from marshmallow import Schema, fields, validate


class VolunteerAssignmentResponseSchema(Schema):
    """Schema for serializing VolunteerAssignment response."""

    assignment_id = fields.Int(required=True)
    ngo_request_id = fields.Int(required=True)
    volunteer_id = fields.Int(required=True)
    rank = fields.Int(required=True)
    score = fields.Float(required=True)
    status = fields.Str(required=True)
    response_deadline = fields.Str(required=True)
    created_at = fields.Str(allow_none=True)


class DeclineAssignmentRequestSchema(Schema):
    """Schema for decline assignment payload."""

    reason = fields.Str(required=False, allow_none=True)


class VolunteerProfileUpdateSchema(Schema):
    """Schema for PATCH /volunteers/me partial profile update.

    All fields optional — at least one must be provided.
    Phone, latitude, longitude, operational_status may be updated.
    vehicle_type is set once at registration and is not patchable here.
    """

    phone = fields.Str(required=False, load_default=None,
                       validate=validate.Length(min=7, max=20))
    latitude = fields.Float(required=False, load_default=None,
                             validate=validate.Range(min=-90.0, max=90.0))
    longitude = fields.Float(required=False, load_default=None,
                              validate=validate.Range(min=-180.0, max=180.0))
    operational_status = fields.Str(required=False, load_default=None,
                                     validate=validate.OneOf(
                                         ["AVAILABLE", "OFFLINE", "BUSY"]))
