"""FoodBridge Flask Application Factory module."""

import os
from datetime import datetime, timezone
from typing import Optional, Type
from flask import Flask, Blueprint, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from backend.config import get_config, Config
from backend.database import db, migrate
from backend.shared.logging import setup_logging
from backend.shared.exceptions import register_error_handlers

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
    app.logger.info(f"Initializing FoodBridge Backend in [{app.config['APP_ENV']}] mode")

    # Initialize Flask extensions
    _initialize_extensions(app)

    # Register centralized error handlers
    register_error_handlers(app)

    # Register application versioned blueprints
    _register_blueprints(app)

    return app


def _initialize_extensions(app: Flask) -> None:
    """Initialize database and security extensions with Flask application context."""
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    cors_origins = app.config.get("CORS_ORIGINS", "*")
    cors.init_app(app, resources={r"/api/*": {"origins": cors_origins}})


def _register_blueprints(app: Flask) -> None:
    """Register API v1 blueprints and health routes."""

    @api_v1_bp.route("/health", methods=["GET"])
    def api_v1_health():
        """API v1 versioned health check endpoint."""
        version_str = app.config.get("API_VERSION", "v1") if app else "v1"
        return jsonify({
            "status": "healthy",
            "service": "FoodBridge API",
            "version": version_str,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200

    # Register API v1 blueprint on application
    app.register_blueprint(api_v1_bp)

    # Future domain module blueprints will be registered under api_v1_bp:
    # Example:
    # from backend.modules.authentication.routes import auth_bp
    # api_v1_bp.register_blueprint(auth_bp, url_prefix="/auth")
