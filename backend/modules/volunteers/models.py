"""Volunteer entity SQLAlchemy ORM models."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import BaseModel, ImmutableBaseModel
from backend.shared.constants.enums import (
    AssignmentStatus,
    OperationalStatus,
    VehicleType,
    VerificationStatus,
)

if TYPE_CHECKING:
    from backend.modules.authentication.models import User
    from backend.modules.ngos.models import NGORequest


class Volunteer(BaseModel):
    """Volunteer food logistics profile domain model."""

    __tablename__ = "volunteers"

    volunteer_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE", onupdate="CASCADE"),
        unique=True,
        nullable=False,
    )
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    vehicle_type: Mapped[VehicleType] = mapped_column(
        Enum(VehicleType), nullable=False
    )
    latitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 7), nullable=True
    )
    longitude: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(10, 7), nullable=True
    )
    operational_status: Mapped[OperationalStatus] = mapped_column(
        Enum(OperationalStatus),
        nullable=False,
        default=OperationalStatus.OFFLINE,
        index=True,
    )
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
    user: Mapped["User"] = relationship("User", back_populates="volunteer")
    assignments: Mapped[List["VolunteerAssignment"]] = relationship(
        "VolunteerAssignment", back_populates="volunteer", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Volunteer volunteer_id={self.volunteer_id} status='{self.operational_status}'>"


class VolunteerAssignment(BaseModel):
    """Volunteer pickup and delivery dispatch assignment attempt model."""

    __tablename__ = "volunteer_assignments"

    assignment_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    ngo_request_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "ngo_requests.ngo_request_id", ondelete="CASCADE", onupdate="CASCADE"
        ),
        nullable=False,
        index=True,
    )
    volunteer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "volunteers.volunteer_id", ondelete="CASCADE", onupdate="CASCADE"
        ),
        nullable=False,
        index=True,
    )
    assignment_rank: Mapped[int] = mapped_column(Integer, nullable=False)
    assignment_score: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False
    )
    response_deadline: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus),
        nullable=False,
        default=AssignmentStatus.PENDING,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "ngo_request_id", "assignment_rank", name="uq_vol_assign_req_rank"
        ),
        UniqueConstraint(
            "ngo_request_id", "volunteer_id", name="uq_vol_assign_req_vol"
        ),
        CheckConstraint(
            "assignment_score >= 0.00 AND assignment_score <= 100.00",
            name="chk_vol_assign_score",
        ),
        Index("idx_vol_assign_status_deadline", "status", "response_deadline"),
    )

    # Relationships
    ngo_request: Mapped["NGORequest"] = relationship(
        "NGORequest", back_populates="volunteer_assignments"
    )
    volunteer: Mapped["Volunteer"] = relationship(
        "Volunteer", back_populates="assignments"
    )
    history: Mapped[List["AssignmentHistory"]] = relationship(
        "AssignmentHistory",
        back_populates="assignment",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<VolunteerAssignment id={self.assignment_id} req_id={self.ngo_request_id} vol_id={self.volunteer_id} status='{self.status}'>"


class AssignmentHistory(ImmutableBaseModel):
    """Immutable status transition audit trail log for volunteer assignments."""

    __tablename__ = "assignment_history"

    assignment_history_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    assignment_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "volunteer_assignments.assignment_id",
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        nullable=False,
        index=True,
    )
    previous_status: Mapped[Optional[AssignmentStatus]] = mapped_column(
        Enum(AssignmentStatus), nullable=True
    )
    new_status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus), nullable=False
    )
    changed_by_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    change_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    assignment: Mapped["VolunteerAssignment"] = relationship(
        "VolunteerAssignment", back_populates="history"
    )
    changed_by_user: Mapped[Optional["User"]] = relationship("User")

    def __repr__(self) -> str:
        return f"<AssignmentHistory id={self.assignment_history_id} assign_id={self.assignment_id} {self.previous_status}->{self.new_status}>"
