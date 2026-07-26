"""Donation entity SQLAlchemy ORM models."""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Dict, List, Optional
from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import BaseModel, ImmutableBaseModel
from backend.shared.constants.enums import (
    DeliveryPreference,
    DonationStatus,
    ExecutionStatus,
    FoodType,
    ItemCategory,
    QuantityUnit,
    TriggerReason,
)

if TYPE_CHECKING:
    from backend.modules.authentication.models import User
    from backend.modules.donors.models import Donor
    from backend.modules.ngos.models import NGORequest


class Donation(BaseModel):
    """Surplus food donation offer domain model."""

    __tablename__ = "donations"

    donation_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    donor_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("donors.donor_id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
        index=True,
    )
    donation_title: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prepared_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    available_from: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True
    )
    expiry_time: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, index=True
    )
    total_quantity: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    quantity_unit: Mapped[QuantityUnit] = mapped_column(
        Enum(QuantityUnit), nullable=False
    )
    pickup_address: Mapped[str] = mapped_column(Text, nullable=False)
    pickup_landmark: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    pickup_city: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )
    pickup_state: Mapped[str] = mapped_column(String(100), nullable=False)
    pickup_postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    pickup_latitude: Mapped[Decimal] = mapped_column(
        Numeric(10, 7), nullable=False
    )
    pickup_longitude: Mapped[Decimal] = mapped_column(
        Numeric(10, 7), nullable=False
    )
    delivery_preference: Mapped[DeliveryPreference] = mapped_column(
        Enum(DeliveryPreference),
        nullable=False,
        default=DeliveryPreference.PICKUP_REQUIRED,
    )
    status: Mapped[DonationStatus] = mapped_column(
        Enum(DonationStatus),
        nullable=False,
        default=DonationStatus.DRAFT,
        index=True,
    )
    special_instructions: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )

    __table_args__ = (
        Index("idx_donations_status_expiry", "status", "expiry_time"),
    )

    # Relationships
    donor: Mapped["Donor"] = relationship("Donor", back_populates="donations")
    created_by_user: Mapped[Optional["User"]] = relationship(
        "User",
        back_populates="created_donations",
        foreign_keys=[created_by_user_id],
    )
    items: Mapped[List["DonationItem"]] = relationship(
        "DonationItem", back_populates="donation", cascade="all, delete-orphan"
    )
    decision_engine_runs: Mapped[List["DecisionEngineRun"]] = relationship(
        "DecisionEngineRun",
        back_populates="donation",
        cascade="all, delete-orphan",
    )
    recommendation_cycles: Mapped[List["RecommendationCycle"]] = relationship(
        "RecommendationCycle",
        back_populates="donation",
        cascade="all, delete-orphan",
    )
    status_history: Mapped[List["DonationStatusHistory"]] = relationship(
        "DonationStatusHistory",
        back_populates="donation",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Donation donation_id={self.donation_id} title='{self.donation_title}' status='{self.status}'>"


class DonationItem(BaseModel):
    """Child food item belonging to a surplus donation offer."""

    __tablename__ = "donation_items"

    item_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    donation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "donations.donation_id", ondelete="CASCADE", onupdate="CASCADE"
        ),
        nullable=False,
        index=True,
    )
    item_name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[ItemCategory] = mapped_column(
        Enum(ItemCategory), nullable=False, index=True
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    unit: Mapped[QuantityUnit] = mapped_column(Enum(QuantityUnit), nullable=False)
    food_type: Mapped[FoodType] = mapped_column(
        Enum(FoodType), nullable=False, index=True
    )
    contains_allergens: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    allergen_details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    donation: Mapped["Donation"] = relationship(
        "Donation", back_populates="items"
    )

    def __repr__(self) -> str:
        return f"<DonationItem item_id={self.item_id} name='{self.item_name}' food_type='{self.food_type}'>"


class DecisionEngineRun(ImmutableBaseModel):
    """Technical execution run log model for Decision Engine matching runs."""

    __tablename__ = "decision_engine_runs"

    decision_engine_run_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    donation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "donations.donation_id", ondelete="CASCADE", onupdate="CASCADE"
        ),
        nullable=False,
        index=True,
    )
    algorithm_version: Mapped[str] = mapped_column(String(20), nullable=False)
    execution_status: Mapped[ExecutionStatus] = mapped_column(
        Enum(ExecutionStatus), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    execution_time_ms: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    failure_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ranking_snapshot: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True
    )

    # Relationships
    donation: Mapped["Donation"] = relationship(
        "Donation", back_populates="decision_engine_runs"
    )
    recommendation_cycles: Mapped[List["RecommendationCycle"]] = relationship(
        "RecommendationCycle",
        back_populates="decision_engine_run",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<DecisionEngineRun run_id={self.decision_engine_run_id} status='{self.execution_status}'>"


class RecommendationCycle(ImmutableBaseModel):
    """Business recommendation cycle generated from a Decision Engine run."""

    __tablename__ = "recommendation_cycles"

    recommendation_cycle_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    donation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "donations.donation_id", ondelete="CASCADE", onupdate="CASCADE"
        ),
        nullable=False,
        index=True,
    )
    decision_engine_run_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "decision_engine_runs.decision_engine_run_id",
            ondelete="CASCADE",
            onupdate="CASCADE",
        ),
        nullable=False,
        index=True,
    )
    algorithm_version: Mapped[str] = mapped_column(String(20), nullable=False)
    trigger_reason: Mapped[TriggerReason] = mapped_column(
        Enum(TriggerReason), nullable=False
    )

    # Relationships
    donation: Mapped["Donation"] = relationship(
        "Donation", back_populates="recommendation_cycles"
    )
    decision_engine_run: Mapped["DecisionEngineRun"] = relationship(
        "DecisionEngineRun", back_populates="recommendation_cycles"
    )
    ngo_requests: Mapped[List["NGORequest"]] = relationship(
        "NGORequest",
        back_populates="recommendation_cycle",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<RecommendationCycle cycle_id={self.recommendation_cycle_id} donation_id={self.donation_id}>"


class DonationStatusHistory(ImmutableBaseModel):
    """Immutable status transition audit trail log for donations."""

    __tablename__ = "donation_status_history"

    donation_status_history_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, autoincrement=True
    )
    donation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey(
            "donations.donation_id", ondelete="CASCADE", onupdate="CASCADE"
        ),
        nullable=False,
        index=True,
    )
    previous_status: Mapped[Optional[DonationStatus]] = mapped_column(
        Enum(DonationStatus), nullable=True
    )
    new_status: Mapped[DonationStatus] = mapped_column(
        Enum(DonationStatus), nullable=False
    )
    changed_by_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    change_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    donation: Mapped["Donation"] = relationship(
        "Donation", back_populates="status_history"
    )
    changed_by_user: Mapped[Optional["User"]] = relationship("User")

    def __repr__(self) -> str:
        return f"<DonationStatusHistory id={self.donation_status_history_id} don_id={self.donation_id} {self.previous_status}->{self.new_status}>"
