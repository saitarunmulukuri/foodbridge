"""Reusable logging configuration module for FoodBridge."""

import logging
import os
import sys
from typing import Optional
from flask import Flask, g, has_request_context


class RequestIdFilter(logging.Filter):
    """Logging filter to inject request_id context attribute into log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Attach request_id attribute to the log record."""
        if has_request_context():
            record.request_id = getattr(g, "request_id", "N/A")
        else:
            record.request_id = "N/A"
        return True


def setup_logging(app: Optional[Flask] = None) -> logging.Logger:
    """Configure application logger for development and production environments.

    Features timestamp, log level, module name, logger name, and request ID placeholder.

    Args:
        app: Optional Flask application instance.

    Returns:
        Configured logger instance.
    """
    log_level_str = (
        app.config.get("LOG_LEVEL", "INFO") if app else os.getenv("LOG_LEVEL", "INFO")
    )
    log_level = getattr(logging, log_level_str.upper(), logging.INFO)

    log_format = (
        "[%(asctime)s] [%(levelname)s] [%(name)s] [%(module)s] [req_id=%(request_id)s]: %(message)s"
    )
    formatter = logging.Formatter(log_format)
    request_filter = RequestIdFilter()

    # Console Handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(request_filter)
    console_handler.setLevel(log_level)

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers to avoid duplicate output
    if root_logger.hasHandlers():
        root_logger.handlers.clear()

    root_logger.addHandler(console_handler)

    # Optional File Handler setup
    log_file = app.config.get("LOG_FILE_PATH") if app else os.getenv("LOG_FILE_PATH")
    if log_file:
        try:
            log_dir = os.path.dirname(log_file)
            if log_dir and not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)

            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            file_handler.addFilter(request_filter)
            file_handler.setLevel(log_level)
            root_logger.addHandler(file_handler)
        except Exception as err:
            root_logger.warning("Failed to initialize file logger: %s", err)

    if app:
        app.logger.handlers = root_logger.handlers
        app.logger.setLevel(log_level)

    return root_logger
