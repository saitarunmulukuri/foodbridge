"""Base configuration class for FoodBridge application."""

import os
from datetime import timedelta
from typing import List, Union
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration with shared defaults across all environments."""

    # General Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "default-secret-key-change-me")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    API_VERSION: str = os.getenv("API_VERSION", "v1")
    DEBUG: bool = False
    TESTING: bool = False

    # JWT Configuration
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MINUTES", "60"))
    )
    JWT_REFRESH_TOKEN_EXPIRES: timedelta = timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", "30"))
    )

    # Database Configuration (MySQL / PyMySQL)
    MYSQL_HOST: str = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT: str = os.getenv("MYSQL_PORT", "3306")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "foodbridge_db")
    MYSQL_USERNAME: str = os.getenv("MYSQL_USERNAME", "foodbridge_user")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "foodbridge_password")

    # Construct default MySQL URL if DATABASE_URL is not set
    _DEFAULT_DB_URL = f"mysql+pymysql://{MYSQL_USERNAME}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URL", _DEFAULT_DB_URL)

    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SQLALCHEMY_ENGINE_OPTIONS: dict = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
    }

    # CORS Configuration
    CORS_ORIGINS: Union[List[str], str] = (
        os.getenv("CORS_ORIGINS", "*").split(",")
        if os.getenv("CORS_ORIGINS") != "*"
        else "*"
    )

    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE_PATH: str = os.getenv("LOG_FILE_PATH", "logs/app.log")

    # Decision Engine Configuration
    # Hard ceiling on NGO-donation distance regardless of NGO service_radius_km.
    # NGOs whose own service_radius_km exceeds this cap are still limited to this value.
    DECISION_ENGINE_MAX_DISTANCE_KM: float = float(
        os.getenv("DECISION_ENGINE_MAX_DISTANCE_KM", "50")
    )
    # Minimum remaining daily meal capacity an NGO must have to be eligible.
    DECISION_ENGINE_MIN_REMAINING_CAPACITY: int = int(
        os.getenv("DECISION_ENGINE_MIN_REMAINING_CAPACITY", "1")
    )

    # ---------------------------------------------------------------------------
    # Background Scheduler Configuration
    # ---------------------------------------------------------------------------

    # Whether to start the background scheduler at all (set False in testing).
    SCHEDULER_ENABLED: bool = os.getenv("SCHEDULER_ENABLED", "true").lower() == "true"

    # How often (in seconds) the NGO timeout sweep runs.
    NGO_TIMEOUT_CHECK_INTERVAL: int = int(
        os.getenv("NGO_TIMEOUT_CHECK_INTERVAL", "60")
    )

    # How often (in seconds) the Volunteer timeout sweep runs.
    VOLUNTEER_TIMEOUT_CHECK_INTERVAL: int = int(
        os.getenv("VOLUNTEER_TIMEOUT_CHECK_INTERVAL", "60")
    )

    # Minutes an NGO has to respond before their request is automatically timed out.
    NGO_RESPONSE_TIMEOUT_MINUTES: int = int(
        os.getenv("NGO_RESPONSE_TIMEOUT_MINUTES", "30")
    )

    # Minutes a volunteer has to respond before their assignment is automatically timed out.
    VOLUNTEER_RESPONSE_TIMEOUT_MINUTES: int = int(
        os.getenv("VOLUNTEER_RESPONSE_TIMEOUT_MINUTES", "15")
    )

    # Maximum search radius (km) when re-running volunteer candidate search on fallback.
    VOLUNTEER_FALLBACK_RADIUS_KM: float = float(
        os.getenv("VOLUNTEER_FALLBACK_RADIUS_KM", "15")
    )

