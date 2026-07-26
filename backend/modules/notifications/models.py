"""Notification entity SQLAlchemy ORM model."""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import ImmutableBaseModel
from backend.shared.constants.enums import DeliveryChannel, NotificationType

if TYPE_CHECKING:
    from backend.modules.authentication.models import User


class Notification(ImmutableBaseModel):
    """Platform notification domain model."""

    __tablename__ = "notifications"

    notification_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="UNREAD", index=True
    )
    delivery_channel: Mapped[DeliveryChannel] = mapped_column(
        Enum(DeliveryChannel),
        nullable=False,
        default=DeliveryChannel.IN_APP,
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_notifications_user_status", "user_id", "status"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification id={self.notification_id} user_id={self.user_id} type='{self.notification_type}' status='{self.status}'>"
