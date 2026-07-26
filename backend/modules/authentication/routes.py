"""API route definitions for Authentication module."""

from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from backend.modules.authentication.exceptions import RegistrationValidationException
from backend.modules.authentication.schemas import (
    UserRegisterResponseSchema,
    UserRegisterSchema,
)
from backend.modules.authentication.services import AuthenticationService

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
register_schema = UserRegisterSchema()
response_schema = UserRegisterResponseSchema()


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user (DONOR, NGO, or VOLUNTEER) and their profile.

    Endpoint: POST /api/v1/auth/register
    """
    json_data = request.get_json(silent=True)
    if not json_data:
        raise RegistrationValidationException(
            {"payload": ["Missing or invalid JSON payload."]}
        )

    # Validate schema
    try:
        validated_data = register_schema.load(json_data)
    except ValidationError as err:
        raise RegistrationValidationException(err.messages)

    # Delegate to business service layer
    service = AuthenticationService()
    user, _profile = service.register_user(validated_data)

    user_output = response_schema.dump({
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role.value,
        "account_status": user.account_status.value,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    })

    return jsonify({
        "success": True,
        "message": "User registered successfully.",
        "data": user_output,
    }), 201
