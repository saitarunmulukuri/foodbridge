"""Development environment configuration."""

import os
from backend.config.config import Config


class DevelopmentConfig(Config):
    """Development environment specific settings."""

    DEBUG: bool = True
    TESTING: bool = False
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG")
    SQLALCHEMY_ECHO: bool = False


# ---------------------------------------------------------------------------
# SQLite compatibility patch (applied when DATABASE_URL points to SQLite)
# Mirrors the patch in backend/tests/conftest.py — BigInteger → INTEGER so
# that SQLAlchemy autoincrement PKs work correctly on SQLite's ROWID scheme.
# This patch is a no-op when running against MySQL/PostgreSQL.
# ---------------------------------------------------------------------------
_db_url = os.getenv("DATABASE_URL", "")
if _db_url.startswith("sqlite"):
    try:
        from sqlalchemy import BigInteger, event
        from sqlalchemy.engine import Engine
        from sqlalchemy.ext.compiler import compiles
        import sqlite3

        @compiles(BigInteger, "sqlite")
        def _bigint_as_integer(element, compiler, **kw):
            return "INTEGER"

        @event.listens_for(Engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, connection_record):
            if isinstance(dbapi_connection, sqlite3.Connection):
                cursor = dbapi_connection.cursor()
                cursor.execute("PRAGMA foreign_keys=OFF")
                cursor.close()

    except Exception:
        pass  # Fail gracefully — do not break app startup
