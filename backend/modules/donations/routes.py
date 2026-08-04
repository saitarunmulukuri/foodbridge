"""API route definitions for the Donations module.

Registered blueprint:
    donations_bp → mounted at /donations under /api/v1/ prefix

Sprint 2.1: POST /api/v1/donations
Sprint 5.5: GET  /api/v1/donations
            GET  /api/v1/donations/{id}
            POST /api/v1/donations/{id}/submit
"""

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required
from marshmallow import ValidationError

from backend.modules.donations.exceptions import DonationValidationException
from backend.modules.donations.schemas import (
    DonationCreateResponseSchema,
    DonationCreateSchema,
)
from backend.modules.donations.services import DonationService

logger = logging.getLogger(__name__)

donations_bp = Blueprint("donations", __name__, url_prefix="/donations")

_create_schema = DonationCreateSchema()
_response_schema = DonationCreateResponseSchema()


@donations_bp.route("", methods=["POST"])
@jwt_required()
def create_donation():
    """Create a new surplus food donation offer with one or more food items.

    Endpoint: POST /api/v1/donations

    Authorization:
        Requires a valid JWT access token in the ``Authorization: Bearer <token>`` header.
        The authenticated user must have the DONOR role.
        NGO, VOLUNTEER, and ADMIN accounts receive HTTP 403.

    Request Payload (JSON):
        donation_title      (str)      required — 3 to 150 characters
        description         (str)      optional — max 1000 characters
        prepared_time       (datetime) optional — ISO 8601
        available_from      (datetime) required — ISO 8601, pickup availability start
        expiry_time         (datetime) required — ISO 8601, must be strictly after available_from
        total_quantity      (decimal)  required — must be > 0
        quantity_unit       (str)      required — KG|GRAM|LITRE|ML|BOX|PACKET|PLATE
        pickup_address      (str)      required — 5 to 500 characters
        pickup_landmark     (str)      optional — max 200 characters
        pickup_city         (str)      required — 2 to 100 characters
        pickup_state        (str)      required — 2 to 100 characters
        pickup_postal_code  (str)      required — 3 to 20 characters
        pickup_latitude     (decimal)  required — between -90 and 90
        pickup_longitude    (decimal)  required — between -180 and 180
        delivery_preference (str)      optional — DONOR_DELIVERY | PICKUP_REQUIRED (default)
        special_instructions (str)     optional — max 500 characters
        items               (list)     required — 1 to 20 food items
          └─ item_name      (str)      required — 1 to 150 characters
          └─ category       (str)      required — ItemCategory enum
          └─ quantity       (decimal)  required — must be > 0
          └─ unit           (str)      required — QuantityUnit enum
          └─ food_type      (str)      required — VEGETARIAN|NON_VEGETARIAN|VEGAN
          └─ contains_allergens (bool) optional — default false
          └─ allergen_details   (str)  optional — max 500 characters

    Security Rule:
        ``donor_id`` must NOT be provided in the request body.
        The donor is always resolved server-side from the authenticated JWT token identity.

    Returns:
        201 Created:
            {
                "success": true,
                "message": "Donation created successfully.",
                "data": {
                    "donation_id": <int>,
                    "status": "DRAFT",
                    "created_at": "<ISO 8601 datetime>"
                }
            }

    Error Responses:
        400 INVALID_DONATION_WINDOW  — time ordering constraints violated (expiry <= available_from).
        401 UNAUTHORIZED            — missing, expired, or invalid JWT token.
        403 INSUFFICIENT_ROLE       — authenticated user is not a DONOR.
        403 DONOR_PROFILE_NOT_FOUND  — DONOR user account has no donor profile record.
        422 VALIDATION_ERROR        — request payload failed schema validation.
    """
    json_data = request.get_json(silent=True)
    if not json_data:
        raise DonationValidationException(
            {"payload": ["Missing or invalid JSON payload."]}
        )

    try:
        validated_data = _create_schema.load(json_data)
    except ValidationError as err:
        raise DonationValidationException(err.messages)

    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    service = DonationService()
    donation = service.create_donation(
        user_id=user_id,
        role=role,
        donation_data=validated_data,
    )

    output = _response_schema.dump({
        "donation_id": donation.donation_id,
        "status": donation.status.value,
        "created_at": donation.created_at,
    })

    return jsonify({
        "success": True,
        "message": "Donation created successfully.",
        "data": output,
    }), 201


@donations_bp.route("", methods=["GET"])
@jwt_required()
def list_my_donations():
    """List all donations belonging to the authenticated donor.

    Endpoint: GET /api/v1/donations

    Authorization:
        Valid JWT required. Only DONOR role accepted.

    Returns:
        200 OK — list of donations with total count.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not a DONOR.
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    service = DonationService()
    result = service.list_my_donations(user_id=user_id, role=role)

    return jsonify({"success": True, "data": result}), 200


@donations_bp.route("/<int:donation_id>", methods=["GET"])
@jwt_required()
def get_donation(donation_id: int):
    """Return a single donation by ID (owner-only).

    Endpoint: GET /api/v1/donations/{donation_id}

    Authorization:
        Valid JWT required. DONOR role only. Caller must own the donation.

    Returns:
        200 OK — full donation detail including items.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not a DONOR or does not own this donation.
        404 Not Found — donation_id does not exist.
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    service = DonationService()
    result = service.get_my_donation(user_id=user_id, role=role, donation_id=donation_id)

    return jsonify({"success": True, "data": result}), 200


@donations_bp.route("/<int:donation_id>/submit", methods=["POST"])
@jwt_required()
def submit_donation(donation_id: int):
    """Submit a DRAFT donation for NGO matching.

    Endpoint: POST /api/v1/donations/{donation_id}/submit

    Authorization:
        Valid JWT required. DONOR role only. Caller must own the donation.

    State Transition:
        DRAFT → SUBMITTED

    Returns:
        200 OK — updated donation with status=SUBMITTED.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not a DONOR or does not own this donation.
        404 Not Found — donation_id does not exist.
        409 Conflict — donation is not in DRAFT status.
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    service = DonationService()
    result = service.submit_donation(user_id=user_id, role=role, donation_id=donation_id)

    return jsonify({
        "success": True,
        "message": "Donation submitted successfully.",
        "data": result,
    }), 200
