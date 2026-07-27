"""API routes for the NGO module — Sprint 3.1 (Profile) + Sprint 3.2 (Capacity).

Registered blueprints:
    ngos_bp → mounted at /ngos under /api/v1/ prefix

Sprint 3.1:
    GET  /api/v1/ngos/me        — retrieve NGO profile
    PATCH /api/v1/ngos/me       — update NGO profile (partial)

Sprint 3.2:
    GET  /api/v1/ngos/me/capacity  — retrieve all daily capacity records
    PUT  /api/v1/ngos/me/capacity  — create or update a daily capacity record
"""

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from marshmallow import ValidationError

from backend.modules.ngos.exceptions import (
    CapacityValidationException,
    NGOProfileValidationException,
)
from backend.modules.ngos.schemas import (
    NGOCapacityUpdateSchema,
    NGOProfileUpdateSchema,
)
from backend.modules.ngos.services import NGOCapacityService, NGOProfileService

logger = logging.getLogger(__name__)

ngos_bp = Blueprint("ngos", __name__, url_prefix="/ngos")

# Module-level schema and service instances
_profile_update_schema = NGOProfileUpdateSchema()
_capacity_update_schema = NGOCapacityUpdateSchema()
_profile_service = NGOProfileService()
_capacity_service = NGOCapacityService()


# -----------------------------------------------------------------------
# Sprint 3.1: Profile Endpoints
# -----------------------------------------------------------------------


@ngos_bp.route("/me", methods=["GET"])
@jwt_required()
def get_my_profile():
    """Return the authenticated NGO's profile.

    Endpoint: GET /api/v1/ngos/me

    Authorization:
        Valid JWT required. Only NGO-role tokens accepted.

    Returns:
        200 OK — serialised NGO profile.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not an NGO user.
        404 Not Found — no NGO profile exists for this user.
    """
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role", "")

    profile = _profile_service.get_my_profile(user_id=user_id, role=role)

    return jsonify({"success": True, "data": profile}), 200


@ngos_bp.route("/me", methods=["PATCH"])
@jwt_required()
def update_my_profile():
    """Partially update the authenticated NGO's profile.

    Endpoint: PATCH /api/v1/ngos/me

    Authorization:
        Valid JWT required. Only NGO-role tokens accepted.

    Request Body (all optional — at least one required):
        organisation_name, contact_person, phone, address,
        latitude, longitude, service_radius_km

    Returns:
        200 OK — serialised updated profile.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not an NGO user.
        404 Not Found — no NGO profile exists for this user.
        422 Unprocessable Entity — validation failure.
    """
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role", "")

    json_data = request.get_json(silent=True)
    if not json_data:
        raise NGOProfileValidationException({"payload": ["Missing or invalid JSON payload."]})

    try:
        validated_data = _profile_update_schema.load(json_data)
    except ValidationError as err:
        raise NGOProfileValidationException(err.messages)

    profile = _profile_service.update_my_profile(
        user_id=user_id, role=role, validated_data=validated_data
    )

    return jsonify({
        "success": True,
        "message": "NGO profile updated successfully.",
        "data": profile,
    }), 200


# -----------------------------------------------------------------------
# Sprint 3.2: Capacity Endpoints
# -----------------------------------------------------------------------


@ngos_bp.route("/me/capacity", methods=["GET"])
@jwt_required()
def get_my_capacity():
    """Return all daily capacity records for the authenticated NGO.

    Endpoint: GET /api/v1/ngos/me/capacity

    Authorization:
        Valid JWT required. Only NGO-role tokens accepted.

    Response fields per record:
        capacity_id, ngo_id, day_of_week, maximum_capacity,
        allocated_capacity, remaining_capacity, status,
        created_at, updated_at

    Computed server-side (never stored directly from client input):
        allocated_capacity = maximum_capacity - remaining_capacity
        remaining_capacity = maximum_capacity - allocated_capacity

    Returns:
        200 OK — list of capacity records with total count.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not an NGO user.
        404 Not Found — no NGO profile exists for this user.
    """
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role", "")

    result = _capacity_service.get_my_capacity(user_id=user_id, role=role)

    return jsonify({"success": True, "data": result}), 200


@ngos_bp.route("/me/capacity", methods=["PUT"])
@jwt_required()
def update_my_capacity():
    """Create or update a daily capacity record for the authenticated NGO.

    Endpoint: PUT /api/v1/ngos/me/capacity

    Authorization:
        Valid JWT required. Only NGO-role tokens accepted.

    Request Body:
        day_of_week       (str, required) — MONDAY through SUNDAY
        maximum_capacity  (int, required) — must be > 0
        status            (str, optional) — ACTIVE | PAUSED | FULL

    Read-Only (never accepted from client):
        allocated_capacity, remaining_capacity, capacity_id, ngo_id

    Business Rules enforced:
        - maximum_capacity must be ≥ current allocated_capacity.
        - remaining_capacity is computed: max - allocated (server-side only).

    Returns:
        200 OK — serialised capacity record with computed figures.
        400 Bad Request — maximum_capacity < current allocated_capacity.
        401 Unauthorized — missing or invalid JWT.
        403 Forbidden — caller is not an NGO user.
        404 Not Found — no NGO profile exists for this user.
        422 Unprocessable Entity — validation failure.
    """
    user_id = int(get_jwt_identity())
    role = get_jwt().get("role", "")

    json_data = request.get_json(silent=True)
    if not json_data:
        raise CapacityValidationException({"payload": ["Missing or invalid JSON payload."]})

    try:
        validated_data = _capacity_update_schema.load(json_data)
    except ValidationError as err:
        raise CapacityValidationException(err.messages)

    capacity = _capacity_service.update_my_capacity(
        user_id=user_id, role=role, validated_data=validated_data
    )

    return jsonify({
        "success": True,
        "message": "Daily capacity updated successfully.",
        "data": capacity,
    }), 200
