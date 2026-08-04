"""Database package initialization.

Includes a compile-time dialect override that makes ``BigInteger`` emit as
``INTEGER`` in SQLite. This is required for SQLAlchemy's ``RETURNING user_id``
pattern to work correctly in test environments (SQLite ROWID autoincrement
only applies to columns declared as ``INTEGER``, not ``BIGINT``).

The override is registered once at module import time via ``@compiles`` and has
no effect on MySQL or PostgreSQL — those dialects use their own compile path.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy import BigInteger
from sqlalchemy.ext.compiler import compiles


# ---------------------------------------------------------------------------
# SQLite compatibility: BigInteger → INTEGER for ROWID autoincrement support
# ---------------------------------------------------------------------------

@compiles(BigInteger, "sqlite")
def _bigint_as_integer_sqlite(element, compiler, **kw):
    """Emit INTEGER (not BIGINT) for SQLite so PK autoincrement works via ROWID."""
    return "INTEGER"


db = SQLAlchemy()
migrate = Migrate()

from backend.database.base import BaseModel, ImmutableBaseModel  # noqa: E402

__all__ = ["db", "migrate", "BaseModel", "ImmutableBaseModel"]
