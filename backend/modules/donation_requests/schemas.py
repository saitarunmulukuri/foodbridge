"""Marshmallow schemas for the Donation Request module — Sprint 4.1.

Field Mapping (sprint API → ORM model):
    request_id          → NGORequest.ngo_request_id
    donation_id         → NGORequest.recommendation_cycle.donation_id
    ngo_id              → NGORequest.ngo_id
    status              → NGORequest.status  (PENDING/ACCEPTED/REJECTED/TIMED_OUT/AUTO_CANCELLED)
    recommendation_score → NGORequest.recommendation_score
    created_at          → NGORequest.created_at
    responded_at        → NGORequest.responded_at
    expires_at          → NGORequest.response_deadline

Status Display Mapping:
    API exposes: PENDING | ACCEPTED | DECLINED | EXPIRED | CANCELLED
    ORM stores:  PENDING | ACCEPTED | REJECTED | TIMED_OUT | AUTO_CANCELLED

    DECLINED   → REJECTED
    EXPIRED    → TIMED_OUT
    CANCELLED  → AUTO_CANCELLED
"""

from marshmallow import EXCLUDE, Schema, fields, validate

from backend.modules.donation_requests.validators import validate_decline_reason


# -----------------------------------------------------------------------
# Request Schemas (inbound)
# -----------------------------------------------------------------------


class DeclineRequestSchema(Schema):
    """Schema for POST /api/v1/ngo/requests/{id}/decline payload.

    Fields:
        decline_reason (str, optional): Human-readable reason for declining.
            Stored in NGORequest.rejection_reason. Max 1000 characters.
    """

    class Meta:
        unknown = EXCLUDE

    decline_reason = fields.Str(
        required=False,
        load_default=None,
        allow_none=True,
        validate=validate_decline_reason,
    )


# -----------------------------------------------------------------------
# Response Schemas (outbound)
# -----------------------------------------------------------------------

# Sprint API display status → ORM status value mapping
_STATUS_DISPLAY_MAP = {
    "PENDING": "PENDING",
    "ACCEPTED": "ACCEPTED",
    "REJECTED": "DECLINED",
    "TIMED_OUT": "EXPIRED",
    "AUTO_CANCELLED": "CANCELLED",
}


class DonationRequestResponseSchema(Schema):
    """Response schema for a single donation request.

    Exposes the sprint-specified API contract fields with consistent
    display-status mapping from internal ORM status values.
    """

    request_id = fields.Int(dump_default=None)
    donation_id = fields.Int(dump_default=None)
    ngo_id = fields.Int(dump_default=None)
    status = fields.Str(dump_default=None)          # sprint display status
    recommendation_score = fields.Decimal(as_string=True, dump_default=None)
    recommendation_rank = fields.Int(dump_default=None)
    decline_reason = fields.Str(dump_default=None, allow_none=True)
    created_at = fields.DateTime(format="iso", dump_default=None)
    responded_at = fields.DateTime(format="iso", dump_default=None)
    expires_at = fields.DateTime(format="iso", dump_default=None)


class DonationRequestListResponseSchema(Schema):
    """Response schema for GET /api/v1/ngo/requests (list view)."""

    requests = fields.List(fields.Nested(DonationRequestResponseSchema))
    total = fields.Int()
