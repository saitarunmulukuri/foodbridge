"""API route definitions for the Authentication module.

Registered blueprints:
    auth_bp → mounted at /auth under /api/v1/ prefix

Sprint 1.1: POST /api/v1/auth/register
Sprint 1.2: POST /api/v1/auth/login
"""

from flask import Blueprint, jsonify, request
from marshmallow import ValidationError

from backend.modules.authentication.exceptions import (
    LoginValidationException,
    RegistrationValidationException,
)
from backend.modules.authentication.schemas import (
    UserLoginSchema,
    UserRegisterResponseSchema,
    UserRegisterSchema,
)
from backend.modules.authentication.services import AuthenticationService

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

_register_schema = UserRegisterSchema()
_register_response_schema = UserRegisterResponseSchema()
_login_schema = UserLoginSchema()


@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user (DONOR, NGO, or VOLUNTEER) and their role-specific profile.

    Endpoint: POST /api/v1/auth/register

    Request Body:
        email           (str)  required
        password        (str)  required — must satisfy password policy
        password_confirmation (str) required
        role            (str)  required — DONOR | NGO | VOLUNTEER
        profile         (dict) required — role-specific fields

    Returns:
        201 Created — with user_id, email, role, account_status, created_at.
    """
    json_data = request.get_json(silent=True)
    if not json_data:
        raise RegistrationValidationException(
            {"payload": ["Missing or invalid JSON payload."]}
        )

    try:
        validated_data = _register_schema.load(json_data)
    except ValidationError as err:
        raise RegistrationValidationException(err.messages)

    service = AuthenticationService()
    user, _profile = service.register_user(validated_data)

    user_output = _register_response_schema.dump({
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


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate a user and issue JWT access and refresh tokens.

    Endpoint: POST /api/v1/auth/login

    Request Body:
        email    (str) required
        password (str) required

    Returns:
        200 OK — with access_token, refresh_token, token_type, expires_in, user info.

    Security:
        Authentication failures (bad email or wrong password) always return
        HTTP 401 with error code INVALID_CREDENTIALS. The response intentionally
        does not distinguish between the two to prevent user enumeration attacks.
    """
    json_data = request.get_json(silent=True)
    if not json_data:
        raise LoginValidationException({"payload": ["Missing or invalid JSON payload."]})

    try:
        validated_data = _login_schema.load(json_data)
    except ValidationError as err:
        raise LoginValidationException(err.messages)

    service = AuthenticationService()
    result = service.login_user(validated_data)

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "data": result,
    }), 200
