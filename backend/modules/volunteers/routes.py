"""API route definitions for the Volunteer module.

Registered blueprint:
    volunteers_bp → mounted at /volunteers under /api/v1/ prefix

Sprint 4.0: GET/POST /api/v1/volunteers/assignments (assignment CRUD)
Sprint 5.5: GET /api/v1/volunteers/me  (profile read)
            PATCH /api/v1/volunteers/me (profile update — phone/location/status)
"""

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required
from marshmallow import ValidationError

from backend.modules.volunteers.schemas import (
    DeclineAssignmentRequestSchema,
    VolunteerProfileUpdateSchema,
)
from backend.modules.volunteers.services import VolunteerService
from backend.shared.exceptions.base_exceptions import BadRequestException

logger = logging.getLogger(__name__)

volunteers_bp = Blueprint("volunteers", __name__, url_prefix="/volunteers")
_decline_schema = DeclineAssignmentRequestSchema()
_profile_update_schema = VolunteerProfileUpdateSchema()


@volunteers_bp.route("/me", methods=["GET"])
@jwt_required()
def get_my_profile():
    """Return the authenticated volunteer's profile.

    Endpoint: GET /api/v1/volunteers/me

    Authorization: Bearer JWT (Role: VOLUNTEER)

    Returns:
        200 OK — volunteer profile (id, phone, vehicle_type, location, status).
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not a VOLUNTEER.
        404 Not Found — no volunteer profile for this user.
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    service = VolunteerService()
    result = service.get_my_profile(user_id=user_id, role=role)

    return jsonify({"success": True, "data": result}), 200


@volunteers_bp.route("/me", methods=["PATCH"])
@jwt_required()
def update_my_profile():
    """Partially update the authenticated volunteer's profile.

    Endpoint: PATCH /api/v1/volunteers/me

    Authorization: Bearer JWT (Role: VOLUNTEER)

    Patchable fields (all optional — at least one required):
        phone              (str)   — 7 to 20 characters
        latitude           (float) — -90 to 90
        longitude          (float) — -180 to 180
        operational_status (str)   — AVAILABLE | OFFLINE | BUSY

    Returns:
        200 OK — updated volunteer profile.
        400 Bad Request — no patchable field provided.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not a VOLUNTEER.
        404 Not Found — no volunteer profile for this user.
        422 Unprocessable Entity — validation failure.
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    json_data = request.get_json(silent=True) or {}

    try:
        validated = _profile_update_schema.load(json_data)
    except ValidationError as err:
        raise BadRequestException(message="Validation failed.", payload=err.messages)

    service = VolunteerService()
    result = service.update_my_profile(user_id=user_id, role=role, validated_data=validated)

    return jsonify({
        "success": True,
        "message": "Volunteer profile updated successfully.",
        "data": result,
    }), 200


@volunteers_bp.route("/assignments", methods=["GET"])
@jwt_required()
def list_my_assignments():
    """List pickup assignments assigned to the authenticated volunteer.

    Endpoint: GET /api/v1/volunteers/assignments
    Authorization: Bearer <JWT token> (Role: VOLUNTEER)
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    service = VolunteerService()
    result = service.list_my_assignments(user_id=user_id, role=role)

    return jsonify({"success": True, "data": result}), 200


@volunteers_bp.route("/assignments/<int:assignment_id>", methods=["GET"])
@jwt_required()
def get_assignment(assignment_id: int):
    """Get single assignment details.

    Endpoint: GET /api/v1/volunteers/assignments/<id>
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    service = VolunteerService()
    result = service.get_assignment(user_id=user_id, role=role, assignment_id=assignment_id)

    return jsonify({"success": True, "data": result}), 200


@volunteers_bp.route("/assignments/<int:assignment_id>/accept", methods=["POST"])
@jwt_required()
def accept_assignment(assignment_id: int):
    """Accept a pickup assignment.

    Endpoint: POST /api/v1/volunteers/assignments/<id>/accept
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    service = VolunteerService()
    result = service.accept_assignment(user_id=user_id, role=role, assignment_id=assignment_id)

    return jsonify({
        "success": True,
        "message": "Assignment accepted successfully.",
        "data": result,
    }), 200


@volunteers_bp.route("/assignments/<int:assignment_id>/decline", methods=["POST"])
@jwt_required()
def decline_assignment(assignment_id: int):
    """Decline a pickup assignment.

    Endpoint: POST /api/v1/volunteers/assignments/<id>/decline
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    json_data = request.get_json(silent=True) or {}
    validated = _decline_schema.load(json_data)

    service = VolunteerService()
    result = service.decline_assignment(
        user_id=user_id,
        role=role,
        assignment_id=assignment_id,
        reason=validated.get("reason"),
    )

    return jsonify({
        "success": True,
        "message": "Assignment declined successfully.",
        "data": result,
    }), 200


@volunteers_bp.route("/assignments/<int:assignment_id>/complete", methods=["POST"])
@jwt_required()
def complete_delivery(assignment_id: int):
    """Complete a pickup delivery.

    Endpoint: POST /api/v1/volunteers/assignments/<id>/complete
    """
    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    service = VolunteerService()
    result = service.complete_delivery(user_id=user_id, role=role, assignment_id=assignment_id)

    return jsonify({
        "success": True,
        "message": "Delivery completed successfully.",
        "data": result,
    }), 200
