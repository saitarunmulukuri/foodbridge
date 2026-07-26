"""System health check and infrastructure monitoring blueprint."""

from datetime import datetime, timezone
from flask import Blueprint, jsonify
from sqlalchemy import text

from backend.database import db

system_bp = Blueprint("system", __name__)


@system_bp.route("/health", methods=["GET"])
def health_check():
    """System health check endpoint returning service status, database connectivity,
    JWT initialization, versioning, and current UTC timestamp.
    """
    try:
        db.session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return jsonify({
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "jwt": "initialized",
        "version": "v1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200 if db_status == "connected" else 503
