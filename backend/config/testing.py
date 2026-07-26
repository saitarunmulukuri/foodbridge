"""Testing environment configuration."""

import os
from backend.config.config import Config


class TestingConfig(Config):
    """Testing environment specific settings."""

    DEBUG: bool = True
    TESTING: bool = True
    LOG_LEVEL: str = "DEBUG"
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "TEST_DATABASE_URL", "sqlite:///:memory:"
    )
    SQLALCHEMY_ECHO: bool = False
