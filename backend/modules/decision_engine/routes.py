"""API route definitions for the Decision Engine module.

Registered blueprint:
    decision_engine_bp → mounted at /decision-engine under /api/v1/ prefix

Sprint 3.2: POST /api/v1/decision-engine/run
Sprint 5.5: Added IDOR ownership guard — DONOR can only run on their own donation.
"""

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required
from marshmallow import ValidationError

from backend.modules.decision_engine.schemas import (
    DecisionEngineResultSchema,
    DecisionEngineRunRequestSchema,
)
from backend.modules.decision_engine.services import DecisionEngineService
from backend.modules.donations.repositories import DonationRepository
from backend.modules.donations.exceptions import (
    DonationNotFoundException,
    DonationForbiddenException,
)
from backend.modules.donors.models import Donor
from backend.shared.constants.enums import DonationStatus
from backend.shared.exceptions.base_exceptions import BadRequestException, ForbiddenException
from backend.database import db
from sqlalchemy import select

logger = logging.getLogger(__name__)

decision_engine_bp = Blueprint("decision_engine", __name__, url_prefix="/decision-engine")

_run_request_schema = DecisionEngineRunRequestSchema()
_result_schema = DecisionEngineResultSchema()


@decision_engine_bp.route("/run", methods=["POST"])
@jwt_required()
def run_decision_engine():
    """Execute the NGO recommendation matching pipeline for a donation.

    Endpoint: POST /api/v1/decision-engine/run

    Authorization:
        Requires valid JWT. DONOR role: may only run on their own SUBMITTED donation.
        ADMIN role: may run on any donation.

    Request Payload (JSON):
        donation_id (int) required — primary key of donation to match
        top_n       (int) optional — limit on number of recommended NGOs

    Security (Sprint 5.5):
        DONOR callers are subject to IDOR ownership check — the donation_id must
        belong to the authenticated donor's profile. ADMINs bypass ownership check.

    Returns:
        200 OK — ranked NGO recommendations.
        400 Bad Request — missing payload or validation failure.
        403 Forbidden — DONOR trying to run engine on another donor's donation.
        404 Not Found — donation_id does not exist.
    """
    json_data = request.get_json(silent=True)
    if not json_data:
        raise BadRequestException("Missing or invalid JSON payload.")

    try:
        validated_data = _run_request_schema.load(json_data)
    except ValidationError as err:
        raise BadRequestException(message="Validation failed.", payload=err.messages)

    claims = get_jwt()
    user_id = int(claims["sub"])
    role = claims.get("role", "")

    donation_id = validated_data["donation_id"]
    top_n = validated_data.get("top_n")

    # IDOR ownership guard: non-ADMIN callers must own the donation
    if role != "ADMIN":
        repo = DonationRepository()
        donation = repo.find_donation_by_id(donation_id)
        if donation is None:
            raise DonationNotFoundException(donation_id)
        # Resolve caller's donor profile
        donor_stmt = select(Donor).where(Donor.user_id == user_id)
        caller_donor = db.session.execute(donor_stmt).scalars().first()
        if caller_donor is None or donation.donor_id != caller_donor.donor_id:
            raise DonationForbiddenException(donation_id)

    service = DecisionEngineService()
    result = service.run(donation_id=donation_id, top_n=top_n)

    output = _result_schema.dump(result)

    return jsonify({
        "success": True,
        "message": "NGO recommendations generated successfully.",
        "data": output,
    }), 200
