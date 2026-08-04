"""Sprint 3.2 — create ngo_date_capacities table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-27

Creates the `ngo_date_capacities` table to support the Sprint 3.2
NGO Date Capacity Management specification.

Schema:
    date_capacity_id   BIGINT PK AUTO_INCREMENT
    ngo_id             BIGINT FK → ngos.ngo_id  (CASCADE DELETE/UPDATE)
    date               DATE NOT NULL
    max_meals          INT NOT NULL              (API: maximum_capacity)
    allocated_meals    INT NOT NULL DEFAULT 0    (API: allocated_capacity; system-managed)
    created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

    UNIQUE(ngo_id, date)
    CHECK(max_meals > 0)
    CHECK(allocated_meals >= 0)
    INDEX(ngo_id, date)

Note:
    remaining_capacity is NEVER stored — always computed as max_meals - allocated_meals.
    allocated_meals is system-managed (updated by the Decision Engine); it is never
    accepted from client input.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic
revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the ngo_date_capacities table."""
    op.create_table(
        "ngo_date_capacities",
        sa.Column("date_capacity_id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("ngo_id", sa.BigInteger(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("max_meals", sa.Integer(), nullable=False),
        sa.Column(
            "allocated_meals",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["ngo_id"],
            ["ngos.ngo_id"],
            name="fk_ngo_date_capacities_ngo_id",
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        sa.PrimaryKeyConstraint("date_capacity_id", name="pk_ngo_date_capacities"),
        sa.UniqueConstraint("ngo_id", "date", name="uq_ngo_date_capacity"),
        sa.CheckConstraint("max_meals > 0", name="chk_ngo_date_cap_max_meals"),
        sa.CheckConstraint("allocated_meals >= 0", name="chk_ngo_date_cap_allocated"),
    )
    op.create_index(
        "idx_ngo_date_capacities_ngo_date",
        "ngo_date_capacities",
        ["ngo_id", "date"],
        unique=False,
    )


def downgrade() -> None:
    """Drop the ngo_date_capacities table."""
    op.drop_index("idx_ngo_date_capacities_ngo_date", table_name="ngo_date_capacities")
    op.drop_table("ngo_date_capacities")
