"""Sprint 3.1 - add NGO profile fields: city, state, country, postal_code, description, website

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-07-27

Adds six new nullable columns to the `ngos` table to support the Sprint 3.1
NGO Profile Management specification:

    city          VARCHAR(100)  NULL
    state         VARCHAR(100)  NULL
    country       VARCHAR(100)  NULL
    postal_code   VARCHAR(20)   NULL
    description   TEXT          NULL
    website       VARCHAR(255)  NULL

All columns are NULL-able to preserve backward compatibility with NGO rows
created before this migration (i.e. via the registration endpoint).
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = "a1b2c3d4e5f6"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("ngos", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("city", sa.String(length=100), nullable=True),
        )
        batch_op.add_column(
            sa.Column("state", sa.String(length=100), nullable=True),
        )
        batch_op.add_column(
            sa.Column("country", sa.String(length=100), nullable=True),
        )
        batch_op.add_column(
            sa.Column("postal_code", sa.String(length=20), nullable=True),
        )
        batch_op.add_column(
            sa.Column("description", sa.Text(), nullable=True),
        )
        batch_op.add_column(
            sa.Column("website", sa.String(length=255), nullable=True),
        )
        batch_op.alter_column(
            "latitude",
            existing_type=sa.Numeric(precision=10, scale=7),
            nullable=True,
        )
        batch_op.alter_column(
            "longitude",
            existing_type=sa.Numeric(precision=10, scale=7),
            nullable=True,
        )


def downgrade():
    with op.batch_alter_table("ngos", schema=None) as batch_op:
        batch_op.drop_column("website")
        batch_op.drop_column("description")
        batch_op.drop_column("postal_code")
        batch_op.drop_column("country")
        batch_op.drop_column("state")
        batch_op.drop_column("city")
        batch_op.alter_column(
            "latitude",
            existing_type=sa.Numeric(precision=10, scale=7),
            nullable=False,
        )
        batch_op.alter_column(
            "longitude",
            existing_type=sa.Numeric(precision=10, scale=7),
            nullable=False,
        )
