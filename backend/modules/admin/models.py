"""Audit log entity SQLAlchemy ORM model."""

from typing import TYPE_CHECKING, Optional
from sqlalchemy import BigInteger, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import ImmutableBaseModel

if TYPE_CHECKING:
    from backend.modules.authentication.models import User


class AuditLog(ImmutableBaseModel):
    """System-wide security and activity audit log entity model."""

    __tablename__ = "audit_logs"

    audit_log_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
        index=True,
    )
    entity_name: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    entity_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45), nullable=True
    )
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User")

    def __repr__(self) -> str:
        return f"<AuditLog id={self.audit_log_id} entity='{self.entity_name}' action='{self.action}'>"
