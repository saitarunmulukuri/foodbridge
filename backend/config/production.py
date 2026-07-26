"""Production environment configuration."""

import os
from backend.config.config import Config


class ProductionConfig(Config):
    """Production environment specific settings."""

    DEBUG: bool = False
    TESTING: bool = False
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    SQLALCHEMY_ECHO: bool = False

    # Production overrides and validations can be added here
