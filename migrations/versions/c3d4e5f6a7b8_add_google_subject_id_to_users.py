"""Add google_subject_id to users and make password_hash nullable

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-22

Schema changes:
    - Add `google_subject_id` VARCHAR(255) NULL UNIQUE to `users` table
    - Add unique index `idx_users_google_subject_id` on `users(google_subject_id)`
    - Alter `password_hash` in `users` to be nullable for Google-only OAuth accounts
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add google_subject_id column and allow nullable password_hash."""
    op.add_column(
        "users",
        sa.Column("google_subject_id", sa.String(255), nullable=True),
    )
    op.create_unique_constraint(
        "uq_users_google_subject_id", "users", ["google_subject_id"]
    )
    op.create_index(
        "idx_users_google_subject_id",
        "users",
        ["google_subject_id"],
        unique=True,
    )
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(255),
        nullable=True,
    )


def downgrade() -> None:
    """Remove google_subject_id column and revert password_hash to NOT NULL."""
    op.drop_index("idx_users_google_subject_id", table_name="users")
    op.drop_constraint("uq_users_google_subject_id", "users", type_="unique")
    op.drop_column("users", "google_subject_id")
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(255),
        nullable=False,
    )
