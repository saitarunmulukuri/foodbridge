"""NGO entity SQLAlchemy ORM models."""

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
    CapacityStatus,
    DayOfWeek,
    RequestStatus,
    VerificationStatus,
)

if TYPE_CHECKING:
    from backend.modules.authentication.models import User
    from backend.modules.donations.models import RecommendationCycle
    from backend.modules.volunteers.models import VolunteerAssignment


class NGO(BaseModel):
    """Non-Governmental Organization recipient entity model."""

    __tablename__ = "ngos"

    ngo_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="CASCADE", onupdate="CASCADE"),
        unique=True,
        nullable=False,
    )
    organisation_name: Mapped[str] = mapped_column(String(200), nullable=False)
    registration_number: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    contact_person: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(10, 7), nullable=False)
    service_radius_km: Mapped[int] = mapped_column(
        Integer, nullable=False, default=15, index=True
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

    __table_args__ = (
        CheckConstraint("service_radius_km > 0", name="chk_ngos_service_radius"),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="ngo")
    daily_capacities: Mapped[List["NGODailyCapacity"]] = relationship(
        "NGODailyCapacity", back_populates="ngo", cascade="all, delete-orphan"
    )
    ngo_requests: Mapped[List["NGORequest"]] = relationship(
        "NGORequest", back_populates="ngo", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<NGO ngo_id={self.ngo_id} org='{self.organisation_name}'>"


class NGODailyCapacity(BaseModel):
    """NGO daily meal intake operational capacity model."""

    __tablename__ = "ngo_daily_capacity"

    capacity_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    ngo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("ngos.ngo_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    day_of_week: Mapped[DayOfWeek] = mapped_column(Enum(DayOfWeek), nullable=False)
    max_meals: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    remaining_capacity: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    status: Mapped[CapacityStatus] = mapped_column(
        Enum(CapacityStatus),
        nullable=False,
        default=CapacityStatus.ACTIVE,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint("ngo_id", "day_of_week", name="uq_ngo_daily_capacity"),
        CheckConstraint("max_meals >= 0", name="chk_ngo_capacity_max_meals"),
        CheckConstraint(
            "remaining_capacity >= 0", name="chk_ngo_capacity_remaining"
        ),
    )

    # Relationships
    ngo: Mapped["NGO"] = relationship("NGO", back_populates="daily_capacities")

    def __repr__(self) -> str:
        return f"<NGODailyCapacity capacity_id={self.capacity_id} day={self.day_of_week} remaining={self.remaining_capacity}>"


class NGORequest(BaseModel):
    """Candidate NGO recommendation attempt model generated within a Recommendation Cycle."""

    __tablename__ = "ngo_requests"

    ngo_request_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    recommendation_cycle_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "recommendation_cycles.recommendation_cycle_id",
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        nullable=False,
        index=True,
    )
    ngo_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("ngos.ngo_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    recommendation_rank: Mapped[int] = mapped_column(Integer, nullable=False)
    recommendation_score: Mapped[Decimal] = mapped_column(
        Numeric(6, 2), nullable=False
    )
    response_deadline: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus),
        nullable=False,
        default=RequestStatus.PENDING,
        index=True,
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "recommendation_cycle_id",
            "recommendation_rank",
            name="uq_ngo_requests_cycle_rank",
        ),
        UniqueConstraint(
            "recommendation_cycle_id", "ngo_id", name="uq_ngo_requests_cycle_ngo"
        ),
        CheckConstraint(
            "recommendation_score >= 0.00 AND recommendation_score <= 100.00",
            name="chk_ngo_req_score",
        ),
        Index("idx_ngo_requests_status_deadline", "status", "response_deadline"),
    )

    # Relationships
    recommendation_cycle: Mapped["RecommendationCycle"] = relationship(
        "RecommendationCycle", back_populates="ngo_requests"
    )
    ngo: Mapped["NGO"] = relationship("NGO", back_populates="ngo_requests")
    volunteer_assignments: Mapped[List["VolunteerAssignment"]] = relationship(
        "VolunteerAssignment",
        back_populates="ngo_request",
        cascade="all, delete-orphan",
    )
    history: Mapped[List["NGORequestHistory"]] = relationship(
        "NGORequestHistory",
        back_populates="ngo_request",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<NGORequest ngo_request_id={self.ngo_request_id} ngo_id={self.ngo_id} rank={self.recommendation_rank} status='{self.status}'>"


class NGORequestHistory(ImmutableBaseModel):
    """Immutable status transition audit trail log for NGO requests."""

    __tablename__ = "ngo_request_history"

    ngo_request_history_id: Mapped[int] = mapped_column(
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
    previous_status: Mapped[Optional[RequestStatus]] = mapped_column(
        Enum(RequestStatus), nullable=True
    )
    new_status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus), nullable=False
    )
    changed_by_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    change_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    ngo_request: Mapped["NGORequest"] = relationship(
        "NGORequest", back_populates="history"
    )
    changed_by_user: Mapped[Optional["User"]] = relationship("User")

    def __repr__(self) -> str:
        return f"<NGORequestHistory id={self.ngo_request_history_id} req_id={self.ngo_request_id} {self.previous_status}->{self.new_status}>"
