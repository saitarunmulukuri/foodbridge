"""Global exception handlers registration module for Flask."""

import logging
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException
from marshmallow.exceptions import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from backend.shared.exceptions.base_exceptions import APIException

logger = logging.getLogger(__name__)


def register_error_handlers(app: Flask) -> None:
    """Register central error handlers on the Flask application instance.

    Args:
        app: Flask application instance.
    """

    @app.errorhandler(APIException)
    def handle_api_exception(error: APIException):
        """Handle custom application API exceptions."""
        logger.warning(f"APIException [{error.error_code}]: {error.message}")
        return jsonify(error.to_dict()), error.status_code

    @app.errorhandler(ValidationError)
    def handle_validation_error(error: ValidationError):
        """Handle Marshmallow schema validation errors."""
        logger.warning(f"ValidationError: {error.messages}")
        response = {
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Input validation failed.",
                "details": error.messages,
            },
        }
        return jsonify(response), 422

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        """Handle standard Werkzeug HTTP exceptions."""
        logger.info(f"HTTPException [{error.code}]: {error.description}")
        response = {
            "success": False,
            "error": {
                "code": error.name.upper().replace(" ", "_"),
                "message": error.description,
                "details": None,
            },
        }
        return jsonify(response), error.code

    @app.errorhandler(SQLAlchemyError)
    def handle_db_exception(error: SQLAlchemyError):
        """Handle SQLAlchemy database operational errors gracefully."""
        logger.error(f"Database error encountered: {str(error)}", exc_info=True)
        response = {
            "success": False,
            "error": {
                "code": "DATABASE_ERROR",
                "message": "A database error occurred. Please try again later.",
                "details": None,
            },
        }
        return jsonify(response), 500

    @app.errorhandler(Exception)
    def handle_unhandled_exception(error: Exception):
        """Fallback handler for unhandled internal exceptions."""
        logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
        response = {
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An internal server error occurred.",
                "details": None,
            },
        }
        return jsonify(response), 500
