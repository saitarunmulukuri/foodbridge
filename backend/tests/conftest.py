"""pytest conftest for integration tests.

Provides two SQLite compatibility patches needed because the FoodBridge models
are MySQL-targeted:

1. BigInteger → INTEGER: SQLite autoincrement only works for columns typed
   exactly ``INTEGER`` (ROWID alias). BigInteger compiles to ``BIGINT`` in
   SQLite which breaks flush()-based PK generation. The @compiles decorator
   overrides this for the sqlite dialect only.

2. PRAGMA foreign_keys=OFF: Disables SQLite FK enforcement so that MySQL-style
   ON DELETE/UPDATE cascade constraints that are silently accepted but not
   executed by SQLite don't break insert order.

Neither patch affects MySQL production deployments.
"""

import pytest
import sqlite3

from sqlalchemy import BigInteger, event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.compiler import compiles


# ---------------------------------------------------------------------------
# Patch 1: BigInteger → INTEGER in SQLite so autoincrement PKs work
# ---------------------------------------------------------------------------

@compiles(BigInteger, "sqlite")
def _bigint_as_integer(element, compiler, **kw):
    """Compile BigInteger as INTEGER in SQLite for ROWID autoincrement support."""
    return "INTEGER"


# ---------------------------------------------------------------------------
# Patch 2: Disable SQLite FK enforcement (ON UPDATE CASCADE not supported)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session", autouse=True)
def disable_sqlite_fk_enforcement():
    """Disable SQLite FK enforcement for the entire test session."""

    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        if isinstance(dbapi_connection, sqlite3.Connection):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=OFF")
            cursor.close()

    yield
