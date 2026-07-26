"""Database package initialization."""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()
migrate = Migrate()

from backend.database.base import BaseModel, ImmutableBaseModel

__all__ = ["db", "migrate", "BaseModel", "ImmutableBaseModel"]
