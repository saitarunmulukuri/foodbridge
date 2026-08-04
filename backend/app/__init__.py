"""FoodBridge Flask Application Factory module."""

import logging
from typing import Optional, Type
from flask import Flask, Blueprint
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from backend.config import get_config, Config
from backend.database import db, migrate
from backend.shared.logging import setup_logging
from backend.shared.exceptions import register_error_handlers
from backend.modules.system.routes import system_bp
from backend.modules.authentication.routes import auth_bp
from backend.modules.donations.routes import donations_bp
from backend.modules.ngos.routes import ngos_bp
from backend.modules.donation_requests.routes import ngo_requests_bp
from backend.modules.decision_engine.routes import decision_engine_bp
from backend.modules.volunteers.routes import volunteers_bp
from backend.shared.scheduling import LocalScheduler

logger = logging.getLogger(__name__)

jwt = JWTManager()
cors = CORS()

# Base API v1 blueprint for versioned routing (/api/v1/)
api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")


def create_app(config_name: Optional[str] = None) -> Flask:
    """Construct and configure the Flask application instance using Application Factory pattern.

    Args:
        config_name: Optional environment name ('development', 'production', 'testing').

    Returns:
        Configured Flask application instance.
    """
    app = Flask(__name__)

    # Load configuration from environment / object
    config_class: Type[Config] = get_config(config_name)
    app.config.from_object(config_class)

    # Initialize reusable logging
    setup_logging(app)
    app.logger.info("Initializing FoodBridge Backend in [%s] mode", app.config["APP_ENV"])

    # Initialize Flask extensions
    _initialize_extensions(app)

    # Register centralized error handlers
    register_error_handlers(app)

    # Register application versioned blueprints
    _register_blueprints(app)

    # Start background scheduler (disabled in testing)
    if app.config.get("SCHEDULER_ENABLED", True) and not app.config.get("TESTING", False):
        _start_scheduler(app)

    return app


def _initialize_extensions(app: Flask) -> None:
    """Initialize database and security extensions with Flask application context."""
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    cors_origins = app.config.get("CORS_ORIGINS", "*")
    cors.init_app(app, resources={r"/api/*": {"origins": cors_origins}})


def _register_blueprints(app: Flask) -> None:
    """Register system and domain blueprints under API v1 versioned routing."""
    api_v1_bp = Blueprint("api_v1", __name__, url_prefix="/api/v1")
    api_v1_bp.register_blueprint(system_bp)
    api_v1_bp.register_blueprint(auth_bp)
    api_v1_bp.register_blueprint(donations_bp)
    api_v1_bp.register_blueprint(ngos_bp)
    api_v1_bp.register_blueprint(ngo_requests_bp)
    api_v1_bp.register_blueprint(decision_engine_bp)
    api_v1_bp.register_blueprint(volunteers_bp)
    app.register_blueprint(api_v1_bp)


def _start_scheduler(app: Flask) -> None:
    """Register background timeout jobs and start the LocalScheduler.

    Each job callable closes over the Flask ``app`` object and pushes an
    application context before touching the database — this makes the jobs
    completely independent of Flask's request context.
    """
    from backend.modules.decision_engine.timeout_manager import NGOTimeoutManager
    from backend.modules.volunteers.timeout_manager import VolunteerTimeoutManager

    ngo_interval: int = app.config.get("NGO_TIMEOUT_CHECK_INTERVAL", 60)
    vol_interval: int = app.config.get("VOLUNTEER_TIMEOUT_CHECK_INTERVAL", 60)
    ngo_timeout_min: int = app.config.get("NGO_RESPONSE_TIMEOUT_MINUTES", 30)
    vol_timeout_min: int = app.config.get("VOLUNTEER_RESPONSE_TIMEOUT_MINUTES", 15)
    vol_radius_km: float = app.config.get("VOLUNTEER_FALLBACK_RADIUS_KM", 15.0)

    scheduler = LocalScheduler()

    def _ngo_timeout_job() -> None:
        with app.app_context():
            try:
                manager = NGOTimeoutManager(response_timeout_minutes=ngo_timeout_min)
                count = manager.process_expired_requests()
                if count:
                    logger.info("Scheduler[ngo_timeout]: processed %d expired NGO request(s).", count)
            except Exception:
                logger.exception("Scheduler[ngo_timeout]: unhandled error in NGO timeout sweep.")

    def _volunteer_timeout_job() -> None:
        with app.app_context():
            try:
                manager = VolunteerTimeoutManager(
                    response_timeout_minutes=vol_timeout_min,
                    fallback_radius_km=vol_radius_km,
                )
                count = manager.process_expired_assignments()
                if count:
                    logger.info("Scheduler[volunteer_timeout]: processed %d expired assignment(s).", count)
            except Exception:
                logger.exception("Scheduler[volunteer_timeout]: unhandled error in volunteer timeout sweep.")

    scheduler.add_job(
        job_id="ngo_timeout",
        fn=_ngo_timeout_job,
        interval_seconds=ngo_interval,
        description="Sweep expired NGO requests and dispatch to next ranked NGO.",
    )
    scheduler.add_job(
        job_id="volunteer_timeout",
        fn=_volunteer_timeout_job,
        interval_seconds=vol_interval,
        description="Sweep expired volunteer assignments and dispatch to next candidate.",
    )

    scheduler.start()
    app.extensions["scheduler"] = scheduler
    logger.info(
        "FoodBridge scheduler started: ngo_timeout=%ds, volunteer_timeout=%ds.",
        ngo_interval,
        vol_interval,
    )

