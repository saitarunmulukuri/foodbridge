"""API routes for the Donation Request module — Sprint 4.1.

Registered blueprint:
    ngo_requests_bp → mounted at /ngo under /api/v1/ prefix

Sprint 4.1 Endpoints:
    GET  /api/v1/ngo/requests           — list all requests for this NGO
    GET  /api/v1/ngo/requests/{id}      — retrieve one request
    POST /api/v1/ngo/requests/{id}/accept  — accept a request
    POST /api/v1/ngo/requests/{id}/decline — decline a request
"""

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from backend.modules.donation_requests.exceptions import DonationRequestValidationException
from backend.modules.donation_requests.schemas import DeclineRequestSchema
from backend.modules.donation_requests.services import DonationRequestService

logger = logging.getLogger(__name__)

ngo_requests_bp = Blueprint("ngo_requests", __name__, url_prefix="/ngo")

_decline_schema = DeclineRequestSchema()
_service = DonationRequestService()


@ngo_requests_bp.route("/requests", methods=["GET"])
@jwt_required()
def list_my_requests():
    """List all donation requests assigned to the authenticated NGO.

    Endpoint: GET /api/v1/ngo/requests

    Authorization:
        Valid JWT required. Only NGO-role tokens accepted.

    Returns:
        200 OK — list of donation requests with total count.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not an NGO user.
        404 Not Found — no NGO profile for this user.
    """
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role", "")

    result = _service.list_my_requests(user_id=user_id, role=role)
    return jsonify({"success": True, "data": result}), 200


@ngo_requests_bp.route("/requests/<int:request_id>", methods=["GET"])
@jwt_required()
def get_request(request_id: int):
    """Retrieve a single donation request by ID.

    Endpoint: GET /api/v1/ngo/requests/{id}

    Authorization:
        Valid JWT required. Only the assigned NGO may view this request.

    Returns:
        200 OK — donation request detail.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — not the assigned NGO.
        404 Not Found — request not found or no NGO profile.
    """
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role", "")

    result = _service.get_request(user_id=user_id, role=role, request_id=request_id)
    return jsonify({"success": True, "data": result}), 200


@ngo_requests_bp.route("/requests/<int:request_id>/accept", methods=["POST"])
@jwt_required()
def accept_request(request_id: int):
    """Accept a donation request.

    Endpoint: POST /api/v1/ngo/requests/{id}/accept

    Authorization:
        Valid JWT required. Only the assigned NGO may accept.

    Side Effects (atomic):
        - Request status → ACCEPTED
        - Donation status → NGO_ACCEPTED
        - All other PENDING requests in the same cycle → AUTO_CANCELLED

    Returns:
        200 OK — accepted donation request.
        400 Bad Request — request already resolved or expired.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — not the assigned NGO.
        404 Not Found — request or NGO profile not found.
        410 Gone — request has passed its response deadline.
    """
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role", "")

    result = _service.accept_request(user_id=user_id, role=role, request_id=request_id)
    return jsonify({
        "success": True,
        "message": "Donation request accepted successfully.",
        "data": result,
    }), 200


@ngo_requests_bp.route("/requests/<int:request_id>/decline", methods=["POST"])
@jwt_required()
def decline_request(request_id: int):
    """Decline a donation request.

    Endpoint: POST /api/v1/ngo/requests/{id}/decline

    Authorization:
        Valid JWT required. Only the assigned NGO may decline.

    Request Body (optional):
        decline_reason (str, optional): Human-readable reason (max 1000 chars).

    Returns:
        200 OK — declined donation request.
        400 Bad Request — request already resolved.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — not the assigned NGO.
        404 Not Found — request or NGO profile not found.
        410 Gone — request has passed its response deadline.
        422 Unprocessable Entity — invalid decline payload.
    """
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role", "")

    json_data = request.get_json(silent=True) or {}

    try:
        validated = _decline_schema.load(json_data)
    except ValidationError as err:
        raise DonationRequestValidationException(err.messages)

    decline_reason = validated.get("decline_reason")

    result = _service.decline_request(
        user_id=user_id,
        role=role,
        request_id=request_id,
        decline_reason=decline_reason,
    )
    return jsonify({
        "success": True,
        "message": "Donation request declined.",
        "data": result,
    }), 200
