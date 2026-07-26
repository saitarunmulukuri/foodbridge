"""Configuration package entry point."""

import os
from typing import Dict, Type
from backend.config.config import Config
from backend.config.development import DevelopmentConfig
from backend.config.production import ProductionConfig
from backend.config.testing import TestingConfig

config_by_name: Dict[str, Type[Config]] = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config(env_name: str = None) -> Type[Config]:
    """Retrieve configuration class by environment name."""
    if not env_name:
        env_name = os.getenv("FLASK_ENV", os.getenv("APP_ENV", "development"))
    return config_by_name.get(env_name.lower(), DevelopmentConfig)


__all__ = ["Config", "DevelopmentConfig", "ProductionConfig", "TestingConfig", "get_config", "config_by_name"]
