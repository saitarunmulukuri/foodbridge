"""Base SQLAlchemy model classes for FoodBridge database entities."""

from datetime import datetime
from typing import Any, Dict
from sqlalchemy import DateTime, func
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import FunctionElement
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import db


class current_timestamp_on_update(FunctionElement):
    """Dialect-aware DDL expression for updated_at server default.

    - MySQL: ``CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP``
    - All other dialects (SQLite, PostgreSQL): ``CURRENT_TIMESTAMP``
    """
    inherit_cache = True


@compiles(current_timestamp_on_update, "mysql")
def _compile_mysql(element, compiler, **kw):
    return "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"


@compiles(current_timestamp_on_update)
def _compile_default(element, compiler, **kw):
    return "CURRENT_TIMESTAMP"


class BaseModel(db.Model):
    """Abstract base model for stateful domain entities.
    
    Includes timestamp tracking (created_at, updated_at) and a lightweight
    debugging dictionary representation method. Database transaction logic
    (commits, rollbacks) is strictly managed by the Service layer.
    """

    __abstract__ = True

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        server_default=current_timestamp_on_update(),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Lightweight debugging dictionary representation helper.
        
        Note: Production API response serialization is handled by Marshmallow
        schemas in the presentation/service layer.
        """
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }


class ImmutableBaseModel(db.Model):
    """Abstract base model for immutable audit, snapshot, and history log entities.
    
    Omits the `updated_at` timestamp field to strictly enforce append-only immutability.
    Database transaction logic is strictly managed by the Service layer.
    """

    __abstract__ = True

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        server_default=func.current_timestamp(),
    )

    def to_dict(self) -> Dict[str, Any]:
        """Lightweight debugging dictionary representation helper.
        
        Note: Production API response serialization is handled by Marshmallow
        schemas in the presentation/service layer.
        """
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
