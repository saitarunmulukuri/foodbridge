"""Decision engine configuration SQLAlchemy ORM model."""

from decimal import Decimal
from sqlalchemy import BigInteger, Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import BaseModel


class DecisionEngineConfig(BaseModel):
    """Decision Engine matching algorithm configuration model."""

    __tablename__ = "decision_engine_configs"

    config_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    algorithm_version: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False
    )
    distance_weight: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.35")
    )
    capacity_weight: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.25")
    )
    expiry_weight: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.25")
    )
    freshness_weight: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False, default=Decimal("0.15")
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )

    def __repr__(self) -> str:
        return f"<DecisionEngineConfig version='{self.algorithm_version}' active={self.is_active}>"
