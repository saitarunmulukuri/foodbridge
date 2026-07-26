"""Donor entity SQLAlchemy ORM model."""

from decimal import Decimal
from typing import TYPE_CHECKING, List
from sqlalchemy import BigInteger, Boolean, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import BaseModel
from backend.shared.constants.enums import VerificationStatus

if TYPE_CHECKING:
    from backend.modules.authentication.models import User
    from backend.modules.donations.models import Donation


class Donor(BaseModel):
    """Food donor profile domain model."""

    __tablename__ = "donors"

    donor_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE", onupdate="CASCADE"),
        unique=True,
        nullable=False,
    )
    organisation_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_person: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        Enum(VerificationStatus),
        nullable=False,
        default=VerificationStatus.PENDING,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, index=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="donor")
    donations: Mapped[List["Donation"]] = relationship(
        "Donation", back_populates="donor", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Donor donor_id={self.donor_id} org='{self.organisation_name}'>"
