"""User authentication SQLAlchemy ORM model."""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import BigInteger, DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import BaseModel
from backend.shared.constants.enums import AccountStatus, UserRole

if TYPE_CHECKING:
    from backend.modules.donors.models import Donor
    from backend.modules.ngos.models import NGO
    from backend.modules.volunteers.models import Volunteer
    from backend.modules.donations.models import Donation
    from backend.modules.notifications.models import Notification


class User(BaseModel):
    """User authentication and identity domain model."""

    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole), nullable=False, index=True
    )
    account_status: Mapped[AccountStatus] = mapped_column(
        Enum(AccountStatus),
        nullable=False,
        default=AccountStatus.PENDING,
        index=True,
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    # Relationships
    donor: Mapped[Optional["Donor"]] = relationship(
        "Donor", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    ngo: Mapped[Optional["NGO"]] = relationship(
        "NGO", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    volunteer: Mapped[Optional["Volunteer"]] = relationship(
        "Volunteer", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    created_donations: Mapped[List["Donation"]] = relationship(
        "Donation",
        back_populates="created_by_user",
        foreign_keys="[Donation.created_by_user_id]",
    )

    def __repr__(self) -> str:
        return f"<User user_id={self.user_id} email='{self.email}' role='{self.role}'>"
