"""Development environment configuration."""

import os
from backend.config.config import Config


class DevelopmentConfig(Config):
    """Development environment specific settings."""

    DEBUG: bool = True
    TESTING: bool = False
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
    SQLALCHEMY_ECHO: bool = False
